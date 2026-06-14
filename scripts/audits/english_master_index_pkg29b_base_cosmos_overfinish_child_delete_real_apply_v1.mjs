import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE';
const APPROVED_FINGERPRINT = '141eb3c42c6c0218db926e01ff72105bd6b200c839f3cd1d092bbfbb6683ef74';
const APPROVED_SQL_HASH = '15d12abbe17df4fe7e1c0849c576fb5543fbd93fa7837c3102e9dca014ac257d';
const APPROVED_SCOPE = {
  target_rows: 4,
  child_deletes_in_dry_run: 4,
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function assertScope(actual) {
  for (const [key, expected] of Object.entries(APPROVED_SCOPE)) {
    assertEqual(`scope.${key}`, Number(actual?.[key] ?? Number.NaN), expected);
  }
}

function buildRealApplySql(dryRunSql) {
  if (!/\nrollback;\s*$/i.test(dryRunSql)) {
    throw new Error('Refusing real apply: source SQL does not end with rollback');
  }
  if (/commit;\s*$/i.test(dryRunSql)) {
    throw new Error('Refusing real apply: source SQL already ends with commit');
  }
  return dryRunSql.replace(/\nrollback;\s*$/i, '\ncommit;\n');
}

async function capturePostApplyProof(client, rows) {
  const childIds = rows.map((row) => row.card_printing_id);
  const remainingChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = any($1::uuid[])`,
    [childIds],
  );
  const remainingMappings = await client.query(
    `select count(*)::int as count
     from public.external_printing_mappings
     where card_printing_id = any($1::uuid[])`,
    [childIds],
  );
  const remainingVaultRefs = await client.query(
    `select count(*)::int as count
     from public.vault_item_instances
     where card_printing_id = any($1::uuid[])
       and archived_at is null`,
    [childIds],
  );
  const remainingWarehouseRefs = await client.query(
    `select count(*)::int as count
     from public.canon_warehouse_candidates
     where promoted_card_printing_id = any($1::uuid[])`,
    [childIds],
  );
  return {
    target_children_remaining: Number(remainingChildren.rows[0]?.count ?? 0),
    external_mappings_remaining: Number(remainingMappings.rows[0]?.count ?? 0),
    active_vault_refs_remaining: Number(remainingVaultRefs.rows[0]?.count ?? 0),
    warehouse_refs_remaining: Number(remainingWarehouseRefs.rows[0]?.count ?? 0),
  };
}

async function executeRealApply(artifact) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const dryRunSql = await fs.readFile(artifact.sql_path, 'utf8');
  const dryRunHash = sha256(dryRunSql);
  assertEqual('sql_hash', dryRunHash, APPROVED_SQL_HASH);
  const realApplySql = buildRealApplySql(dryRunSql);
  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(realApplySql);
    const postApplyProof = await capturePostApplyProof(client, artifact.rows);
    return {
      apply_status: 'pkg29b_real_apply_committed',
      committed: true,
      dry_run_sql_hash: dryRunHash,
      real_apply_sql_hash: sha256(realApplySql),
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
      post_apply_proof: postApplyProof,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-29B Base Cosmos Overfinish Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-29B scope only.

No migrations were created. No parent writes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['child_deletes', report.summary.child_deletes],
    ['target_children_remaining', report.execution.post_apply_proof.target_children_remaining],
    ['external_mappings_remaining', report.execution.post_apply_proof.external_mappings_remaining],
    ['active_vault_refs_remaining', report.execution.post_apply_proof.active_vault_refs_remaining],
    ['warehouse_refs_remaining', report.execution.post_apply_proof.warehouse_refs_remaining],
  ])}
`;
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  assertEqual('package_id', artifact.package_id, APPROVED_PACKAGE_ID);
  assertEqual('fingerprint', artifact.fingerprint, APPROVED_FINGERPRINT);
  assertEqual('artifact.sql_hash', artifact.sql_hash, APPROVED_SQL_HASH);
  assertScope(artifact.summary);

  const execution = await executeRealApply(artifact);
  const proof = execution.post_apply_proof;
  assertEqual('post_apply.target_children_remaining', proof.target_children_remaining, 0);
  assertEqual('post_apply.external_mappings_remaining', proof.external_mappings_remaining, 0);
  assertEqual('post_apply.active_vault_refs_remaining', proof.active_vault_refs_remaining, 0);
  assertEqual('post_apply.warehouse_refs_remaining', proof.warehouse_refs_remaining, 0);

  const report = {
    package_id: artifact.package_id,
    generated_at: new Date().toISOString(),
    fingerprint: artifact.fingerprint,
    artifact_json: path.relative(process.cwd(), ARTIFACT_JSON),
    safety: {
      no_global_apply: true,
      migrations_created: false,
      parent_writes: false,
      merges: false,
      quarantine: false,
    },
    summary: {
      child_deletes: APPROVED_SCOPE.child_deletes_in_dry_run,
    },
    execution,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    execution,
  }, null, 2));
}

await main();
