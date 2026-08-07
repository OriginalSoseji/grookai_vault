import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  ACCOUNT_DELETION_POLICY_VERSION,
  buildDeletionDecision,
  canonicalPlanPayload,
  classifyReference,
  planFingerprint,
  sha256,
  targetFingerprint,
} from '../../backend/account_deletion/account_deletion_policy_v1.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), envPath), override: false, quiet: true });
}

export const WORKER_VERSION = 'ACCOUNT_DELETION_WORKER_V1';

function parseArgs(argv) {
  const values = new Map();
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    values.set(key, rest.length > 0 ? rest.join('=') : true);
  }
  return {
    apply: values.has('apply'),
    userId: String(values.get('user-id') ?? '').trim(),
    requestTicket: String(values.get('request-ticket') ?? '').trim(),
    expectedPlanSha256: String(values.get('expected-plan-sha256') ?? '').trim(),
    outDir: values.has('out-dir') ? path.resolve(String(values.get('out-dir'))) : null,
  };
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function createDatabaseClient(applicationName) {
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required.');
  return new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    application_name: applicationName,
  });
}

function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for apply.');
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function readReferenceCatalog(client) {
  const result = await client.query(`
    select n.nspname as schema_name,
           c.relname as table_name,
           a.attname as column_name,
           not a.attnotnull as nullable,
           case con.confdeltype
             when 'a' then 'NO ACTION'
             when 'r' then 'RESTRICT'
             when 'c' then 'CASCADE'
             when 'n' then 'SET NULL'
             when 'd' then 'SET DEFAULT'
           end as delete_action,
           con.conname as constraint_name
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join unnest(con.conkey) with ordinality ck(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.oid and a.attnum = ck.attnum
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
    order by n.nspname, c.relname, a.attname
  `);
  return result.rows;
}

async function countReferences(client, userId, catalog) {
  const references = [];
  for (const reference of catalog) {
    const sql = `select count(*)::int as row_count from ${quoteIdent(reference.schema_name)}.${quoteIdent(reference.table_name)} where ${quoteIdent(reference.column_name)} = $1::uuid`;
    const result = await client.query(sql, [userId]);
    references.push({
      ...reference,
      row_count: Number(result.rows[0]?.row_count ?? 0),
      ...classifyReference(reference),
    });
  }
  return references;
}

async function readStorageInventory(client, userId) {
  const result = await client.query(
    `select bucket_id, count(*)::int as object_count
     from storage.objects
     where owner = $1::uuid
        or owner_id = $1::text
        or (bucket_id = 'profile-media' and name like ('profiles/' || $1::text || '/%'))
        or name like ($1::text || '/%')
     group by bucket_id
     order by bucket_id`,
    [userId],
  );
  return result.rows.map((row) => ({
    bucket_id: row.bucket_id,
    object_count: Number(row.object_count),
  }));
}

async function readOwnedStorageObjects(client, userId) {
  const result = await client.query(
    `select bucket_id, name
     from storage.objects
     where owner = $1::uuid
        or owner_id = $1::text
        or (bucket_id = 'profile-media' and name like ('profiles/' || $1::text || '/%'))
        or name like ($1::text || '/%')
     order by bucket_id, name`,
    [userId],
  );
  return result.rows;
}

export async function buildAccountDeletionPlan({ userId, requestTicket = null }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('A valid --user-id UUID is required.');
  }
  const client = createDatabaseClient('account-deletion-plan-v1');
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query("set local statement_timeout = '60s'");
    const user = await client.query(
      `select id, deleted_at is not null as soft_deleted
       from auth.users where id = $1::uuid`,
      [userId],
    );
    const catalog = await readReferenceCatalog(client);
    const references = await countReferences(client, userId, catalog);
    const storage = await readStorageInventory(client, userId);
    const binders = await client.query(
      `select count(*)::int as row_count
       from public.binders
       where owner_user_id = $1::uuid and lifecycle in ('active', 'archived')`,
      [userId],
    );
    await client.query('rollback');

    const activeOwnedBinders = Number(binders.rows[0]?.row_count ?? 0);
    const decision = buildDeletionDecision({ references, activeOwnedBinders });
    const plan = {
      version: WORKER_VERSION,
      policy_version: ACCOUNT_DELETION_POLICY_VERSION,
      generated_at: new Date().toISOString(),
      request_ticket_hash: requestTicket ? sha256(requestTicket) : null,
      target_fingerprint: targetFingerprint(userId),
      target_exists: user.rowCount === 1,
      target_soft_deleted: user.rows[0]?.soft_deleted === true,
      references,
      storage,
      active_owned_binders: activeOwnedBinders,
      decision,
      boundaries: {
        raw_user_id_in_artifact: false,
        raw_email_in_artifact: false,
        credentials_in_artifact: false,
        other_users_may_change: false,
        hard_delete_requires_exact_plan_ack: true,
        soft_delete_apply_implemented: false,
      },
    };
    plan.plan_sha256 = planFingerprint(plan);
    return plan;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function removeStorageObjects(service, rows) {
  const byBucket = new Map();
  for (const row of rows) {
    const names = byBucket.get(row.bucket_id) ?? [];
    names.push(row.name);
    byBucket.set(row.bucket_id, names);
  }
  for (const [bucket, names] of byBucket) {
    for (let offset = 0; offset < names.length; offset += 100) {
      const { error } = await service.storage.from(bucket).remove(names.slice(offset, offset + 100));
      if (error) throw new Error(`Storage removal failed for bucket ${bucket}: ${error.message}`);
    }
  }
}

async function preprocessHardDelete(client, userId, references) {
  const results = [];
  for (const reference of references.filter((row) => Number(row.row_count) > 0)) {
    const qualified = `${quoteIdent(reference.schema_name)}.${quoteIdent(reference.table_name)}`;
    const column = quoteIdent(reference.column_name);
    if (reference.policy === 'delete_user_content_before_auth_removal') {
      const result = await client.query(`delete from ${qualified} where ${column} = $1::uuid`, [userId]);
      results.push({ key: reference.key, action: 'deleted_user_content', row_count: result.rowCount });
    } else if (reference.policy === 'scrub_nullable_attribution_before_auth_removal') {
      const result = await client.query(`update ${qualified} set ${column} = null where ${column} = $1::uuid`, [userId]);
      results.push({ key: reference.key, action: 'scrubbed_nullable_attribution', row_count: result.rowCount });
    }
  }
  return results;
}

export async function executeHardDelete({ userId, requestTicket, expectedPlanSha256 }) {
  if (!requestTicket) throw new Error('--request-ticket is required for apply.');
  const before = await buildAccountDeletionPlan({ userId, requestTicket });
  if (before.plan_sha256 !== expectedPlanSha256) throw new Error('The expected plan fingerprint does not match the live plan.');
  if (process.env.GROOKAI_ACCOUNT_DELETION_ACK !== expectedPlanSha256) {
    throw new Error(`Apply requires GROOKAI_ACCOUNT_DELETION_ACK=${expectedPlanSha256}`);
  }
  if (!before.target_exists) throw new Error('The target auth user does not exist.');
  if (!before.decision.hard_delete_allowed) {
    throw new Error(`Hard delete refused: ${before.decision.decision}.`);
  }

  const service = createServiceClient();
  const client = createDatabaseClient('account-deletion-hard-apply-v1');
  await client.connect();
  let preprocessing = [];
  let storageRows = [];
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtextextended('account-deletion:' || $1::text, 0))", [userId]);
    const live = await buildAccountDeletionPlan({ userId, requestTicket });
    if (live.plan_sha256 !== expectedPlanSha256) throw new Error('The target state changed after planning.');
    storageRows = await readOwnedStorageObjects(client, userId);
    preprocessing = await preprocessHardDelete(client, userId, live.references);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  await removeStorageObjects(service, storageRows);
  const binderResult = await service.rpc('binder_service_account_delete_v1', {
    p_user_id: userId,
    p_correlation_id: `account-deletion:${before.target_fingerprint.slice(0, 20)}`,
    p_idempotency_key: expectedPlanSha256,
  });
  if (binderResult.error) throw new Error(`Binder account-deletion cleanup failed: ${binderResult.error.message}`);
  if (binderResult.data?.ok === false) throw new Error(`Binder account-deletion cleanup refused: ${binderResult.data.code}.`);

  const deletion = await service.auth.admin.deleteUser(userId, false);
  if (deletion.error) throw new Error(`Auth hard deletion failed: ${deletion.error.message}`);

  const after = await buildAccountDeletionPlan({ userId, requestTicket });
  const remainingRows = after.references.reduce((sum, row) => sum + Number(row.row_count), 0);
  const remainingStorage = after.storage.reduce((sum, row) => sum + Number(row.object_count), 0);
  if (after.target_exists || remainingRows !== 0 || remainingStorage !== 0) {
    throw new Error('Account deletion readback did not reconcile to zero.');
  }
  return {
    version: WORKER_VERSION,
    mode: 'hard_delete_apply',
    completed_at: new Date().toISOString(),
    target_fingerprint: before.target_fingerprint,
    request_ticket_hash: before.request_ticket_hash,
    plan_sha256: expectedPlanSha256,
    preprocessing,
    storage_objects_removed: storageRows.length,
    binder_cleanup: binderResult.data,
    auth_user_absent: true,
    direct_reference_rows_remaining: 0,
    storage_objects_remaining: 0,
    raw_user_id_in_artifact: false,
  };
}

async function writeArtifact(outDir, name, payload) {
  await fs.mkdir(outDir, { recursive: true });
  const output = { ...payload };
  output.artifact_sha256 = sha256(JSON.stringify(payload));
  const target = path.join(outDir, name);
  await fs.writeFile(target, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return path.relative(process.cwd(), target).replaceAll('\\', '/');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.userId) throw new Error('--user-id is required.');
  if (args.apply && !args.expectedPlanSha256) throw new Error('--expected-plan-sha256 is required for apply.');
  const outDir = args.outDir ?? path.resolve(
    'docs/audits/release_completion_v1/account_deletion_operations_v1',
    new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z'),
  );

  if (!args.apply) {
    const plan = await buildAccountDeletionPlan({ userId: args.userId, requestTicket: args.requestTicket });
    const artifact = await writeArtifact(outDir, 'dry_run_plan.json', plan);
    process.stdout.write(`${JSON.stringify({
      mode: 'dry_run',
      target_fingerprint: plan.target_fingerprint,
      decision: plan.decision.decision,
      plan_sha256: plan.plan_sha256,
      artifact,
    }, null, 2)}\n`);
    return;
  }

  const result = await executeHardDelete({
    userId: args.userId,
    requestTicket: args.requestTicket,
    expectedPlanSha256: args.expectedPlanSha256,
  });
  const artifact = await writeArtifact(outDir, 'apply_readback.json', result);
  process.stdout.write(`${JSON.stringify({
    mode: result.mode,
    target_fingerprint: result.target_fingerprint,
    plan_sha256: result.plan_sha256,
    artifact,
  }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { canonicalPlanPayload };
