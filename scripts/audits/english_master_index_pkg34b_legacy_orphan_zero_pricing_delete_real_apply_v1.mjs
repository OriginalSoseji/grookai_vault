import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE';
const APPROVED_FINGERPRINT = 'cf3b0e774dc617aff711c67826c4ade5485e6beb2e18c396bdbc603a2099997b';
const APPROVED_SQL_HASH = 'a00c8e21d85fc49ba606610975e843424f50b6715541a52a620e7028b90c923f';
const APPROVED_SCOPE = {
  target_rows: 2,
  pricing_dependency_deletes_in_dry_run: 8,
  species_mapping_deletes_in_dry_run: 2,
  child_deletes_in_dry_run: 2,
  parent_deletes_in_dry_run: 2,
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
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
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
  const speciesIds = rows.map((row) => row.species_mapping_id);
  const curveIds = rows.map((row) => row.price_curve_id);
  const snapshotIds = rows.map((row) => row.ebay_snapshot_id);
  const jobIds = rows.map((row) => row.pricing_job_id);

  const queries = await Promise.all([
    client.query('select count(*)::int as count from public.card_prints where id = any($1::uuid[])', [parentIds]),
    client.query('select count(*)::int as count from public.card_printings where id = any($1::uuid[])', [childIds]),
    client.query('select count(*)::int as count from public.card_print_species where id = any($1::uuid[]) or card_print_id = any($2::uuid[])', [speciesIds, parentIds]),
    client.query('select count(*)::int as count from public.card_print_price_curves where id = any($1::uuid[]) or card_print_id = any($2::uuid[])', [curveIds, parentIds]),
    client.query('select count(*)::int as count from public.ebay_active_price_snapshots where id = any($1::uuid[]) or card_print_id = any($2::uuid[])', [snapshotIds, parentIds]),
    client.query('select count(*)::int as count from public.ebay_active_prices_latest where card_print_id = any($1::uuid[])', [parentIds]),
    client.query('select count(*)::int as count from public.pricing_jobs where id = any($1::uuid[]) or card_print_id = any($2::uuid[])', [jobIds, parentIds]),
    client.query("select count(*)::int as count from public.card_prints cp join public.card_printings cpr on cpr.card_print_id = cp.id where cp.set_code = 'legacy_orphan'"),
  ]);

  return {
    target_parents_remaining: Number(queries[0].rows[0]?.count ?? 0),
    target_children_remaining: Number(queries[1].rows[0]?.count ?? 0),
    target_species_refs_remaining: Number(queries[2].rows[0]?.count ?? 0),
    price_curve_refs_remaining: Number(queries[3].rows[0]?.count ?? 0),
    ebay_snapshot_refs_remaining: Number(queries[4].rows[0]?.count ?? 0),
    ebay_latest_refs_remaining: Number(queries[5].rows[0]?.count ?? 0),
    pricing_job_refs_remaining: Number(queries[6].rows[0]?.count ?? 0),
    legacy_orphan_child_rows_remaining: Number(queries[7].rows[0]?.count ?? 0),
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
      apply_status: 'pkg34b_real_apply_committed',
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
  return `# PKG-34B Legacy Orphan Zero Pricing Delete Real Apply V1

Real apply completed for the explicitly approved PKG-34B scope only.

No migrations were created. No merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['pricing_dependency_deletes', report.summary.pricing_dependency_deletes],
    ['species_mapping_deletes', report.summary.species_mapping_deletes],
    ['child_deletes', report.summary.child_deletes],
    ['parent_deletes', report.summary.parent_deletes],
    ['legacy_orphan_child_rows_remaining', report.execution.post_apply_proof.legacy_orphan_child_rows_remaining],
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
  for (const [key, value] of Object.entries(proof)) assertEqual(`post_apply.${key}`, value, 0);

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
    execution,
    summary: {
      pricing_dependency_deletes: artifact.summary.pricing_dependency_deletes_in_dry_run,
      species_mapping_deletes: artifact.summary.species_mapping_deletes_in_dry_run,
      child_deletes: artifact.summary.child_deletes_in_dry_run,
      parent_deletes: artifact.summary.parent_deletes_in_dry_run,
    },
    rows: artifact.rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    dry_run_sql_hash: execution.dry_run_sql_hash,
    real_apply_sql_hash: execution.real_apply_sql_hash,
    post_apply_proof: execution.post_apply_proof,
  }, null, 2));
}

await main();
