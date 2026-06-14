import crypto from 'node:crypto';
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

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06e_active_finish_child_printing_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06e_active_finish_child_printing_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06e_active_finish_child_printing_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06e_active_finish_child_printing_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06E-ACTIVE-FINISH-CHILD-PRINTING-INSERTS';
const SOURCE_READINESS_FINGERPRINT = '0a1a320527119d55a012ae2a564059993f48b83220591cd522f6ca9119393a32';
const PACKAGE_FINGERPRINT = '87af87fa1a17297509296b6a06d421ec8840a8323d6f348bff01817962408aa6';
const SQL_HASH = 'f54045f6359547976f14d07b7fcedf71cc9203f7b868f386eb2f87f5a103cece';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validate(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) findings.push('source_readiness_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.dry_run_execution_status !== 'pkg06e_active_finish_child_printing_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('durable_rollback_proof_failed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.child_printing_rows !== 391) findings.push('child_count_not_391');
  if (dryRun.scope?.target_parent_rows !== 387) findings.push('parent_count_not_387');
  if (dryRun.scope?.set_counts?.ex10 !== 102) findings.push('ex10_count_not_102');
  if (dryRun.scope?.set_counts?.ex13 !== 99) findings.push('ex13_count_not_99');
  if (dryRun.scope?.set_counts?.ex7 !== 95) findings.push('ex7_count_not_95');
  if (dryRun.scope?.set_counts?.ex8 !== 95) findings.push('ex8_count_not_95');
  if (dryRun.scope?.finish_counts?.reverse !== 386) findings.push('reverse_count_not_386');
  if (dryRun.scope?.finish_counts?.holo !== 2) findings.push('holo_count_not_2');
  if (dryRun.scope?.finish_counts?.cosmos !== 2) findings.push('cosmos_count_not_2');
  if (dryRun.scope?.finish_counts?.normal !== 1) findings.push('normal_count_not_1');
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) findings.push('before_after_hash_mismatch');
  return findings;
}

function renderMarkdown(report) {
  return `# PKG-06E Active Finish Child Printing Real Apply Gate V1

This is a no-write gate for operator decision. It does not apply SQL.

## Gate Status

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| child_card_printing_inserts | ${report.package_scope.child_card_printing_inserts} |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| stop_findings | ${report.stop_findings.length} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |

## Required Approval

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`

## Non-Authorizations

${report.explicit_non_authorizations.map((item) => `- ${item}`).join('\n')}
`;
}

function renderCheckpoint(report) {
  return `# PKG-06E Active Finish Child Printing Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| child_card_printing_inserts | ${report.package_scope.child_card_printing_inserts} |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| write_ready_now | ${report.write_ready_now} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

Real apply remains blocked until exact operator approval is provided.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06E Active Finish Child Printing Real Apply Gate Checkpoint V1](20260609_pkg06e_active_finish_child_printing_real_apply_gate_checkpoint_v1.md) | No-write gate for 391 active-finish child-only inserts for ex10, ex13, ex7, and ex8; real apply blocked pending exact approval. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06e_active_finish_child_printing_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg06e_active_finish_child_printing_real_apply_gate_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const stopFindings = validate(dryRun);
const dryRunProof = `${dryRun.before_snapshot?.hash_sha256} == ${dryRun.after_snapshot?.hash_sha256}`;
const requiredApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. SQL hash: ${SQL_HASH}. Scope: 391 child-only card_printing inserts for ex10/Unseen Forces, ex13/Holon Phantoms, ex7/Team Rocket Returns, and ex8/Deoxys; finishes reverse=386, holo=2, cosmos=2, normal=1; target parents=387. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.`;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg06e_active_finish_child_printing_real_apply_gate_v1',
  audit_only: true,
  approval_gate_only: true,
  real_apply_gate_only: true,
  db_reads_performed: false,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  approval_gate_status: stopFindings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_stop_findings_present',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    child_card_printing_inserts: 391,
    target_parent_rows: 387,
    set_counts: dryRun.scope?.set_counts,
    finish_counts: dryRun.scope?.finish_counts,
    parent_writes_allowed: false,
    child_insert_only: true,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
  },
  dry_run_proof: {
    dry_run_execution_status: dryRun.dry_run_execution_status,
    sql_artifact_ref: path.relative(ROOT, dryRun.sql_artifact_path).replaceAll('\\', '/'),
    sql_hash_sha256: dryRun.sql_hash_sha256,
    before_hash_sha256: dryRun.before_snapshot?.hash_sha256,
    after_hash_sha256: dryRun.after_snapshot?.hash_sha256,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    rollback_proof_rows: dryRun.rollback_proof_rows,
  },
  required_operator_decision: {
    decision_needed: stopFindings.length === 0,
    exact_approval_phrase_required: requiredApproval,
    approval_effect: 'This would authorize preparing and running the durable PKG-06E active-finish child-only apply path only.',
  },
  explicit_non_authorizations: [
    'This gate is not a real apply.',
    'This gate does not record approval.',
    'This gate does not run SQL.',
    'This gate does not read from or write to the database.',
    'This gate does not create a migration.',
    'This gate does not authorize global apply.',
    'This gate does not authorize deletes.',
    'This gate does not authorize merges.',
    'This gate does not authorize unsupported cleanup.',
    'This gate does not authorize parent writes.',
  ],
  source_artifacts: {
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    sql_artifact: path.relative(ROOT, dryRun.sql_artifact_path).replaceAll('\\', '/'),
  },
  stop_findings: stopFindings,
  pass: stopFindings.length === 0,
  gate_fingerprint_sha256: sha256(stableJson({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    dry_run_proof: dryRunProof,
  })),
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  approval_gate_status: report.approval_gate_status,
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  sql_hash_sha256: SQL_HASH,
  child_card_printing_inserts: 391,
  target_parent_rows: 387,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  db_writes_performed: false,
  migrations_created: false,
  stop_findings: stopFindings.length,
  required_approval: requiredApproval,
}, null, 2));

if (!report.pass) process.exitCode = 1;

