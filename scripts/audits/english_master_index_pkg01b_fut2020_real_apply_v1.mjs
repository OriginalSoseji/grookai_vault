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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_gate_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01b_fut2020_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-01B-FUT2020';
const PACKAGE_FINGERPRINT = 'c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63';
const APPROVAL_TEXT = 'Approve real PKG-01B-FUT2020 apply only. Fingerprint: c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63. Parent scope: 4 set_code updates. Child scope: 8 unsupported holo/reverse deletes. Dry-run proof: 9129574db351ca002e3e5b0a0122ebd375d31d8725945bb419d61d120339db22 == 9129574db351ca002e3e5b0a0122ebd375d31d8725945bb419d61d120339db22. No global apply. No migrations.';

const OPTIONAL_CHILD_DEPENDENCIES = [
  { table: 'vault_item_instances', column: 'card_printing_id', activeClause: 'archived_at is null' },
  { table: 'external_printing_mappings', column: 'card_printing_id' },
  { table: 'canon_warehouse_candidates', column: 'promoted_card_printing_id' },
  { table: 'card_printing_truth_reviews', column: 'card_printing_id' },
  { table: 'justtcg_grookai_mappings', column: 'card_printing_id' },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function tableColumnExists(client, table, column) {
  const result = await client.query(
    `select exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1
         and column_name = $2
     ) as exists`,
    [table, column],
  );
  return result.rows[0]?.exists === true;
}

async function countChildDependencies(client, childIds) {
  const dependencyRows = {};
  for (const dep of OPTIONAL_CHILD_DEPENDENCIES) {
    const exists = await tableColumnExists(client, dep.table, dep.column);
    if (!exists) {
      dependencyRows[dep.table] = {
        table: dep.table,
        column: dep.column,
        available: false,
        total_refs: null,
        by_card_printing_id: {},
      };
      continue;
    }

    const where = dep.activeClause ? `and ${dep.activeClause}` : '';
    const result = await client.query(
      `select ${dep.column}::text as card_printing_id, count(*)::int as refs
       from public.${dep.table}
       where ${dep.column} = any($1::uuid[])
       ${where}
       group by ${dep.column}`,
      [childIds],
    );
    const byId = {};
    for (const row of result.rows) byId[row.card_printing_id] = row.refs;
    dependencyRows[dep.table] = {
      table: dep.table,
      column: dep.column,
      available: true,
      total_refs: result.rows.reduce((sum, row) => sum + row.refs, 0),
      by_card_printing_id: byId,
    };
  }
  return dependencyRows;
}

async function captureSnapshot(client, cardPrintIds, deleteCandidateIds) {
  const result = await client.query(
    `select
       cp.id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.set_id,
       cp.updated_at,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', cpr.id,
           'finish_key', cpr.finish_key,
           'provenance_source', cpr.provenance_source,
           'provenance_ref', cpr.provenance_ref
         ) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
       (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
       (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
       (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by nullif(regexp_replace(coalesce(cp.number_plain, cp.number), '[^0-9]', '', 'g'), '')::int nulls last`,
    [cardPrintIds],
  );

  const rows = result.rows.map((row) => ({
    card_print_id: row.id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    name: row.name,
    set_id: row.set_id,
    updated_at: row.updated_at,
    card_printings: row.card_printings,
    dependency_counts: {
      external_mappings: row.external_mappings_count,
      card_print_identity: row.identity_rows_count,
      card_print_traits: row.trait_rows_count,
      vault_items: row.vault_items_count,
    },
  }));
  const childDependencySummary = deleteCandidateIds.length > 0
    ? await countChildDependencies(client, deleteCandidateIds)
    : {};

  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    child_dependency_summary: childDependencySummary,
    counts: {
      card_prints_found: rows.length,
      card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
      parent_vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
      child_dependency_refs_found: Object.values(childDependencySummary).reduce(
        (sum, dep) => sum + Number(dep.total_refs ?? 0),
        0,
      ),
      normal_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'normal').length,
        0,
      ),
      holo_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'holo').length,
        0,
      ),
      reverse_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'reverse').length,
        0,
      ),
    },
  };
}

function validatePrerequisites(gate, artifact, dryRun) {
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
  if (gate.apply_allowed !== false) findings.push('real_apply_gate_unexpected_apply_allowed');
  if (gate.write_ready_now !== 0) findings.push('real_apply_gate_write_ready_nonzero');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');

  if (artifact.artifact_status !== 'pkg01b_fut2020_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_not_ready');
  }
  if (artifact.pass !== true) findings.push('source_artifact_not_passing');
  if (artifact.package_scope?.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('source_artifact_fingerprint_mismatch');
  }
  if (artifact.package_scope?.parent_set_code_updates !== 4) findings.push('source_artifact_parent_update_count_not_four');
  if (artifact.package_scope?.child_delete_candidates !== 8) findings.push('source_artifact_delete_count_not_eight');
  if (artifact.package_scope?.child_keep_rows !== 4) findings.push('source_artifact_keep_count_not_four');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');

  if (dryRun.dry_run_execution_status !== 'pkg01b_fut2020_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_durable_state_not_proven_unchanged');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('dry_run_fingerprint_mismatch');
  }
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');

  return findings;
}

function validateBeforeSnapshot(snapshot, parentIds, deleteIds) {
  const findings = [];
  if (snapshot.counts.card_prints_found !== 4) findings.push('before_parent_count_not_four');
  if (snapshot.counts.card_printings_found !== 12) findings.push('before_child_count_not_twelve');
  if (snapshot.counts.parent_vault_items_found !== 0) findings.push('before_parent_vault_refs_present');
  if (snapshot.counts.child_dependency_refs_found !== 0) findings.push('before_child_dependency_refs_present');
  if (snapshot.counts.normal_printings_found !== 4) findings.push('before_normal_count_not_four');
  if (snapshot.counts.holo_printings_found !== 4) findings.push('before_holo_count_not_four');
  if (snapshot.counts.reverse_printings_found !== 4) findings.push('before_reverse_count_not_four');

  const seenParentIds = new Set(snapshot.rows.map((row) => row.card_print_id));
  for (const id of parentIds) {
    if (!seenParentIds.has(id)) findings.push(`before_missing_parent_${id}`);
  }
  const seenDeleteIds = new Set();
  for (const row of snapshot.rows) {
    if (row.set_code !== null) findings.push(`before_parent_set_code_not_null_${row.card_print_id}`);
    const finishes = row.card_printings.map((printing) => printing.finish_key).sort().join(',');
    if (finishes !== 'holo,normal,reverse') findings.push(`before_finish_scope_mismatch_${row.card_print_id}`);
    for (const printing of row.card_printings) {
      if (deleteIds.includes(printing.id)) seenDeleteIds.add(printing.id);
    }
  }
  for (const id of deleteIds) {
    if (!seenDeleteIds.has(id)) findings.push(`before_missing_delete_candidate_${id}`);
  }
  return findings;
}

function validateAfterSnapshot(snapshot, parentIds) {
  const findings = [];
  if (snapshot.counts.card_prints_found !== 4) findings.push('after_parent_count_not_four');
  if (snapshot.counts.card_printings_found !== 4) findings.push('after_child_count_not_four');
  if (snapshot.counts.parent_vault_items_found !== 0) findings.push('after_parent_vault_refs_present');
  if (snapshot.counts.child_dependency_refs_found !== 0) findings.push('after_child_dependency_refs_present');
  if (snapshot.counts.normal_printings_found !== 4) findings.push('after_normal_count_not_four');
  if (snapshot.counts.holo_printings_found !== 0) findings.push('after_holo_count_not_zero');
  if (snapshot.counts.reverse_printings_found !== 0) findings.push('after_reverse_count_not_zero');

  const seenParentIds = new Set(snapshot.rows.map((row) => row.card_print_id));
  for (const id of parentIds) {
    if (!seenParentIds.has(id)) findings.push(`after_missing_parent_${id}`);
  }
  for (const row of snapshot.rows) {
    if (row.set_code !== 'fut2020') findings.push(`after_parent_set_code_not_fut2020_${row.card_print_id}`);
    const finishes = row.card_printings.map((printing) => printing.finish_key).sort().join(',');
    if (finishes !== 'normal') findings.push(`after_finish_scope_mismatch_${row.card_print_id}`);
  }
  return findings;
}

async function applyPkg01b({ artifact }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      updated_rows: 0,
      deleted_rows: 0,
      committed: false,
    };
  }

  const parentRows = artifact.mutation_matrix ?? [];
  const childRows = artifact.child_printing_matrix ?? [];
  const parentIds = parentRows.map((row) => row.card_print_id);
  const deleteRows = childRows.filter((row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only');
  const keepRows = childRows.filter((row) => row.action === 'keep');
  const deleteIds = deleteRows.map((row) => row.card_printing_id);
  const keepIds = keepRows.map((row) => row.card_printing_id);

  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, parentIds, deleteIds);
    const beforeFindings = validateBeforeSnapshot(beforeSnapshot, parentIds, deleteIds);
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        updated_rows: 0,
        deleted_rows: 0,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '30s'");

    const lockedParents = await client.query(
      `select id, set_code, number, number_plain, name
       from public.card_prints
       where id = any($1::uuid[])
       for update`,
      [parentIds],
    );
    if (lockedParents.rowCount !== 4) throw new Error(`locked parent count mismatch: ${lockedParents.rowCount}`);

    const expectedByParentId = new Map(parentRows.map((row) => [row.card_print_id, row]));
    for (const locked of lockedParents.rows) {
      const expected = expectedByParentId.get(locked.id);
      if (!expected) throw new Error(`unexpected locked parent: ${locked.id}`);
      if (
        locked.set_code !== null ||
        locked.number !== expected.before_values_from_fresh_snapshot.number ||
        locked.number_plain !== expected.before_values_from_fresh_snapshot.number_plain ||
        locked.name !== expected.before_values_from_fresh_snapshot.name
      ) {
        throw new Error(`locked parent drifted before apply: ${locked.id}`);
      }
    }

    const lockedChildren = await client.query(
      `select id, card_print_id, finish_key
       from public.card_printings
       where card_print_id = any($1::uuid[])
       for update`,
      [parentIds],
    );
    if (lockedChildren.rowCount !== 12) throw new Error(`locked child count mismatch: ${lockedChildren.rowCount}`);

    const lockedDeleteIds = new Set();
    const lockedKeepIds = new Set();
    for (const row of lockedChildren.rows) {
      if (deleteIds.includes(row.id)) lockedDeleteIds.add(row.id);
      if (keepIds.includes(row.id)) lockedKeepIds.add(row.id);
    }
    for (const id of deleteIds) {
      if (!lockedDeleteIds.has(id)) throw new Error(`delete candidate missing in lock scope: ${id}`);
    }
    for (const id of keepIds) {
      if (!lockedKeepIds.has(id)) throw new Error(`keep row missing in lock scope: ${id}`);
    }

    const dependencySnapshot = await captureSnapshot(client, parentIds, deleteIds);
    const dependencyFindings = validateBeforeSnapshot(dependencySnapshot, parentIds, deleteIds);
    if (dependencyFindings.length !== 0) {
      throw new Error(`transaction dependency guard failed: ${dependencyFindings.join(', ')}`);
    }

    const updateResult = await client.query(
      `update public.card_prints
       set set_code = 'fut2020'
       where id = any($1::uuid[])
         and set_code is null`,
      [parentIds],
    );
    if (updateResult.rowCount !== 4) throw new Error(`parent update count mismatch: ${updateResult.rowCount}`);

    const deleteResult = await client.query(
      `delete from public.card_printings
       where id = any($1::uuid[])
         and finish_key = any($2::text[])`,
      [deleteIds, ['holo', 'reverse']],
    );
    if (deleteResult.rowCount !== 8) throw new Error(`child delete count mismatch: ${deleteResult.rowCount}`);

    const finalCheck = await client.query(
      `select
         (select count(*)::int from public.card_prints where id = any($1::uuid[]) and set_code = 'fut2020') as resolved_parents,
         (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as remaining_children,
         (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[]) and finish_key = 'normal') as remaining_normal,
         (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[]) and finish_key in ('holo', 'reverse')) as remaining_unsupported`,
      [parentIds],
    );
    const final = finalCheck.rows[0];
    if (
      final.resolved_parents !== 4 ||
      final.remaining_children !== 4 ||
      final.remaining_normal !== 4 ||
      final.remaining_unsupported !== 0
    ) {
      throw new Error(`final transaction guard failed: ${JSON.stringify(final)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, parentIds, deleteIds);
    return {
      connected: true,
      apply_status: 'pkg01b_fut2020_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: updateResult.rowCount,
      deleted_rows: deleteResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const parentIds = artifact.mutation_matrix.map((row) => row.card_print_id);
    const deleteIds = artifact.child_printing_matrix
      .filter((row) => row.action === 'delete_candidate_approved_for_dry_run_artifact_only')
      .map((row) => row.card_printing_id);
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, parentIds, deleteIds) : null;
    return {
      connected: true,
      apply_status: 'pkg01b_fut2020_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: 0,
      deleted_rows: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildRollbackSqlPreview(rollbackMatrix) {
  const parentUpdates = rollbackMatrix.map((row) => (
    `update public.card_prints set set_code = ${sqlString(row.parent_rollback_values_from_fresh_snapshot.set_code)} where id = '${row.card_print_id}'::uuid and set_code = 'fut2020';`
  ));
  const childNotes = rollbackMatrix.flatMap((row) =>
    row.child_printing_reinsert_snapshot_for_delete_candidates.map((printing) =>
      `-- reinsert card_printings snapshot id=${printing.id} card_print_id=${printing.card_print_id} finish_key=${printing.finish_key}`),
  );
  return [...parentUpdates, ...childNotes].join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Real Apply V1');
  lines.push('');
  lines.push('This report records the real `PKG-01B-FUT2020` apply authorized by the operator.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| updated_rows | ${report.updated_rows} |`);
  lines.push(`| deleted_rows | ${report.deleted_rows} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| global_apply_included | ${report.package_scope.global_apply_included} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Before And After');
  lines.push('');
  lines.push('| Snapshot | Hash | parent rows | child rows | normal | holo | reverse | vault refs | child deps |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(`| before | \`${report.before_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.before_snapshot?.counts?.card_prints_found ?? null} | ${report.before_snapshot?.counts?.card_printings_found ?? null} | ${report.before_snapshot?.counts?.normal_printings_found ?? null} | ${report.before_snapshot?.counts?.holo_printings_found ?? null} | ${report.before_snapshot?.counts?.reverse_printings_found ?? null} | ${report.before_snapshot?.counts?.parent_vault_items_found ?? null} | ${report.before_snapshot?.counts?.child_dependency_refs_found ?? null} |`);
  lines.push(`| after | \`${report.after_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.after_snapshot?.counts?.card_prints_found ?? null} | ${report.after_snapshot?.counts?.card_printings_found ?? null} | ${report.after_snapshot?.counts?.normal_printings_found ?? null} | ${report.after_snapshot?.counts?.holo_printings_found ?? null} | ${report.after_snapshot?.counts?.reverse_printings_found ?? null} | ${report.after_snapshot?.counts?.parent_vault_items_found ?? null} | ${report.after_snapshot?.counts?.child_dependency_refs_found ?? null} |`);
  lines.push('');
  lines.push('## Verification Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.verification_summary)) {
    lines.push(`- ${key}: ${mdEscape(value)}`);
  }
  lines.push('');
  lines.push('## Rollback Proof');
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
  lines.push('');
  lines.push('The source JSON artifact contains exact full child reinsert snapshots for all eight deleted child rows.');
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
  return `# PKG-01B-FUT2020 Real Apply Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved real apply for PKG-01B-FUT2020 after successful rollback-only dry-run proof.

## Result

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| updated_rows | ${report.updated_rows} |
| deleted_rows | ${report.deleted_rows} |
| before_hash_sha256 | \`${report.before_snapshot?.hash_sha256 ?? 'not_available'}\` |
| after_hash_sha256 | \`${report.after_snapshot?.hash_sha256 ?? 'not_available'}\` |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| global_apply_included | ${report.package_scope.global_apply_included} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- Real apply was scoped to PKG-01B-FUT2020 only.
- Parent rows updated: 4.
- Child unsupported rows deleted: 8.
- Remaining child rows: 4 normal printings.
- No migrations.
- No global apply.
- No cleanup or quarantine outside the explicitly approved child delete scope.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_real_apply_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_real_apply_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Real Apply Checkpoint V1](20260609_pkg01b_fut2020_real_apply_checkpoint_v1.md) | Records approved real apply for fut2020 cards #2-#5: four parent set_code updates, eight unsupported holo/reverse child deletes, post-apply verification, no migrations, and no global apply. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_real_apply_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const artifact = readJson(ARTIFACT_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const prerequisiteFindings = validatePrerequisites(gate, artifact, dryRun);
const applyResult = prerequisiteFindings.length === 0
  ? await applyPkg01b({ artifact })
  : {
      connected: false,
      apply_status: 'blocked_prerequisite_findings_present',
      error_message: prerequisiteFindings.join(', '),
      before_snapshot: null,
      after_snapshot: null,
      updated_rows: 0,
      deleted_rows: 0,
      committed: false,
    };

const parentIds = (artifact.mutation_matrix ?? []).map((row) => row.card_print_id);
const afterFindings = applyResult.after_snapshot
  ? validateAfterSnapshot(applyResult.after_snapshot, parentIds)
  : ['after_snapshot_unavailable'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg01b_fut2020_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg01b_fut2020_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_set_key: 'fut2020',
    approved_parent_scope: '4 set_code updates',
    approved_child_scope: '8 unsupported holo/reverse deletes',
    approved_for_global_apply: false,
    approved_for_migrations: false,
  },
  apply_status: pass ? 'pkg01b_fut2020_real_apply_committed_and_verified' : 'pkg01b_fut2020_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  updated_rows: applyResult.updated_rows,
  deleted_rows: applyResult.deleted_rows,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    set_key: 'fut2020',
    target_numbers: ['2', '3', '4', '5'],
    parent_card_print_rows: 4,
    child_printing_rows_before: 12,
    child_printing_rows_after: 4,
    allowed_parent_field_changes: ['set_code'],
    allowed_child_delete_finish_keys: ['holo', 'reverse'],
    global_apply_included: false,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    transaction_artifact_preparation: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  rollback_proof: {
    rollback_matrix: artifact.rollback_matrix,
    rollback_sql_preview: buildRollbackSqlPreview(artifact.rollback_matrix ?? []),
    child_reinsert_snapshots: (artifact.rollback_matrix ?? []).flatMap(
      (row) => row.child_printing_reinsert_snapshot_for_delete_candidates ?? [],
    ),
  },
  verification_summary: {
    before_hash_sha256: applyResult.before_snapshot?.hash_sha256 ?? null,
    after_hash_sha256: applyResult.after_snapshot?.hash_sha256 ?? null,
    parent_set_code_resolved: applyResult.after_snapshot?.rows?.every((row) => row.set_code === 'fut2020') ?? false,
    child_printing_count_reduced_to_index: applyResult.after_snapshot?.counts?.card_printings_found === 4,
    normal_printings_remaining: applyResult.after_snapshot?.counts?.normal_printings_found === 4,
    unsupported_holo_reverse_removed: (
      applyResult.after_snapshot?.counts?.holo_printings_found === 0 &&
      applyResult.after_snapshot?.counts?.reverse_printings_found === 0
    ),
    vault_items_still_zero: applyResult.after_snapshot?.counts?.parent_vault_items_found === 0,
    child_dependency_refs_still_zero: applyResult.after_snapshot?.counts?.child_dependency_refs_found === 0,
    master_index_comparison_status: pass ? 'pkg01b_fut2020_verified_by_index_after_apply' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized.',
    'No migrations were authorized or created.',
    'No cleanup or quarantine outside the eight approved child delete candidates was authorized.',
    'No vault, ownership, pricing, scanner, marketplace, or UI rows were changed.',
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
  updated_rows: report.updated_rows,
  deleted_rows: report.deleted_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_child_printings: report.before_snapshot?.counts?.card_printings_found ?? null,
  after_child_printings: report.after_snapshot?.counts?.card_printings_found ?? null,
  after_normal_printings: report.after_snapshot?.counts?.normal_printings_found ?? null,
  after_holo_printings: report.after_snapshot?.counts?.holo_printings_found ?? null,
  after_reverse_printings: report.after_snapshot?.counts?.reverse_printings_found ?? null,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
