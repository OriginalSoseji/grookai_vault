import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08c_exu_parent_relocation_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08C-EXU-PARENT-RELOCATION';
const PACKAGE_FINGERPRINT = '89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62';
const DRY_RUN_PROOF_HASH = 'ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b';

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

function validateDryRun(dryRun) {
  const findings = [];
  const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
  if (dryRun.scope?.target_parent_updates !== 28) findings.push('target_parent_updates_not_28');
  if (dryRun.scope?.child_printings_preserved !== 28) findings.push('child_printings_preserved_not_28');
  if (dryRun.simulated_mapping_inserts !== 1) findings.push('simulated_mapping_inserts_not_1');
  if (dryRun.scope?.blocked_rows !== 0) findings.push('blocked_rows_present');
  if (beforeHash !== DRY_RUN_PROOF_HASH || afterHash !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (beforeHash !== afterHash) findings.push('before_after_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('durable_after_snapshot_does_not_match_before_snapshot');
  }
  return { findings, beforeHash, afterHash };
}

function renderMarkdown(report) {
  return `# PKG-08C EXU Parent Relocation Real Apply Gate V1

This is a no-write approval gate. It validates the rollback-only dry run and emits the exact approval phrase required for a later durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| target_parent_updates | ${report.package_scope.target_parent_updates} |
| child_printings_preserved | ${report.package_scope.child_printings_preserved} |
| mapping_inserts | ${report.package_scope.mapping_inserts} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| write_ready_now | ${report.write_ready_now} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_status | ${report.dry_run_proof.dry_run_status} |
| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |
| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |
| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |

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
  const line = '| 2026-06-10 | [PKG-08C EXU Parent Relocation Real Apply Gate Checkpoint V1](20260610_pkg08c_exu_parent_relocation_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate after successful rollback-only dry run for 28 ex10 -> exu parent relocations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08c_exu_parent_relocation_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08c_exu_parent_relocation_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const { findings, beforeHash, afterHash } = validateDryRun(dryRun);
const exactApprovalPhrase = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. Scope: 28 parent relocations from ex10 to exu, 28 child printings preserved, 1 TCGdex mapping insert for the question-mark Unown. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08c_exu_parent_relocation_real_apply_gate_v1',
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
  approval_gate_status: findings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_before_real_apply_operator_decision',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    target_parent_updates: 28,
    from_set_code: 'ex10',
    to_set_code: 'exu',
    child_printings_preserved: 28,
    mapping_inserts: 1,
    global_apply_included: false,
  },
  dry_run_proof: {
    dry_run_status: dryRun.dry_run_status,
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    stop_findings: dryRun.stop_findings ?? [],
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: exactApprovalPhrase,
    approval_effect: 'This would authorize a durable PKG-08C apply only, scoped to relocating 28 Unown Collection parents from ex10 to exu and inserting one missing TCGdex external mapping after one more final fresh snapshot.',
    approval_must_reference: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      target_parent_updates: 28,
      child_printings_preserved: 28,
      mapping_inserts: 1,
      dry_run_before_hash_sha256: beforeHash,
      dry_run_after_hash_sha256: afterHash,
    },
  },
  next_step_if_approved_later: [
    'Capture one more final fresh DB snapshot immediately before durable apply.',
    'Verify the same 28 parents still belong to ex10 and have the expected holo child printing.',
    'Verify no exu duplicate parent exists for the same number/name.',
    'Execute durable transaction with COMMIT only after exact real-apply approval is present.',
    'Capture post-apply readback and rerun remaining missing lane classification.',
  ],
  explicit_non_authorizations: [
    'This gate is not a real apply.',
    'This gate does not record approval.',
    'This gate does not write to the database.',
    'This gate does not create a migration.',
    'This gate does not delete or merge rows.',
    'This gate does not authorize global apply.',
  ],
  source_artifacts: {
    guarded_dry_run: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
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
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  exact_approval_phrase_required: exactApprovalPhrase,
  stop_findings: findings,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if (findings.length !== 0) process.exitCode = 1;
