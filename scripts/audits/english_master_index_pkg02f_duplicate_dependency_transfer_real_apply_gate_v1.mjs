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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02f_duplicate_dependency_transfer_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = '21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function validateInputs(dryRun, artifact) {
  const findings = [];
  if (dryRun.dry_run_execution_status !== 'pkg02f_duplicate_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_before_after_hash_mismatch');
  if (dryRun.artifact_fresh_snapshot_matches_before_snapshot !== true) findings.push('dry_run_fresh_snapshot_drift');
  if (dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_performed !== false) findings.push('dry_run_reports_real_apply');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.package_scope?.duplicate_parent_rows !== 21) findings.push('dry_run_parent_count_not_21');
  if (dryRun.package_scope?.duplicate_child_printing_rows !== 23) findings.push('dry_run_child_count_not_23');
  if (dryRun.package_scope?.number_key_collision_rows_excluded !== 58) findings.push('dry_run_number_key_exclusion_count_not_58');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');
  if (dryRun.sql_artifact?.contains_delete_statement !== true) findings.push('dry_run_sql_missing_delete_simulation');
  if (dryRun.sql_artifact?.contains_update_statement !== true) findings.push('dry_run_sql_missing_update_simulation');

  if (artifact.artifact_status !== 'pkg02f_duplicate_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('artifact_status_not_ready');
  }
  if (artifact.pass !== true) findings.push('artifact_report_not_passing');
  if (artifact.db_writes_performed !== false) findings.push('artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('artifact_reports_migration');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');
  if (artifact.package_scope?.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package_id');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if (artifact.package_scope?.duplicate_parent_rows !== 21) findings.push('artifact_parent_count_not_21');
  if (artifact.package_scope?.duplicate_child_printing_rows !== 23) findings.push('artifact_child_count_not_23');
  if (artifact.package_scope?.number_key_collision_rows_excluded !== 58) findings.push('artifact_number_key_exclusion_count_not_58');
  return findings;
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const artifact = readJson(ARTIFACT_JSON);
  const stopFindings = validateInputs(dryRun, artifact);
  const beforeHash = dryRun.execution_result?.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.execution_result?.after_snapshot?.hash_sha256 ?? null;
  const exactApprovalPhrase = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. Scope: 21 duplicate parent rows, 23 duplicate child printings, external mapping transfer, 58 number-key collision rows excluded. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations.`;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_gate_v1',
    audit_only: true,
    approval_gate_only: true,
    real_apply_gate_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    apply_allowed: false,
    write_ready_now: 0,
    approval_gate_status: stopFindings.length === 0
      ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
      : 'blocked_before_real_apply_operator_decision',
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      duplicate_parent_rows: 21,
      duplicate_child_printing_rows: 23,
      number_key_collision_rows_excluded: 58,
      allowed_parent_dependency_transfer: ['external_mappings.card_print_id'],
      allowed_deletes_if_later_approved: ['card_printings duplicate child rows', 'card_prints duplicate parent rows'],
      global_apply_included: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: dryRun.sql_artifact?.path ?? null,
      sql_artifact_hash_sha256: dryRun.sql_artifact?.actual_sha256 ?? null,
      contains_commit_statement: dryRun.sql_artifact?.contains_commit_statement ?? null,
      contains_rollback_statement: dryRun.sql_artifact?.contains_rollback_statement ?? null,
      contains_delete_statement: dryRun.sql_artifact?.contains_delete_statement ?? null,
      contains_update_statement: dryRun.sql_artifact?.contains_update_statement ?? null,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      artifact_fresh_snapshot_matches_before_snapshot: dryRun.artifact_fresh_snapshot_matches_before_snapshot,
      stop_findings: dryRun.stop_findings ?? [],
    },
    rollback_proof: {
      source_artifact_snapshot_hash_sha256: artifact.fresh_snapshot?.hash_sha256 ?? null,
      source_artifact_ref: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
      parent_merge_matrix_rows: artifact.parent_merge_matrix?.length ?? 0,
      child_merge_matrix_rows: artifact.child_merge_matrix?.length ?? 0,
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect: 'This would authorize preparing and running the durable PKG-02F apply path only, scoped to dependency transfer for 21 duplicate parent rows and 23 duplicate child printings. It does not authorize global apply or the 58 number-key collision rows.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        duplicate_parent_rows: 21,
        duplicate_child_printing_rows: 23,
        number_key_collision_rows_excluded: 58,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same 21 duplicate parent rows, 23 duplicate child printings, and zero blocked child refs.',
      'Execute a durable transaction with COMMIT only after this exact real-apply approval is present.',
      'Capture post-apply readback and verify duplicate parents/children are removed, survivor rows remain, and number-key collisions stay untouched.',
      'Run post-apply preflight and checkpoint.',
    ],
    explicit_non_authorizations: [
      'This gate is not a real apply.',
      'This gate does not record approval.',
      'This gate does not run SQL.',
      'This gate does not write to the database.',
      'This gate does not create a migration.',
      'This gate does not authorize global apply.',
      'This gate does not authorize the 58 number-key collision rows.',
    ],
    source_artifacts: {
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      dry_run_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02F Duplicate Dependency Transfer Real Apply Gate V1');
  lines.push('');
  lines.push('This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approval_gate_status | ${report.approval_gate_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Dry-Run Proof');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_proof.dry_run_execution_status} |`);
  lines.push(`| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |`);
  lines.push(`| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |`);
  lines.push(`| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| artifact_fresh_snapshot_matches_before_snapshot | ${report.dry_run_proof.artifact_fresh_snapshot_matches_before_snapshot} |`);
  lines.push(`| contains_commit_statement | ${report.dry_run_proof.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.dry_run_proof.contains_rollback_statement} |`);
  lines.push(`| contains_delete_statement | ${report.dry_run_proof.contains_delete_statement} |`);
  lines.push('');
  lines.push('## Required Approval Phrase');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_decision.exact_approval_phrase_required);
  lines.push('```');
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02F Duplicate Dependency Transfer Real Apply Gate Checkpoint V1](20260609_pkg02f_duplicate_dependency_transfer_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate after successful rollback-only dry run for 21 duplicate parent rows and 23 duplicate child printings. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02f_duplicate_dependency_transfer_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02f_duplicate_dependency_transfer_real_apply_gate_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  approval_gate_status: report.approval_gate_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  dry_run_before_hash_sha256: report.dry_run_proof.before_hash_sha256,
  dry_run_after_hash_sha256: report.dry_run_proof.after_hash_sha256,
  duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
  duplicate_child_printing_rows: report.package_scope.duplicate_child_printing_rows,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
