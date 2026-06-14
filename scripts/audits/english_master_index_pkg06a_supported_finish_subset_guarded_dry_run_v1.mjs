import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SOURCE_ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_transaction_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06a_supported_finish_subset_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS';
const SOURCE_PACKAGE_ID = 'PKG-06A-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const SOURCE_ARTIFACT_FINGERPRINT = 'a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120';
const APPROVAL_TEXT = 'Proceed next step';

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

async function queryActiveFinishKeys(client) {
  const result = await client.query(
    `select key, label, is_active
     from public.finish_keys
     order by key`,
  );
  return result.rows;
}

function plannedTargets(rows) {
  return rows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    finish_key: row.finish_key,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
  }));
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
    [JSON.stringify(plannedTargets(rows))],
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

function buildSql({ rows, packageFingerprint, sourceArtifactFingerprint }) {
  const expectedChildRows = rows.length;
  const expectedParentRows = new Set(rows.map((row) => row.card_print_id)).size;
  const expectedSetRows = new Set(rows.map((row) => row.set_key)).size;
  return `-- English Master Index ${PACKAGE_ID} guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source artifact: ${sourceArtifactFingerprint}
-- Package fingerprint: ${packageFingerprint}

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06a_supported_child_printings (
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

insert into pkg06a_supported_child_printings (
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
  duplicate_count int;
  unsupported_finish_count int;
  missing_parent_count int;
  existing_child_count int;
begin
  select count(*) into child_count from pkg06a_supported_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06a_supported_child_printings;
  select count(distinct set_key) into set_count from pkg06a_supported_child_printings;
  select count(*) into duplicate_count
  from (
    select card_print_id, finish_key
    from pkg06a_supported_child_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) duplicates;
  select count(*) into unsupported_finish_count
  from pkg06a_supported_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into missing_parent_count
  from pkg06a_supported_child_printings target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  select count(*) into existing_child_count
  from pkg06a_supported_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;

  if child_count <> ${expectedChildRows} then raise exception 'PKG-06A supported child count drift: %', child_count; end if;
  if parent_count <> ${expectedParentRows} then raise exception 'PKG-06A supported parent count drift: %', parent_count; end if;
  if set_count <> ${expectedSetRows} then raise exception 'PKG-06A supported set count drift: %', set_count; end if;
  if duplicate_count <> 0 then raise exception 'PKG-06A supported duplicate target count: %', duplicate_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06A supported unsupported finish count: %', unsupported_finish_count; end if;
  if missing_parent_count <> 0 then raise exception 'PKG-06A supported missing parent count: %', missing_parent_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06A supported existing child count: %', existing_child_count; end if;
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
from pkg06a_supported_child_printings;

do $$
declare
  inserted_children int;
begin
  select count(*) into inserted_children
  from public.card_printings cpr
  join pkg06a_supported_child_printings target on target.card_printing_id = cpr.id;
  if inserted_children <> ${expectedChildRows} then raise exception 'PKG-06A supported inserted child count mismatch: %', inserted_children; end if;
end $$;

select
  '${PACKAGE_ID}'::text as package_id,
  '${sourceArtifactFingerprint}'::text as source_artifact_fingerprint,
  '${packageFingerprint}'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06a_supported_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06a_supported_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06a_supported_child_printings)::int as planned_child_rows;

rollback;
`;
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

async function runDryRun(client, sql, rows) {
  const beforeSnapshot = await captureTargetSnapshot(client, rows);
  let executionStatus = 'pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change';
  let errorMessage = null;
  let rollbackProofRows = [];
  try {
    const result = await client.query(sql);
    rollbackProofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
  } catch (error) {
    executionStatus = 'pkg06a_supported_finish_subset_failed';
    errorMessage = error.message;
    await client.query('rollback').catch(() => {});
  }
  const afterSnapshot = await captureTargetSnapshot(client, rows);
  return {
    execution_status: executionStatus,
    error_message: errorMessage,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_rows: rollbackProofRows,
  };
}

function validateSql(sql) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');
  if (/\bupdate\s+public\./i.test(strippedSql)) findings.push('sql_contains_update_statement');
  if (/\binsert\s+into\s+public\.sets\b/i.test(strippedSql)) findings.push('sql_contains_set_insert');
  if (/\binsert\s+into\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_contains_parent_insert');
  if (/\binsert\s+into\s+public\.external/i.test(strippedSql)) findings.push('sql_contains_external_mapping_insert');
  if (!/\binsert\s+into\s+public\.card_printings\b/i.test(strippedSql)) findings.push('sql_missing_child_insert');
  return findings;
}

function evaluate({ supportedRows, blockedRows, activeFinishKeys, execution, sourceArtifact }) {
  const findings = [];
  if (sourceArtifact.package_id !== SOURCE_PACKAGE_ID) findings.push('source_artifact_package_id_mismatch');
  if (sourceArtifact.artifact_fingerprint_sha256 !== SOURCE_ARTIFACT_FINGERPRINT) findings.push('source_artifact_fingerprint_mismatch');
  if ((sourceArtifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');
  if (supportedRows.length === 0) findings.push('supported_subset_empty');
  if (supportedRows.some((row) => !activeFinishKeys.has(row.finish_key))) findings.push('supported_subset_contains_unsupported_finish_key');
  if (blockedRows.some((row) => activeFinishKeys.has(row.finish_key))) findings.push('blocked_subset_contains_supported_finish_key');
  if (execution.execution_status !== 'pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.error_message) findings.push('dry_run_transaction_error_message_present');
  if (execution.before_snapshot.counts.existing_target_child_rows !== 0) findings.push('before_snapshot_existing_target_child_rows_present');
  if (execution.before_snapshot.counts.planned_id_collision_rows !== 0) findings.push('before_snapshot_planned_id_collision_rows_present');
  if (execution.after_snapshot.counts.existing_target_child_rows !== 0) findings.push('after_snapshot_existing_target_child_rows_present_after_rollback');
  if (execution.after_snapshot.counts.planned_id_collision_rows !== 0) findings.push('after_snapshot_planned_id_collision_rows_present_after_rollback');
  if (execution.before_snapshot.hash_sha256 !== execution.after_snapshot.hash_sha256) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  if (!execution.rollback_proof_rows[0]) findings.push('rollback_proof_row_missing');
  return findings;
}

function buildMarkdown(report) {
  const supportedSetRows = Object.entries(report.supported_subset.set_counts).map(([setKey, count]) => [setKey, count]);
  const blockedRows = Object.entries(report.blocked_subset.finish_counts).map(([finishKey, count]) => [finishKey, count, report.blocked_subset.block_reason_by_finish_key[finishKey]]);
  return `# PKG-06A Supported Finish Subset Guarded Dry-Run V1

The original PKG-06A dry-run failed safely because some Master Index logical finish keys are not present in \`public.finish_keys\`. This report splits that package and dry-runs only rows whose finish keys are active in the DB.

## Safety

- real_apply_authorized: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- deletes_or_merges: false
- parent_writes: false

## Package

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_artifact_fingerprint_sha256 | \`${report.source_artifact_fingerprint_sha256}\` |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| stop_findings | ${report.stop_findings.length} |

## Supported Subset

| Metric | Value |
| --- | ---: |
| supported_child_printing_rows | ${report.supported_subset.child_printing_rows} |
| supported_target_parent_rows | ${report.supported_subset.target_parent_rows} |
| supported_set_count | ${report.supported_subset.set_count} |

### Supported Sets

${markdownTable(['set_key', 'child_printing_rows'], supportedSetRows)}

### Supported Finish Counts

${markdownTable(['finish_key', 'count'], Object.entries(report.supported_subset.finish_counts))}

## Blocked Subset

These rows are not rejected as Master Index truth. They are blocked because the current DB finish taxonomy cannot represent their finish keys.

${markdownTable(['finish_key', 'count', 'blocked_reason'], blockedRows)}

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | ${report.before_snapshot.counts.target_parent_rows} | ${report.before_snapshot.counts.existing_target_child_rows} | ${report.before_snapshot.counts.planned_id_collision_rows} | \`${report.before_snapshot.hash_sha256}\` |
| after | ${report.after_snapshot.counts.target_parent_rows} | ${report.after_snapshot.counts.existing_target_child_rows} | ${report.after_snapshot.counts.planned_id_collision_rows} | \`${report.after_snapshot.hash_sha256}\` |

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}
`;
}

function buildCheckpoint(report) {
  return `# PKG-06A Supported Finish Subset Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_artifact_fingerprint_sha256 | \`${report.source_artifact_fingerprint_sha256}\` |
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

The original PKG-06A scope contains Master Index logical finish keys that the current DB taxonomy cannot represent. The supported subset proves that DB-supported child-only inserts can be staged safely without weakening the finish-key foreign key.

Blocked finish keys require separate finish-taxonomy governance before any write package can include them.
`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06A Supported Finish Subset Guarded Dry-Run Checkpoint V1](20260609_pkg06a_supported_finish_subset_guarded_dry_run_checkpoint_v1.md) | Splits PKG-06A by live finish taxonomy and rollback-dry-runs only supported child-printing inserts; first-edition/stamped/cracked-ice rows blocked for finish-key governance. |';
  const current = await fs.readFile(indexPath, 'utf8').catch(() => '# Master Index Checkpoints\n');
  if (current.includes('20260609_pkg06a_supported_finish_subset_guarded_dry_run_checkpoint_v1.md')) {
    await fs.writeFile(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg06a_supported_finish_subset_guarded_dry_run_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');

  const sourceArtifact = await readJson(SOURCE_ARTIFACT_JSON);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const finishKeys = await queryActiveFinishKeys(client);
    const activeFinishKeys = new Set(finishKeys.filter((row) => row.is_active === true).map((row) => row.key));
    const sourceRows = sourceArtifact.planned_child_printing_rows ?? [];
    const supportedRows = sourceRows.filter((row) => activeFinishKeys.has(row.finish_key));
    const blockedRows = sourceRows.filter((row) => !activeFinishKeys.has(row.finish_key));
    const packagePayload = {
      package_id: PACKAGE_ID,
      source_artifact_fingerprint_sha256: sourceArtifact.artifact_fingerprint_sha256,
      supported_child_printing_rows: supportedRows.map((row) => ({
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
    const sql = buildSql({
      rows: supportedRows,
      packageFingerprint,
      sourceArtifactFingerprint: sourceArtifact.artifact_fingerprint_sha256,
    });
    const sqlHash = sha256(sql);
    const sqlFindings = validateSql(sql);
    await writeText(OUTPUT_SQL, sql);
    const execution = sqlFindings.length
      ? {
          execution_status: 'blocked_sql_validation_findings_present',
          error_message: null,
          before_snapshot: await captureTargetSnapshot(client, supportedRows),
          after_snapshot: await captureTargetSnapshot(client, supportedRows),
          rollback_proof_rows: [],
        }
      : await runDryRun(client, sql, supportedRows);
    const stopFindings = [
      ...sqlFindings,
      ...evaluate({ supportedRows, blockedRows, activeFinishKeys, execution, sourceArtifact }),
    ];
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      approval: {
        approval_text: APPROVAL_TEXT,
        approved_scope: 'rollback_only_supported_finish_subset_dry_run_execution_and_proof_generation',
      },
      source_artifact_path: SOURCE_ARTIFACT_JSON,
      source_artifact_fingerprint_sha256: sourceArtifact.artifact_fingerprint_sha256,
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
        block_reason_by_finish_key: Object.fromEntries(Object.keys(countBy(blockedRows, (row) => row.finish_key)).map((finishKey) => [
          finishKey,
          'finish_key_not_present_as_active_public_finish_keys_row',
        ])),
        rows: blockedRows.map((row) => ({
          card_printing_id: row.card_printing_id,
          card_print_id: row.card_print_id,
          set_key: row.set_key,
          card_number: row.card_number,
          card_name: row.card_name,
          finish_key: row.finish_key,
        })),
      },
      dry_run_execution_status: execution.execution_status,
      error_message: execution.error_message,
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot: execution.before_snapshot.hash_sha256 === execution.after_snapshot.hash_sha256,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      deletes_or_merges: false,
      parent_writes: false,
      write_ready_now: 0,
      stop_findings: stopFindings,
      next_allowed_step: stopFindings.length === 0
        ? 'Prepare real-apply gate for supported subset only if separately authorized; blocked finish keys require finish-taxonomy governance.'
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
      source_artifact_fingerprint_sha256: report.source_artifact_fingerprint_sha256,
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
  console.error('[pkg06a][supported-finish-subset] failed:', error?.message ?? error);
  process.exitCode = 1;
});
