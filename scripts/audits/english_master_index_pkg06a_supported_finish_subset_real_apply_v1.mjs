import crypto from 'node:crypto';
import fs from 'node:fs';
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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06a_supported_finish_subset_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06a_supported_finish_subset_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS';
const PACKAGE_FINGERPRINT = '4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9';
const SQL_HASH = '54599d99925c9e8fcbdfe694b1bfab0fd801e45e1e3e2ffe616fcbb48de05e98';
const SOURCE_ARTIFACT_FINGERPRINT = 'a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120';
const APPROVAL_TEXT = 'Approve real PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS apply only. Fingerprint: 4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9. SQL hash: 54599d99925c9e8fcbdfe694b1bfab0fd801e45e1e3e2ffe616fcbb48de05e98. Scope: 115 child-only card_printing inserts for pl3/Supreme Victors, finishes normal=113 and cosmos=2. Blocked finish-taxonomy rows remain excluded: 282. Dry-run proof: 3f045c7dd1742d32a742cdfd891e6709bf3306e42073cb148c3d9b67e8fe5b2d == 3f045c7dd1742d32a742cdfd891e6709bf3306e42073cb148c3d9b67e8fe5b2d. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.';

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
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function targetRows(dryRun) {
  return (dryRun.supported_subset?.rows ?? []).map((row) => ({
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
    finish_counts: snapshotRows
      .filter((row) => row.row_type === 'existing_target_child')
      .reduce((counts, row) => ({ ...counts, [row.finish_key]: (counts[row.finish_key] ?? 0) + 1 }), {}),
  };
}

async function captureParentSnapshot(client, rows) {
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.set_id::text as set_id,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.rarity
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
      normal: result.rows.filter((row) => row.finish_key === 'normal').length,
      cosmos: result.rows.filter((row) => row.finish_key === 'cosmos').length,
      provisional_rows: result.rows.filter((row) => row.is_provisional === true).length,
    },
  };
}

function validatePrerequisites({ gate, dryRun, rows }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('real_apply_gate_approval_text_mismatch');
  }
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('real_apply_gate_fingerprint_mismatch');
  }
  if (gate.package_scope?.sql_hash_sha256 !== SQL_HASH) findings.push('real_apply_gate_sql_hash_mismatch');
  if (gate.apply_allowed !== false) findings.push('real_apply_gate_unexpected_apply_allowed');
  if (gate.write_ready_now !== 0) findings.push('real_apply_gate_write_ready_nonzero');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.source_artifact_fingerprint_sha256 !== SOURCE_ARTIFACT_FINGERPRINT) {
    findings.push('dry_run_source_artifact_fingerprint_mismatch');
  }
  if (dryRun.dry_run_execution_status !== 'pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_durable_state_not_proven_unchanged');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.supported_subset?.child_printing_rows !== 115) findings.push('dry_run_child_count_not_115');
  if (dryRun.supported_subset?.target_parent_rows !== 115) findings.push('dry_run_parent_count_not_115');
  if (dryRun.supported_subset?.set_counts?.pl3 !== 115) findings.push('dry_run_pl3_count_not_115');
  if (dryRun.supported_subset?.finish_counts?.normal !== 113) findings.push('dry_run_normal_count_not_113');
  if (dryRun.supported_subset?.finish_counts?.cosmos !== 2) findings.push('dry_run_cosmos_count_not_2');
  if (dryRun.blocked_subset?.child_printing_rows !== 282) findings.push('dry_run_blocked_count_not_282');

  if (rows.length !== 115) findings.push('target_row_count_not_115');
  if (new Set(rows.map((row) => row.card_print_id)).size !== 115) findings.push('target_parent_count_not_115');
  if (rows.some((row) => row.set_key !== 'pl3')) findings.push('target_contains_non_pl3_row');
  if (rows.filter((row) => row.finish_key === 'normal').length !== 113) findings.push('target_normal_count_not_113');
  if (rows.filter((row) => row.finish_key === 'cosmos').length !== 2) findings.push('target_cosmos_count_not_2');
  if (rows.some((row) => !['normal', 'cosmos'].includes(row.finish_key))) {
    findings.push('target_contains_unsupported_finish_for_this_package');
  }
  return findings;
}

function validateBeforeSnapshot({ beforeTargetSnapshot, beforeParentSnapshot, dryRun }) {
  const findings = [];
  if (beforeTargetSnapshot.hash_sha256 !== dryRun.before_snapshot?.hash_sha256) {
    findings.push('before_target_snapshot_hash_does_not_match_dry_run_proof');
  }
  if (beforeTargetSnapshot.counts.target_parent_rows !== 115) findings.push('before_parent_count_not_115');
  if (beforeTargetSnapshot.counts.existing_target_child_rows !== 0) {
    findings.push('before_existing_target_child_rows_present');
  }
  if (beforeTargetSnapshot.counts.planned_id_collision_rows !== 0) {
    findings.push('before_planned_id_collision_rows_present');
  }
  if (beforeParentSnapshot.count !== 115) findings.push('before_parent_snapshot_count_not_115');
  return findings;
}

function validateAfterSnapshot({ afterTargetSnapshot, beforeParentSnapshot, afterParentSnapshot, insertedRows }) {
  const findings = [];
  if (afterTargetSnapshot.counts.target_parent_rows !== 115) findings.push('after_parent_count_not_115');
  if (afterTargetSnapshot.counts.existing_target_child_rows !== 115) {
    findings.push('after_existing_target_child_count_not_115');
  }
  if (afterTargetSnapshot.counts.planned_id_collision_rows !== 115) {
    findings.push('after_planned_id_collision_count_not_115');
  }
  if (afterTargetSnapshot.finish_counts.normal !== 113) findings.push('after_normal_count_not_113');
  if (afterTargetSnapshot.finish_counts.cosmos !== 2) findings.push('after_cosmos_count_not_2');
  if (beforeParentSnapshot.hash_sha256 !== afterParentSnapshot.hash_sha256) {
    findings.push('parent_snapshot_changed_unexpectedly');
  }
  if (insertedRows.counts.inserted_rows_found !== 115) findings.push('inserted_rows_found_not_115');
  if (insertedRows.counts.normal !== 113) findings.push('inserted_normal_count_not_113');
  if (insertedRows.counts.cosmos !== 2) findings.push('inserted_cosmos_count_not_2');
  if (insertedRows.counts.provisional_rows !== 0) findings.push('inserted_provisional_rows_present');
  return findings;
}

async function applyPackage({ dryRun, rows }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_target_snapshot: null,
      after_target_snapshot: null,
      before_parent_snapshot: null,
      after_parent_snapshot: null,
      inserted_rows: null,
      inserted_row_count: 0,
      committed: false,
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
    await client.query("set local statement_timeout = '60s'");
    await client.query(
      `create temporary table pkg06a_real_apply_targets (
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
      `insert into pkg06a_real_apply_targets (
         card_printing_id,
         card_print_id,
         set_key,
         card_number,
         card_name,
         finish_key,
         provenance_source,
         provenance_ref,
         created_by
       )
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
         count(*) filter (where finish_key = 'normal')::int as normal_rows,
         count(*) filter (where finish_key = 'cosmos')::int as cosmos_rows,
         count(*) filter (where finish_key not in ('normal', 'cosmos'))::int as unsupported_rows
       from pkg06a_real_apply_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.child_rows !== 115 ||
      shapeRow.parent_rows !== 115 ||
      shapeRow.set_rows !== 1 ||
      shapeRow.normal_rows !== 113 ||
      shapeRow.cosmos_rows !== 2 ||
      shapeRow.unsupported_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }

    const lockParents = await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg06a_real_apply_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    if (lockParents.rowCount !== 115) throw new Error(`locked parent count mismatch: ${lockParents.rowCount}`);

    const finishGuard = await client.query(
      `select count(*)::int as unsupported_finish_count
       from pkg06a_real_apply_targets target
       left join public.finish_keys fk
         on fk.key = target.finish_key
        and fk.is_active = true
       where fk.key is null`,
    );
    if (finishGuard.rows[0].unsupported_finish_count !== 0) {
      throw new Error(`unsupported finish count: ${finishGuard.rows[0].unsupported_finish_count}`);
    }

    const existingChildGuard = await client.query(
      `select count(*)::int as existing_child_count
       from pkg06a_real_apply_targets target
       join public.card_printings cpr
         on cpr.card_print_id = target.card_print_id
        and cpr.finish_key = target.finish_key`,
    );
    if (existingChildGuard.rows[0].existing_child_count !== 0) {
      throw new Error(`existing target child count: ${existingChildGuard.rows[0].existing_child_count}`);
    }

    const idCollisionGuard = await client.query(
      `select count(*)::int as id_collision_count
       from pkg06a_real_apply_targets target
       join public.card_printings cpr on cpr.id = target.card_printing_id`,
    );
    if (idCollisionGuard.rows[0].id_collision_count !== 0) {
      throw new Error(`planned id collision count: ${idCollisionGuard.rows[0].id_collision_count}`);
    }

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
       from pkg06a_real_apply_targets`,
    );
    if (insertResult.rowCount !== 115) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);

    const finalGuard = await client.query(
      `select
         count(*)::int as inserted_rows,
         count(*) filter (where cpr.finish_key = 'normal')::int as normal_rows,
         count(*) filter (where cpr.finish_key = 'cosmos')::int as cosmos_rows,
         count(*) filter (where cpr.is_provisional = true)::int as provisional_rows
       from public.card_printings cpr
       join pkg06a_real_apply_targets target on target.card_printing_id = cpr.id`,
    );
    const final = finalGuard.rows[0];
    if (
      final.inserted_rows !== 115 ||
      final.normal_rows !== 113 ||
      final.cosmos_rows !== 2 ||
      final.provisional_rows !== 0
    ) {
      throw new Error(`final insert guard mismatch: ${JSON.stringify(final)}`);
    }

    await client.query('commit');
    const afterTargetSnapshot = await captureTargetSnapshot(client, rows);
    const afterParentSnapshot = await captureParentSnapshot(client, rows);
    const insertedRows = await captureInsertedRows(client, rows);
    return {
      connected: true,
      apply_status: 'pkg06a_supported_finish_subset_real_apply_committed',
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
      apply_status: 'pkg06a_supported_finish_subset_real_apply_failed_rolled_back',
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

function buildRollbackSqlPreview(rows) {
  return rows
    .slice(0, 20)
    .map((row) => `delete from public.card_printings where id = '${row.card_printing_id}'::uuid and card_print_id = '${row.card_print_id}'::uuid and finish_key = '${row.finish_key}';`)
    .join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# PKG-06A Supported Finish Subset Real Apply V1');
  lines.push('');
  lines.push('This report records the approved real apply for the PKG-06A supported-finish child-only insert subset.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| inserted_rows | ${report.inserted_rows} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| parent_writes_performed | ${report.parent_writes_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Before And After');
  lines.push('');
  lines.push('| Snapshot | Hash | target parents | existing target child rows | planned id collisions |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  lines.push(`| before | \`${report.before_target_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.before_target_snapshot?.counts?.target_parent_rows ?? null} | ${report.before_target_snapshot?.counts?.existing_target_child_rows ?? null} | ${report.before_target_snapshot?.counts?.planned_id_collision_rows ?? null} |`);
  lines.push(`| after | \`${report.after_target_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.after_target_snapshot?.counts?.target_parent_rows ?? null} | ${report.after_target_snapshot?.counts?.existing_target_child_rows ?? null} | ${report.after_target_snapshot?.counts?.planned_id_collision_rows ?? null} |`);
  lines.push('');
  lines.push('## Verification Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.verification_summary)) {
    lines.push(`- ${key}: ${mdEscape(value)}`);
  }
  lines.push('');
  lines.push('## Rollback Preview');
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
  lines.push('');
  lines.push('The JSON report contains all 115 inserted row IDs for exact rollback targeting.');
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-06A Supported Finish Subset Real Apply Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved real apply for 115 supported child-only PKG-06A card_printing inserts.

## Result

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| inserted_rows | ${report.inserted_rows} |
| normal_inserted | ${report.verification_summary.normal_inserted} |
| cosmos_inserted | ${report.verification_summary.cosmos_inserted} |
| parent_rows_unchanged | ${report.verification_summary.parent_rows_unchanged} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| parent_writes_performed | ${report.parent_writes_performed} |
| blocked_finish_taxonomy_rows_excluded | ${report.package_scope.blocked_finish_taxonomy_rows_excluded} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- Real apply was scoped to 115 child-only card_printing inserts.
- Parent rows were not changed.
- Blocked finish-taxonomy rows remain excluded.
- No migrations.
- No global apply.
- No deletes, merges, unsupported cleanup, or quarantine.

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06A Supported Finish Subset Real Apply Checkpoint V1](20260609_pkg06a_supported_finish_subset_real_apply_checkpoint_v1.md) | Records approved real apply for 115 child-only pl3 card_printing inserts, normal=113 and cosmos=2, parent rows unchanged, 282 finish-taxonomy rows excluded, no migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06a_supported_finish_subset_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg06a_supported_finish_subset_real_apply_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
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
      before_target_snapshot: null,
      after_target_snapshot: null,
      before_parent_snapshot: null,
      after_parent_snapshot: null,
      inserted_rows: null,
      inserted_row_count: 0,
      committed: false,
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
  version: 'english_master_index_pkg06a_supported_finish_subset_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_sql_hash_sha256: SQL_HASH,
    approved_for_child_insert_rows: 115,
    approved_for_set_key: 'pl3',
    approved_for_global_apply: false,
    approved_for_migrations: false,
    approved_for_deletes: false,
    approved_for_merges: false,
    approved_for_parent_writes: false,
  },
  apply_status: pass
    ? 'pkg06a_supported_finish_subset_real_apply_committed_and_verified'
    : 'pkg06a_supported_finish_subset_real_apply_failed_or_blocked',
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
    source_artifact_fingerprint_sha256: SOURCE_ARTIFACT_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    set_key: 'pl3',
    set_name: 'Supreme Victors',
    child_card_printing_inserts: 115,
    target_parent_rows: 115,
    finish_counts: {
      normal: 113,
      cosmos: 2,
    },
    blocked_finish_taxonomy_rows_excluded: 282,
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
    rollback_sql_preview: buildRollbackSqlPreview(rows),
  },
  verification_summary: {
    before_hash_matches_dry_run_proof:
      applyResult.before_target_snapshot?.hash_sha256 === dryRun.before_snapshot?.hash_sha256,
    inserted_rows_found: applyResult.inserted_rows?.counts?.inserted_rows_found ?? 0,
    normal_inserted: applyResult.inserted_rows?.counts?.normal ?? 0,
    cosmos_inserted: applyResult.inserted_rows?.counts?.cosmos ?? 0,
    provisional_rows_inserted: applyResult.inserted_rows?.counts?.provisional_rows ?? null,
    parent_rows_unchanged:
      applyResult.before_parent_snapshot?.hash_sha256 === applyResult.after_parent_snapshot?.hash_sha256,
    blocked_finish_taxonomy_rows_still_excluded: true,
    master_index_comparison_status: pass ? 'pkg06a_supported_finish_subset_verified_after_apply' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'No migrations were authorized or created.',
    'No deletes were authorized or performed.',
    'No merges were authorized or performed.',
    'No unsupported cleanup was authorized or performed.',
    'No parent writes were authorized or performed.',
    'The 282 blocked finish-taxonomy rows remain excluded.',
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
  normal_inserted: report.verification_summary.normal_inserted,
  cosmos_inserted: report.verification_summary.cosmos_inserted,
  parent_rows_unchanged: report.verification_summary.parent_rows_unchanged,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  parent_writes_performed: report.parent_writes_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
