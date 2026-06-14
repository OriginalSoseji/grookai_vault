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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06j_active_finish_child_printing_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS';
const SOURCE_READINESS_FINGERPRINT = '6063892190519f7b48b87f46e4c7d556ad12333655ab0c2aef3149d1da2764f7';
const PACKAGE_FINGERPRINT = '5bae5af1da3258540c9d010c88023fa4ea668bacde0db12bc454e0a4ec6f2879';
const SQL_HASH = 'e5e6b0713a3bb4c42e23eaf90091799c52bc57b11b35f91f7f10af1fb91bd14b';
const DRY_RUN_PROOF_HASH = 'aae9dbaf88d6d12c6a0c0d3f6ec18a7e15872056a3745e99878bb902216638c8';
const APPROVAL_TEXT = 'Approve real PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS apply only. Fingerprint: 5bae5af1da3258540c9d010c88023fa4ea668bacde0db12bc454e0a4ec6f2879. SQL hash: e5e6b0713a3bb4c42e23eaf90091799c52bc57b11b35f91f7f10af1fb91bd14b. Scope: 68 child-only card_printing inserts for bw7/Boundaries Crossed, dp1/Diamond & Pearl, hgss1/HeartGold & SoulSilver, pop5/POP Series 5, swsh3/Darkness Ablaze, swsh5/Battle Styles, swsh9/Brilliant Stars, xy4/Phantom Forces, 2017sm/McDonald\'s Collection 2017, and 2022swsh/McDonald\'s Collection 2022; finishes cosmos=30, normal=18, holo=17, reverse=3; target parents=65. Dry-run proof: aae9dbaf88d6d12c6a0c0d3f6ec18a7e15872056a3745e99878bb902216638c8 == aae9dbaf88d6d12c6a0c0d3f6ec18a7e15872056a3745e99878bb902216638c8. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.';

const EXPECTED_CHILD_ROWS = 68;
const EXPECTED_PARENT_ROWS = 65;
const EXPECTED_SET_COUNTS = {
  bw7: 7,
  dp1: 7,
  hgss1: 7,
  pop5: 7,
  swsh3: 7,
  swsh5: 7,
  swsh9: 7,
  xy4: 7,
  '2017sm': 6,
  '2022swsh': 6,
};
const EXPECTED_LIVE_SET_COUNTS = {
  bw7: 7,
  dp1: 7,
  hgss1: 7,
  mcd17: 6,
  mcd22: 6,
  pop5: 7,
  swsh3: 7,
  swsh5: 7,
  swsh9: 7,
  xy4: 7,
};
const EXPECTED_FINISH_COUNTS = { cosmos: 30, normal: 18, holo: 17, reverse: 3 };
const ALLOWED_FINISHES = new Set(Object.keys(EXPECTED_FINISH_COUNTS));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function targetRows(dryRun) {
  return (dryRun.scope?.rows ?? []).map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    set_key: row.set_key,
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
      by_set: countBy(result.rows, (row) => row.set_code),
    },
  };
}

function validateExpectedCounts(actual, expected, label, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${label}_${key}_count_not_${count}`);
  }
}

function validatePrerequisites({ gate, dryRun, rows }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('real_apply_gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('real_apply_gate_not_ready');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('real_apply_gate_fingerprint_mismatch');
  if (gate.package_scope?.sql_hash_sha256 !== SQL_HASH) findings.push('real_apply_gate_sql_hash_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('real_apply_gate_unexpected_write_ready');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) findings.push('dry_run_source_readiness_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.dry_run_execution_status !== 'pkg06j_active_finish_child_printing_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (rows.length !== EXPECTED_CHILD_ROWS) findings.push('target_row_count_not_68');
  if (new Set(rows.map((row) => row.card_print_id)).size !== EXPECTED_PARENT_ROWS) findings.push('target_parent_count_not_65');
  validateExpectedCounts(countBy(rows, (row) => row.set_key), EXPECTED_SET_COUNTS, 'target_set', findings);
  validateExpectedCounts(countBy(rows, (row) => row.finish_key), EXPECTED_FINISH_COUNTS, 'target_finish', findings);
  if (rows.some((row) => !ALLOWED_FINISHES.has(row.finish_key))) findings.push('target_contains_unapproved_finish');
  return findings;
}

function validateBeforeSnapshot({ beforeTargetSnapshot, beforeParentSnapshot, dryRun }) {
  const findings = [];
  if (beforeTargetSnapshot.hash_sha256 !== dryRun.before_snapshot?.hash_sha256) findings.push('before_target_snapshot_hash_does_not_match_dry_run_proof');
  if (beforeTargetSnapshot.counts.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push('before_parent_count_not_65');
  if (beforeTargetSnapshot.counts.existing_target_child_rows !== 0) findings.push('before_existing_target_child_rows_present');
  if (beforeTargetSnapshot.counts.planned_id_collision_rows !== 0) findings.push('before_planned_id_collision_rows_present');
  if (beforeParentSnapshot.count !== EXPECTED_PARENT_ROWS) findings.push('before_parent_snapshot_count_not_65');
  return findings;
}

function validateAfterSnapshot({ afterTargetSnapshot, beforeParentSnapshot, afterParentSnapshot, insertedRows }) {
  const findings = [];
  if (afterTargetSnapshot.counts.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push('after_parent_count_not_65');
  if (afterTargetSnapshot.counts.existing_target_child_rows !== EXPECTED_CHILD_ROWS) findings.push('after_existing_target_child_count_not_68');
  if (afterTargetSnapshot.counts.planned_id_collision_rows !== EXPECTED_CHILD_ROWS) findings.push('after_planned_id_collision_count_not_68');
  if (beforeParentSnapshot.hash_sha256 !== afterParentSnapshot.hash_sha256) findings.push('parent_snapshot_changed_unexpectedly');
  if (insertedRows.counts.inserted_rows_found !== EXPECTED_CHILD_ROWS) findings.push('inserted_rows_found_not_68');
  if (insertedRows.counts.provisional_rows !== 0) findings.push('inserted_provisional_rows_present');
  validateExpectedCounts(insertedRows.counts.by_set, EXPECTED_LIVE_SET_COUNTS, 'inserted_live_set', findings);
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
      `create temporary table pkg06j_real_apply_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg06j_real_apply_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.set_key,
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
         count(*) filter (where finish_key not in ('cosmos', 'normal', 'holo', 'reverse'))::int as unsupported_rows
       from pkg06j_real_apply_targets`,
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
    const grouped = await client.query(
      `select 'set' as kind, set_key as key, count(*)::int as count from pkg06j_real_apply_targets group by set_key
       union all
       select 'finish' as kind, finish_key as key, count(*)::int as count from pkg06j_real_apply_targets group by finish_key`,
    );
    const groupedFindings = [];
    validateExpectedCounts(
      Object.fromEntries(grouped.rows.filter((row) => row.kind === 'set').map((row) => [row.key, row.count])),
      EXPECTED_SET_COUNTS,
      'transaction_set',
      groupedFindings,
    );
    validateExpectedCounts(
      Object.fromEntries(grouped.rows.filter((row) => row.kind === 'finish').map((row) => [row.key, row.count])),
      EXPECTED_FINISH_COUNTS,
      'transaction_finish',
      groupedFindings,
    );
    if (groupedFindings.length !== 0) throw new Error(groupedFindings.join(', '));
    const lockParents = await client.query(
      `select cp.id
       from public.card_prints cp
       join (select distinct card_print_id from pkg06j_real_apply_targets) target on target.card_print_id = cp.id
       for update of cp`,
    );
    if (lockParents.rowCount !== EXPECTED_PARENT_ROWS) throw new Error(`locked parent count mismatch: ${lockParents.rowCount}`);
    const finishGuard = await client.query(
      `select count(*)::int as unsupported_finish_count
       from pkg06j_real_apply_targets target
       left join public.finish_keys fk
         on fk.key = target.finish_key
        and fk.is_active = true
       where fk.key is null`,
    );
    if (finishGuard.rows[0].unsupported_finish_count !== 0) throw new Error(`unsupported finish count: ${finishGuard.rows[0].unsupported_finish_count}`);
    const existingChildGuard = await client.query(
      `select count(*)::int as existing_child_count
       from pkg06j_real_apply_targets target
       join public.card_printings cpr
         on cpr.card_print_id = target.card_print_id
        and cpr.finish_key = target.finish_key`,
    );
    if (existingChildGuard.rows[0].existing_child_count !== 0) throw new Error(`existing target child count: ${existingChildGuard.rows[0].existing_child_count}`);
    const idCollisionGuard = await client.query(
      `select count(*)::int as id_collision_count
       from pkg06j_real_apply_targets target
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
       from pkg06j_real_apply_targets`,
    );
    if (insertResult.rowCount !== EXPECTED_CHILD_ROWS) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);
    await client.query('commit');
    const afterTargetSnapshot = await captureTargetSnapshot(client, rows);
    const afterParentSnapshot = await captureParentSnapshot(client, rows);
    const insertedRows = await captureInsertedRows(client, rows);
    return {
      connected: true,
      apply_status: 'pkg06j_active_finish_child_printing_real_apply_committed',
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
      apply_status: 'pkg06j_active_finish_child_printing_real_apply_failed_rolled_back',
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
    .slice(0, 30)
    .map((row) => `delete from public.card_printings where id = '${row.card_printing_id}'::uuid and card_print_id = '${row.card_print_id}'::uuid and finish_key = '${row.finish_key}';`)
    .join('\n');
}

function renderMarkdown(report) {
  return `# PKG-06J Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06J active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| inserted_rows | ${report.inserted_rows} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| parent_writes_performed | ${report.parent_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

## Inserted Counts

- by_set: ${JSON.stringify(report.verification_summary.inserted_by_set)}
- by_finish: ${JSON.stringify(report.verification_summary.inserted_by_finish)}
- parent_rows_unchanged: ${report.verification_summary.parent_rows_unchanged}

## Rollback Preview

\`\`\`sql
${report.rollback_proof.rollback_sql_preview}
\`\`\`

The JSON report contains all inserted row IDs for exact rollback targeting.
`;
}

function renderCheckpoint(report) {
  return `# PKG-06J Active Finish Child Printing Real Apply Checkpoint V1

Date: 2026-06-09

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| inserted_rows | ${report.inserted_rows} |
| parent_rows_unchanged | ${report.verification_summary.parent_rows_unchanged} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| parent_writes_performed | ${report.parent_writes_performed} |
| stop_findings | ${report.stop_findings.length} |

Real apply was scoped to 68 child-only card_printing inserts across 10 sets. No parent writes, migrations, deletes, merges, unsupported cleanup, or quarantine were performed.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06J Active Finish Child Printing Real Apply Checkpoint V1](20260609_pkg06j_active_finish_child_printing_real_apply_checkpoint_v1.md) | Records approved real apply for 68 active-finish child-only card_printing inserts across 10 sets; parent rows unchanged, no migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06j_active_finish_child_printing_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260609_pkg06j_active_finish_child_printing_real_apply_checkpoint_v1.md') ? line : existingLine
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
  version: 'english_master_index_pkg06j_active_finish_child_printing_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_sql_hash_sha256: SQL_HASH,
    approved_for_child_insert_rows: EXPECTED_CHILD_ROWS,
    approved_for_global_apply: false,
    approved_for_migrations: false,
    approved_for_deletes: false,
    approved_for_merges: false,
    approved_for_parent_writes: false,
  },
  apply_status: pass
    ? 'pkg06j_active_finish_child_printing_real_apply_committed_and_verified'
    : 'pkg06j_active_finish_child_printing_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  inserted_rows: applyResult.inserted_row_count,
  parent_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    child_card_printing_inserts: EXPECTED_CHILD_ROWS,
    target_parent_rows: EXPECTED_PARENT_ROWS,
    set_counts: EXPECTED_SET_COUNTS,
    finish_counts: EXPECTED_FINISH_COUNTS,
    global_apply_included: false,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_target_snapshot: applyResult.before_target_snapshot,
  after_target_snapshot: applyResult.after_target_snapshot,
  before_parent_snapshot: applyResult.before_parent_snapshot,
  after_parent_snapshot: applyResult.after_parent_snapshot,
  inserted_row_readback: applyResult.inserted_rows,
  rollback_proof: {
    rollback_selector: 'delete only inserted public.card_printings rows by exact id, card_print_id, and finish_key from this package.',
    inserted_row_ids: rows.map((row) => row.card_printing_id),
    rollback_sql_preview: rollbackSqlPreview(rows),
  },
  verification_summary: {
    before_hash_matches_dry_run_proof:
      applyResult.before_target_snapshot?.hash_sha256 === dryRun.before_snapshot?.hash_sha256,
    inserted_rows_found: applyResult.inserted_rows?.counts?.inserted_rows_found ?? 0,
    inserted_by_set: applyResult.inserted_rows?.counts?.by_set ?? {},
    inserted_by_finish: applyResult.inserted_rows?.counts?.by_finish ?? {},
    provisional_rows_inserted: applyResult.inserted_rows?.counts?.provisional_rows ?? null,
    parent_rows_unchanged:
      applyResult.before_parent_snapshot?.hash_sha256 === applyResult.after_parent_snapshot?.hash_sha256,
    master_index_comparison_status: pass ? 'pkg06j_active_finish_child_printing_verified_after_apply' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'No migrations were authorized or created.',
    'No deletes were authorized or performed.',
    'No merges were authorized or performed.',
    'No unsupported cleanup was authorized or performed.',
    'No parent writes were authorized or performed.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  apply_status: report.apply_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  inserted_rows: report.inserted_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_hash_matches_dry_run_proof: report.verification_summary.before_hash_matches_dry_run_proof,
  inserted_rows_found: report.verification_summary.inserted_rows_found,
  inserted_by_set: report.verification_summary.inserted_by_set,
  inserted_by_finish: report.verification_summary.inserted_by_finish,
  parent_rows_unchanged: report.verification_summary.parent_rows_unchanged,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  parent_writes_performed: report.parent_writes_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
