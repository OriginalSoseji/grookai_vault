import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_pkg08e_existing_parent_child_printing_real_apply_sv03_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08E-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const PACKAGE_FINGERPRINT = '7bed0d85cfc7f875d902bb1b7453107a00be0a4b69329b171ef4583c7e6e2ef8';
const DRY_RUN_PROOF_HASH = 'e7ca48bb8fac12f973774e94f97a4e924e11bd21311506f2e5500e9027518ff9';
const APPROVAL_TEXT = 'Approve real PKG-08E-EXISTING-PARENT-CHILD-PRINTING-INSERTS apply only. Fingerprint: 7bed0d85cfc7f875d902bb1b7453107a00be0a4b69329b171ef4583c7e6e2ef8. Scope: 16 child-only card_printing inserts across 1 sets; target parents=15; finishes cosmos=15, normal=1. Dry-run proof: e7ca48bb8fac12f973774e94f97a4e924e11bd21311506f2e5500e9027518ff9 == e7ca48bb8fac12f973774e94f97a4e924e11bd21311506f2e5500e9027518ff9. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.';

const EXPECTED_CHILD_ROWS = 16;
const EXPECTED_PARENT_ROWS = 15;
const EXPECTED_EXCLUDED_ROWS = 0;
const EXPECTED_SET_COUNTS = {
  sv03: 16,
};
const EXPECTED_FINISH_COUNTS = { cosmos: 15, normal: 1 };

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function targetRows(dryRun) {
  return (dryRun.scope?.rows ?? []).map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    set_key: row.set_key,
    live_set_code: row.live_set_code,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    provenance_source: row.provenance_source,
    provenance_ref: row.provenance_ref,
    created_by: row.created_by,
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
         live_set_code text,
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

async function captureParentSnapshot(client, rows) {
  const result = await client.query(
    `select cp.id::text as card_print_id, cp.set_code, cp.set_id::text as set_id, cp.number, cp.number_plain, cp.name, cp.rarity
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code nulls last, cp.number_plain nulls last, cp.name, cp.id`,
    [[...new Set(rows.map((row) => row.card_print_id))]],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    count: result.rows.length,
  };
}

async function captureInsertedRows(client, rows) {
  const result = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, card_number, cp.name, cpr.finish_key, cpr.id`,
    [rows.map((row) => row.card_printing_id)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      inserted_rows_found: result.rows.length,
      provisional_rows: result.rows.filter((row) => row.is_provisional === true).length,
      by_finish: countBy(result.rows, (row) => row.finish_key),
      by_live_set: countBy(result.rows, (row) => row.set_code),
    },
  };
}

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
  for (const key of Object.keys(actual)) {
    if (expected[key] === undefined) findings.push(`${label}_${key}_unexpected`);
  }
}

function validatePrerequisites({ gate, dryRun, rows }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08e_existing_parent_child_printing_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.blocked_resolution_rows_excluded_from_package !== EXPECTED_EXCLUDED_ROWS) findings.push(`excluded_resolution_count_not_${EXPECTED_EXCLUDED_ROWS}`);
  if (rows.length !== EXPECTED_CHILD_ROWS) findings.push(`target_row_count_not_${EXPECTED_CHILD_ROWS}`);
  if (new Set(rows.map((row) => row.card_print_id)).size !== EXPECTED_PARENT_ROWS) findings.push(`target_parent_count_not_${EXPECTED_PARENT_ROWS}`);
  validateExpectedCounts(countBy(rows, (row) => row.set_key), EXPECTED_SET_COUNTS, 'target_set', findings);
  validateExpectedCounts(countBy(rows, (row) => row.finish_key), EXPECTED_FINISH_COUNTS, 'target_finish', findings);
  return findings;
}

function validateBeforeSnapshot({ beforeTargetSnapshot, beforeParentSnapshot, dryRun }) {
  const findings = [];
  if (beforeTargetSnapshot.hash_sha256 !== dryRun.before_snapshot?.hash_sha256) findings.push('before_target_snapshot_hash_does_not_match_dry_run_proof');
  if (beforeTargetSnapshot.counts.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push(`before_parent_count_not_${EXPECTED_PARENT_ROWS}`);
  if (beforeTargetSnapshot.counts.existing_target_child_rows !== 0) findings.push('before_existing_target_child_rows_present');
  if (beforeTargetSnapshot.counts.planned_id_collision_rows !== 0) findings.push('before_planned_id_collision_rows_present');
  if (beforeParentSnapshot.count !== EXPECTED_PARENT_ROWS) findings.push(`before_parent_snapshot_count_not_${EXPECTED_PARENT_ROWS}`);
  return findings;
}

function validateAfterSnapshot({ afterTargetSnapshot, beforeParentSnapshot, afterParentSnapshot, insertedRows }) {
  const findings = [];
  if (afterTargetSnapshot.counts.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push(`after_parent_count_not_${EXPECTED_PARENT_ROWS}`);
  if (afterTargetSnapshot.counts.existing_target_child_rows !== EXPECTED_CHILD_ROWS) findings.push(`after_existing_target_child_count_not_${EXPECTED_CHILD_ROWS}`);
  if (afterTargetSnapshot.counts.planned_id_collision_rows !== EXPECTED_CHILD_ROWS) findings.push(`after_planned_id_collision_count_not_${EXPECTED_CHILD_ROWS}`);
  if (beforeParentSnapshot.hash_sha256 !== afterParentSnapshot.hash_sha256) findings.push('parent_snapshot_changed_unexpectedly');
  if (insertedRows.counts.inserted_rows_found !== EXPECTED_CHILD_ROWS) findings.push(`inserted_rows_found_not_${EXPECTED_CHILD_ROWS}`);
  if (insertedRows.counts.provisional_rows !== 0) findings.push('inserted_provisional_rows_present');
  validateExpectedCounts(insertedRows.counts.by_finish, EXPECTED_FINISH_COUNTS, 'inserted_finish', findings);
  return findings;
}

async function applyPackage({ dryRun, rows }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      committed: false,
      inserted_row_count: 0,
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeTargetSnapshot = null;
  let beforeParentSnapshot = null;
  try {
    beforeTargetSnapshot = await captureTargetSnapshot(client, rows);
    beforeParentSnapshot = await captureParentSnapshot(client, rows);
    const beforeFindings = validateBeforeSnapshot({ beforeTargetSnapshot, beforeParentSnapshot, dryRun });
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_target_snapshot: beforeTargetSnapshot,
        after_target_snapshot: beforeTargetSnapshot,
        before_parent_snapshot: beforeParentSnapshot,
        after_parent_snapshot: beforeParentSnapshot,
        inserted_rows: null,
        inserted_row_count: 0,
        committed: false,
      };
    }
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    await client.query(
      `create temporary table pkg08e_real_apply_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         set_key text not null,
         live_set_code text not null,
         card_number text not null,
         card_name text not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08e_real_apply_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.set_key,
         row.live_set_code,
         row.card_number,
         row.card_name,
         row.finish_key,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         set_key text,
         live_set_code text,
         card_number text,
         card_name text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(rows)],
    );
    const shape = await client.query(
      `select
         count(*)::int as child_rows,
         count(distinct card_print_id)::int as parent_rows,
         count(distinct set_key)::int as set_rows,
         0::int as unsupported_rows
       from pkg08e_real_apply_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.child_rows !== EXPECTED_CHILD_ROWS ||
      shapeRow.parent_rows !== EXPECTED_PARENT_ROWS ||
      shapeRow.set_rows !== Object.keys(EXPECTED_SET_COUNTS).length ||
      shapeRow.unsupported_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const lockParents = await client.query(
      `select cp.id
       from public.card_prints cp
       join (select distinct card_print_id from pkg08e_real_apply_targets) target on target.card_print_id = cp.id
       for update of cp`,
    );
    if (lockParents.rowCount !== EXPECTED_PARENT_ROWS) throw new Error(`locked parent count mismatch: ${lockParents.rowCount}`);
    const finishGuard = await client.query(
      `select count(*)::int as unsupported_finish_count
       from pkg08e_real_apply_targets target
       left join public.finish_keys fk
         on fk.key = target.finish_key
        and fk.is_active = true
       where fk.key is null`,
    );
    if (finishGuard.rows[0].unsupported_finish_count !== 0) throw new Error(`unsupported finish count: ${finishGuard.rows[0].unsupported_finish_count}`);
    const existingChildGuard = await client.query(
      `select count(*)::int as existing_child_count
       from pkg08e_real_apply_targets target
       join public.card_printings cpr
         on cpr.card_print_id = target.card_print_id
        and cpr.finish_key = target.finish_key`,
    );
    if (existingChildGuard.rows[0].existing_child_count !== 0) throw new Error(`existing target child count: ${existingChildGuard.rows[0].existing_child_count}`);
    const idCollisionGuard = await client.query(
      `select count(*)::int as id_collision_count
       from pkg08e_real_apply_targets target
       join public.card_printings cpr on cpr.id = target.card_printing_id`,
    );
    if (idCollisionGuard.rows[0].id_collision_count !== 0) throw new Error(`planned id collision count: ${idCollisionGuard.rows[0].id_collision_count}`);
    const insertResult = await client.query(
      `insert into public.card_printings (
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
       from pkg08e_real_apply_targets`,
    );
    if (insertResult.rowCount !== EXPECTED_CHILD_ROWS) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);
    await client.query('commit');
    const afterTargetSnapshot = await captureTargetSnapshot(client, rows);
    const afterParentSnapshot = await captureParentSnapshot(client, rows);
    const insertedRows = await captureInsertedRows(client, rows);
    return {
      connected: true,
      apply_status: 'pkg08e_existing_parent_child_printing_real_apply_committed',
      error_message: null,
      before_target_snapshot: beforeTargetSnapshot,
      after_target_snapshot: afterTargetSnapshot,
      before_parent_snapshot: beforeParentSnapshot,
      after_parent_snapshot: afterParentSnapshot,
      inserted_rows: insertedRows,
      inserted_row_count: insertResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterTargetSnapshot = beforeTargetSnapshot ? await captureTargetSnapshot(client, rows) : null;
    const afterParentSnapshot = beforeParentSnapshot ? await captureParentSnapshot(client, rows) : null;
    return {
      connected: true,
      apply_status: 'pkg08e_existing_parent_child_printing_real_apply_failed_rolled_back',
      error_message: error.message,
      before_target_snapshot: beforeTargetSnapshot,
      after_target_snapshot: afterTargetSnapshot,
      before_parent_snapshot: beforeParentSnapshot,
      after_parent_snapshot: afterParentSnapshot,
      inserted_rows: null,
      inserted_row_count: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function rollbackSqlPreview(rows) {
  return rows
    .slice(0, EXPECTED_CHILD_ROWS)
    .map((row) => `delete from public.card_printings where id = '${row.card_printing_id}'::uuid and card_print_id = '${row.card_print_id}'::uuid and finish_key = '${row.finish_key}';`)
    .join('\n');
}

function renderMarkdown(report) {
  return `# PKG-08E Existing-Parent Child Printing Real Apply V1

This report records the approved real apply for PKG-08E child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| inserted_rows | ${report.inserted_rows} |
| target_parents | ${report.package_scope.target_parent_rows} |
| excluded_resolution_rows | ${report.package_scope.excluded_resolution_rows} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| parent_writes_performed | ${report.parent_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

## Inserted Counts

- by_live_set: ${JSON.stringify(report.verification_summary.inserted_by_live_set)}
- by_finish: ${JSON.stringify(report.verification_summary.inserted_by_finish)}
- parent_rows_unchanged: ${report.verification_summary.parent_rows_unchanged}

## Rollback Preview

\`\`\`sql
${report.rollback_proof.rollback_sql_preview}
\`\`\`
`;
}

function renderCheckpoint(report) {
  return `# PKG-08E Existing-Parent Child Printing Real Apply Checkpoint V1

Date: 2026-06-12

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| inserted_rows | ${report.inserted_rows} |
| target_parents | ${report.package_scope.target_parent_rows} |
| excluded_resolution_rows | ${report.package_scope.excluded_resolution_rows} |
| parent_rows_unchanged | ${report.verification_summary.parent_rows_unchanged} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| parent_writes_performed | ${report.parent_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

Real apply was scoped to ${EXPECTED_CHILD_ROWS} child-only card_printing inserts across existing parents. ${EXPECTED_EXCLUDED_ROWS} ambiguous resolution rows remain excluded. No parent writes, migrations, deletes, merges, unsupported cleanup, or quarantine were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const checkpointName = '20260612_pkg08e_existing_parent_child_printing_real_apply_sv03_checkpoint_v1.md';
  const line = '| 2026-06-12 | [PKG-08E Existing-Parent Child Printing Real Apply SV03 Checkpoint V1](20260612_pkg08e_existing_parent_child_printing_real_apply_sv03_checkpoint_v1.md) | Records approved real apply for 16 existing-parent child-only card_printing inserts across sv03; no parent writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes(checkpointName)) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes(checkpointName) ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const rows = targetRows(dryRun);
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, rows });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPackage({ dryRun, rows })
  : {
      connected: false,
      apply_status: 'blocked_prerequisite_findings_present',
      error_message: prerequisiteFindings.join(', '),
      committed: false,
      inserted_row_count: 0,
    };
const afterFindings = applyResult.committed
  ? validateAfterSnapshot({
      afterTargetSnapshot: applyResult.after_target_snapshot,
      beforeParentSnapshot: applyResult.before_parent_snapshot,
      afterParentSnapshot: applyResult.after_parent_snapshot,
      insertedRows: applyResult.inserted_rows,
    })
  : ['apply_not_committed'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_v1',
  audit_only: false,
  apply_only: true,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    target_child_rows: EXPECTED_CHILD_ROWS,
    target_parent_rows: EXPECTED_PARENT_ROWS,
    excluded_resolution_rows: EXPECTED_EXCLUDED_ROWS,
    by_set: dryRun.scope?.by_set ?? {},
    by_finish: dryRun.scope?.by_finish ?? {},
  },
  approval: {
    exact_approval_text: APPROVAL_TEXT,
    approved_real_apply_only: true,
    no_global_apply: true,
    no_migrations: true,
    no_deletes: true,
    no_merges: true,
    no_unsupported_cleanup: true,
    no_parent_writes: true,
  },
  apply_status: applyResult.apply_status,
  error_message: applyResult.error_message,
  db_write_committed: applyResult.committed === true,
  db_writes_performed: applyResult.committed === true,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  parent_writes_performed: false,
  inserted_rows: applyResult.inserted_row_count,
  before_target_snapshot: applyResult.before_target_snapshot,
  after_target_snapshot: applyResult.after_target_snapshot,
  before_parent_snapshot: applyResult.before_parent_snapshot,
  after_parent_snapshot: applyResult.after_parent_snapshot,
  inserted_row_snapshot: applyResult.inserted_rows,
  verification_summary: {
    inserted_by_live_set: applyResult.inserted_rows?.counts?.by_live_set ?? {},
    inserted_by_finish: applyResult.inserted_rows?.counts?.by_finish ?? {},
    parent_rows_unchanged:
      Boolean(applyResult.before_parent_snapshot?.hash_sha256) &&
      applyResult.before_parent_snapshot?.hash_sha256 === applyResult.after_parent_snapshot?.hash_sha256,
  },
  rollback_proof: {
    rollback_sql_preview: rollbackSqlPreview(rows),
    inserted_child_printing_ids: rows.map((row) => row.card_printing_id),
  },
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  inserted_rows: report.inserted_rows,
  target_parents: report.package_scope.target_parent_rows,
  excluded_resolution_rows: report.package_scope.excluded_resolution_rows,
  inserted_by_live_set: report.verification_summary.inserted_by_live_set,
  inserted_by_finish: report.verification_summary.inserted_by_finish,
  parent_rows_unchanged: report.verification_summary.parent_rows_unchanged,
  db_write_committed: report.db_write_committed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  deletes_performed: report.deletes_performed,
  merges_performed: report.merges_performed,
  unsupported_cleanup_performed: report.unsupported_cleanup_performed,
  parent_writes_performed: report.parent_writes_performed,
  stop_findings: report.stop_findings,
}, null, 2));

if (!pass) process.exitCode = 1;
