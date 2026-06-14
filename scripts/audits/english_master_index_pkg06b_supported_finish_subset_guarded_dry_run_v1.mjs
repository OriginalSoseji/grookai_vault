import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_insert_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06b_supported_finish_subset_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06b_supported_finish_subset_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg06b_supported_finish_subset_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06b_supported_finish_subset_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS';
const SOURCE_READINESS_FINGERPRINT = '723fba910048e21e8f1df079f3269ecd4b81e3a441cdf2657f3f26d88666a9be';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';
const CREATED_BY = 'pkg06b_supported_finish_subset_dry_run_v1';

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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deterministicUuid(input) {
  const hex = sha256(input).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) counts.set(keyFn(row), (counts.get(keyFn(row)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    row.card_name,
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function buildRows(readiness) {
  return (readiness.recommended_bucket?.sets ?? [])
    .flatMap((set) => (set.rows ?? []).map((row) => ({
      card_printing_id: deterministicUuid(`${PACKAGE_ID}|${factKey(row)}|${row.target_card_print_id}`),
      card_print_id: row.target_card_print_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: normalizeFinishKey(row.finish_key),
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${normalizeFinishKey(row.finish_key)}`,
      created_by: CREATED_BY,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
      readiness_classification: row.classification,
      live_parent_match_count: row.live_parent_match_count,
    })))
    .sort((left, right) => (
      left.set_key.localeCompare(right.set_key) ||
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
      left.card_name.localeCompare(right.card_name) ||
      left.finish_key.localeCompare(right.finish_key)
    ));
}

async function queryFinishKeys(client) {
  const result = await client.query(
    `select key, label, is_active
     from public.finish_keys
     order by key`,
  );
  return result.rows;
}

async function captureTargetSnapshot(client, rows) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text,
         set_key text,
         card_number text,
         card_name text
       )
     ),
     distinct_parent as (
       select distinct card_print_id
       from target
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as target_card_printing_id
     from distinct_parent t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'existing_target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr
       on cpr.card_print_id = t.card_print_id
      and cpr.finish_key = t.finish_key
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'planned_id_collision' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr on cpr.id = t.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(rows)],
  );
  const snapshotRows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: sha256(stableJson(snapshotRows)),
    counts: {
      target_parent_rows: snapshotRows.filter((row) => row.row_type === 'target_parent').length,
      existing_target_child_rows: snapshotRows.filter((row) => row.row_type === 'existing_target_child').length,
      planned_id_collision_rows: snapshotRows.filter((row) => row.row_type === 'planned_id_collision').length,
      total_rows: snapshotRows.length,
    },
  };
}

function valuesSql(rows) {
  return rows.map((row) => `  (${[
    sqlUuid(row.card_printing_id),
    sqlUuid(row.card_print_id),
    sqlString(row.set_key),
    sqlString(row.card_number),
    sqlString(row.card_name),
    sqlString(row.finish_key),
    sqlString(row.provenance_source),
    sqlString(row.provenance_ref),
    sqlString(row.created_by),
  ].join(', ')})`).join(',\n');
}

function buildSql({ rows, packageFingerprint }) {
  const expectedChildren = rows.length;
  const expectedParents = new Set(rows.map((row) => row.card_print_id)).size;
  const expectedSets = new Set(rows.map((row) => row.set_key)).size;
  return `-- English Master Index ${PACKAGE_ID} guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: ${SOURCE_READINESS_FINGERPRINT}
-- Package fingerprint: ${packageFingerprint}

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06b_supported_child_printings (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg06b_supported_child_printings (
  card_printing_id,
  card_print_id,
  set_key,
  card_number,
  card_name,
  finish_key,
  provenance_source,
  provenance_ref,
  created_by
) values
${valuesSql(rows)};

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06b_supported_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06b_supported_child_printings;
  select count(distinct set_key) into set_count from pkg06b_supported_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06b_supported_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06b_supported_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06b_supported_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> ${expectedChildren} then raise exception 'PKG-06B child count drift: %', child_count; end if;
  if parent_count <> ${expectedParents} then raise exception 'PKG-06B parent count drift: %', parent_count; end if;
  if set_count <> ${expectedSets} then raise exception 'PKG-06B set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06B unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06B existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06B id collision count: %', id_collision_count; end if;
end $$;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by
)
select
  card_printing_id,
  card_print_id,
  finish_key,
  false,
  provenance_source,
  provenance_ref,
  created_by
from pkg06b_supported_child_printings;

select
  '${PACKAGE_ID}'::text as package_id,
  '${SOURCE_READINESS_FINGERPRINT}'::text as source_readiness_fingerprint,
  '${packageFingerprint}'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06b_supported_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06b_supported_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06b_supported_child_printings)::int as planned_child_rows;

rollback;
`;
}

function validateSql(sql) {
  const findings = [];
  const stripped = sql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(stripped)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push('sql_contains_delete_statement');
  if (/\bupdate\s+public\./i.test(stripped)) findings.push('sql_contains_update_statement');
  if (/\binsert\s+into\s+public\.sets\b/i.test(stripped)) findings.push('sql_contains_set_insert');
  if (/\binsert\s+into\s+public\.card_prints\b/i.test(stripped)) findings.push('sql_contains_parent_insert');
  if (/\binsert\s+into\s+public\.external/i.test(stripped)) findings.push('sql_contains_external_insert');
  if (!/\binsert\s+into\s+public\.card_printings\b/i.test(stripped)) findings.push('sql_missing_child_insert');
  return findings;
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

async function runDryRun(client, sql, rows) {
  const before = await captureTargetSnapshot(client, rows);
  let status = 'pkg06b_supported_finish_subset_completed_rolled_back_no_durable_change';
  let errorMessage = null;
  let proofRows = [];
  try {
    const result = await client.query(sql);
    proofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
  } catch (error) {
    status = 'pkg06b_supported_finish_subset_failed';
    errorMessage = error.message;
    await client.query('rollback').catch(() => {});
  }
  const after = await captureTargetSnapshot(client, rows);
  return { status, errorMessage, before, after, proofRows };
}

function evaluate({ readiness, supportedRows, blockedRows, activeFinishKeys, execution }) {
  const findings = [];
  if (readiness.package_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) findings.push('readiness_fingerprint_mismatch');
  if ((readiness.stop_findings ?? []).length !== 0) findings.push('readiness_stop_findings_present');
  if (supportedRows.length !== 120) findings.push('supported_child_count_not_120');
  if (new Set(supportedRows.map((row) => row.card_print_id)).size !== 120) findings.push('supported_parent_count_not_120');
  if (new Set(supportedRows.map((row) => row.set_key)).size !== 1) findings.push('supported_set_count_not_1');
  if (countBy(supportedRows, (row) => row.set_key).me03 !== 120) findings.push('supported_me03_count_not_120');
  if (countBy(supportedRows, (row) => row.finish_key).normal !== 65) findings.push('supported_normal_count_not_65');
  if (countBy(supportedRows, (row) => row.finish_key).holo !== 55) findings.push('supported_holo_count_not_55');
  if (blockedRows.length !== 268) findings.push('blocked_count_not_268');
  if (supportedRows.some((row) => !activeFinishKeys.has(row.finish_key))) findings.push('supported_contains_inactive_finish_key');
  if (execution.status !== 'pkg06b_supported_finish_subset_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.errorMessage) findings.push('dry_run_error_message_present');
  if (execution.before.counts.existing_target_child_rows !== 0) findings.push('before_existing_target_child_rows_present');
  if (execution.before.counts.planned_id_collision_rows !== 0) findings.push('before_id_collision_rows_present');
  if (execution.after.counts.existing_target_child_rows !== 0) findings.push('after_existing_target_child_rows_present_after_rollback');
  if (execution.after.counts.planned_id_collision_rows !== 0) findings.push('after_id_collision_rows_present_after_rollback');
  if (execution.before.hash_sha256 !== execution.after.hash_sha256) findings.push('durable_after_snapshot_differs_from_before_snapshot');
  if (!execution.proofRows[0]) findings.push('rollback_proof_row_missing');
  return findings;
}

function buildMarkdown(report) {
  return `# PKG-06B Supported Finish Subset Guarded Dry-Run V1

Rollback-only dry-run for the next DB-supported child-printing insert subset after PKG-06A apply.

## Safety

- real_apply_authorized: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent_writes: false
- deletes_or_merges: false

## Package

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_readiness_fingerprint_sha256 | \`${report.source_readiness_fingerprint_sha256}\` |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| stop_findings | ${report.stop_findings.length} |

## Supported Subset

${markdownTable(['metric', 'value'], [
  ['child_printing_rows', report.supported_subset.child_printing_rows],
  ['target_parent_rows', report.supported_subset.target_parent_rows],
  ['set_count', report.supported_subset.set_count],
])}

### Supported Finish Counts

${markdownTable(['finish_key', 'count'], Object.entries(report.supported_subset.finish_counts))}

## Blocked Subset

Blocked rows are excluded because their finish keys are not active in \`public.finish_keys\`.

${markdownTable(['finish_key', 'count'], Object.entries(report.blocked_subset.finish_counts))}

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | ${report.before_snapshot.counts.target_parent_rows} | ${report.before_snapshot.counts.existing_target_child_rows} | ${report.before_snapshot.counts.planned_id_collision_rows} | \`${report.before_snapshot.hash_sha256}\` |
| after | ${report.after_snapshot.counts.target_parent_rows} | ${report.after_snapshot.counts.existing_target_child_rows} | ${report.after_snapshot.counts.planned_id_collision_rows} | \`${report.after_snapshot.hash_sha256}\` |

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : '- none'}
`;
}

function buildCheckpoint(report) {
  return `# PKG-06B Supported Finish Subset Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_readiness_fingerprint_sha256 | \`${report.source_readiness_fingerprint_sha256}\` |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| supported_child_printing_rows | ${report.supported_subset.child_printing_rows} |
| supported_target_parent_rows | ${report.supported_subset.target_parent_rows} |
| blocked_child_printing_rows | ${report.blocked_subset.child_printing_rows} |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| stop_findings | ${report.stop_findings.length} |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| real_apply_authorized | ${report.real_apply_authorized} |

## Interpretation

PKG-06B is ready for a separate real-apply gate if the operator chooses. The blocked finish-taxonomy rows remain excluded.
`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06B Supported Finish Subset Guarded Dry-Run Checkpoint V1](20260609_pkg06b_supported_finish_subset_guarded_dry_run_checkpoint_v1.md) | Rollback-dry-runs 120 supported child-only me03 printing inserts, normal=65 and holo=55, with 268 finish-taxonomy rows excluded. |';
  const current = await fs.readFile(indexPath, 'utf8').catch(() => '# Master Index Checkpoints\n');
  if (current.includes('20260609_pkg06b_supported_finish_subset_guarded_dry_run_checkpoint_v1.md')) {
    await fs.writeFile(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg06b_supported_finish_subset_guarded_dry_run_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
  const readiness = await readJson(READINESS_JSON);
  const allRows = buildRows(readiness);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const finishKeys = await queryFinishKeys(client);
    const activeFinishKeys = new Set(finishKeys.filter((row) => row.is_active).map((row) => row.key));
    const supportedRows = allRows.filter((row) => activeFinishKeys.has(row.finish_key));
    const blockedRows = allRows.filter((row) => !activeFinishKeys.has(row.finish_key));
    const packagePayload = {
      package_id: PACKAGE_ID,
      source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
      supported_rows: supportedRows.map((row) => ({
        card_printing_id: row.card_printing_id,
        card_print_id: row.card_print_id,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
      })),
      active_finish_keys: [...activeFinishKeys].sort(),
    };
    const packageFingerprint = sha256(stableJson(packagePayload));
    const sql = buildSql({ rows: supportedRows, packageFingerprint });
    const sqlHash = sha256(sql);
    const sqlFindings = validateSql(sql);
    await writeText(OUTPUT_SQL, sql);
    const execution = sqlFindings.length
      ? {
          status: 'blocked_sql_validation_findings_present',
          errorMessage: sqlFindings.join(', '),
          before: await captureTargetSnapshot(client, supportedRows),
          after: await captureTargetSnapshot(client, supportedRows),
          proofRows: [],
        }
      : await runDryRun(client, sql, supportedRows);
    const stopFindings = [
      ...sqlFindings,
      ...evaluate({ readiness, supportedRows, blockedRows, activeFinishKeys, execution }),
    ];
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg06b_supported_finish_subset_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
      package_fingerprint_sha256: packageFingerprint,
      sql_artifact_path: OUTPUT_SQL,
      sql_hash_sha256: sqlHash,
      live_finish_keys: finishKeys,
      supported_subset: {
        child_printing_rows: supportedRows.length,
        target_parent_rows: new Set(supportedRows.map((row) => row.card_print_id)).size,
        set_count: new Set(supportedRows.map((row) => row.set_key)).size,
        set_counts: countBy(supportedRows, (row) => row.set_key),
        finish_counts: countBy(supportedRows, (row) => row.finish_key),
        rows: supportedRows,
      },
      blocked_subset: {
        child_printing_rows: blockedRows.length,
        finish_counts: countBy(blockedRows, (row) => row.finish_key),
        rows: blockedRows.map((row) => ({
          card_printing_id: row.card_printing_id,
          card_print_id: row.card_print_id,
          set_key: row.set_key,
          card_number: row.card_number,
          card_name: row.card_name,
          finish_key: row.finish_key,
        })),
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
      parent_writes: false,
      deletes_or_merges: false,
      write_ready_now: 0,
      stop_findings: stopFindings,
      next_allowed_step: stopFindings.length === 0
        ? 'Prepare real-apply gate for PKG-06B supported subset only if separately requested.'
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
      supported_subset: {
        child_printing_rows: report.supported_subset.child_printing_rows,
        target_parent_rows: report.supported_subset.target_parent_rows,
        set_count: report.supported_subset.set_count,
        finish_counts: report.supported_subset.finish_counts,
      },
      blocked_subset: {
        child_printing_rows: report.blocked_subset.child_printing_rows,
        finish_counts: report.blocked_subset.finish_counts,
      },
      dry_run_execution_status: report.dry_run_execution_status,
      stop_findings: report.stop_findings,
      durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
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
}

main().catch((error) => {
  console.error('[pkg06b][supported-finish-subset] failed:', error?.message ?? error);
  process.exitCode = 1;
});
