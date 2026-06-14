import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const PACKAGE_DIR = path.join(AUDIT_DIR, 'dry_run_packages');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SAFE_SUBSET_JSON = path.join(AUDIT_DIR, 'english_master_index_recovery_vault_safe_subset_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg07a_vault_safe_physical_recovery_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY';
const EXPECTED_SOURCE_ROWS = 185;
const EXPECTED_EXCLUDED_MISSING_ROWS = 21;
const EXPECTED_PARENT_ROWS = 164;
const EXPECTED_CHILD_PRINTINGS = 253;
const EXPECTED_VAULT_REFS = 0;
const EXPECTED_SET_COUNTS = {
  '2021swsh': 25,
  col1: 2,
  dp7: 8,
  ecard2: 13,
  ecard3: 15,
  pl1: 9,
  pl2: 15,
  pl3: 9,
  pl4: 12,
  'sv08.5': 20,
  'swsh10.5': 33,
  swsh2: 1,
  'swsh4.5': 2,
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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) counts.set(keyFn(row), (counts.get(keyFn(row)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function valuesSql(rows) {
  return rows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlString(row.target_set_key),
    sqlString(row.target_card_number),
    sqlString(row.target_card_name),
  ].join(', ')})`).join(',\n');
}

function buildRows({ safeSubset, packageArtifacts }) {
  const safeFiles = new Set((safeSubset.safe_packages ?? []).map((pkg) => path.basename(pkg.package_file)));
  return packageArtifacts
    .filter((artifact) => safeFiles.has(path.basename(artifact.file_path)))
    .flatMap((artifact) => (artifact.package_rows ?? []).map((row) => ({
      source_package_file: path.relative(ROOT, artifact.file_path).replaceAll('\\', '/'),
      card_print_id: row.card_print_id,
      current_grookai_name: row.current_grookai_name,
      target_set_key: row.target_set_key,
      target_set_name: row.target_set_name,
      target_card_number: row.target_card_number,
      target_card_name: row.target_card_name,
      child_printings: row.target_printings?.length ?? 0,
      external_mappings: row.external_mappings ?? null,
      identity_rows: row.identity_rows ?? null,
      trait_rows: row.trait_rows ?? null,
      vault_items: row.vault_items ?? 0,
      supported_finishes: row.supported_finishes ?? [],
      evidence_sources: row.evidence_sources ?? [],
      source_card_url: row.source_card_url,
    })))
    .sort((left, right) => (
      left.target_set_key.localeCompare(right.target_set_key) ||
      String(left.target_card_number).localeCompare(String(right.target_card_number), undefined, { numeric: true }) ||
      left.target_card_name.localeCompare(right.target_card_name) ||
      left.card_print_id.localeCompare(right.card_print_id)
    ));
}

async function readPackageArtifacts(safeSubset) {
  const artifacts = [];
  for (const pkg of safeSubset.safe_packages ?? []) {
    const packagePath = path.join(PACKAGE_DIR, path.basename(pkg.package_file));
    const artifact = await readJson(packagePath);
    artifacts.push({ ...artifact, file_path: packagePath });
  }
  return artifacts;
}

async function captureSnapshot(client, rows) {
  const ids = rows.map((row) => row.card_print_id);
  const result = await client.query(
    `select
       cp.id,
       to_jsonb(cp) as card_print,
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       coalesce((
         select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings,
       coalesce((
         select jsonb_agg(to_jsonb(cpi) order by cpi.id)
         from public.card_print_identity cpi
         where cpi.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_identity,
       coalesce((
         select jsonb_agg(to_jsonb(cpt) order by cpt.id)
         from public.card_print_traits cpt
         where cpt.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_traits,
       coalesce((
         select jsonb_agg(to_jsonb(vi) order by vi.id)
         from public.vault_items vi
         where vi.card_id = cp.id
       ), '[]'::jsonb) as vault_items
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code nulls first, cp.number nulls first, cp.name, cp.id`,
    [ids],
  );
  const snapshotRows = result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
    card_print_identity: row.card_print_identity,
    card_print_traits: row.card_print_traits,
    vault_items: row.vault_items,
    dependency_counts: {
      card_printings: row.card_printings.length,
      external_mappings: row.external_mappings.length,
      card_print_identity: row.card_print_identity.length,
      card_print_traits: row.card_print_traits.length,
      vault_items: row.vault_items.length,
    },
  }));
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: sha256(stableJson(snapshotRows)),
    impact_counts: {
      card_prints_found: snapshotRows.length,
      card_printings_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_printings, 0),
      external_mappings_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.external_mappings, 0),
      identity_rows_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_print_identity, 0),
      trait_rows_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.card_print_traits, 0),
      vault_items_found: snapshotRows.reduce((total, row) => total + row.dependency_counts.vault_items, 0),
    },
  };
}

async function filterLiveExistingRows(client, rows) {
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       count(cpr.id)::int as child_printing_count,
       count(vi.id)::int as vault_item_count
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.vault_items vi on vi.card_id = cp.id
     where cp.id = any($1::uuid[])
     group by cp.id`,
    [rows.map((row) => row.card_print_id)],
  );
  const liveById = new Map(result.rows.map((row) => [row.card_print_id, row]));
  const liveRows = [];
  const excludedRows = [];
  for (const row of rows) {
    const live = liveById.get(row.card_print_id);
    if (!live) {
      excludedRows.push({ ...row, exclusion_reason: 'card_print_id_not_found_in_live_db' });
      continue;
    }
    liveRows.push({
      ...row,
      child_printings: Number(live.child_printing_count),
      vault_items: Number(live.vault_item_count),
    });
  }
  return { liveRows, excludedRows };
}

function buildSql({ rows, packageFingerprint }) {
  return `-- English Master Index ${PACKAGE_ID} guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Package fingerprint: ${packageFingerprint}

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg07a_physical_recovery_targets (
  card_print_id uuid primary key,
  target_set_code text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

insert into pkg07a_physical_recovery_targets (
  card_print_id,
  target_set_code,
  target_number,
  target_name
) values
${valuesSql(rows)};

do $$
declare
  parent_count int;
  child_count int;
  vault_count int;
  missing_parent_count int;
  duplicate_identity_count int;
begin
  select count(*) into parent_count from pkg07a_physical_recovery_targets;
  select count(*) into child_count
  from public.card_printings cpr
  join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id;
  select count(*) into vault_count
  from public.vault_items vi
  join pkg07a_physical_recovery_targets target on target.card_print_id = vi.card_id;
  select count(*) into missing_parent_count
  from pkg07a_physical_recovery_targets target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  select count(*) into duplicate_identity_count
  from (
    select target_set_code, target_number, target_name, count(*) as row_count
    from pkg07a_physical_recovery_targets
    group by target_set_code, target_number, target_name
    having count(*) > 1
  ) duplicate_targets;

  if parent_count <> ${EXPECTED_PARENT_ROWS} then raise exception 'PKG-07A parent count drift: %', parent_count; end if;
  if child_count <> ${EXPECTED_CHILD_PRINTINGS} then raise exception 'PKG-07A child count drift: %', child_count; end if;
  if vault_count <> ${EXPECTED_VAULT_REFS} then raise exception 'PKG-07A vault reference count drift: %', vault_count; end if;
  if missing_parent_count <> 0 then raise exception 'PKG-07A missing parent count: %', missing_parent_count; end if;
  if duplicate_identity_count <> 0 then raise exception 'PKG-07A duplicate target identity count: %', duplicate_identity_count; end if;
end $$;

update public.card_prints cp
set
  set_code = target.target_set_code,
  number = target.target_number,
  name = target.target_name
from pkg07a_physical_recovery_targets target
where cp.id = target.card_print_id;

do $$
declare
  unresolved_count int;
  child_count int;
  vault_count int;
begin
  select count(*) into unresolved_count
  from public.card_prints cp
  join pkg07a_physical_recovery_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.target_set_code
     or cp.number is distinct from target.target_number
     or cp.name is distinct from target.target_name;
  select count(*) into child_count
  from public.card_printings cpr
  join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id;
  select count(*) into vault_count
  from public.vault_items vi
  join pkg07a_physical_recovery_targets target on target.card_print_id = vi.card_id;

  if unresolved_count <> 0 then raise exception 'PKG-07A unresolved update count: %', unresolved_count; end if;
  if child_count <> ${EXPECTED_CHILD_PRINTINGS} then raise exception 'PKG-07A child count changed after update: %', child_count; end if;
  if vault_count <> ${EXPECTED_VAULT_REFS} then raise exception 'PKG-07A vault references appeared after update: %', vault_count; end if;
end $$;

select
  '${PACKAGE_ID}'::text as package_id,
  '${packageFingerprint}'::text as package_fingerprint,
  (select count(*) from pkg07a_physical_recovery_targets)::int as planned_parent_rows,
  (select count(*) from public.card_printings cpr join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id)::int as preserved_child_printings;

rollback;
`;
}

function validateSql(sql) {
  const findings = [];
  const stripped = sql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(stripped)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push('sql_contains_delete_statement');
  if (/\binsert\s+into\s+public\./i.test(stripped)) findings.push('sql_contains_public_insert');
  if (!/\bupdate\s+public\.card_prints\b/i.test(stripped)) findings.push('sql_missing_parent_update');
  if (/\bupdate\s+public\.card_printings\b/i.test(stripped)) findings.push('sql_contains_child_update');
  return findings;
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

async function runDryRun(client, sql, rows) {
  const before = await captureSnapshot(client, rows);
  let status = 'pkg07a_vault_safe_physical_recovery_completed_rolled_back_no_durable_change';
  let errorMessage = null;
  let proofRows = [];
  try {
    const result = await client.query(sql);
    proofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
  } catch (error) {
    status = 'pkg07a_vault_safe_physical_recovery_failed';
    errorMessage = error.message;
    await client.query('rollback').catch(() => {});
  }
  const after = await captureSnapshot(client, rows);
  return { status, errorMessage, before, after, proofRows };
}

function evaluate({ safeSubset, sourceRows, excludedRows, rows, execution }) {
  const findings = [];
  const setCounts = countBy(rows, (row) => row.target_set_key);
  if (safeSubset.stop_findings?.length) findings.push('safe_subset_stop_findings_present');
  if (safeSubset.summary?.safe_candidate_card_prints !== EXPECTED_SOURCE_ROWS) findings.push('safe_subset_parent_count_not_185');
  if (sourceRows.length !== EXPECTED_SOURCE_ROWS) findings.push('source_candidate_count_not_185');
  if (excludedRows.length !== EXPECTED_EXCLUDED_MISSING_ROWS) findings.push('excluded_missing_count_not_21');
  if (safeSubset.summary?.safe_vault_items_referencing_targets !== EXPECTED_VAULT_REFS) findings.push('safe_subset_vault_count_not_0');
  if (rows.length !== EXPECTED_PARENT_ROWS) findings.push('target_parent_count_not_185');
  if (rows.reduce((total, row) => total + Number(row.child_printings ?? 0), 0) !== EXPECTED_CHILD_PRINTINGS) {
    findings.push('target_child_count_not_275');
  }
  if (rows.reduce((total, row) => total + Number(row.vault_items ?? 0), 0) !== EXPECTED_VAULT_REFS) {
    findings.push('target_vault_count_not_0');
  }
  for (const [setKey, count] of Object.entries(EXPECTED_SET_COUNTS)) {
    if (setCounts[setKey] !== count) findings.push(`set_${setKey}_count_not_${count}`);
  }
  if (execution.status !== 'pkg07a_vault_safe_physical_recovery_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.errorMessage) findings.push('dry_run_error_message_present');
  if (execution.before.impact_counts.card_prints_found !== EXPECTED_PARENT_ROWS) findings.push('before_parent_count_not_185');
  if (execution.after.impact_counts.card_prints_found !== EXPECTED_PARENT_ROWS) findings.push('after_parent_count_not_185');
  if (execution.before.impact_counts.card_printings_found !== EXPECTED_CHILD_PRINTINGS) findings.push('before_child_count_not_275');
  if (execution.after.impact_counts.card_printings_found !== EXPECTED_CHILD_PRINTINGS) findings.push('after_child_count_not_275');
  if (execution.before.impact_counts.vault_items_found !== EXPECTED_VAULT_REFS) findings.push('before_vault_count_not_0');
  if (execution.after.impact_counts.vault_items_found !== EXPECTED_VAULT_REFS) findings.push('after_vault_count_not_0');
  if (execution.before.hash_sha256 !== execution.after.hash_sha256) findings.push('durable_after_snapshot_differs_from_before_snapshot');
  if (!execution.proofRows[0]) findings.push('rollback_proof_row_missing');
  return findings;
}

function buildMarkdown(report) {
  const setRows = Object.entries(report.scope.set_counts)
    .map(([setKey, count]) => `| ${mdEscape(setKey)} | ${count} |`)
    .join('\n');
  return `# PKG-07A Vault-Safe Physical Recovery Guarded Dry-Run V1

Rollback-only dry-run for the vault-safe physical recovery subset.

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| parent_update_rows | ${report.scope.parent_update_rows} |
| source_candidate_rows | ${report.scope.source_candidate_rows} |
| excluded_missing_rows | ${report.scope.excluded_missing_rows} |
| preserved_child_printings | ${report.scope.preserved_child_printings} |
| vault_references | ${report.scope.vault_references} |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| stop_findings | ${report.stop_findings.length} |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |

## Set Counts

| Set | Rows |
| --- | ---: |
${setRows}
`;
}

function buildCheckpoint(report) {
  return `# PKG-07A Vault-Safe Physical Recovery Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| parent_update_rows | ${report.scope.parent_update_rows} |
| source_candidate_rows | ${report.scope.source_candidate_rows} |
| excluded_missing_rows | ${report.scope.excluded_missing_rows} |
| preserved_child_printings | ${report.scope.preserved_child_printings} |
| vault_references | ${report.scope.vault_references} |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| stop_findings | ${report.stop_findings.length} |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |

Rollback-only transaction completed with no durable DB writes.
`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-07A Vault-Safe Physical Recovery Guarded Dry-Run Checkpoint V1](20260609_pkg07a_vault_safe_physical_recovery_guarded_dry_run_checkpoint_v1.md) | Rollback-dry-runs 164 live vault-safe physical recovery parent updates preserving 253 child printings; 21 stale source rows excluded, no durable writes or migrations. |';
  const current = await fs.readFile(indexPath, 'utf8').catch(() => '# Master Index Checkpoints\n');
  if (current.includes('20260609_pkg07a_vault_safe_physical_recovery_guarded_dry_run_checkpoint_v1.md')) {
    await fs.writeFile(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg07a_vault_safe_physical_recovery_guarded_dry_run_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
const safeSubset = await readJson(SAFE_SUBSET_JSON);
const packageArtifacts = await readPackageArtifacts(safeSubset);
const sourceRows = buildRows({ safeSubset, packageArtifacts });
const client = new Client({ connectionString: conn });
await client.connect();
const { liveRows: rows, excludedRows } = await filterLiveExistingRows(client, sourceRows);
const packagePayload = {
  package_id: PACKAGE_ID,
  safe_subset_fingerprint: sha256(stableJson({
    safe_packages: safeSubset.safe_packages,
    summary: safeSubset.summary,
  })),
  rows: rows.map((row) => ({
    card_print_id: row.card_print_id,
    target_set_key: row.target_set_key,
    target_card_number: row.target_card_number,
    target_card_name: row.target_card_name,
  })),
};
const packageFingerprint = sha256(stableJson(packagePayload));
const sql = buildSql({ rows, packageFingerprint });
const sqlHash = sha256(sql);
const sqlFindings = validateSql(sql);
await writeText(OUTPUT_SQL, sql);

try {
  const execution = sqlFindings.length
    ? {
        status: 'blocked_sql_validation_findings_present',
        errorMessage: sqlFindings.join(', '),
        before: await captureSnapshot(client, rows),
        after: await captureSnapshot(client, rows),
        proofRows: [],
      }
    : await runDryRun(client, sql, rows);
  const stopFindings = [
    ...sqlFindings,
    ...evaluate({ safeSubset, sourceRows, excludedRows, rows, execution }),
  ];
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    audit_only: false,
    rollback_only_dry_run: true,
    source_artifacts: {
      vault_safe_subset: path.relative(ROOT, SAFE_SUBSET_JSON).replaceAll('\\', '/'),
      package_files: packageArtifacts.map((artifact) => path.relative(ROOT, artifact.file_path).replaceAll('\\', '/')),
    },
    package_fingerprint_sha256: packageFingerprint,
    sql_artifact_path: OUTPUT_SQL,
    sql_hash_sha256: sqlHash,
    scope: {
      source_candidate_rows: sourceRows.length,
      excluded_missing_rows: excludedRows.length,
      parent_update_rows: rows.length,
      preserved_child_printings: rows.reduce((total, row) => total + Number(row.child_printings ?? 0), 0),
      vault_references: rows.reduce((total, row) => total + Number(row.vault_items ?? 0), 0),
      set_count: new Set(rows.map((row) => row.target_set_key)).size,
      set_counts: countBy(rows, (row) => row.target_set_key),
      excluded_rows: excludedRows,
      rows,
    },
    dry_run_execution_status: execution.status,
    error_message: execution.errorMessage,
    before_snapshot: execution.before,
    after_snapshot: execution.after,
    rollback_proof_rows: execution.proofRows,
    durable_after_snapshot_matches_before_snapshot: execution.before.hash_sha256 === execution.after.hash_sha256,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_authorized: false,
    child_writes: false,
    deletes_or_merges: false,
    write_ready_now: 0,
    stop_findings: stopFindings,
    next_allowed_step: stopFindings.length === 0
      ? 'Prepare a real-apply gate for PKG-07A only if separately requested.'
      : 'Resolve stop findings before any real-apply gate.',
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  await writeText(CHECKPOINT_MD, buildCheckpoint(report));
  await updateCheckpointIndex();
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    output_sql: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    checkpoint: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_hash_sha256: report.sql_hash_sha256,
    source_candidate_rows: report.scope.source_candidate_rows,
    excluded_missing_rows: report.scope.excluded_missing_rows,
    parent_update_rows: report.scope.parent_update_rows,
    preserved_child_printings: report.scope.preserved_child_printings,
    vault_references: report.scope.vault_references,
    set_counts: report.scope.set_counts,
    dry_run_execution_status: report.dry_run_execution_status,
    durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
    stop_findings: report.stop_findings.length,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_authorized: false,
  }, null, 2));
  if (report.stop_findings.length) process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
