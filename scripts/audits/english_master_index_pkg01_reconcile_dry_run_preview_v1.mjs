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

const APPROVAL_TEMPLATE_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_record_template_v1.json');
const APPROVAL_GUARD_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_template_guard_v1.json');
const PREWRITE_SNAPSHOT_SPEC_JSON = path.join(AUDIT_DIR, 'english_master_index_prewrite_snapshot_spec_v1.json');
const FUTURE_EXECUTION_SPEC_JSON = path.join(AUDIT_DIR, 'english_master_index_future_execution_artifact_spec_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_reconcile_dry_run_preview_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01_reconcile_dry_run_preview_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileHash(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function normalizeEmpty(value) {
  if (value === undefined || value === null) return null;
  const stringValue = String(value);
  return stringValue.length === 0 ? null : stringValue;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readOnlySnapshot(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const rowsResult = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
         (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
         (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.id`,
      [cardPrintIds],
    );
    const impactResult = await client.query(
      `select
         count(*)::int as card_prints_found,
         coalesce(sum((select count(*) from public.card_printings cpr where cpr.card_print_id = cp.id)), 0)::int as card_printings_found,
         coalesce(sum((select count(*) from public.external_mappings em where em.card_print_id = cp.id)), 0)::int as external_mappings_found,
         coalesce(sum((select count(*) from public.card_print_identity cpi where cpi.card_print_id = cp.id)), 0)::int as identity_rows_found,
         coalesce(sum((select count(*) from public.card_print_traits cpt where cpt.card_print_id = cp.id)), 0)::int as trait_rows_found,
         coalesce(sum((select count(*) from public.vault_items vi where vi.card_id = cp.id)), 0)::int as vault_items_found
       from public.card_prints cp
       where cp.id = any($1::uuid[])`,
      [cardPrintIds],
    );
    await client.query('rollback');
    const rows = rowsResult.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      card_printings: row.card_printings,
      dependency_counts: {
        external_mappings: row.external_mappings_count,
        card_print_identity: row.identity_rows_count,
        card_print_traits: row.trait_rows_count,
        vault_items: row.vault_items_count,
      },
    }));
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      impact_counts: impactResult.rows[0] ?? {},
      snapshot_hash_sha256: sha256(JSON.stringify(rows)),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only DB snapshot failed: ${error.message}`,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMatrices(entries, snapshot) {
  const snapshotById = new Map((snapshot.rows ?? []).map((row) => [row.card_print_id, row]));
  const mutationMatrix = [];
  const rollbackMatrix = [];
  const driftFindings = [];
  for (const entry of entries) {
    const snapshotRow = snapshotById.get(entry.card_print_id);
    const current = snapshotRow?.card_print ?? {};
    const currentFields = {
      set_code: normalizeEmpty(current.set_code),
      number: normalizeEmpty(current.number),
      name: normalizeEmpty(current.name),
      number_plain: normalizeEmpty(current.number_plain),
      set_id: current.set_id ?? null,
    };
    const approvedSnapshotFields = entry.current_fields ?? {};
    for (const field of ['set_code', 'number', 'name', 'number_plain', 'set_id']) {
      if (normalizeEmpty(currentFields[field]) !== normalizeEmpty(approvedSnapshotFields[field])) {
        driftFindings.push({
          card_print_id: entry.card_print_id,
          field,
          approval_template_value: normalizeEmpty(approvedSnapshotFields[field]),
          current_db_value: normalizeEmpty(currentFields[field]),
        });
      }
    }
    const proposedFields = entry.proposed_fields ?? {};
    const allowedChangedFields = Object.keys(entry.direct_field_changes ?? {}).sort();
    const dryRunChanges = {};
    for (const field of allowedChangedFields) {
      dryRunChanges[field] = {
        before: currentFields[field],
        after: proposedFields[field] ?? null,
      };
    }
    mutationMatrix.push({
      card_print_id: entry.card_print_id,
      row_fingerprint_sha256: entry.row_fingerprint_sha256,
      set_key: entry.set_key,
      set_name: entry.set_name,
      source_external_id: entry.source_external_id,
      source_card_url: entry.source_card_url,
      allowed_changed_fields: allowedChangedFields,
      before_values_from_current_db: currentFields,
      approved_after_values: proposedFields,
      dry_run_changes: dryRunChanges,
      child_printing_rows_expected: entry.child_printing_rows_verified,
      child_printing_rows_current: snapshotRow?.card_printings?.length ?? null,
      dependency_counts: snapshotRow?.dependency_counts ?? {},
      evidence_sources: entry.evidence_sources ?? [],
      dry_run_row_status: snapshotRow ? 'preview_only_apply_blocked_no_approval' : 'blocked_missing_current_db_row',
    });
    rollbackMatrix.push({
      card_print_id: entry.card_print_id,
      rollback_values_from_current_db_snapshot: {
        set_code: currentFields.set_code,
        number: currentFields.number,
        name: currentFields.name,
      },
      rollback_source: 'current_read_only_snapshot',
      rollback_available: Boolean(snapshotRow),
    });
  }
  return { mutationMatrix, rollbackMatrix, driftFindings };
}

function summarizeRows(entries, mutationMatrix) {
  const bySet = {};
  const byChangedField = {};
  let childPrintingRows = 0;
  for (const entry of entries) {
    bySet[entry.set_key] = (bySet[entry.set_key] ?? 0) + 1;
    childPrintingRows += Number(entry.child_printing_rows_verified ?? 0);
  }
  for (const row of mutationMatrix) {
    for (const field of row.allowed_changed_fields) byChangedField[field] = (byChangedField[field] ?? 0) + 1;
  }
  return {
    card_print_rows: entries.length,
    child_printing_rows_verified: childPrintingRows,
    affected_sets: Object.keys(bySet).length,
    by_set: bySet,
    by_changed_field: byChangedField,
  };
}

async function buildReport() {
  const approvalTemplate = readJson(APPROVAL_TEMPLATE_JSON);
  const approvalGuard = readJson(APPROVAL_GUARD_JSON);
  const prewriteSnapshotSpec = readJson(PREWRITE_SNAPSHOT_SPEC_JSON);
  const futureExecutionSpec = readJson(FUTURE_EXECUTION_SPEC_JSON);
  const entries = approvalTemplate.approval_entries ?? [];
  const snapshot = await readOnlySnapshot(entries.map((entry) => entry.card_print_id));
  const { mutationMatrix, rollbackMatrix, driftFindings } = buildMatrices(entries, snapshot);
  const stopFindings = [];

  if (approvalTemplate.approval_recorded !== false) stopFindings.push('approval_template_records_approval');
  if (approvalGuard.guard_status !== 'pass_blank_template_verified_no_write') stopFindings.push('approval_guard_not_passing');
  if (prewriteSnapshotSpec.spec_status !== 'prewrite_snapshot_spec_complete_approval_required_no_write') {
    stopFindings.push('prewrite_snapshot_spec_not_complete');
  }
  if (futureExecutionSpec.spec_status !== 'future_execution_artifact_spec_complete_approval_required_no_write') {
    stopFindings.push('future_execution_artifact_spec_not_complete');
  }
  if (!snapshot.available) stopFindings.push('current_db_snapshot_unavailable');
  if (Number(snapshot.impact_counts?.card_prints_found ?? 0) !== entries.length) stopFindings.push('current_db_target_rows_missing');
  if (Number(snapshot.impact_counts?.vault_items_found ?? 0) !== 0) stopFindings.push('vault_items_reference_target_rows');
  if (mutationMatrix.some((row) => row.child_printing_rows_current !== row.child_printing_rows_expected)) {
    stopFindings.push('child_printing_count_differs_from_reviewed_scope');
  }
  if (driftFindings.length !== 0) stopFindings.push('current_db_drift_from_approval_template_snapshot');

  const summary = summarizeRows(entries, mutationMatrix);
  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01_reconcile_dry_run_preview_v1',
    audit_only: true,
    dry_run_only: true,
    db_reads_performed: snapshot.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    write_ready_now: 0,
    apply_allowed: false,
    preview_status: stopFindings.length === 0
      ? 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
      : 'dry_run_reconcile_preview_blocked_stop_findings_present',
    package_scope: {
      package_id: 'PKG-01',
      package_fingerprint_sha256: approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null,
      ...summary,
    },
    source_artifacts: {
      approval_record_template: path.relative(ROOT, APPROVAL_TEMPLATE_JSON).replaceAll('\\', '/'),
      approval_template_guard: path.relative(ROOT, APPROVAL_GUARD_JSON).replaceAll('\\', '/'),
      prewrite_snapshot_spec: path.relative(ROOT, PREWRITE_SNAPSHOT_SPEC_JSON).replaceAll('\\', '/'),
      future_execution_artifact_spec: path.relative(ROOT, FUTURE_EXECUTION_SPEC_JSON).replaceAll('\\', '/'),
    },
    source_artifact_hashes_sha256: {
      approval_record_template: fileHash(APPROVAL_TEMPLATE_JSON),
      approval_template_guard: fileHash(APPROVAL_GUARD_JSON),
      prewrite_snapshot_spec: fileHash(PREWRITE_SNAPSHOT_SPEC_JSON),
      future_execution_artifact_spec: fileHash(FUTURE_EXECUTION_SPEC_JSON),
    },
    current_db_snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      captured_at: snapshot.captured_at ?? null,
      snapshot_hash_sha256: snapshot.snapshot_hash_sha256 ?? null,
      impact_counts: snapshot.impact_counts,
    },
    approval_proof: {
      approval_recorded: false,
      approval_status: 'not_recorded_apply_blocked',
      package_fingerprint_sha256: approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null,
      approved_row_count: 0,
    },
    dry_run_gate: {
      dry_run_default: true,
      apply_flag_available_in_this_artifact: false,
      reason_apply_blocked: 'Operator approval is not recorded and this preview is not executable.',
    },
    mutation_matrix: mutationMatrix,
    rollback_matrix: rollbackMatrix,
    drift_findings: driftFindings,
    stop_findings: stopFindings,
    pass_for_preview: stopFindings.length === 0,
    explicit_non_authorizations: [
      'This preview is not approval.',
      'This preview is not SQL.',
      'This preview is not a migration.',
      'This preview does not create an apply runner.',
      'This preview does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.',
    ],
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01 Reconcile Dry-Run Preview V1');
  lines.push('');
  lines.push('This is the first consolidated DB reconcile preview for PKG-01.');
  lines.push('');
  lines.push('It reads current DB state in a read-only transaction and produces before/after/rollback matrices. It does not write to the DB and cannot apply changes.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| preview_status | ${report.preview_status} |`);
  lines.push(`| dry_run_only | ${report.dry_run_only} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| apply_paths_executed | ${report.apply_paths_executed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Package Scope');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| card_print_rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| child_printing_rows_verified | ${report.package_scope.child_printing_rows_verified} |`);
  lines.push(`| affected_sets | ${report.package_scope.affected_sets} |`);
  lines.push(`| current_db_card_prints_found | ${report.current_db_snapshot.impact_counts?.card_prints_found ?? null} |`);
  lines.push(`| current_db_card_printings_found | ${report.current_db_snapshot.impact_counts?.card_printings_found ?? null} |`);
  lines.push(`| vault_items_found | ${report.current_db_snapshot.impact_counts?.vault_items_found ?? null} |`);
  lines.push(`| snapshot_hash_sha256 | \`${report.current_db_snapshot.snapshot_hash_sha256 ?? 'not_available'}\` |`);
  lines.push('');
  lines.push('## Rows By Set');
  lines.push('');
  lines.push('| Set | Rows |');
  lines.push('| --- | ---: |');
  for (const [setKey, count] of Object.entries(report.package_scope.by_set).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(setKey)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Changed Fields');
  lines.push('');
  lines.push('| Field | Rows |');
  lines.push('| --- | ---: |');
  for (const [field, count] of Object.entries(report.package_scope.by_changed_field).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(field)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

const report = await buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      generated_files: [
        path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
        path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      ],
      preview_status: report.preview_status,
      package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
      card_print_rows: report.package_scope.card_print_rows,
      child_printing_rows_verified: report.package_scope.child_printing_rows_verified,
      db_reads_performed: report.db_reads_performed,
      db_writes_performed: report.db_writes_performed,
      migrations_created: report.migrations_created,
      cleanup_performed: report.cleanup_performed,
      quarantine_performed: report.quarantine_performed,
      apply_allowed: report.apply_allowed,
      write_ready_now: report.write_ready_now,
      stop_findings: report.stop_findings.length,
    },
    null,
    2,
  ),
);
