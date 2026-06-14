import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE';
const APPROVED_FINGERPRINT = '9a4b671f19abe698262b55d2c5d9cbe7dc3ab068b74146e2341489de5cfea9ee';
const APPROVED_SQL_HASH = '66f084dc988ddc87bb02f008c3141e4049b763af761d319e08fe1e9f38f887bf';
const APPROVED_SCOPE = {
  target_rows: 4,
  mapping_transfers: 4,
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
  const sourceChildIds = rows.map((row) => row.card_printing_id);
  const targetChildIds = rows.map((row) => row.target.target_card_printing_id);
  const mappingIds = rows.map((row) => row.external_mappings[0].id);
  const sourceChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = any($1::uuid[])`,
    [sourceChildIds],
  );
  const targetChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = any($1::uuid[])`,
    [targetChildIds],
  );
  const movedMappings = await client.query(
    `select count(*)::int as count
     from public.external_printing_mappings em
     join unnest($1::uuid[], $2::uuid[]) as target(mapping_id, target_card_printing_id)
       on target.mapping_id = em.id
      and target.target_card_printing_id = em.card_printing_id`,
    [mappingIds, targetChildIds],
  );
  const sourceMappingRefs = await client.query(
    `select count(*)::int as count
     from public.external_printing_mappings
     where card_printing_id = any($1::uuid[])`,
    [sourceChildIds],
  );
  return {
    source_children_remaining: Number(sourceChildren.rows[0]?.count ?? 0),
    target_children_present: Number(targetChildren.rows[0]?.count ?? 0),
    mappings_moved_to_targets: Number(movedMappings.rows[0]?.count ?? 0),
    mappings_remaining_on_source_children: Number(sourceMappingRefs.rows[0]?.count ?? 0),
  };
}

async function executeRealApply(artifact) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const dryRunSql = await fs.readFile(artifact.sql_path, 'utf8');
  const dryRunHash = sha256(dryRunSql);
  assertEqual('sql_hash', dryRunHash, APPROVED_SQL_HASH);
  const realApplySql = buildRealApplySql(dryRunSql);
  const realApplySqlHash = sha256(realApplySql);
  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(realApplySql);
    const postApplyProof = await capturePostApplyProof(client, artifact.rows);
    return {
      apply_status: 'pkg28b_real_apply_committed',
      committed: true,
      dry_run_sql_hash: dryRunHash,
      real_apply_sql_hash: realApplySqlHash,
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
      post_apply_proof: postApplyProof,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-28B External Mapping Transfer Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-28B scope only.

No migrations were created. No parent writes, merges, quarantine, unsupported cleanup beyond the approved four child deletes, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['mapping_transfers', report.summary.mapping_transfers],
    ['child_deletes', report.summary.child_deletes],
    ['source_children_remaining', report.execution.post_apply_proof.source_children_remaining],
    ['target_children_present', report.execution.post_apply_proof.target_children_present],
    ['mappings_moved_to_targets', report.execution.post_apply_proof.mappings_moved_to_targets],
    ['mappings_remaining_on_source_children', report.execution.post_apply_proof.mappings_remaining_on_source_children],
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
  assertEqual('post_apply.source_children_remaining', proof.source_children_remaining, 0);
  assertEqual('post_apply.target_children_present', proof.target_children_present, APPROVED_SCOPE.target_rows);
  assertEqual('post_apply.mappings_moved_to_targets', proof.mappings_moved_to_targets, APPROVED_SCOPE.mapping_transfers);
  assertEqual('post_apply.mappings_remaining_on_source_children', proof.mappings_remaining_on_source_children, 0);

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
      mapping_transfers: APPROVED_SCOPE.mapping_transfers,
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
