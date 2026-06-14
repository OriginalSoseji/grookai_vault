import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE';
const APPROVED_FINGERPRINT = '3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911';
const APPROVED_SQL_HASH = '3a65a8e5b08c61eb7ec23d815d7d2dd0be13aa028400a7ae20f3db076bfdb4a8';
const APPROVED_SCOPE = {
  target_rows: 40,
  mapping_transfers_in_dry_run: 40,
  source_child_deletes_in_dry_run: 40,
  h_number_external_id: 20,
  trainer_gallery_external_id: 20,
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

function assertScope(summary) {
  assertEqual('scope.target_rows', Number(summary.target_rows), APPROVED_SCOPE.target_rows);
  assertEqual('scope.mapping_transfers_in_dry_run', Number(summary.mapping_transfers_in_dry_run), APPROVED_SCOPE.mapping_transfers_in_dry_run);
  assertEqual('scope.source_child_deletes_in_dry_run', Number(summary.source_child_deletes_in_dry_run), APPROVED_SCOPE.source_child_deletes_in_dry_run);
  assertEqual('scope.h_number_external_id', Number(summary.by_target_rule?.h_number_external_id ?? 0), APPROVED_SCOPE.h_number_external_id);
  assertEqual('scope.trainer_gallery_external_id', Number(summary.by_target_rule?.trainer_gallery_external_id ?? 0), APPROVED_SCOPE.trainer_gallery_external_id);
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
  const sourceChildIds = rows.map((row) => row.source.card_printing_id);
  const targetChildIds = rows.map((row) => row.target_child.card_printing_id);
  const mappingIds = rows.map((row) => row.external_mapping.id);

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
  const targetMappingRefs = await client.query(
    `select count(*)::int as count
     from public.external_printing_mappings
     where id = any($1::uuid[])
       and meta->>'pkg31b_package_fingerprint' = $2`,
    [mappingIds, APPROVED_FINGERPRINT],
  );

  return {
    source_children_remaining: Number(sourceChildren.rows[0]?.count ?? 0),
    target_children_present: Number(targetChildren.rows[0]?.count ?? 0),
    mappings_moved_to_targets: Number(movedMappings.rows[0]?.count ?? 0),
    mappings_remaining_on_source_children: Number(sourceMappingRefs.rows[0]?.count ?? 0),
    mappings_with_pkg31b_meta: Number(targetMappingRefs.rows[0]?.count ?? 0),
  };
}

async function executeRealApply(artifact) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const dryRunSql = await fs.readFile(artifact.sql_path, 'utf8');
  const dryRunHash = sha256(dryRunSql);
  assertEqual('dry_run_sql_hash', dryRunHash, APPROVED_SQL_HASH);
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
      apply_status: 'pkg31b_real_apply_committed',
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
  return `# PKG-31B External ID Relocation Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-31B scope only.

No migrations were created. No parent writes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['mapping_transfers', report.summary.mapping_transfers],
    ['source_child_deletes', report.summary.source_child_deletes],
    ['source_children_remaining', report.execution.post_apply_proof.source_children_remaining],
    ['target_children_present', report.execution.post_apply_proof.target_children_present],
    ['mappings_moved_to_targets', report.execution.post_apply_proof.mappings_moved_to_targets],
    ['mappings_remaining_on_source_children', report.execution.post_apply_proof.mappings_remaining_on_source_children],
    ['mappings_with_pkg31b_meta', report.execution.post_apply_proof.mappings_with_pkg31b_meta],
  ])}
`;
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  assertEqual('package_id', artifact.package_id, APPROVED_PACKAGE_ID);
  assertEqual('fingerprint', artifact.fingerprint, APPROVED_FINGERPRINT);
  assertEqual('artifact.sql_hash', artifact.sql_hash, APPROVED_SQL_HASH);
  assertScope(artifact.summary);
  if (artifact.execution?.committed !== false) {
    throw new Error('Refusing real apply: dry-run artifact does not prove committed=false');
  }

  const execution = await executeRealApply(artifact);
  const proof = execution.post_apply_proof;
  assertEqual('post_apply.source_children_remaining', proof.source_children_remaining, 0);
  assertEqual('post_apply.target_children_present', proof.target_children_present, APPROVED_SCOPE.target_rows);
  assertEqual('post_apply.mappings_moved_to_targets', proof.mappings_moved_to_targets, APPROVED_SCOPE.mapping_transfers_in_dry_run);
  assertEqual('post_apply.mappings_remaining_on_source_children', proof.mappings_remaining_on_source_children, 0);
  assertEqual('post_apply.mappings_with_pkg31b_meta', proof.mappings_with_pkg31b_meta, APPROVED_SCOPE.mapping_transfers_in_dry_run);

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
      mapping_transfers: APPROVED_SCOPE.mapping_transfers_in_dry_run,
      source_child_deletes: APPROVED_SCOPE.source_child_deletes_in_dry_run,
      by_target_rule: artifact.summary.by_target_rule,
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
