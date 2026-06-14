import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-30B-STAMPED-ORPHAN-PARENT-CHILD-DELETE';
const APPROVED_FINGERPRINT = 'fed84a447d3b571213e3f3a2b600f56f4f2f60f37203a7c763d489cef1133d9f';
const APPROVED_SQL_HASH = '25aa20505da034121867cc5ffdc7a20143cce02361496702e75da230f0fc7738';
const APPROVED_SCOPE = {
  target_rows: 62,
  child_deletes_in_dry_run: 62,
  parent_deletes_in_dry_run: 62,
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
  const parentIds = rows.map((row) => row.card_print_id);
  const childIds = rows.map((row) => row.card_printing_id);
  const remainingParents = await client.query(
    `select count(*)::int as count
     from public.card_prints
     where id = any($1::uuid[])`,
    [parentIds],
  );
  const remainingChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = any($1::uuid[])`,
    [childIds],
  );
  const remainingExternalMappings = await client.query(
    `select count(*)::int as count
     from public.external_mappings
     where card_print_id = any($1::uuid[])`,
    [parentIds],
  );
  const remainingExternalPrintingMappings = await client.query(
    `select count(*)::int as count
     from public.external_printing_mappings
     where card_printing_id = any($1::uuid[])`,
    [childIds],
  );
  const remainingIdentityRows = await client.query(
    `select count(*)::int as count
     from public.card_print_identity
     where card_print_id = any($1::uuid[])
       and is_active is true`,
    [parentIds],
  );
  const remainingSpecies = await client.query(
    `select count(*)::int as count
     from public.card_print_species
     where card_print_id = any($1::uuid[])`,
    [parentIds],
  );
  const remainingWarehouseParentRefs = await client.query(
    `select count(*)::int as count
     from public.canon_warehouse_candidates
     where promoted_card_print_id = any($1::uuid[])`,
    [parentIds],
  );
  const remainingWarehouseChildRefs = await client.query(
    `select count(*)::int as count
     from public.canon_warehouse_candidates
     where promoted_card_printing_id = any($1::uuid[])`,
    [childIds],
  );
  const remainingVaultRefs = await client.query(
    `select count(*)::int as count
     from public.vault_item_instances
     where card_printing_id = any($1::uuid[])
       and archived_at is null`,
    [childIds],
  );
  return {
    target_parents_remaining: Number(remainingParents.rows[0]?.count ?? 0),
    target_children_remaining: Number(remainingChildren.rows[0]?.count ?? 0),
    external_mappings_remaining: Number(remainingExternalMappings.rows[0]?.count ?? 0),
    external_printing_mappings_remaining: Number(remainingExternalPrintingMappings.rows[0]?.count ?? 0),
    active_identity_rows_remaining: Number(remainingIdentityRows.rows[0]?.count ?? 0),
    species_refs_remaining: Number(remainingSpecies.rows[0]?.count ?? 0),
    warehouse_parent_refs_remaining: Number(remainingWarehouseParentRefs.rows[0]?.count ?? 0),
    warehouse_child_refs_remaining: Number(remainingWarehouseChildRefs.rows[0]?.count ?? 0),
    active_vault_refs_remaining: Number(remainingVaultRefs.rows[0]?.count ?? 0),
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
      apply_status: 'pkg30b_real_apply_committed',
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
  return `# PKG-30B Stamped Orphan Parent Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-30B scope only.

No migrations were created. No merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['parent_deletes', report.summary.parent_deletes],
    ['child_deletes', report.summary.child_deletes],
    ['target_parents_remaining', report.execution.post_apply_proof.target_parents_remaining],
    ['target_children_remaining', report.execution.post_apply_proof.target_children_remaining],
    ['external_mappings_remaining', report.execution.post_apply_proof.external_mappings_remaining],
    ['external_printing_mappings_remaining', report.execution.post_apply_proof.external_printing_mappings_remaining],
    ['active_identity_rows_remaining', report.execution.post_apply_proof.active_identity_rows_remaining],
    ['active_vault_refs_remaining', report.execution.post_apply_proof.active_vault_refs_remaining],
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
  for (const [key, value] of Object.entries(proof)) {
    assertEqual(`post_apply.${key}`, value, 0);
  }

  const report = {
    package_id: artifact.package_id,
    generated_at: new Date().toISOString(),
    fingerprint: artifact.fingerprint,
    artifact_json: path.relative(process.cwd(), ARTIFACT_JSON),
    safety: {
      no_global_apply: true,
      migrations_created: false,
      merges: false,
      quarantine: false,
    },
    summary: {
      child_deletes: APPROVED_SCOPE.child_deletes_in_dry_run,
      parent_deletes: APPROVED_SCOPE.parent_deletes_in_dry_run,
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
