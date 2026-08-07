import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  buildAccountDeletionPlan,
  executeHardDelete,
  WORKER_VERSION,
} from '../ops/account_deletion_worker_v1.mjs';
import { sha256 } from '../../backend/account_deletion/account_deletion_policy_v1.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), envPath), override: false, quiet: true });
}

export const EXERCISE_VERSION = 'ACCOUNT_DELETION_DISPOSABLE_EXERCISE_V1';
export const TEST_EMAIL_PREFIX = 'codex-release-deletion-';

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function databaseClient() {
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('A PostgreSQL connection string is required.');
  return new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    application_name: 'account-deletion-disposable-exercise-v1',
  });
}

async function writeArtifacts(report) {
  const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  const outDir = path.resolve(
    'docs/audits/release_completion_v1/account_deletion_operations_v1',
    stamp,
  );
  await fs.mkdir(outDir, { recursive: true });
  const summary = { ...report, artifact_sha256: sha256(JSON.stringify(report)) };
  const summaryPath = path.join(outDir, 'summary.json');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  const reportPath = path.join(outDir, 'REPORT.md');
  await fs.writeFile(reportPath, `# Account Deletion Disposable Exercise V1

- Status: **${report.status}**
- Worker: \`${report.worker_version}\`
- Target fingerprint: \`${report.target_fingerprint}\`
- Dry-run decision: \`${report.dry_run_decision}\`
- Representative profile rows: \`${report.fixture.profile_rows}\`
- Representative Storage objects: \`${report.fixture.storage_objects}\`
- Auth user absent after apply: \`${report.readback.auth_user_absent}\`
- Direct reference rows remaining: \`${report.readback.direct_reference_rows_remaining}\`
- Storage objects remaining: \`${report.readback.storage_objects_remaining}\`
- Raw UUID, email, password, and service credentials persisted: \`false\`

This exercise used a disposable account created by this execution. It proves the hard-delete path for an account without retained operational-history blockers. It does not prove the separate anonymized-retention path for established accounts.
`, 'utf8');
  const files = [summaryPath, reportPath];
  const hashes = {};
  for (const file of files) hashes[path.basename(file)] = sha256(await fs.readFile(file));
  const hashPath = path.join(outDir, 'artifact_hashes.json');
  await fs.writeFile(hashPath, `${JSON.stringify(hashes, null, 2)}\n`, 'utf8');
  return path.relative(process.cwd(), outDir).replaceAll('\\', '/');
}

async function main() {
  const service = serviceClient();
  const client = databaseClient();
  const nonce = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const email = `${TEST_EMAIL_PREFIX}${nonce}@example.invalid`;
  const password = crypto.randomBytes(32).toString('base64url');
  const requestTicket = `release-proof-${nonce}`;
  const slug = `deleted-proof-${nonce}`.slice(0, 62);
  let userId = null;
  let storagePath = null;
  let completed = false;

  await client.connect();
  try {
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: EXERCISE_VERSION },
    });
    if (created.error || !created.data.user) {
      throw new Error(`Disposable Auth user creation failed: ${created.error?.message ?? 'missing user'}`);
    }
    userId = created.data.user.id;

    await client.query(
      `insert into public.public_profiles (
         user_id, slug, display_name, public_profile_enabled, vault_sharing_enabled
       ) values ($1::uuid, $2, 'Release deletion proof', false, false)`,
      [userId, slug],
    );
    storagePath = `profiles/${userId}/avatar/current`;
    const upload = await service.storage
      .from('profile-media')
      .upload(storagePath, new TextEncoder().encode('account-deletion-proof'), {
        contentType: 'application/octet-stream',
        upsert: false,
      });
    if (upload.error) throw new Error(`Disposable Storage upload failed: ${upload.error.message}`);

    const plan = await buildAccountDeletionPlan({ userId, requestTicket });
    if (plan.decision.decision !== 'hard_delete_allowed') {
      throw new Error(`Disposable account unexpectedly routed to ${plan.decision.decision}.`);
    }
    const profileReference = plan.references.find(
      (row) => row.key === 'public.public_profiles.user_id',
    );
    if (Number(profileReference?.row_count) !== 1) throw new Error('Representative profile row was not inventoried.');
    if (plan.storage.reduce((sum, row) => sum + Number(row.object_count), 0) !== 1) {
      throw new Error('Representative Storage object was not inventoried.');
    }

    process.env.GROOKAI_ACCOUNT_DELETION_ACK = plan.plan_sha256;
    const applied = await executeHardDelete({
      userId,
      requestTicket,
      expectedPlanSha256: plan.plan_sha256,
    });
    delete process.env.GROOKAI_ACCOUNT_DELETION_ACK;
    completed = true;

    const report = {
      version: EXERCISE_VERSION,
      worker_version: WORKER_VERSION,
      generated_at: new Date().toISOString(),
      status: 'passed',
      target_fingerprint: plan.target_fingerprint,
      request_ticket_hash: plan.request_ticket_hash,
      dry_run_decision: plan.decision.decision,
      plan_sha256: plan.plan_sha256,
      fixture: {
        profile_rows: Number(profileReference.row_count),
        storage_objects: 1,
        public_profile_enabled: false,
      },
      readback: {
        auth_user_absent: applied.auth_user_absent,
        direct_reference_rows_remaining: applied.direct_reference_rows_remaining,
        storage_objects_remaining: applied.storage_objects_remaining,
      },
      boundaries: {
        disposable_account_created_by_execution: true,
        real_user_touched: false,
        raw_user_id_persisted: false,
        raw_email_persisted: false,
        password_persisted: false,
        credentials_persisted: false,
        retained_history_path_proven: false,
      },
    };
    const artifactDirectory = await writeArtifacts(report);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      target_fingerprint: report.target_fingerprint,
      dry_run_decision: report.dry_run_decision,
      artifact_directory: artifactDirectory,
    }, null, 2)}\n`);
  } finally {
    delete process.env.GROOKAI_ACCOUNT_DELETION_ACK;
    if (!completed && userId) {
      if (storagePath) await service.storage.from('profile-media').remove([storagePath]).catch(() => {});
      await service.auth.admin.deleteUser(userId, false).catch(() => {});
    }
    await client.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
