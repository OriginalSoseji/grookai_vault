import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION';
const PACKAGE_FINGERPRINT = '883bd24d352b7029e8e9fed6241ca058f1ec1ed12cb82ec37e247a188d4bf1e5';
const SQL_HASH = '246fa3965d7dc87fbd3f8104d4d5b3bdaf004062c7fbe7c3c6183ee6feb1fbc8';
const DRY_RUN_PROOF_HASH = '27dba3a506f6bc71246fe55bcc83fa4a7e83b5a92bf8b5d9ec6d541beda8dc61';
const SOURCE_READINESS_FINGERPRINT = '382e2fab7154d290b90f4f0bda40941b4b353e8844459c4d03a7225b158d026b';

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countSqlStatements(sqlText) {
  const lower = sqlText.toLowerCase().replace(/--.*$/gm, '');
  return {
    contains_begin_statement: /(^|\n)\s*begin\s*;/.test(lower),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/.test(lower),
    contains_commit_statement: /(^|\n)\s*commit\s*;/.test(lower),
    contains_update_statement: /(^|\n)\s*update\s+/.test(lower),
    contains_delete_statement: /(^|\n)\s*delete\s+/.test(lower),
    contains_finish_key_insert: /\binsert\s+into\s+public\.finish_keys\b/.test(lower),
    contains_finish_key_upsert: /\bon\s+conflict\s*\(\s*key\s*\)\s+do\s+update\b/.test(lower),
    contains_card_printings_insert: /\binsert\s+into\s+public\.card_printings\b/.test(lower),
    contains_card_prints_insert: /\binsert\s+into\s+public\.card_prints\b/.test(lower),
    contains_sets_insert: /\binsert\s+into\s+public\.sets\b/.test(lower),
    contains_external_insert: /\binsert\s+into\s+public\.external/.test(lower),
  };
}

function validateInputs({ dryRun, sqlText }) {
  const findings = [];
  const sqlHash = sha256(sqlText);
  const sql = countSqlStatements(sqlText);
  const proof = dryRun.rollback_proof_rows?.[0] ?? null;
  const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (sqlHash !== SQL_HASH) findings.push('sql_artifact_hash_mismatch');
  if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) {
    findings.push('source_readiness_fingerprint_mismatch');
  }
  if (dryRun.dry_run_execution_status !== 'pkg10a_cracked_ice_finish_taxonomy_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
  if (dryRun.child_printing_inserts !== false) findings.push('dry_run_reports_child_printing_inserts');
  if (dryRun.parent_writes !== false) findings.push('dry_run_reports_parent_writes');
  if (dryRun.deletes_or_merges !== false) findings.push('dry_run_reports_deletes_or_merges');
  if (beforeHash !== DRY_RUN_PROOF_HASH || afterHash !== DRY_RUN_PROOF_HASH) {
    findings.push('dry_run_proof_hash_mismatch');
  }
  if (beforeHash !== afterHash) findings.push('finish_snapshot_hash_mismatch_after_rollback');
  if (dryRun.before_snapshot?.counts?.cracked_ice_active_rows !== 0) {
    findings.push('before_snapshot_cracked_ice_already_active');
  }
  if (dryRun.after_snapshot?.counts?.cracked_ice_active_rows !== 0) {
    findings.push('after_snapshot_cracked_ice_active_after_rollback');
  }
  if (dryRun.candidate_scope?.cracked_ice_candidate_rows !== 131) {
    findings.push('cracked_ice_candidate_rows_not_131');
  }
  if (dryRun.candidate_scope?.affected_sets !== 53) findings.push('affected_sets_not_53');
  if (dryRun.target_finish_key?.key !== 'cracked_ice') findings.push('target_finish_key_mismatch');
  if (dryRun.target_finish_key?.label !== 'Cracked Ice Holo') findings.push('target_finish_label_mismatch');
  if (dryRun.target_finish_key?.sort_order !== 36) findings.push('target_finish_sort_order_mismatch');
  if (dryRun.target_finish_key?.is_active !== true) findings.push('target_finish_not_active');

  if (!proof) findings.push('rollback_proof_missing');
  if (proof) {
    if (proof.package_id !== PACKAGE_ID) findings.push('rollback_proof_wrong_package_id');
    if (proof.source_readiness_fingerprint !== SOURCE_READINESS_FINGERPRINT) {
      findings.push('rollback_proof_source_readiness_fingerprint_mismatch');
    }
    if (proof.package_fingerprint !== PACKAGE_FINGERPRINT) {
      findings.push('rollback_proof_package_fingerprint_mismatch');
    }
    if (proof.finish_key !== 'cracked_ice') findings.push('rollback_proof_finish_key_mismatch');
    if (proof.finish_label !== 'Cracked Ice Holo') findings.push('rollback_proof_finish_label_mismatch');
    if (Number(proof.finish_sort_order) !== 36) findings.push('rollback_proof_sort_order_mismatch');
    if (Number(proof.activated_finish_rows) !== 1) findings.push('rollback_proof_activated_rows_not_1');
    if (Number(proof.cracked_ice_candidate_rows) !== 131) findings.push('rollback_proof_candidate_rows_not_131');
  }

  if (!sql.contains_begin_statement) findings.push('sql_missing_begin_statement');
  if (!sql.contains_rollback_statement) findings.push('sql_missing_rollback_statement');
  if (sql.contains_commit_statement) findings.push('sql_contains_commit_statement');
  if (!sql.contains_finish_key_insert) findings.push('sql_missing_finish_key_insert');
  if (!sql.contains_finish_key_upsert) findings.push('sql_missing_finish_key_upsert');
  if (sql.contains_delete_statement) findings.push('sql_contains_delete_statement');
  if (sql.contains_card_printings_insert) findings.push('sql_contains_child_printing_insert');
  if (sql.contains_card_prints_insert) findings.push('sql_contains_parent_insert');
  if (sql.contains_sets_insert) findings.push('sql_contains_set_insert');
  if (sql.contains_external_insert) findings.push('sql_contains_external_insert');

  return { findings, sql, sqlHash, beforeHash, afterHash };
}

function renderMarkdown(report) {
  return `# PKG-10A Cracked Ice Finish Taxonomy Real Apply Gate V1

This is a no-write approval gate. It does not perform or authorize a durable write by itself.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| finish_key | ${report.package_scope.finish_key} |
| finish_label | ${report.package_scope.finish_label} |
| candidate_printings_unlocked_later | ${report.package_scope.candidate_printings_unlocked_later} |
| affected_sets | ${report.package_scope.affected_sets} |
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
  const line = '| 2026-06-10 | [PKG-10A Cracked Ice Finish Taxonomy Real Apply Gate Checkpoint V1](20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for cracked_ice finish key activation; child printing inserts remain separate. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const sqlPath = dryRun.sql_artifact;
const sqlText = fs.readFileSync(sqlPath, 'utf8');
const { findings, sql, sqlHash, beforeHash, afterHash } = validateInputs({ dryRun, sqlText });
const exactApprovalPhrase =
  `Approve real ${PACKAGE_ID} apply only. ` +
  `Fingerprint: ${PACKAGE_FINGERPRINT}. ` +
  `SQL hash: ${SQL_HASH}. ` +
  'Scope: finish_keys activation only for cracked_ice / Cracked Ice Holo, sort_order=36; 131 cracked_ice Master Index printings across 53 sets remain for a separate child-insert package after activation. ' +
  `Dry-run proof: ${beforeHash} == ${afterHash}. ` +
  'No child inserts. No parent writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine.';

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_v1',
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
  approval_gate_status: findings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_before_real_apply_operator_decision',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    finish_key: 'cracked_ice',
    finish_label: 'Cracked Ice Holo',
    sort_order: 36,
    candidate_printings_unlocked_later: dryRun.candidate_scope?.cracked_ice_candidate_rows ?? null,
    affected_sets: dryRun.candidate_scope?.affected_sets ?? null,
    finish_key_activation_only: true,
    child_inserts_allowed: false,
    parent_writes_allowed: false,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    migrations_allowed: false,
  },
  dry_run_proof: {
    dry_run_execution_status: dryRun.dry_run_execution_status,
    sql_artifact_ref: path.relative(ROOT, sqlPath).replaceAll('\\', '/'),
    sql_hash_sha256: sqlHash,
    sql_contains_begin_statement: sql.contains_begin_statement,
    sql_contains_finish_key_insert: sql.contains_finish_key_insert,
    sql_contains_finish_key_upsert: sql.contains_finish_key_upsert,
    sql_contains_commit_statement: sql.contains_commit_statement,
    sql_contains_rollback_statement: sql.contains_rollback_statement,
    sql_contains_child_printing_insert: sql.contains_card_printings_insert,
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    rollback_proof_rows: dryRun.rollback_proof_rows ?? [],
    stop_findings: dryRun.stop_findings ?? [],
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: exactApprovalPhrase,
    approval_effect:
      'This would authorize preparing and running the durable PKG-10A finish_keys activation only. It does not authorize child printing inserts, parent writes, global apply, deletes, merges, unsupported cleanup, quarantine, or migrations.',
  },
  source_artifacts: {
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    rollback_sql_artifact: path.relative(ROOT, sqlPath).replaceAll('\\', '/'),
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
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  sql_hash_sha256: SQL_HASH,
  finish_key: 'cracked_ice',
  candidate_printings_unlocked_later: report.package_scope.candidate_printings_unlocked_later,
  affected_sets: report.package_scope.affected_sets,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: exactApprovalPhrase,
}, null, 2));

if (!report.pass) process.exitCode = 1;
