import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08v_tcgcollector_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08V-TCGCOLLECTOR-PARENT-CHILD-INSERTS';
const PACKAGE_FINGERPRINT = 'e538746b24e91247a72c604e0b8c10d71ff698c52caad48aa99396cbd1b1b021';
const SOURCE_GOVERNANCE_FINGERPRINT = 'dac1d78017087e84e389f6b0ba2f06a8763bbdab68fb3666c8589a03cfd58089';
const DRY_RUN_PROOF_HASH = '2076d3f38f8234aac3dcdf764b87e3527d1953d750717f18b7230320fd22ecc4';
const APPROVAL_TEXT = 'Approve real PKG-08V-TCGCOLLECTOR-PARENT-CHILD-INSERTS apply only. Fingerprint: e538746b24e91247a72c604e0b8c10d71ff698c52caad48aa99396cbd1b1b021. Scope: 104 parent card_print inserts, 104 child card_printing inserts, 104 TCGCollector external mappings across 3 sets; finishes holo=104. Dry-run proof: 2076d3f38f8234aac3dcdf764b87e3527d1953d750717f18b7230320fd22ecc4 == 2076d3f38f8234aac3dcdf764b87e3527d1953d750717f18b7230320fd22ecc4. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

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
  return `# PKG-08V TCGCollector Parent+Child Insert Real Apply Gate V1

This is a no-write real-apply gate. It records the exact approval boundary and does not perform durable writes.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| source_governance_fingerprint_sha256 | \`${report.source_governance_fingerprint_sha256}\` |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| target_child_rows | ${report.package_scope.target_child_rows} |
| target_external_mappings | ${report.package_scope.target_external_mappings} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
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
  const line = '| 2026-06-10 | [PKG-08V TCGCollector Parent+Child Insert Real Apply Gate Checkpoint V1](20260610_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for 104 TCGCollector parent+child inserts. No durable writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
const findings = [];

if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_GOVERNANCE_FINGERPRINT) findings.push('source_governance_fingerprint_mismatch');
if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
if (dryRun.dry_run_status !== 'pkg08v_tcgcollector_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_before_after_hash_mismatch');
if (beforeHash !== DRY_RUN_PROOF_HASH || afterHash !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
if (dryRun.durable_db_writes_performed !== false || dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
if (dryRun.scope?.target_parent_rows !== 104) findings.push('target_parent_rows_not_104');
if (dryRun.scope?.target_child_rows !== 104) findings.push('target_child_rows_not_104');
if (dryRun.scope?.target_external_mappings !== 104) findings.push('target_external_mapping_rows_not_104');
if (Object.keys(dryRun.scope?.by_set ?? {}).length !== 3) findings.push('set_count_not_3');
if (dryRun.scope?.by_finish?.holo !== 104) findings.push('holo_count_not_104');
if (dryRun.scope?.by_mapping_source?.tcgcollector !== 104) findings.push('tcgcollector_mapping_count_not_104');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08v_tcgcollector_parent_child_insert_real_apply_gate_v1',
  audit_only: true,
  approval_gate_only: true,
  real_apply_gate_only: true,
  source_governance_fingerprint_sha256: dryRun.source_readiness_fingerprint_sha256 ?? null,
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
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    target_parent_rows: dryRun.scope?.target_parent_rows ?? null,
    target_child_rows: dryRun.scope?.target_child_rows ?? null,
    target_external_mappings: dryRun.scope?.target_external_mappings ?? null,
    by_set: dryRun.scope?.by_set ?? {},
    by_finish: dryRun.scope?.by_finish ?? {},
    by_mapping_source: dryRun.scope?.by_mapping_source ?? {},
    updates_allowed: false,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    global_apply_allowed: false,
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
    exact_approval_phrase_required: APPROVAL_TEXT,
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
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  source_governance_fingerprint_sha256: report.source_governance_fingerprint_sha256,
  target_parent_rows: report.package_scope.target_parent_rows,
  target_child_rows: report.package_scope.target_child_rows,
  target_external_mappings: report.package_scope.target_external_mappings,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: APPROVAL_TEXT,
}, null, 2));

if (!report.pass) process.exitCode = 1;
