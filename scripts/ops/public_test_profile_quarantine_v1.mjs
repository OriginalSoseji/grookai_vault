import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const { Client } = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), envPath), override: false, quiet: true });
}

export const VERSION = 'PUBLIC_TEST_PROFILE_QUARANTINE_V1';
export const TARGET_SLUGS = Object.freeze([
  'codex-gvvi-owner-1774463786566',
  'codex-gvvi-owner-1774463886468',
  'codex-gvvi-owner-1774463985119',
  'codex-gvvi-owner-1774464043211',
  'codex-gvvi-pricing-owner-1774458143573',
  'codex-gvvi-pricing-owner-1774459372226',
  'codex-gvvi-pricing-owner-1774460624132',
  'codex-gvvi-pricing-owner-1774460655456',
  'codex-live-owner-20260422171853-765bcb',
  'codex-live-viewer-20260422171853-765bcb',
  'codexp3buyer90925214',
  'codexp3buyer90981826',
  'codexp3buyer91021024',
  'codexp3buyer91104708',
  'codexp3seller90925214',
  'codexp3seller90981826',
  'codexp3seller91021024',
  'codexp3seller91104708',
  'e7-a',
  'e7-b',
  'e7-c',
  'p3-owner-1774390607510',
  'removal-owner-1774471395814',
  'removal-owner-1774471567432',
  'route-owner-1774471662399',
]);

const APPLY = process.argv.includes('--apply');
const OUT_DIR = path.resolve(
  process.cwd(),
  'docs/audits/release_completion_v1/public_test_profile_quarantine',
);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function buildMutationContract() {
  return {
    version: VERSION,
    targets: [...TARGET_SLUGS],
    mutation: {
      table: 'public.public_profiles',
      public_profile_enabled: false,
      vault_sharing_enabled: false,
      delete_rows: false,
      delete_accounts: false,
      mutate_vault_rows: false,
    },
  };
}

export function mutationContractHash() {
  return sha256(JSON.stringify(buildMutationContract()));
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
}

async function readTargets(client, { lock = false } = {}) {
  const result = await client.query(
    `select
       user_id::text,
       slug,
       display_name,
       public_profile_enabled,
       vault_sharing_enabled,
       created_at,
       updated_at
     from public.public_profiles
     where slug = any($1::text[])
     order by slug
     ${lock ? 'for update' : ''}`,
    [TARGET_SLUGS],
  );
  return result.rows;
}

async function countEnabledNonTargets(client) {
  const result = await client.query(
    `select count(*)::int as enabled_count
     from public.public_profiles
     where public_profile_enabled = true
       and not (slug = any($1::text[]))`,
    [TARGET_SLUGS],
  );
  return Number(result.rows[0]?.enabled_count ?? -1);
}

function assertExactTargets(rows) {
  const slugs = rows.map((row) => row.slug);
  if (rows.length !== TARGET_SLUGS.length) {
    throw new Error(`Expected ${TARGET_SLUGS.length} target profiles; found ${rows.length}.`);
  }
  if (JSON.stringify(slugs) !== JSON.stringify(TARGET_SLUGS)) {
    throw new Error('Target profile set or ordering changed.');
  }
}

function assertQuarantined(rows) {
  const visible = rows.filter(
    (row) => row.public_profile_enabled === true || row.vault_sharing_enabled === true,
  );
  if (visible.length > 0) {
    throw new Error(`Expected every target to be private; ${visible.length} remain exposed.`);
  }
}

async function writeReport(report) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const fileName = APPLY ? 'apply_v1.json' : 'dry_run_v1.json';
  const outputPath = path.join(OUT_DIR, fileName);
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return path.relative(process.cwd(), outputPath).replaceAll('\\', '/');
}

async function main() {
  const url = connectionString();
  if (!url) throw new Error('A PostgreSQL connection string is required.');

  const contractHash = mutationContractHash();
  if (APPLY && process.env.GROOKAI_PUBLIC_TEST_PROFILE_QUARANTINE_ACK !== contractHash) {
    throw new Error(`Apply requires GROOKAI_PUBLIC_TEST_PROFILE_QUARANTINE_ACK=${contractHash}`);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    application_name: 'public-test-profile-quarantine-v1',
  });

  let before;
  let after = [];
  let enabledNonTargetsBefore;
  let enabledNonTargetsAfter;
  await client.connect();
  try {
    await client.query(APPLY ? 'begin' : 'begin read only');
    await client.query("set local statement_timeout = '30s'");
    before = await readTargets(client, { lock: APPLY });
    assertExactTargets(before);
    enabledNonTargetsBefore = await countEnabledNonTargets(client);

    if (APPLY) {
      await client.query(
        `update public.public_profiles
         set public_profile_enabled = false,
             vault_sharing_enabled = false,
             updated_at = now()
         where slug = any($1::text[])`,
        [TARGET_SLUGS],
      );
      after = await readTargets(client);
      assertExactTargets(after);
      assertQuarantined(after);
      enabledNonTargetsAfter = await countEnabledNonTargets(client);
      if (enabledNonTargetsAfter !== enabledNonTargetsBefore) {
        throw new Error('A non-target public profile changed during quarantine.');
      }
      await client.query('commit');
    } else {
      await client.query('rollback');
    }
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const report = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry_run',
    mutation_contract_sha256: contractHash,
    target_count: TARGET_SLUGS.length,
    db_writes_performed: APPLY,
    rows_deleted: 0,
    accounts_deleted: 0,
    vault_rows_mutated: 0,
    enabled_non_target_profiles_before: enabledNonTargetsBefore,
    enabled_non_target_profiles_after: APPLY ? enabledNonTargetsAfter : null,
    before,
    after,
    recovery_payload: before.map((row) => ({
      user_id: row.user_id,
      slug: row.slug,
      public_profile_enabled: row.public_profile_enabled,
      vault_sharing_enabled: row.vault_sharing_enabled,
    })),
  };
  report.artifact_sha256 = sha256(JSON.stringify(report));
  const artifact = await writeReport(report);
  process.stdout.write(`${JSON.stringify({
    mode: report.mode,
    target_count: report.target_count,
    mutation_contract_sha256: contractHash,
    enabled_non_target_profiles_before: enabledNonTargetsBefore,
    enabled_non_target_profiles_after: report.enabled_non_target_profiles_after,
    artifact,
  }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
