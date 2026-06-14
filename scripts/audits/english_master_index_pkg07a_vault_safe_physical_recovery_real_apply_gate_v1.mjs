import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg07a_vault_safe_physical_recovery_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY';
const EXPECTED_PARENT_ROWS = 164;
const EXPECTED_CHILD_PRINTINGS = 253;
const EXPECTED_SOURCE_ROWS = 185;
const EXPECTED_EXCLUDED_ROWS = 21;
const EXPECTED_VAULT_REFS = 0;
const EXPECTED_SET_COUNTS = {
  '2021swsh': 25,
  col1: 2,
  dp7: 8,
  ecard2: 13,
  ecard3: 15,
  pl1: 9,
  pl2: 15,
  pl3: 9,
  pl4: 12,
  'sv08.5': 20,
  'swsh10.5': 33,
  swsh2: 1,
  'swsh4.5': 2,
};

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
  if (dryRun.dry_run_execution_status !== 'pkg07a_vault_safe_physical_recovery_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('durable_rollback_proof_failed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.source_candidate_rows !== EXPECTED_SOURCE_ROWS) findings.push('source_candidate_count_not_185');
  if (dryRun.scope?.excluded_missing_rows !== EXPECTED_EXCLUDED_ROWS) findings.push('excluded_missing_count_not_21');
  if (dryRun.scope?.parent_update_rows !== EXPECTED_PARENT_ROWS) findings.push('parent_update_count_not_164');
  if (dryRun.scope?.preserved_child_printings !== EXPECTED_CHILD_PRINTINGS) findings.push('preserved_child_count_not_253');
  if (dryRun.scope?.vault_references !== EXPECTED_VAULT_REFS) findings.push('vault_reference_count_not_0');
  for (const [setKey, count] of Object.entries(EXPECTED_SET_COUNTS)) {
    if (dryRun.scope?.set_counts?.[setKey] !== count) findings.push(`${setKey}_count_not_${count}`);
  }
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) findings.push('before_after_hash_mismatch');
  if (!dryRun.package_fingerprint_sha256) findings.push('package_fingerprint_missing');
  if (!dryRun.sql_hash_sha256) findings.push('sql_hash_missing');
  return findings;
}

function renderMarkdown(report) {
  return `# PKG-07A Vault-Safe Physical Recovery Real Apply Gate V1

This is a no-write gate for operator decision. It does not apply SQL.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| parent_update_rows | ${report.package_scope.parent_update_rows} |
| preserved_child_printings | ${report.package_scope.preserved_child_printings} |
| excluded_missing_rows | ${report.package_scope.excluded_missing_rows} |
| vault_references | ${report.package_scope.vault_references} |
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
  return `# PKG-07A Vault-Safe Physical Recovery Real Apply Gate Checkpoint V1

Date: 2026-06-09

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| parent_update_rows | ${report.package_scope.parent_update_rows} |
| preserved_child_printings | ${report.package_scope.preserved_child_printings} |
| excluded_missing_rows | ${report.package_scope.excluded_missing_rows} |
| vault_references | ${report.package_scope.vault_references} |
| write_ready_now | ${report.write_ready_now} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

Real apply remains blocked until exact operator approval is provided.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-07A Vault-Safe Physical Recovery Real Apply Gate Checkpoint V1](20260609_pkg07a_vault_safe_physical_recovery_real_apply_gate_checkpoint_v1.md) | No-write gate for 164 vault-safe physical recovery parent updates preserving 253 child printings; real apply blocked pending exact approval. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg07a_vault_safe_physical_recovery_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_pkg07a_vault_safe_physical_recovery_real_apply_gate_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const stopFindings = validate(dryRun);
const dryRunProof = `${dryRun.before_snapshot?.hash_sha256} == ${dryRun.after_snapshot?.hash_sha256}`;
const requiredApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${dryRun.package_fingerprint_sha256}. SQL hash: ${dryRun.sql_hash_sha256}. Scope: 164 vault-safe card_print parent updates across 13 sets, preserving 253 child printings; source candidates=185, stale missing rows excluded=21, vault references=0. Sets: 2021swsh=25, col1=2, dp7=8, ecard2=13, ecard3=15, pl1=9, pl2=15, pl3=9, pl4=12, sv08.5=20, swsh10.5=33, swsh2=1, swsh4.5=2. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No child writes.`;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg07a_vault_safe_physical_recovery_real_apply_gate_v1',
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
    sql_hash_sha256: dryRun.sql_hash_sha256,
    source_candidate_rows: EXPECTED_SOURCE_ROWS,
    excluded_missing_rows: EXPECTED_EXCLUDED_ROWS,
    parent_update_rows: EXPECTED_PARENT_ROWS,
    preserved_child_printings: EXPECTED_CHILD_PRINTINGS,
    vault_references: EXPECTED_VAULT_REFS,
    set_counts: dryRun.scope?.set_counts,
    child_writes_allowed: false,
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
    approval_effect: 'This would authorize preparing and running the durable PKG-07A vault-safe physical recovery parent-update apply path only.',
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
    'This gate does not authorize child writes.',
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
  parent_update_rows: EXPECTED_PARENT_ROWS,
  preserved_child_printings: EXPECTED_CHILD_PRINTINGS,
  excluded_missing_rows: EXPECTED_EXCLUDED_ROWS,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  db_writes_performed: false,
  migrations_created: false,
  stop_findings: stopFindings.length,
  required_approval: requiredApproval,
}, null, 2));

if (!report.pass) process.exitCode = 1;
