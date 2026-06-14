import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06j_active_finish_child_printing_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06j_active_finish_child_printing_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS';
const SOURCE_READINESS_FINGERPRINT = '6063892190519f7b48b87f46e4c7d556ad12333655ab0c2aef3149d1da2764f7';
const EXPECTED_SET_COUNTS = {
  bw7: 7,
  dp1: 7,
  hgss1: 7,
  pop5: 7,
  swsh3: 7,
  swsh5: 7,
  swsh9: 7,
  xy4: 7,
  '2017sm': 6,
  '2022swsh': 6,
};
const EXPECTED_FINISH_COUNTS = { normal: 18, reverse: 3, cosmos: 30, holo: 17 };
const EXPECTED_CHILD_ROWS = 68;
const EXPECTED_PARENT_ROWS = 65;

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
  if (dryRun.dry_run_execution_status !== 'pkg06j_active_finish_child_printing_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('durable_rollback_proof_failed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.child_printing_rows !== EXPECTED_CHILD_ROWS) findings.push('child_count_not_68');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_PARENT_ROWS) findings.push('parent_count_not_65');
  for (const [setKey, count] of Object.entries(EXPECTED_SET_COUNTS)) {
    if (dryRun.scope?.set_counts?.[setKey] !== count) findings.push(`${setKey}_count_not_${count}`);
  }
  for (const [finishKey, count] of Object.entries(EXPECTED_FINISH_COUNTS)) {
    if (dryRun.scope?.finish_counts?.[finishKey] !== count) findings.push(`${finishKey}_count_not_${count}`);
  }
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) findings.push('before_after_hash_mismatch');
  if (!dryRun.package_fingerprint_sha256) findings.push('package_fingerprint_missing');
  if (!dryRun.sql_hash_sha256) findings.push('sql_hash_missing');
  return findings;
}

function renderMarkdown(report) {
  return `# PKG-06J Active Finish Child Printing Real Apply Gate V1

This is a no-write gate for operator decision. It does not apply SQL.

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
`;
}

function renderCheckpoint(report) {
  return `# PKG-06J Active Finish Child Printing Real Apply Gate Checkpoint V1

Date: 2026-06-09

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
  const line = '| 2026-06-09 | [PKG-06J Active Finish Child Printing Real Apply Gate Checkpoint V1](20260609_pkg06j_active_finish_child_printing_real_apply_gate_checkpoint_v1.md) | No-write gate for 68 active-finish child-only inserts across 10 sets; real apply blocked pending exact approval. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06j_active_finish_child_printing_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg06j_active_finish_child_printing_real_apply_gate_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const stopFindings = validate(dryRun);
const dryRunProof = `${dryRun.before_snapshot?.hash_sha256} == ${dryRun.after_snapshot?.hash_sha256}`;
const requiredApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${dryRun.package_fingerprint_sha256}. SQL hash: ${dryRun.sql_hash_sha256}. Scope: 68 child-only card_printing inserts for bw7/Boundaries Crossed, dp1/Diamond & Pearl, hgss1/HeartGold & SoulSilver, pop5/POP Series 5, swsh3/Darkness Ablaze, swsh5/Battle Styles, swsh9/Brilliant Stars, xy4/Phantom Forces, 2017sm/McDonald's Collection 2017, and 2022swsh/McDonald's Collection 2022; finishes cosmos=30, normal=18, holo=17, reverse=3; target parents=65. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.`;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg06j_active_finish_child_printing_real_apply_gate_v1',
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
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
    sql_hash_sha256: dryRun.sql_hash_sha256,
    child_card_printing_inserts: EXPECTED_CHILD_ROWS,
    target_parent_rows: EXPECTED_PARENT_ROWS,
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
    approval_effect: 'This would authorize preparing and running the durable PKG-06J active-finish child-only apply path only.',
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
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    sql_hash_sha256: dryRun.sql_hash_sha256,
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
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  sql_hash_sha256: report.package_scope.sql_hash_sha256,
  child_card_printing_inserts: EXPECTED_CHILD_ROWS,
  target_parent_rows: EXPECTED_PARENT_ROWS,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  db_writes_performed: false,
  migrations_created: false,
  stop_findings: stopFindings.length,
  required_approval: requiredApproval,
}, null, 2));

if (!report.pass) process.exitCode = 1;
