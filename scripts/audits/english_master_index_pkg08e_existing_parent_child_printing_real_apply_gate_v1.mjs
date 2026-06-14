import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08e_existing_parent_child_printing_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08E-EXISTING-PARENT-CHILD-PRINTING-INSERTS';

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

function compactCounts(counts) {
  return Object.entries(counts ?? {})
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function renderMarkdown(report) {
  return `# PKG-08E Existing-Parent Child Printing Real Apply Gate V1

This is a no-write real-apply approval gate. It does not perform or authorize a durable write by itself.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| target_child_rows | ${report.package_scope.target_child_rows} |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| excluded_resolution_rows | ${report.package_scope.excluded_resolution_rows} |
| finish_counts | ${compactCounts(report.package_scope.by_finish)} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Required Approval

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08E Existing-Parent Child Printing Real Apply Gate Checkpoint V1](20260610_pkg08e_existing_parent_child_printing_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for current existing-parent child-only card_printing inserts; ambiguous rows remain excluded. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08e_existing_parent_child_printing_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08e_existing_parent_child_printing_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
const packageFingerprint = dryRun.package_fingerprint_sha256;
const targetRows = dryRun.scope?.rows ?? [];
const findings = [];

if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
if (!packageFingerprint) findings.push('dry_run_missing_package_fingerprint');
if (dryRun.dry_run_status !== 'pkg08e_existing_parent_child_printing_completed_rolled_back_no_durable_change') {
  findings.push('dry_run_not_passed');
}
if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_before_after_hash_mismatch');
if (!beforeHash || beforeHash !== afterHash) findings.push('dry_run_proof_hash_mismatch');
if (dryRun.durable_db_writes_performed !== false || dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
if ((dryRun.scope?.target_child_rows ?? 0) <= 0) findings.push('target_child_rows_empty');
if (dryRun.scope?.target_child_rows !== targetRows.length) findings.push('target_child_rows_do_not_match_rows_length');
if (dryRun.scope?.target_parent_rows !== new Set(targetRows.map((row) => row.card_print_id)).size) {
  findings.push('target_parent_count_mismatch');
}
if ((dryRun.scope?.blocked_resolution_rows_excluded_from_package ?? 0) !== 0) {
  findings.push('blocked_resolution_rows_present');
}
if (targetRows.some((row) => row.resolution_status !== 'resolved_exact_parent')) {
  findings.push('target_contains_unresolved_parent');
}
const proof = dryRun.rollback_proof_rows?.[0] ?? null;
if (!proof) findings.push('rollback_proof_missing');
if (proof) {
  if (proof.package_id !== PACKAGE_ID) findings.push('rollback_proof_wrong_package');
  if (proof.package_fingerprint !== packageFingerprint) findings.push('rollback_proof_fingerprint_mismatch');
  if (Number(proof.planned_child_rows) !== dryRun.scope?.target_child_rows) findings.push('rollback_proof_child_count_mismatch');
  if (Number(proof.planned_parent_rows) !== dryRun.scope?.target_parent_rows) findings.push('rollback_proof_parent_count_mismatch');
}

const targetChildRows = dryRun.scope?.target_child_rows ?? 0;
const targetParentRows = dryRun.scope?.target_parent_rows ?? 0;
const finishText = compactCounts(dryRun.scope?.by_finish);
const setCount = Object.keys(dryRun.scope?.by_set ?? {}).length;
const exactApprovalPhrase =
  `Approve real ${PACKAGE_ID} apply only. ` +
  `Fingerprint: ${packageFingerprint}. ` +
  `Scope: ${targetChildRows} child-only card_printing inserts across ${setCount} sets; target parents=${targetParentRows}; finishes ${finishText}. ` +
  `Dry-run proof: ${beforeHash} == ${afterHash}. ` +
  'No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.';

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08e_existing_parent_child_printing_real_apply_gate_v1',
  audit_only: true,
  approval_gate_only: true,
  real_apply_gate_only: true,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  approval_gate_status: findings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_before_real_apply_operator_decision',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    target_child_rows: targetChildRows,
    target_parent_rows: targetParentRows,
    excluded_resolution_rows: dryRun.scope?.blocked_resolution_rows_excluded_from_package ?? null,
    by_set: dryRun.scope?.by_set ?? {},
    by_live_set: dryRun.scope?.by_live_set ?? {},
    by_finish: dryRun.scope?.by_finish ?? {},
    updates_allowed: false,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    parent_writes_allowed: false,
  },
  dry_run_proof: {
    dry_run_status: dryRun.dry_run_status,
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    rollback_proof_rows: dryRun.rollback_proof_rows ?? [],
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: exactApprovalPhrase,
  },
  source_artifacts: {
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  },
  stop_findings: findings,
  pass: findings.length === 0,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  approval_gate_status: report.approval_gate_status,
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: packageFingerprint,
  target_child_rows: targetChildRows,
  target_parent_rows: targetParentRows,
  excluded_resolution_rows: report.package_scope.excluded_resolution_rows,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: exactApprovalPhrase,
}, null, 2));

if (!report.pass) process.exitCode = 1;
