import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg09a_alias_subset_bulk_convergence_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE';
const PACKAGE_FINGERPRINT = 'd66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a';
const DRY_RUN_PROOF_HASH = 'a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f';
const APPROVAL_TEXT = 'Approve real PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE apply only. Fingerprint: d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a. Scope: 155 candidate rows, 105 parent set_id/set_code updates, 48 parent inserts, 53 child printing inserts, 48 external mapping inserts, 36 blocked rows excluded. Dry-run proof: a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f == a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine.';

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

function renderMarkdown(report) {
  return `# PKG-09A Alias / Subset Bulk Convergence Real Apply Gate V1

This is a no-write real-apply gate. It records whether the approved dry-run artifact is eligible for one real apply.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| candidate_rows | ${report.package_scope.candidate_rows} |
| parent_set_code_update_rows | ${report.package_scope.parent_set_code_update_rows} |
| parent_insert_rows | ${report.package_scope.parent_insert_rows} |
| child_insert_rows | ${report.package_scope.child_insert_rows} |
| external_mapping_insert_rows | ${report.package_scope.external_mapping_insert_rows} |
| blocked_rows_excluded | ${report.package_scope.blocked_rows_excluded} |
| dry_run_proof_hash_sha256 | \`${report.dry_run_proof.dry_run_proof_hash_sha256}\` |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Required Approval

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-09A Alias / Subset Bulk Convergence Real Apply Gate Checkpoint V1](20260610_pkg09a_alias_subset_bulk_convergence_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for PKG-09A bulk alias/subset convergence. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!current.includes('20260610_pkg09a_alias_subset_bulk_convergence_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const findings = [];

if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
if (dryRun.dry_run?.status !== 'pkg09a_alias_subset_bulk_convergence_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
if (dryRun.dry_run?.proof_hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
if (dryRun.dry_run?.proof_row?.package_fingerprint !== PACKAGE_FINGERPRINT) findings.push('dry_run_proof_row_fingerprint_mismatch');
if (dryRun.scope?.candidate_rows !== 155) findings.push('candidate_rows_not_155');
if (dryRun.scope?.parent_set_code_update_rows !== 105) findings.push('parent_set_code_update_rows_not_105');
if (dryRun.scope?.parent_insert_rows !== 48) findings.push('parent_insert_rows_not_48');
if (dryRun.scope?.child_insert_rows !== 53) findings.push('child_insert_rows_not_53');
if (dryRun.scope?.external_mapping_insert_rows !== 48) findings.push('external_mapping_insert_rows_not_48');
if (dryRun.scope?.blocked_rows_excluded !== 36) findings.push('blocked_rows_excluded_not_36');
if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
if (dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_cleanup_or_quarantine');
if (dryRun.transaction_ended_with_rollback !== true) findings.push('dry_run_not_rolled_back');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_gate_v1',
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
  approval_gate_status: findings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_before_real_apply_operator_decision',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    candidate_rows: dryRun.scope?.candidate_rows ?? null,
    parent_set_code_update_rows: dryRun.scope?.parent_set_code_update_rows ?? null,
    parent_insert_rows: dryRun.scope?.parent_insert_rows ?? null,
    child_insert_rows: dryRun.scope?.child_insert_rows ?? null,
    external_mapping_insert_rows: dryRun.scope?.external_mapping_insert_rows ?? null,
    blocked_rows_excluded: dryRun.scope?.blocked_rows_excluded ?? null,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    quarantine_allowed: false,
    migrations_allowed: false,
  },
  dry_run_proof: {
    dry_run_status: dryRun.dry_run?.status,
    dry_run_proof_hash_sha256: dryRun.dry_run?.proof_hash_sha256,
    dry_run_proof_row: dryRun.dry_run?.proof_row ?? null,
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: APPROVAL_TEXT,
  },
  source_artifacts: {
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    guarded_dry_run_sql: dryRun.output_sql,
  },
  stop_findings: findings,
  pass: findings.length === 0,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
  approval_gate_status: report.approval_gate_status,
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  dry_run_proof_hash_sha256: report.dry_run_proof.dry_run_proof_hash_sha256,
  stop_findings: report.stop_findings,
  required_approval: APPROVAL_TEXT,
}, null, 2));

if (!report.pass) process.exitCode = 1;
