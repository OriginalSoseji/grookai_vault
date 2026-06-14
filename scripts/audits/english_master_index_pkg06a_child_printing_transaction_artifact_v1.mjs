import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_insert_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_transaction_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_transaction_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg06a_child_printing_inserts_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-06A-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const SOURCE_READINESS_FINGERPRINT = '7b2339f8004754d69bfcdc59bb63965a2e9f2e27827a211853af53ab8c18ab41';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';
const CREATED_BY = 'pkg06a_child_printing_insert_dry_run_artifact_v1';
const EXPECTED_SET_COUNT = 3;
const EXPECTED_CHILD_INSERTS = 397;
const EXPECTED_DISTINCT_PARENT_COUNT = 390;

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

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    row.card_name,
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function buildPlannedRows(readiness) {
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

function duplicateTargetKeys(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = `${row.card_print_id}|${row.finish_key}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
}

async function captureFreshSnapshot(plannedRows) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }

  const targets = plannedRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    finish_key: row.finish_key,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
  }));
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
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
      [JSON.stringify(targets)],
    );
    await client.query('rollback');
    const rows = result.rows;
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      impact_counts: {
        target_parent_rows_found: rows.filter((row) => row.row_type === 'target_parent').length,
        existing_target_child_rows: rows.filter((row) => row.row_type === 'existing_target_child').length,
        planned_id_collision_rows: rows.filter((row) => row.row_type === 'planned_id_collision').length,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only fresh snapshot failed: ${error.message}`,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
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

function buildSql({ readiness, plannedRows, artifactFingerprint, snapshotHash }) {
  return `-- English Master Index PKG-06A guarded dry-run transaction artifact V1
-- GENERATED ARTIFACT ONLY. Codex did not execute this SQL.
-- Scope: ${PACKAGE_ID}
-- Source readiness fingerprint: ${readiness.package_fingerprint_sha256}
-- Artifact fingerprint: ${artifactFingerprint}
-- Fresh snapshot hash: ${snapshotHash}
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06a_card_printings (
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

insert into pkg06a_card_printings (
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
${valuesSql(plannedRows)};

-- Guard 1: source package shape must still match the readiness artifact.
do $$
declare
  child_count int;
  parent_count int;
  duplicate_count int;
begin
  select count(*) into child_count from pkg06a_card_printings;
  select count(distinct card_print_id) into parent_count from pkg06a_card_printings;
  select count(*) into duplicate_count
  from (
    select card_print_id, finish_key
    from pkg06a_card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) duplicate_targets;
  if child_count <> ${EXPECTED_CHILD_INSERTS} then raise exception 'PKG-06A child count drift: %', child_count; end if;
  if parent_count <> ${EXPECTED_DISTINCT_PARENT_COUNT} then raise exception 'PKG-06A parent count drift: %', parent_count; end if;
  if duplicate_count <> 0 then raise exception 'PKG-06A duplicate target count: %', duplicate_count; end if;
end $$;

-- Guard 2: every target parent must exist, and no exact target child finish may already exist.
do $$
declare
  missing_parent_count int;
  existing_child_count int;
begin
  select count(*) into missing_parent_count
  from pkg06a_card_printings target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  if missing_parent_count <> 0 then raise exception 'PKG-06A missing parent count: %', missing_parent_count; end if;

  select count(*) into existing_child_count
  from pkg06a_card_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  if existing_child_count <> 0 then raise exception 'PKG-06A existing child finish count: %', existing_child_count; end if;
end $$;

-- Dry-run insert simulation. This transaction must roll back.
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
from pkg06a_card_printings;

-- Guard 3: dry-run post-insert count must match exactly.
do $$
declare
  inserted_children int;
begin
  select count(*) into inserted_children
  from public.card_printings cpr
  join pkg06a_card_printings target on target.card_printing_id = cpr.id;
  if inserted_children <> ${EXPECTED_CHILD_INSERTS} then raise exception 'PKG-06A inserted child count mismatch: %', inserted_children; end if;
end $$;

-- Rollback proof query.
select
  '${PACKAGE_ID}'::text as package_id,
  '${readiness.package_fingerprint_sha256}'::text as readiness_fingerprint,
  '${artifactFingerprint}'::text as artifact_fingerprint,
  (select count(distinct set_key) from pkg06a_card_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06a_card_printings)::int as target_parent_rows,
  (select count(*) from pkg06a_card_printings)::int as planned_child_rows;

rollback;
`;
}

function buildStopFindings({ readiness, plannedRows, freshSnapshot }) {
  const findings = [];
  const selectedSets = readiness.recommended_bucket?.sets ?? [];
  const duplicateTargets = duplicateTargetKeys(plannedRows);

  if (readiness.package_id !== PACKAGE_ID) findings.push('readiness_package_id_mismatch');
  if (readiness.package_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) {
    findings.push('readiness_fingerprint_mismatch');
  }
  if ((readiness.db_writes_performed ?? false) !== false) findings.push('readiness_reports_db_write');
  if ((readiness.migrations_created ?? false) !== false) findings.push('readiness_reports_migration');
  if ((readiness.write_ready_now ?? 0) !== 0) findings.push('readiness_write_ready_nonzero');
  if (selectedSets.length !== EXPECTED_SET_COUNT) findings.push('selected_set_count_mismatch');
  if (plannedRows.length !== EXPECTED_CHILD_INSERTS) findings.push('planned_child_count_mismatch');
  if (new Set(plannedRows.map((row) => row.card_print_id)).size !== EXPECTED_DISTINCT_PARENT_COUNT) {
    findings.push('planned_distinct_parent_count_mismatch');
  }
  if (duplicateTargets.length !== 0) findings.push('duplicate_target_card_print_finish_rows');
  if (plannedRows.some((row) => row.readiness_classification !== 'eligible_child_printing_insert_only')) {
    findings.push('non_eligible_readiness_row_selected');
  }
  if (plannedRows.some((row) => row.live_parent_match_count !== 1)) {
    findings.push('selected_row_without_single_live_parent_match');
  }
  if (!freshSnapshot.available) findings.push('fresh_snapshot_unavailable');
  if ((freshSnapshot.impact_counts?.target_parent_rows_found ?? 0) !== EXPECTED_DISTINCT_PARENT_COUNT) {
    findings.push('fresh_snapshot_parent_count_mismatch');
  }
  if ((freshSnapshot.impact_counts?.existing_target_child_rows ?? 0) !== 0) {
    findings.push('fresh_snapshot_existing_target_child_rows_found');
  }
  if ((freshSnapshot.impact_counts?.planned_id_collision_rows ?? 0) !== 0) {
    findings.push('fresh_snapshot_planned_id_collision_rows_found');
  }

  return findings;
}

function buildMarkdown(report) {
  const selectedRows = report.selected_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.child_printing_inserts,
    JSON.stringify(row.finish_counts),
  ]);
  const summaryRows = Object.entries(report.summary).map(([key, value]) => [key, value]);
  return `# PKG-06A Child Printing Transaction Artifact V1

This is a preparation-only rollback artifact. It does not execute apply, create migrations, delete rows, merge rows, run cleanup, or mutate canonical truth.

## Safety

- preparation_only: true
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Package

- package_id: ${report.package_id}
- source_readiness_fingerprint_sha256: \`${report.source_readiness_fingerprint_sha256}\`
- artifact_fingerprint_sha256: \`${report.artifact_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- sql_artifact_path: \`${path.relative(ROOT, report.sql_artifact_path).replaceAll('\\', '/')}\`

## Selected Sets

${markdownTable(['set_key', 'set_name', 'child_printing_inserts', 'finish_counts'], selectedRows)}

## Summary

${markdownTable(['metric', 'value'], summaryRows)}

## Fresh Snapshot

| Field | Value |
| --- | --- |
| available | ${report.fresh_snapshot.available} |
| hash_sha256 | \`${report.fresh_snapshot.hash_sha256 ?? 'unavailable'}\` |
| target_parent_rows_found | ${report.fresh_snapshot.impact_counts?.target_parent_rows_found ?? 'n/a'} |
| existing_target_child_rows | ${report.fresh_snapshot.impact_counts?.existing_target_child_rows ?? 'n/a'} |
| planned_id_collision_rows | ${report.fresh_snapshot.impact_counts?.planned_id_collision_rows ?? 'n/a'} |

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${mdEscape(item)}`).join('\n') : 'None.'}

## Stop Rules

- Do not execute this SQL as a real apply.
- Do not add COMMIT to this SQL without a separate real-apply approval gate.
- Stop if fresh snapshot has any existing target child rows or planned ID collisions.
- Stop if dry-run execution reports any collision or count mismatch.
- No migrations, deletes, merges, unsupported cleanup, parent inserts, parent updates, or identity modifier work are in scope.
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const plannedRows = buildPlannedRows(readiness);
  const freshSnapshot = await captureFreshSnapshot(plannedRows);
  const planningPayload = {
    package_id: PACKAGE_ID,
    source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
    selected_sets: readiness.recommended_bucket?.sets?.map((set) => ({
      set_key: set.set_key,
      set_name: set.set_name,
      child_printing_inserts: set.child_printing_inserts,
      finish_counts: set.finish_counts,
    })),
    planned_child_rows: plannedRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
    })),
    fresh_snapshot_hash_sha256: freshSnapshot.hash_sha256 ?? null,
  };
  const artifactFingerprint = sha256(stableJson(planningPayload));
  const sql = buildSql({
    readiness,
    plannedRows,
    artifactFingerprint,
    snapshotHash: freshSnapshot.hash_sha256 ?? 'unavailable',
  });
  const sqlHash = sha256(sql);
  const stopFindings = buildStopFindings({ readiness, plannedRows, freshSnapshot });

  const selectedSets = (readiness.recommended_bucket?.sets ?? []).map((set) => ({
    set_key: set.set_key,
    set_name: set.set_name,
    child_printing_inserts: set.child_printing_inserts,
    finish_counts: set.finish_counts,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg06a_child_printing_transaction_artifact_v1',
    package_id: PACKAGE_ID,
    preparation_only: true,
    db_reads_performed: freshSnapshot.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
    artifact_fingerprint_sha256: artifactFingerprint,
    sql_hash_sha256: sqlHash,
    sql_artifact_path: OUTPUT_SQL,
    fresh_snapshot: freshSnapshot,
    selected_sets: selectedSets,
    summary: {
      planned_set_count: selectedSets.length,
      planned_child_printing_inserts: plannedRows.length,
      target_parent_rows: new Set(plannedRows.map((row) => row.card_print_id)).size,
      existing_target_child_rows_in_fresh_snapshot: freshSnapshot.impact_counts?.existing_target_child_rows ?? null,
      planned_id_collision_rows_in_fresh_snapshot: freshSnapshot.impact_counts?.planned_id_collision_rows ?? null,
    },
    planned_child_printing_rows: plannedRows,
    rollback_strategy: {
      artifact_is_rollback_only: true,
      durable_apply_not_authorized: true,
      future_real_apply_rollback_selector: 'Use planned child printing UUIDs from this artifact to delete only inserted PKG-06A child rows if rollback is required.',
    },
    stop_findings: stopFindings,
    stop_rules: [
      'Do not execute this SQL as a real apply.',
      'Do not add COMMIT to this SQL without a separate real-apply approval gate.',
      'Stop if fresh snapshot has any existing target child rows or planned ID collisions.',
      'Stop if dry-run execution reports any collision or count mismatch.',
      'No migrations, deletes, merges, unsupported cleanup, parent inserts, parent updates, or identity modifier work are in scope.',
    ],
  };

  await writeText(OUTPUT_SQL, sql);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    output_sql: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    source_readiness_fingerprint_sha256: report.source_readiness_fingerprint_sha256,
    artifact_fingerprint_sha256: report.artifact_fingerprint_sha256,
    sql_hash_sha256: report.sql_hash_sha256,
    summary: report.summary,
    stop_findings: report.stop_findings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error('[pkg06a][transaction-artifact] failed:', error?.message ?? error);
  process.exitCode = 1;
});
