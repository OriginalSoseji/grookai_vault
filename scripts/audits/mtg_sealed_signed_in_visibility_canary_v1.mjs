import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  buildMtgSealedCanaryPlanV1,
  evaluateMtgSealedCanaryProofV1,
  hashMtgSealedCanaryV1,
  MTG_SEALED_CANARY_BUCKET_V1,
  MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
  MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_OBJECT_PATH_V1,
  MTG_SEALED_CANARY_OBJECT_SHA256_V1,
  MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_PROJECT_REF_V1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1,
  stableMtgSealedCanaryV1,
  validateMtgSealedCanaryPreflightV1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_canary_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { Client } = pg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPECTED_BRANCH = 'agent/mtg-sealed-image-migration-promotion-v1';
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp',
  'mtg-sealed-signed-in-visibility-canary-v1');
const SIGNER_NAME = 'mtg-sealed-sign-image-v1';
const RPC_NAME = 'get_active_sealed_product_pricing_v3';

function parseArgs(argv) {
  const args = {
    mode: 'preflight',
    expectedHeadSha: '',
    expectedPlanFingerprint: '',
    envFile: DEFAULT_ENV_FILE,
    outDir: DEFAULT_OUT,
  };
  for (const value of argv) {
    if (value === '--preflight') args.mode = 'preflight';
    else if (value === '--execute') args.mode = 'execute';
    else if (value.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = value.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (value.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = value
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (value.startsWith('--env-file=')) {
      args.envFile = path.resolve(value.slice('--env-file='.length));
    } else if (value.startsWith('--out-dir=')) {
      args.outDir = path.resolve(value.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${value}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode === 'execute' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error(
      'Exact --expected-plan-fingerprint=<64-character SHA-256> is required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function repository(args) {
  const branch = git('branch', '--show-current');
  const result = {
    branch: branch || process.env.GITHUB_REF_NAME || 'detached',
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (result.head_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean canary producer');
  }
  if (branch && branch !== EXPECTED_BRANCH) {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  return result;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function projectRef(connectionString) {
  for (const value of [process.env.SUPABASE_URL ?? '', connectionString]) {
    const match = value.match(/(?:https?:\/\/|db\.|@)([a-z0-9]{20})\./i);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

function databaseOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: applicationName,
  };
}

async function withClient(connectionString, applicationName, callback) {
  const client = new Client(databaseOptions(connectionString, applicationName));
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function readOnly(connectionString, applicationName, callback) {
  return withClient(connectionString, applicationName, async (client) => {
    await client.query('begin transaction read only');
    try {
      const value = await callback(client);
      await client.query('rollback');
      return value;
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  });
}

async function one(client, sql, values = []) {
  return (await client.query(sql, values)).rows[0] ?? null;
}

async function captureReleaseControl(client) {
  return one(client, `select game_key,release_status,release_version,evidence,
    activated_at::text,activated_by,updated_at::text
    from public.sealed_product_game_release_controls where game_key='mtg'`);
}

async function captureProtectedState(client) {
  const value = await one(client, `select jsonb_build_object(
    'sealed_family_count',(select count(*) from public.sealed_product_families),
    'sealed_variant_count',(select count(*) from public.sealed_product_variants),
    'sealed_mapping_count',(select count(*) from public.sealed_product_source_mappings),
    'price_release_count',(select count(*) from public.sealed_product_releases),
    'price_member_count',(select count(*) from public.sealed_product_release_members),
    'image_evidence_count',(select count(*) from public.sealed_product_image_evidence),
    'image_object_count',(select count(*) from public.sealed_product_image_objects),
    'image_assertion_count',(select count(*) from public.sealed_product_variant_image_assertions),
    'image_release_count',(select count(*) from public.sealed_product_image_releases),
    'image_member_count',(select count(*) from public.sealed_product_image_release_members),
    'mtg_price_pointer',(select release_id::text from public.sealed_product_release_pointer where game_key='mtg'),
    'mtg_image_pointer',(select image_release_id::text from public.sealed_product_image_release_pointer where game_key='mtg'),
    'mtg_catalog_visibility',(select release_status from public.catalog_game_release_controls where game_code='mtg'),
    'mtg_sealed_control',(select to_jsonb(control) from public.sealed_product_game_release_controls control where game_key='mtg'),
    'mtg_storage_object_count',(select count(*) from storage.objects where bucket_id='user-card-images' and name like 'sealed/mtg/sha256/%'),
    'mtg_storage_object_bytes',(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='user-card-images' and name like 'sealed/mtg/sha256/%'),
    'vault_item_count',(select count(*) from public.vault_items),
    'vault_instance_count',(select count(*) from public.vault_item_instances)
  ) as state`);
  return value.state;
}

async function captureAuthority(client) {
  return one(client, `select
    price_pointer.release_id::text as price_release_id,
    image_pointer.image_release_id::text as image_release_id,
    image_release.manifest_fingerprint as image_manifest,
    (select count(*) from public.sealed_product_release_members m
      where m.release_id=price_pointer.release_id)::text as active_price_members,
    (select count(*) from public.sealed_product_image_release_members m
      where m.image_release_id=image_pointer.image_release_id)::text
      as active_image_members
    from public.sealed_product_release_pointer price_pointer
    join public.sealed_product_image_release_pointer image_pointer
      on image_pointer.game_key=price_pointer.game_key
    join public.sealed_product_image_releases image_release
      on image_release.id=image_pointer.image_release_id
     and image_release.game_key=image_pointer.game_key
     and image_release.source_price_release_id=price_pointer.release_id
     and image_release.release_state='frozen'
    where price_pointer.game_key='mtg'`);
}

async function captureCandidate(client) {
  const row = await one(client, `select image_object.storage_bucket,
    image_object.object_path,image_object.content_sha256,
    image_object.image_mime,image_object.image_width,image_object.image_height,
    image_object.image_bytes::text,variant.canonical_name,
    exists (
      select 1
      from public.sealed_product_image_release_pointer image_pointer
      join public.sealed_product_image_release_members image_member
        on image_member.image_release_id=image_pointer.image_release_id
       and image_member.game_key=image_pointer.game_key
      join public.sealed_product_variant_image_assertions image_assertion
        on image_assertion.id=image_member.image_assertion_id
       and image_assertion.variant_id=image_member.variant_id
       and image_assertion.assertion_state='exact_verified'
      join public.sealed_product_image_evidence image_evidence
        on image_evidence.id=image_assertion.image_evidence_id
       and image_evidence.source_release_member_id is not null
      join public.sealed_product_release_pointer price_pointer
        on price_pointer.game_key=image_pointer.game_key
      join public.sealed_product_release_members price_member
        on price_member.release_id=price_pointer.release_id
       and price_member.id=image_evidence.source_release_member_id
       and price_member.variant_id=image_assertion.variant_id
       and price_member.qualification_status='qualified_exact'
      where image_pointer.game_key='mtg'
        and image_assertion.image_object_id=image_object.id
        and image_pointer.image_release_id=$2::uuid
        and price_pointer.release_id=$3::uuid
    ) as structurally_authorized
    from public.sealed_product_image_objects image_object
    join public.sealed_product_variant_image_assertions assertion
      on assertion.image_object_id=image_object.id
     and assertion.game_key=image_object.game_key
    join public.sealed_product_variants variant on variant.id=assertion.variant_id
    where image_object.game_key='mtg' and image_object.object_path=$1
    order by variant.id limit 1`, [MTG_SEALED_CANARY_OBJECT_PATH_V1,
    MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
    MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1]);
  if (!row) throw new Error('Frozen signer candidate is absent');
  return row;
}

async function captureHiddenBehavior(client) {
  await client.query('set local role authenticated');
  await client.query(
    `select set_config('request.jwt.claim.role','authenticated',true)`);
  const rpc = await one(client, `select count(*)::text as count from
    public.get_active_sealed_product_pricing_v3('mtg',null,100,0)`);
  const signing = await one(client,
    `select public.mtg_sealed_image_object_signing_authorized_v1($1,$2)
      as authorized`, [MTG_SEALED_CANARY_BUCKET_V1,
    MTG_SEALED_CANARY_OBJECT_PATH_V1]);
  return {
    hidden_rpc_rows: Number(rpc.count),
    hidden_signing_authorized: signing.authorized === true,
  };
}

function clientBoundaries() {
  const web = execFileSync('powershell', ['-NoProfile', '-Command',
    "Select-String -Path 'apps/web/src/lib/sealed/mtgSealedClientV1.ts' -Pattern 'MTG_SEALED_CLIENT_V1_ENABLED = false as const' -Quiet"],
  { cwd: ROOT, encoding: 'utf8' }).trim();
  const flutter = execFileSync('powershell', ['-NoProfile', '-Command',
    "Select-String -Path 'lib/services/sealed/mtg_sealed_client_v1.dart' -Pattern 'kMtgSealedClientV1Enabled = false;' -Quiet"],
  { cwd: ROOT, encoding: 'utf8' }).trim();
  return { web_enabled: web.toLowerCase() !== 'true',
    flutter_enabled: flutter.toLowerCase() !== 'true' };
}

async function capturePreflight(connectionString, ref) {
  const base = await readOnly(connectionString,
    'mtg-sealed-visibility-canary-preflight-v1', async (client) => {
      const releaseControl = await captureReleaseControl(client);
      const protectedState = await captureProtectedState(client);
      const authority = await captureAuthority(client);
      const candidate = await captureCandidate(client);
      const catalog = await one(client, `select release_status
        as catalog_visibility from public.catalog_game_release_controls
        where game_code='mtg'`);
      const privileges = await one(client, `select
        has_function_privilege('anon',
          'public.get_active_sealed_product_pricing_v3(text,text,integer,integer)',
          'EXECUTE') as anonymous_rpc_execute,
        has_function_privilege('authenticated',
          'public.get_active_sealed_product_pricing_v3(text,text,integer,integer)',
          'EXECUTE') as authenticated_rpc_execute`);
      return { release_control: releaseControl,
        protected_state: protectedState, authority, candidate,
        catalog_visibility: catalog?.catalog_visibility ?? null, privileges };
    });
  const behavior = await readOnly(connectionString,
    'mtg-sealed-visibility-canary-hidden-behavior-v1', captureHiddenBehavior);
  return { project_ref: ref, ...base, ...behavior, clients: clientBoundaries() };
}

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  }
  return createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false,
      autoRefreshToken: false, detectSessionInUrl: false } });
}

function publishableKey() {
  const value = process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!value) throw new Error('SUPABASE_PUBLISHABLE_KEY is required');
  return value;
}

async function createAuthFixture(service) {
  const nonce = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const email = `mtg-sealed-canary-${nonce}@example.invalid`;
  const password = crypto.randomBytes(32).toString('base64url');
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      purpose: MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1,
    },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Disposable Auth user creation failed: ${
      created.error?.message ?? 'missing user'}`);
  }
  const user = createClient(process.env.SUPABASE_URL, publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false,
      detectSessionInUrl: false },
  });
  const signedIn = await user.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session?.access_token) {
    await service.auth.admin.deleteUser(created.data.user.id, false)
      .catch(() => {});
    throw new Error(`Disposable Auth sign-in failed: ${
      signedIn.error?.message ?? 'missing session'}`);
  }
  return { userId: created.data.user.id,
    accessToken: signedIn.data.session.access_token, user,
    artifact: { created: true, signed_in: true,
      user_id_sha256: hashMtgSealedCanaryV1(created.data.user.id),
      raw_user_id_persisted: false, email_persisted: false,
      password_persisted: false } };
}

async function rpcProbe(accessToken = '', query = null) {
  const headers = { apikey: publishableKey(),
    'content-type': 'application/json' };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/${RPC_NAME}`, {
      method: 'POST', headers,
      body: JSON.stringify({ p_game_key: 'mtg', p_query: query,
        p_limit: 100, p_offset: 0 }),
      signal: AbortSignal.timeout(30_000),
    });
  let body;
  try { body = await response.json(); } catch { body = null; }
  const rows = response.ok && Array.isArray(body) ? body : [];
  return {
    internal_rows: rows,
    artifact: { status: response.status, row_count: rows.length,
      denied: !response.ok,
      error_code: !response.ok && body && typeof body === 'object'
        ? String(body.code ?? body.error ?? 'request_failed') : null,
      sample: rows[0] ? {
        variant_id: rows[0].variant_id,
        canonical_name: rows[0].canonical_name,
        price_release_id: rows[0].price_release_id,
        image_release_id: rows[0].image_release_id,
        image_object_path: rows[0].image_object_path,
        observed_on: rows[0].observed_on,
        market_price: rows[0].market_price,
      } : null,
    },
  };
}

async function signerProbe(accessToken = '') {
  const headers = { apikey: publishableKey(),
    'content-type': 'application/json' };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/${SIGNER_NAME}`, {
      method: 'POST', headers,
      body: JSON.stringify({ storage_bucket: MTG_SEALED_CANARY_BUCKET_V1,
        object_path: MTG_SEALED_CANARY_OBJECT_PATH_V1 }),
      signal: AbortSignal.timeout(30_000),
    });
  let body;
  try { body = await response.json(); } catch { body = null; }
  return {
    signedUrl: response.ok && typeof body?.signed_url === 'string'
      ? body.signed_url : '',
    artifact: { status: response.status,
      error: !response.ok ? String(body?.error ?? 'request_failed') : null,
      signed_url_present: response.ok &&
        typeof body?.signed_url === 'string' && body.signed_url.length > 0,
      expires_in: response.ok ? Number(body?.expires_in ?? 0) : null,
      signed_url_persisted: false },
  };
}

async function downloadSignedImage(signedUrl) {
  if (!signedUrl) return { status: 0, bytes: 0, sha256: null };
  const response = await fetch(signedUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes: bytes.length,
    content_type: response.headers.get('content-type'),
    sha256: hashMtgSealedCanaryV1(bytes) };
}

async function activateCanary(connectionString, baseline, planFingerprint) {
  return withClient(connectionString, 'mtg-sealed-visibility-canary-activate-v1',
    async (client) => {
      await client.query('begin');
      try {
        await client.query(`select pg_advisory_xact_lock(
          hashtextextended('mtg_sealed_visibility_canary_v1',0))`);
        const current = await captureReleaseControl(client);
        if (stableMtgSealedCanaryV1(current) !==
            stableMtgSealedCanaryV1(baseline)) {
          throw new Error('Release control changed after frozen preflight');
        }
        const updated = await one(client, `update
          public.sealed_product_game_release_controls set
          release_status='signed_in',
          release_version=$1,
          evidence=jsonb_build_object(
            'canary_plan_fingerprint_sha256',$2::text,
            'baseline_release_control_sha256',$3::text,
            'temporary',true,
            'durable_activation',false
          ),
          activated_at=clock_timestamp(),activated_by=$1,
          updated_at=clock_timestamp()
          where game_key='mtg'
          returning game_key,release_status,release_version,evidence,
            activated_at::text,activated_by,updated_at::text`, [
          MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1,
          planFingerprint, hashMtgSealedCanaryV1(baseline)]);
        await client.query('commit');
        return updated;
      } catch (error) {
        await client.query('rollback').catch(() => {});
        throw error;
      }
    });
}

async function restoreControl(connectionString, baseline, planFingerprint) {
  return withClient(connectionString, 'mtg-sealed-visibility-canary-restore-v1',
    async (client) => {
      await client.query('begin');
      try {
        await client.query(`select pg_advisory_xact_lock(
          hashtextextended('mtg_sealed_visibility_canary_v1',0))`);
        const current = await captureReleaseControl(client);
        if (stableMtgSealedCanaryV1(current) ===
            stableMtgSealedCanaryV1(baseline)) {
          await client.query('rollback');
          return { restored: true, already_baseline: true };
        }
        if (current?.evidence?.canary_plan_fingerprint_sha256 !==
            planFingerprint) {
          throw new Error(
            'Refusing to overwrite release control not owned by this canary');
        }
        const result = await client.query(`update
          public.sealed_product_game_release_controls set
          release_status=$1,release_version=$2,evidence=$3::jsonb,
          activated_at=$4::timestamptz,activated_by=$5,
          updated_at=$6::timestamptz
          where game_key='mtg'`, [baseline.release_status,
          baseline.release_version, JSON.stringify(baseline.evidence),
          baseline.activated_at, baseline.activated_by, baseline.updated_at]);
        if (result.rowCount !== 1) throw new Error('Restore updated row mismatch');
        await client.query('commit');
        return { restored: true, already_baseline: false };
      } catch (error) {
        await client.query('rollback').catch(() => {});
        throw error;
      }
    });
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function verifyAuthResidue(connectionString, userId) {
  return readOnly(connectionString, 'mtg-sealed-canary-auth-readback-v1',
    async (client) => {
      const references = [];
      const authColumns = (await client.query(`select table_schema,table_name,
        column_name,data_type from information_schema.columns
        where table_schema='auth' and (
          (table_name='users' and column_name='id') or column_name='user_id')
        order by table_name,column_name`)).rows;
      const foreignKeys = (await client.query(`select distinct
        source_ns.nspname as table_schema,source.relname as table_name,
        source_col.attname as column_name,
        format_type(source_col.atttypid,source_col.atttypmod) as data_type
        from pg_constraint constraint_row
        join pg_class source on source.oid=constraint_row.conrelid
        join pg_namespace source_ns on source_ns.oid=source.relnamespace
        join pg_class target on target.oid=constraint_row.confrelid
        join pg_namespace target_ns on target_ns.oid=target.relnamespace
        join unnest(constraint_row.conkey) with ordinality source_key(attnum,ord)
          on true
        join unnest(constraint_row.confkey) with ordinality target_key(attnum,ord)
          on target_key.ord=source_key.ord
        join pg_attribute source_col on source_col.attrelid=source.oid
          and source_col.attnum=source_key.attnum
        join pg_attribute target_col on target_col.attrelid=target.oid
          and target_col.attnum=target_key.attnum
        where constraint_row.contype='f' and target_ns.nspname='auth'
          and target.relname='users' and target_col.attname='id'
          and source_ns.nspname <> 'auth'
        order by source_ns.nspname,source.relname,source_col.attname`)).rows;
      const seen = new Set();
      for (const column of [...authColumns, ...foreignKeys]) {
        const key = `${column.table_schema}.${column.table_name}.${column.column_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const target = `${quoteIdentifier(column.table_schema)}.${
          quoteIdentifier(column.table_name)}`;
        const field = quoteIdentifier(column.column_name);
        const cast = String(column.data_type).includes('uuid') ? '$1::uuid'
          : '$1::text';
        const count = await one(client,
          `select count(*)::text as count from ${target} where ${field}=${cast}`,
          [userId]);
        references.push({ reference: key, row_count: Number(count.count) });
      }
      return { auth_user_absent: !references.some((entry) =>
        entry.reference === 'auth.users.id' && entry.row_count !== 0),
      auth_reference_rows: references.reduce((sum, entry) =>
        sum + entry.row_count, 0), references };
    });
}

async function deleteAuthFixture(service, fixture) {
  if (!fixture?.userId) return { deleted: true, absent_fixture: true };
  await fixture.user?.auth?.signOut({ scope: 'local' }).catch(() => {});
  const deletion = await service.auth.admin.deleteUser(fixture.userId, false);
  if (deletion.error) {
    throw new Error(`Disposable Auth deletion failed: ${deletion.error.message}`);
  }
  return { deleted: true, absent_fixture: false };
}

async function writeJson(directory, name, value) {
  await fs.writeFile(path.join(directory, name),
    `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeArtifacts(directory, values, producerCommit) {
  await fs.mkdir(directory, { recursive: true });
  for (const [name, value] of Object.entries(values)) {
    if (name.endsWith('.json')) await writeJson(directory, name, value);
    else await fs.writeFile(path.join(directory, name), String(value), 'utf8');
  }
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const artifacts = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name === 'artifact_hashes.json') continue;
    const body = await fs.readFile(path.join(directory, entry.name));
    artifacts.push({ file: entry.name, bytes: body.length,
      sha256: hashMtgSealedCanaryV1(body) });
  }
  artifacts.sort((a, b) => a.file.localeCompare(b.file));
  await writeJson(directory, 'artifact_hashes.json', {
    hash_algorithm: 'sha256', producer_commit_sha: producerCommit, artifacts,
  });
}

function report(summary) {
  return `# MTG Sealed Signed-In Visibility Canary V1\n\n` +
    `- Result: **${summary.validation.passed ? 'PASS' : 'FAIL'}**\n` +
    `- Producer: \`${summary.repository.head_sha}\`\n` +
    `- Plan fingerprint: \`${summary.plan.plan_fingerprint_sha256}\`\n` +
    `- Visibility transition: \`hidden -> signed_in -> hidden\`\n` +
    `- Visibility open seconds: \`${summary.proof.timing.visibility_open_seconds}\`\n` +
    `- Authenticated RPC rows: \`${summary.proof.active.authenticated_rpc_rows}\`\n` +
    `- Selected candidate returned: \`${summary.proof.active.selected_candidate_returned}\`\n` +
    `- Signer status: \`${summary.proof.active.authenticated_signer_status}\`\n` +
    `- Signed image SHA-256: \`${summary.proof.active.signed_image_sha256}\`\n` +
    `- Release control exactly restored: \`${summary.proof.rollback.release_control_exact}\`\n` +
    `- Protected state exact: \`${summary.proof.rollback.protected_state_exact}\`\n` +
    `- Auth reference rows remaining: \`${summary.proof.rollback.auth_reference_rows}\`\n` +
    `- Web/Flutter clients enabled: \`false/false\`\n` +
    `- Anonymous visibility enabled: \`false\`\n\n` +
    `## Findings\n\n${summary.validation.findings.length === 0
      ? '- None.\n' : summary.validation.findings.map((entry) =>
        `- \`${entry.code}\`: actual \`${JSON.stringify(entry.actual)}\`, expected \`${JSON.stringify(entry.expected)}\``).join('\n') + '\n'}`;
}

async function executeCanary({ connectionString, repo, preflight, plan, outDir }) {
  const service = serviceClient();
  let fixture = null;
  let activatedAt = null;
  let restoredAt = null;
  let executionError = null;
  const proof = {
    preflight_findings: validateMtgSealedCanaryPreflightV1(preflight),
    auth_fixture: { created: false, signed_in: false },
    hidden: {}, active: {}, rollback: {}, timing: {},
  };
  await writeJson(outDir, 'run_plan.json', plan);
  try {
    fixture = await createAuthFixture(service);
    proof.auth_fixture = fixture.artifact;
    const hiddenRpc = await rpcProbe(fixture.accessToken);
    const hiddenSigner = await signerProbe(fixture.accessToken);
    const hiddenAnonSigner = await signerProbe();
    const hiddenAnonRpc = await rpcProbe();
    proof.hidden = {
      authenticated_rpc_status: hiddenRpc.artifact.status,
      authenticated_rpc_rows: hiddenRpc.artifact.row_count,
      authenticated_signer_status: hiddenSigner.artifact.status,
      anonymous_rpc_status: hiddenAnonRpc.artifact.status,
      anonymous_rpc_rows: hiddenAnonRpc.artifact.row_count,
      anonymous_signer_status: hiddenAnonSigner.artifact.status,
    };

    const activeControl = await activateCanary(connectionString,
      preflight.release_control, plan.plan_fingerprint_sha256);
    activatedAt = Date.now();
    const activeRpc = await rpcProbe(fixture.accessToken,
      preflight.candidate.canonical_name);
    const activeSigner = await signerProbe(fixture.accessToken);
    const activeAnonRpc = await rpcProbe('',
      preflight.candidate.canonical_name);
    const activeAnonSigner = await signerProbe();
    const imageReadback = await downloadSignedImage(activeSigner.signedUrl);
    proof.active = {
      release_status: activeControl.release_status,
      authenticated_rpc_status: activeRpc.artifact.status,
      authenticated_rpc_rows: activeRpc.artifact.row_count,
      rpc_sample: activeRpc.artifact.sample,
      selected_candidate_returned: activeRpc.internal_rows.some((row) =>
        row.image_object_path === MTG_SEALED_CANARY_OBJECT_PATH_V1),
      authenticated_signer_status: activeSigner.artifact.status,
      signer: activeSigner.artifact,
      signed_image_status: imageReadback.status,
      signed_image_bytes: imageReadback.bytes,
      signed_image_content_type: imageReadback.content_type,
      signed_image_sha256: imageReadback.sha256,
      anonymous_rpc_status: activeAnonRpc.artifact.status,
      anonymous_rpc_rows: activeAnonRpc.artifact.row_count,
      anonymous_signer_status: activeAnonSigner.artifact.status,
    };
  } catch (error) {
    executionError = error;
  } finally {
    try {
      const restored = await restoreControl(connectionString,
        preflight.release_control, plan.plan_fingerprint_sha256);
      restoredAt = Date.now();
      proof.rollback.restore_operation = restored;
    } catch (error) {
      executionError ??= error;
      proof.rollback.restore_error = String(error?.message ?? error);
    }
    if (fixture?.accessToken) {
      try {
        const postRpc = await rpcProbe(fixture.accessToken,
          preflight.candidate.canonical_name);
        const postSigner = await signerProbe(fixture.accessToken);
        proof.rollback.post_restore_authenticated_rpc_status =
          postRpc.artifact.status;
        proof.rollback.post_restore_authenticated_rpc_rows =
          postRpc.artifact.row_count;
        proof.rollback.post_restore_authenticated_signer_status =
          postSigner.artifact.status;
      } catch (error) {
        executionError ??= error;
      }
    }
    try {
      proof.rollback.auth_deletion = await deleteAuthFixture(service, fixture);
    } catch (error) {
      executionError ??= error;
      proof.rollback.auth_deletion_error = String(error?.message ?? error);
    }
  }

  const post = await capturePreflight(connectionString,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  const authReadback = fixture?.userId
    ? await verifyAuthResidue(connectionString, fixture.userId)
    : { auth_user_absent: true, auth_reference_rows: 0, references: [] };
  proof.rollback.release_control_exact = stableMtgSealedCanaryV1(
    post.release_control) === stableMtgSealedCanaryV1(preflight.release_control);
  proof.rollback.protected_state_exact = stableMtgSealedCanaryV1(
    post.protected_state) === stableMtgSealedCanaryV1(preflight.protected_state);
  proof.rollback.auth_user_absent = authReadback.auth_user_absent;
  proof.rollback.auth_reference_rows = authReadback.auth_reference_rows;
  proof.rollback.auth_reference_readback = authReadback.references;
  proof.timing = {
    activated: activatedAt !== null,
    restored: restoredAt !== null,
    visibility_open_seconds: activatedAt && restoredAt
      ? Math.max(0, (restoredAt - activatedAt) / 1000) : 0,
  };
  proof.execution_error = executionError
    ? { message: String(executionError?.message ?? executionError) } : null;
  const validation = evaluateMtgSealedCanaryProofV1(proof);
  if (executionError && validation.findings.length === 0) {
    validation.passed = false;
    validation.status = 'mtg_sealed_signed_in_visibility_canary_failed';
    validation.findings.push({ code: 'execution_error',
      actual: proof.execution_error.message, expected: null });
  }
  const summary = { canary_version:
    MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1,
  repository: repo, plan, proof, post_restore_preflight: post,
  validation, boundaries: plan.boundaries,
  exact_next_gate: validation.passed
    ? 'prepare durable signed-in visibility activation and disabled-client rollout as separate gates'
    : 'keep MTG sealed hidden and repair only the recorded canary failure' };
  await writeArtifacts(outDir, {
    'fresh_production_preflight.json': preflight,
    'canary_proof.json': proof,
    'post_restore_preflight.json': post,
    'summary.json': summary,
    'REPORT.md': report(summary),
  }, repo.head_sha);
  if (!validation.passed) {
    throw new Error(`Canary failed: ${validation.findings.map((entry) =>
      entry.code).join(',')}`);
  }
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('SUPABASE_DB_URL is required');
  const ref = projectRef(connectionString);
  if (ref !== MTG_SEALED_CANARY_PROJECT_REF_V1) {
    throw new Error(`Production project ref mismatch: ${ref || 'unknown'}`);
  }
  const repo = repository(args);
  const preflight = await capturePreflight(connectionString, ref);
  const plan = buildMtgSealedCanaryPlanV1({ repository: repo, preflight });
  if (args.expectedPlanFingerprint && plan.plan_fingerprint_sha256 !==
      args.expectedPlanFingerprint) {
    throw new Error('Canary plan fingerprint mismatch');
  }
  await fs.mkdir(args.outDir, { recursive: true });
  if (args.mode === 'preflight') {
    const summary = { status: 'ready_for_zero_residue_canary',
      repository: repo, preflight, plan,
      preflight_findings: validateMtgSealedCanaryPreflightV1(preflight) };
    await writeArtifacts(args.outDir, {
      'fresh_production_preflight.json': preflight,
      'run_plan.json': plan,
      'summary.json': summary,
    }, repo.head_sha);
    console.log(JSON.stringify({ status: summary.status,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      producer_commit: repo.head_sha }, null, 2));
    return;
  }
  const summary = await executeCanary({ connectionString, repo, preflight,
    plan, outDir: args.outDir });
  console.log(JSON.stringify({ status: summary.validation.status,
    passed: summary.validation.passed,
    producer_commit: repo.head_sha,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    authenticated_rpc_rows: summary.proof.active.authenticated_rpc_rows,
    signed_image_sha256: summary.proof.active.signed_image_sha256,
    visibility_open_seconds: summary.proof.timing.visibility_open_seconds,
    release_control_exact: summary.proof.rollback.release_control_exact,
    auth_reference_rows: summary.proof.rollback.auth_reference_rows,
    output_directory: args.outDir }, null, 2));
}

if (process.argv[1] &&
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  capturePreflight,
  createAuthFixture,
  deleteAuthFixture,
  downloadSignedImage,
  parseArgs,
  rpcProbe,
  serviceClient,
  signerProbe,
  restoreControl,
  verifyAuthResidue,
};
