import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08m_suffix_parent_split_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08M-SUFFIX-PARENT-SPLIT';
const PACKAGE_FINGERPRINT = '1bf0d4aa087d3185935212bd1a244aecd3a0b3fce6bdc7bc851e9a0d82af3405';
const DRY_RUN_PROOF_HASH = '22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a';
const APPROVAL_TEXT = 'Approve real PKG-08M-SUFFIX-PARENT-SPLIT apply only. Fingerprint: 1bf0d4aa087d3185935212bd1a244aecd3a0b3fce6bdc7bc851e9a0d82af3405. Scope: 3 suffix parent inserts, 3 suffix child card_printing inserts, 3 TCGdex mapping transfers across 3 sets; finish normal=3; existing base parents preserved; unsupported cleanup deferred. Dry-run proof: 22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a == 22d54b6da93a7bc3f8530e7f9983f14b14fcac12db3ee848be7cc845953b2e8a. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

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
  return `# PKG-08M Suffix Parent Split Real Apply Gate V1

This is a no-write real-apply gate. It records the exact operator approval boundary and does not perform durable writes.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| target_parent_inserts | ${report.package_scope.target_parent_inserts} |
| target_child_inserts | ${report.package_scope.target_child_inserts} |
| target_mapping_transfers | ${report.package_scope.target_mapping_transfers} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| deletes_allowed | ${report.package_scope.deletes_allowed} |
| unsupported_cleanup_allowed | ${report.package_scope.unsupported_cleanup_allowed} |
| stop_findings | ${report.stop_findings.length} |

## Required Approval

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08M Suffix Parent Split Real Apply Gate Checkpoint V1](20260610_pkg08m_suffix_parent_split_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for 3 suffix parent splits; no deletes, cleanup, migrations, or durable writes. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08m_suffix_parent_split_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08m_suffix_parent_split_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
const targetRows = dryRun.scope?.target_rows ?? [];
const findings = [];

if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
if (dryRun.dry_run_status !== 'pkg08m_suffix_parent_split_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_before_after_hash_mismatch');
if (beforeHash !== DRY_RUN_PROOF_HASH || afterHash !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
if (dryRun.durable_db_writes_performed !== false || dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
if (dryRun.scope?.target_parent_inserts !== 3) findings.push('target_parent_inserts_not_3');
if (dryRun.scope?.target_child_inserts !== 3) findings.push('target_child_inserts_not_3');
if (dryRun.scope?.target_mapping_transfers !== 3) findings.push('target_mapping_transfers_not_3');
if (dryRun.scope?.by_finish?.normal !== 3) findings.push('normal_count_not_3');
if (Object.keys(dryRun.scope?.by_set ?? {}).length !== 3) findings.push('set_count_not_3');
if (targetRows.some((row) => row.finish_key !== 'normal')) findings.push('non_normal_target_present');
if (targetRows.some((row) => !String(row.tcgdex_external_id ?? '').endsWith('a'))) findings.push('non_suffix_tcgdex_target_present');
if (targetRows.some((row) => !row.external_mapping_id || !row.base_parent_id || !row.suffix_parent_id || !row.suffix_child_id)) findings.push('target_identity_or_mapping_missing');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08m_suffix_parent_split_real_apply_gate_v1',
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
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    target_parent_inserts: dryRun.scope?.target_parent_inserts ?? null,
    target_child_inserts: dryRun.scope?.target_child_inserts ?? null,
    target_mapping_transfers: dryRun.scope?.target_mapping_transfers ?? null,
    by_set: dryRun.scope?.by_set ?? {},
    by_finish: dryRun.scope?.by_finish ?? {},
    updates_allowed: true,
    update_scope: 'tcgdex_external_mapping_transfer_only',
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
  target_parent_inserts: report.package_scope.target_parent_inserts,
  target_child_inserts: report.package_scope.target_child_inserts,
  target_mapping_transfers: report.package_scope.target_mapping_transfers,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: APPROVAL_TEXT,
}, null, 2));

if (!report.pass) process.exitCode = 1;
