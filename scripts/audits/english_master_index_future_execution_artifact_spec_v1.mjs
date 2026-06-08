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
const PREWRITE_SNAPSHOT_SPEC_JSON = path.join(AUDIT_DIR, 'english_master_index_prewrite_snapshot_spec_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_future_execution_artifact_spec_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_future_execution_artifact_spec_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function summarizeMutationFields(entries) {
  const byChangedField = {};
  const bySet = {};
  for (const entry of entries) {
    const setKey = String(entry.set_key ?? '').trim() || 'unknown';
    bySet[setKey] = (bySet[setKey] ?? 0) + 1;
    for (const field of Object.keys(entry.direct_field_changes_under_review ?? {})) {
      byChangedField[field] = (byChangedField[field] ?? 0) + 1;
    }
  }
  return { byChangedField, bySet };
}

function buildFutureExecutionTargets(snapshotTargets) {
  return snapshotTargets.map((target) => ({
    card_print_id: target.card_print_id,
    row_fingerprint_sha256: target.row_fingerprint_sha256,
    set_key: target.set_key,
    set_name: target.set_name,
    review_priority: target.review_priority,
    allowed_field_changes: Object.keys(target.direct_field_changes_under_review ?? {}).sort(),
    proposed_fields_under_review: target.proposed_fields_under_review,
    rollback_source: 'fresh_prewrite_snapshot_required_after_approval',
    required_child_printing_rows_verified: target.child_printing_rows_verified,
    must_stop_if_vault_reference_appears: true,
  }));
}

function buildReport() {
  const approvalTemplate = readJson(APPROVAL_TEMPLATE_JSON);
  const approvalGuard = readJson(APPROVAL_GUARD_JSON);
  const prewriteSnapshotSpec = readJson(PREWRITE_SNAPSHOT_SPEC_JSON);
  const snapshotTargets = prewriteSnapshotSpec.snapshot_targets ?? [];
  const stopFindings = [];

  if (approvalTemplate.approval_recorded !== false) stopFindings.push('approval_template_records_approval');
  if (approvalTemplate.write_ready_now !== 0) stopFindings.push('approval_template_write_ready_nonzero');
  if (approvalGuard.guard_status !== 'pass_blank_template_verified_no_write') {
    stopFindings.push('approval_template_guard_not_passing');
  }
  if (approvalGuard.write_ready_now !== 0) stopFindings.push('approval_guard_write_ready_nonzero');
  if ((approvalGuard.row_findings ?? []).length !== 0) stopFindings.push('approval_guard_row_findings_present');
  if (prewriteSnapshotSpec.spec_status !== 'prewrite_snapshot_spec_complete_approval_required_no_write') {
    stopFindings.push('prewrite_snapshot_spec_not_complete');
  }
  if (prewriteSnapshotSpec.approval_recorded !== false) stopFindings.push('prewrite_snapshot_spec_records_approval');
  if (prewriteSnapshotSpec.db_reads_performed !== false) stopFindings.push('prewrite_snapshot_spec_reads_db');
  if (prewriteSnapshotSpec.write_ready_now !== 0) stopFindings.push('prewrite_snapshot_spec_write_ready_nonzero');
  if ((prewriteSnapshotSpec.stop_findings ?? []).length !== 0) stopFindings.push('prewrite_snapshot_spec_stop_findings_present');

  const packageFingerprint = approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null;
  if (approvalGuard.summary?.actual_package_fingerprint_sha256 !== packageFingerprint) {
    stopFindings.push('approval_guard_package_fingerprint_mismatch');
  }
  if (prewriteSnapshotSpec.package_scope?.package_fingerprint_sha256 !== packageFingerprint) {
    stopFindings.push('prewrite_snapshot_package_fingerprint_mismatch');
  }

  const executionTargets = buildFutureExecutionTargets(snapshotTargets);
  const { byChangedField, bySet } = summarizeMutationFields(snapshotTargets);

  const requiredArtifactSections = [
    {
      section: 'approval_proof',
      purpose: 'Prove explicit operator approval was recorded against the exact package fingerprint.',
      required_fields: ['approved_at', 'approved_by', 'package_fingerprint_sha256', 'approved_row_count', 'approved_row_fingerprints'],
      stop_if_missing: true,
    },
    {
      section: 'fresh_snapshot_proof',
      purpose: 'Prove a fresh before-state snapshot was captured after approval and before any future transaction.',
      required_fields: ['snapshot_captured_at', 'snapshot_artifact_ref', 'snapshot_target_count', 'snapshot_hash_sha256'],
      stop_if_missing: true,
    },
    {
      section: 'package_integrity',
      purpose: 'Prove the approval template, snapshot spec, fresh snapshot, and future mutation matrix share the same package fingerprint.',
      required_fields: ['package_id', 'package_fingerprint_sha256', 'source_artifact_hashes'],
      stop_if_missing: true,
    },
    {
      section: 'mutation_matrix',
      purpose: 'List exact row IDs and exact allowed field changes. No inferred or extra mutation is permitted.',
      required_fields: ['card_print_id', 'before_values', 'after_values', 'allowed_changed_fields', 'row_fingerprint_sha256'],
      stop_if_missing: true,
    },
    {
      section: 'rollback_matrix',
      purpose: 'List exact inverse changes from the fresh before-state snapshot.',
      required_fields: ['card_print_id', 'rollback_values', 'rollback_snapshot_ref'],
      stop_if_missing: true,
    },
    {
      section: 'transaction_boundary',
      purpose: 'Define one explicit transaction scope and row-lock/read-check behavior for the future write.',
      required_fields: ['transaction_mode', 'target_table', 'target_ids', 'pre_commit_checks'],
      stop_if_missing: true,
    },
    {
      section: 'dry_run_default_gate',
      purpose: 'Guarantee the future artifact cannot write unless an explicit apply flag is supplied after all gates pass.',
      required_fields: ['dry_run_default', 'apply_flag_name', 'apply_flag_default', 'non_interactive_guard'],
      stop_if_missing: true,
    },
    {
      section: 'pre_commit_verification',
      purpose: 'Verify row fingerprints, vault references, identity drift, child printing counts, and approved field scope before commit.',
      required_fields: ['fingerprint_check', 'vault_check', 'identity_drift_check', 'child_printing_count_check', 'field_scope_check'],
      stop_if_missing: true,
    },
    {
      section: 'post_apply_verification',
      purpose: 'Define verification queries and expected counts after a future commit.',
      required_fields: ['expected_updated_rows', 'expected_child_printing_rows', 'master_index_comparison_expected_status'],
      stop_if_missing: true,
    },
    {
      section: 'audit_log',
      purpose: 'Record future dry-run/apply attempts, operator identity, timestamps, checks, and generated artifacts.',
      required_fields: ['attempt_id', 'operator', 'started_at', 'finished_at', 'mode', 'result', 'artifact_refs'],
      stop_if_missing: true,
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_future_execution_artifact_spec_v1',
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    write_ready_now: 0,
    spec_status: stopFindings.length === 0
      ? 'future_execution_artifact_spec_complete_approval_required_no_write'
      : 'stop_future_execution_artifact_spec_not_safe',
    purpose: 'Define the required shape of a future dry-run-default transactional execution artifact for PKG-01, without creating executable SQL or an apply runner.',
    source_artifacts: {
      approval_record_template: path.relative(ROOT, APPROVAL_TEMPLATE_JSON).replaceAll('\\', '/'),
      approval_template_guard: path.relative(ROOT, APPROVAL_GUARD_JSON).replaceAll('\\', '/'),
      prewrite_snapshot_spec: path.relative(ROOT, PREWRITE_SNAPSHOT_SPEC_JSON).replaceAll('\\', '/'),
    },
    package_scope: {
      package_id: 'PKG-01',
      package_fingerprint_sha256: packageFingerprint,
      card_print_rows: prewriteSnapshotSpec.package_scope?.card_print_rows ?? executionTargets.length,
      child_printing_rows_verified: prewriteSnapshotSpec.package_scope?.child_printing_rows_verified ?? 0,
      affected_sets: prewriteSnapshotSpec.package_scope?.affected_sets ?? Object.keys(bySet).length,
      approval_guard_status: approvalGuard.guard_status,
      by_set: bySet,
      by_changed_field: byChangedField,
    },
    required_artifact_sections: requiredArtifactSections,
    future_execution_targets: executionTargets,
    future_transaction_rules: [
      'Future execution artifact must default to dry-run mode.',
      'Future apply mode must require an explicit flag and recorded operator approval.',
      'Future transaction must stop before commit if any target row fingerprint differs from the fresh snapshot.',
      'Future transaction must stop before commit if any target row has vault ownership references.',
      'Future transaction must stop before commit if child printing rows no longer match reviewed master-verified scope.',
      'Future transaction may update only explicitly approved card_print display/identity fields.',
      'Future transaction may not insert, delete, hide, quarantine, or normalize unrelated rows.',
      'Future post-apply verification must prove exact updated row count and Master Index comparison status.',
    ],
    explicit_non_authorizations: [
      'This specification is not approval.',
      'This specification is not a DB snapshot.',
      'This specification is not an execution artifact.',
      'This specification is not SQL.',
      'This specification is not a migration.',
      'This specification does not create an apply runner.',
      'This specification does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Future Execution Artifact Spec V1');
  lines.push('');
  lines.push('This is a no-write specification for a future dry-run-default transactional execution artifact.');
  lines.push('');
  lines.push('It does not create SQL, execute writes, capture a DB snapshot, create a migration, or authorize an apply path.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| audit_only | ${report.audit_only} |`);
  lines.push(`| spec_status | ${report.spec_status} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| apply_paths_executed | ${report.apply_paths_executed} |`);
  lines.push(`| pass | ${report.pass} |`);
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
  lines.push(`| approval_guard_status | ${report.package_scope.approval_guard_status} |`);
  lines.push('');
  lines.push('## Required Future Artifact Sections');
  lines.push('');
  lines.push('| Section | Purpose | Required Fields | Stop If Missing |');
  lines.push('| --- | --- | --- | --- |');
  for (const section of report.required_artifact_sections) {
    lines.push(`| ${mdEscape(section.section)} | ${mdEscape(section.purpose)} | ${mdEscape(section.required_fields.join(', '))} | ${section.stop_if_missing} |`);
  }
  lines.push('');
  lines.push('## Future Transaction Rules');
  lines.push('');
  for (const rule of report.future_transaction_rules) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Target Summary By Set');
  lines.push('');
  lines.push('| Set | Rows |');
  lines.push('| --- | ---: |');
  for (const [setKey, count] of Object.entries(report.package_scope.by_set).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(setKey)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Source approval template: \`${report.source_artifacts.approval_record_template}\``);
  lines.push(`Source approval guard: \`${report.source_artifacts.approval_template_guard}\``);
  lines.push(`Source prewrite snapshot spec: \`${report.source_artifacts.prewrite_snapshot_spec}\``);
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
      spec_status: report.spec_status,
      package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
      card_print_rows: report.package_scope.card_print_rows,
      child_printing_rows_verified: report.package_scope.child_printing_rows_verified,
      affected_sets: report.package_scope.affected_sets,
      required_artifact_sections: report.required_artifact_sections.length,
      db_reads_performed: report.db_reads_performed,
      write_ready_now: report.write_ready_now,
      approval_recorded: report.approval_recorded,
      pass: report.pass,
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
