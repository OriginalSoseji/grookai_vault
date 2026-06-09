import fs from 'node:fs';
import path from 'node:path';

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
const RECONCILE_PREVIEW_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_reconcile_dry_run_preview_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_operator_approval_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01_operator_approval_gate_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function buildReport() {
  const approvalTemplate = readJson(APPROVAL_TEMPLATE_JSON);
  const approvalGuard = readJson(APPROVAL_GUARD_JSON);
  const reconcilePreview = readJson(RECONCILE_PREVIEW_JSON);
  const stopFindings = [];

  if (approvalTemplate.approval_recorded !== false) stopFindings.push('approval_template_records_approval');
  if (approvalTemplate.write_ready_now !== 0) stopFindings.push('approval_template_write_ready_nonzero');
  if (approvalGuard.guard_status !== 'pass_blank_template_verified_no_write') stopFindings.push('approval_guard_not_passing');
  if (approvalGuard.summary?.blank_entries !== approvalGuard.summary?.approval_template_rows) {
    stopFindings.push('approval_template_not_fully_blank');
  }
  if (reconcilePreview.preview_status !== 'dry_run_reconcile_preview_complete_apply_blocked_no_approval') {
    stopFindings.push('reconcile_preview_not_ready');
  }
  if (reconcilePreview.db_writes_performed !== false) stopFindings.push('reconcile_preview_reports_db_writes');
  if (reconcilePreview.apply_allowed !== false) stopFindings.push('reconcile_preview_allows_apply');
  if (reconcilePreview.write_ready_now !== 0) stopFindings.push('reconcile_preview_write_ready_nonzero');
  if ((reconcilePreview.stop_findings ?? []).length !== 0) stopFindings.push('reconcile_preview_stop_findings_present');

  const packageFingerprint = approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null;
  if (approvalGuard.summary?.actual_package_fingerprint_sha256 !== packageFingerprint) {
    stopFindings.push('approval_guard_fingerprint_mismatch');
  }
  if (reconcilePreview.package_scope?.package_fingerprint_sha256 !== packageFingerprint) {
    stopFindings.push('reconcile_preview_fingerprint_mismatch');
  }

  const approvalReadiness = stopFindings.length === 0
    ? 'ready_for_operator_decision_apply_blocked_no_write'
    : 'blocked_before_operator_decision';

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01_operator_approval_gate_v1',
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    write_ready_now: 0,
    apply_allowed: false,
    approval_gate_status: approvalReadiness,
    purpose: 'State whether PKG-01 is ready for explicit operator approval review while keeping execution blocked.',
    package_scope: {
      package_id: 'PKG-01',
      package_fingerprint_sha256: packageFingerprint,
      card_print_rows: reconcilePreview.package_scope?.card_print_rows ?? 0,
      child_printing_rows_verified: reconcilePreview.package_scope?.child_printing_rows_verified ?? 0,
      affected_sets: reconcilePreview.package_scope?.affected_sets ?? 0,
      mutation_matrix_rows: reconcilePreview.mutation_matrix?.length ?? 0,
      rollback_matrix_rows: reconcilePreview.rollback_matrix?.length ?? 0,
      current_db_card_prints_found: reconcilePreview.current_db_snapshot?.impact_counts?.card_prints_found ?? null,
      current_db_card_printings_found: reconcilePreview.current_db_snapshot?.impact_counts?.card_printings_found ?? null,
      current_db_vault_items_found: reconcilePreview.current_db_snapshot?.impact_counts?.vault_items_found ?? null,
      current_db_snapshot_hash_sha256: reconcilePreview.current_db_snapshot?.snapshot_hash_sha256 ?? null,
    },
    source_statuses: {
      approval_template_status: approvalTemplate.approval_status,
      approval_template_blank_entries: approvalGuard.summary?.blank_entries ?? 0,
      approval_template_rows: approvalGuard.summary?.approval_template_rows ?? 0,
      approval_guard_status: approvalGuard.guard_status,
      reconcile_preview_status: reconcilePreview.preview_status,
      reconcile_preview_stop_findings: reconcilePreview.stop_findings?.length ?? 0,
    },
    required_operator_decision: {
      decision_needed: true,
      acceptable_decisions: [
        'approve_pkg01_for_final_snapshot_and_execution_artifact',
        'reject_pkg01',
        'request_pkg01_changes',
      ],
      approval_must_reference: {
        package_id: 'PKG-01',
        package_fingerprint_sha256: packageFingerprint,
        card_print_rows: reconcilePreview.package_scope?.card_print_rows ?? 0,
        child_printing_rows_verified: reconcilePreview.package_scope?.child_printing_rows_verified ?? 0,
      },
      approval_effect: 'Approval would only allow the next no-write-to-write-adjacent step: capture a final fresh snapshot and create a dry-run-default guarded execution artifact. It would not itself write to the DB.',
    },
    next_step_if_approved_later: [
      'Record explicit approval in a separate approval record artifact.',
      'Capture a final fresh DB snapshot immediately after approval.',
      'Compare the final snapshot against this reconcile preview.',
      'Create a separate guarded transaction artifact that defaults to dry-run.',
      'Run that artifact in dry-run before any apply execution is considered.',
    ],
    explicit_non_authorizations: [
      'This approval gate is not approval.',
      'This approval gate is not an approval record.',
      'This approval gate is not SQL.',
      'This approval gate is not a migration.',
      'This approval gate does not create an apply runner.',
      'This approval gate does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.',
    ],
    source_artifacts: {
      approval_record_template: path.relative(ROOT, APPROVAL_TEMPLATE_JSON).replaceAll('\\', '/'),
      approval_template_guard: path.relative(ROOT, APPROVAL_GUARD_JSON).replaceAll('\\', '/'),
      reconcile_dry_run_preview: path.relative(ROOT, RECONCILE_PREVIEW_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01 Operator Approval Gate V1');
  lines.push('');
  lines.push('This report states whether PKG-01 is ready for explicit operator approval review.');
  lines.push('');
  lines.push('It does not record approval, write to the DB, create SQL, create a migration, or create an apply runner.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approval_gate_status | ${report.approval_gate_status} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
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
  lines.push(`| mutation_matrix_rows | ${report.package_scope.mutation_matrix_rows} |`);
  lines.push(`| rollback_matrix_rows | ${report.package_scope.rollback_matrix_rows} |`);
  lines.push(`| current_db_card_prints_found | ${report.package_scope.current_db_card_prints_found} |`);
  lines.push(`| current_db_card_printings_found | ${report.package_scope.current_db_card_printings_found} |`);
  lines.push(`| current_db_vault_items_found | ${report.package_scope.current_db_vault_items_found} |`);
  lines.push(`| current_db_snapshot_hash_sha256 | \`${report.package_scope.current_db_snapshot_hash_sha256}\` |`);
  lines.push('');
  lines.push('## Required Operator Decision');
  lines.push('');
  lines.push(`Approval must reference package \`${report.required_operator_decision.approval_must_reference.package_id}\` and fingerprint \`${report.required_operator_decision.approval_must_reference.package_fingerprint_sha256}\`.`);
  lines.push('');
  lines.push('Acceptable decisions:');
  for (const decision of report.required_operator_decision.acceptable_decisions) lines.push(`- ${decision}`);
  lines.push('');
  lines.push('## Next Step If Approved Later');
  lines.push('');
  for (const step of report.next_step_if_approved_later) lines.push(`- ${step}`);
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

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      generated_files: [
        path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
        path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      ],
      approval_gate_status: report.approval_gate_status,
      package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
      card_print_rows: report.package_scope.card_print_rows,
      child_printing_rows_verified: report.package_scope.child_printing_rows_verified,
      mutation_matrix_rows: report.package_scope.mutation_matrix_rows,
      rollback_matrix_rows: report.package_scope.rollback_matrix_rows,
      approval_recorded: report.approval_recorded,
      write_ready_now: report.write_ready_now,
      apply_allowed: report.apply_allowed,
      stop_findings: report.stop_findings.length,
      db_writes_performed: report.db_writes_performed,
      migrations_created: report.migrations_created,
      cleanup_performed: report.cleanup_performed,
      quarantine_performed: report.quarantine_performed,
    },
    null,
    2,
  ),
);
