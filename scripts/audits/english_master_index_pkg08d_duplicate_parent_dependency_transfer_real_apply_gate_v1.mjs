import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = 'b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8';

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

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function validateInputs(dryRun, artifact) {
  const findings = [];
  if (dryRun.dry_run_execution_status !== 'pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change') {
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
  if (dryRun.package_scope?.duplicate_parent_rows !== 39) findings.push('dry_run_parent_count_not_39');
  if (dryRun.package_scope?.groups !== 38) findings.push('dry_run_group_count_not_38');

  if (artifact.artifact_status !== 'pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('artifact_status_not_ready');
  }
  if (artifact.pass !== true) findings.push('artifact_report_not_passing');
  if (artifact.db_writes_performed !== false) findings.push('artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('artifact_reports_migration');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');
  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package_id');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if (artifact.package_scope?.duplicate_parent_rows !== 39) findings.push('artifact_parent_count_not_39');
  if (artifact.package_scope?.groups !== 38) findings.push('artifact_group_count_not_38');
  return findings;
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const artifact = readJson(ARTIFACT_JSON);
  const stopFindings = validateInputs(dryRun, artifact);
  const beforeHash = dryRun.execution_result?.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.execution_result?.after_snapshot?.hash_sha256 ?? null;
  const sqlHash = artifact.sql_artifact?.sha256 ?? dryRun.sql_artifact?.actual_sha256 ?? null;
  const exactApprovalPhrase = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. SQL hash: ${sqlHash}. Scope: 38 groups, 39 duplicate parent dependency transfers. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations.`;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_v1',
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
      duplicate_parent_rows: 39,
      groups: 38,
      planned_updates: artifact.package_scope?.planned_updates ?? {},
      global_apply_included: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: dryRun.sql_artifact?.path ?? null,
      sql_artifact_hash_sha256: sqlHash,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      artifact_fresh_snapshot_matches_before_snapshot: dryRun.artifact_fresh_snapshot_matches_before_snapshot,
      stop_findings: dryRun.stop_findings ?? [],
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect: 'This would authorize a durable PKG-08D apply only, scoped to dependency transfer and deletion of the 39 duplicate parent rows after one more final fresh snapshot.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        sql_hash_sha256: sqlHash,
        duplicate_parent_rows: 39,
        groups: 38,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same 39 duplicate parent rows still have zero child rows and only allowed dependencies.',
      'Execute a durable transaction with COMMIT only after exact real-apply approval is present.',
      'Capture post-apply readback and verify duplicate parents are removed, survivor parents remain, and dependencies moved.',
      'Run post-apply preflight and checkpoint.',
    ],
    explicit_non_authorizations: [
      'This gate is not a real apply.',
      'This gate does not record approval.',
      'This gate does not run SQL.',
      'This gate does not write to the database.',
      'This gate does not create a migration.',
      'This gate does not authorize global apply.',
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
  return `# PKG-08D Duplicate Parent Dependency Transfer Real Apply Gate V1

This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| write_ready_now | ${report.write_ready_now} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_execution_status | ${report.dry_run_proof.dry_run_execution_status} |
| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |
| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |
| sql_artifact_hash_sha256 | \`${report.dry_run_proof.sql_artifact_hash_sha256}\` |
| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |
| artifact_fresh_snapshot_matches_before_snapshot | ${report.dry_run_proof.artifact_fresh_snapshot_matches_before_snapshot} |

## Required Approval Phrase

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`

## Stop Findings

${report.stop_findings.length === 0 ? '- none' : report.stop_findings.map((finding) => `- ${mdEscape(finding)}`).join('\n')}

## Non-Authorizations

${report.explicit_non_authorizations.map((item) => `- ${item}`).join('\n')}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08D Duplicate Parent Dependency Transfer Real Apply Gate Checkpoint V1](20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate after successful rollback-only dry run for 39 duplicate parent dependency transfers. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  approval_gate_status: report.approval_gate_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  dry_run_before_hash_sha256: report.dry_run_proof.before_hash_sha256,
  dry_run_after_hash_sha256: report.dry_run_proof.after_hash_sha256,
  sql_hash_sha256: report.dry_run_proof.sql_artifact_hash_sha256,
  duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
  groups: report.package_scope.groups,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
}, null, 2));

if (!report.pass) process.exitCode = 1;
