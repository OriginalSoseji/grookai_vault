import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const ALL_READY_MODE = process.argv.includes('--all-ready') || process.argv.includes('--bulk');

const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  ALL_READY_MODE
    ? 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_v1.json'
    : 'english_master_index_pkg10ba_first_edition_parent_identity_guarded_dry_run_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  ALL_READY_MODE
    ? 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_v1.json'
    : 'english_master_index_pkg10ba_first_edition_parent_identity_real_apply_gate_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  ALL_READY_MODE
    ? 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_v1.md'
    : 'english_master_index_pkg10ba_first_edition_parent_identity_real_apply_gate_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  ALL_READY_MODE
    ? '20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_checkpoint_v1.md'
    : '20260610_pkg10ba_first_edition_parent_identity_real_apply_gate_checkpoint_v1.md',
);

const PACKAGE_ID = ALL_READY_MODE
  ? 'PKG-10B-B-FIRST-EDITION-PARENT-IDENTITY-BULK-DRY-RUN'
  : 'PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT';
const PACKAGE_FINGERPRINT = ALL_READY_MODE
  ? '429353610d2eddead641783e02861d1cdb50d26da6eee4cca84bd87bd4b1a9d5'
  : 'e8fd374f201c0a18dd971fa2889f32883a2cc620565088f4926b59f8268707f1';
const SOURCE_READINESS_FINGERPRINT = '7b7c9692e664b5a9b026b3d78b51b1ff8849421667ba427e2bd7f688c9ebb81b';
const DRY_RUN_PROOF_HASH = ALL_READY_MODE
  ? '3714a24507734cc9809ecf1ede541aa65289e4fd9caa0e0a29a46aca4e1952c8'
  : '9d9a0307e87357cd79110c51345866bf41890704c602813b87f20b00be3e8df7';
const EXPECTED_SCOPE = ALL_READY_MODE
  ? {
    target_parent_rows: 941,
    target_child_rows: 941,
    external_mapping_rows: 0,
    target_set_count: 11,
    normal: 761,
    holo: 180,
    first_edition_normal: 761,
    first_edition_holo: 180,
    source_candidate_rows: 942,
    deduped_source_rows: 1,
  }
  : {
    target_parent_rows: 64,
    target_child_rows: 64,
    external_mapping_rows: 0,
    target_set_count: 1,
    normal: 48,
    holo: 16,
    first_edition_normal: 48,
    first_edition_holo: 16,
    source_candidate_rows: 64,
    deduped_source_rows: 0,
  };

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

function inspectSql(sqlText) {
  const lower = sqlText.toLowerCase().replace(/--.*$/gm, '');
  return {
    contains_begin_statement: /(^|\n)\s*begin\s*;/.test(lower),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/.test(lower),
    contains_commit_statement: /(^|\n)\s*commit\s*;/.test(lower),
    contains_card_prints_insert: /\binsert\s+into\s+public\.card_prints\b/.test(lower),
    contains_card_printings_insert: /\binsert\s+into\s+public\.card_printings\b/.test(lower),
    contains_external_mapping_insert: /\binsert\s+into\s+public\.external_mappings\b/.test(lower),
    contains_sets_insert: /\binsert\s+into\s+public\.sets\b/.test(lower),
    contains_delete_statement: /(^|\n)\s*delete\s+/.test(lower),
    contains_update_statement: /(^|\n)\s*update\s+/.test(lower),
    contains_finish_key_insert: /\binsert\s+into\s+public\.finish_keys\b/.test(lower),
    contains_finish_key_update: /(^|\n)\s*update\s+public\.finish_keys\b/.test(lower),
  };
}

function validate({ dryRun, sqlText, sqlHash }) {
  const findings = [];
  const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
  const sql = inspectSql(sqlText);

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) {
    findings.push('source_readiness_fingerprint_mismatch');
  }
  if (dryRun.rollback_only !== true) findings.push('dry_run_not_rollback_only');
  if (dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.dry_run?.ok !== true) findings.push('dry_run_not_ok');
  if (dryRun.dry_run?.rolled_back !== true) findings.push('dry_run_not_rolled_back');
  if (dryRun.rollback_proof_equal !== true) findings.push('rollback_proof_not_equal');
  if (beforeHash !== DRY_RUN_PROOF_HASH || afterHash !== DRY_RUN_PROOF_HASH) {
    findings.push('dry_run_proof_hash_mismatch');
  }
  if (beforeHash !== afterHash) findings.push('before_after_hash_mismatch');
  if (dryRun.summary?.target_parent_rows !== EXPECTED_SCOPE.target_parent_rows) findings.push('target_parent_rows_mismatch');
  if (dryRun.summary?.target_child_rows !== EXPECTED_SCOPE.target_child_rows) findings.push('target_child_rows_mismatch');
  if (dryRun.summary?.external_mapping_rows !== EXPECTED_SCOPE.external_mapping_rows) findings.push('external_mapping_rows_mismatch');
  if (dryRun.summary?.target_set_count !== EXPECTED_SCOPE.target_set_count) findings.push('target_set_count_mismatch');
  if (dryRun.summary?.source_candidate_rows !== EXPECTED_SCOPE.source_candidate_rows) findings.push('source_candidate_rows_mismatch');
  if (dryRun.summary?.deduped_source_rows !== EXPECTED_SCOPE.deduped_source_rows) findings.push('deduped_source_rows_mismatch');
  if (dryRun.summary?.by_finish?.normal !== EXPECTED_SCOPE.normal) findings.push('normal_count_mismatch');
  if (dryRun.summary?.by_finish?.holo !== EXPECTED_SCOPE.holo) findings.push('holo_count_mismatch');
  if (dryRun.summary?.by_source_finish?.first_edition_normal !== EXPECTED_SCOPE.first_edition_normal) {
    findings.push('first_edition_normal_count_mismatch');
  }
  if (dryRun.summary?.by_source_finish?.first_edition_holo !== EXPECTED_SCOPE.first_edition_holo) {
    findings.push('first_edition_holo_count_mismatch');
  }
  if (dryRun.dry_run?.guard?.target_count !== EXPECTED_SCOPE.target_child_rows) findings.push('guard_target_count_mismatch');
  if (dryRun.dry_run?.guard?.set_count !== EXPECTED_SCOPE.target_set_count) findings.push('guard_set_count_mismatch');
  if (dryRun.dry_run?.guard?.missing_base_count !== 0) findings.push('guard_missing_base_count_nonzero');
  if (dryRun.dry_run?.guard?.inactive_finish_count !== 0) findings.push('guard_inactive_finish_count_nonzero');
  if (dryRun.dry_run?.guard?.parent_collision_count !== 0) findings.push('guard_parent_collision_count_nonzero');
  if (dryRun.dry_run?.guard?.child_collision_count !== 0) findings.push('guard_child_collision_count_nonzero');
  if (dryRun.dry_run?.inserted?.inserted_parent_count !== EXPECTED_SCOPE.target_parent_rows) findings.push('inserted_parent_count_mismatch');
  if (dryRun.dry_run?.inserted?.inserted_child_count !== EXPECTED_SCOPE.target_child_rows) findings.push('inserted_child_count_mismatch');

  if (!sql.contains_begin_statement) findings.push('sql_missing_begin_statement');
  if (!sql.contains_rollback_statement) findings.push('sql_missing_rollback_statement');
  if (sql.contains_commit_statement) findings.push('sql_contains_commit_statement');
  if (!sql.contains_card_prints_insert) findings.push('sql_missing_parent_insert');
  if (!sql.contains_card_printings_insert) findings.push('sql_missing_child_insert');
  if (sql.contains_external_mapping_insert) findings.push('sql_contains_external_mapping_insert');
  if (sql.contains_sets_insert) findings.push('sql_contains_set_insert');
  if (sql.contains_delete_statement) findings.push('sql_contains_delete_statement');
  if (sql.contains_update_statement) findings.push('sql_contains_update_statement');
  if (sql.contains_finish_key_insert || sql.contains_finish_key_update) findings.push('sql_contains_finish_key_activation');

  return { findings, beforeHash, afterHash, sql, sqlHash };
}

function renderMarkdown(report) {
  return `# ${ALL_READY_MODE ? 'PKG-10BB Bulk' : 'PKG-10BA'} First Edition Parent Identity Real Apply Gate V1

This is a no-write real-apply gate. It records the exact approval boundary and does not perform durable writes.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| target_set | ${report.package_scope.target_set_key} / ${report.package_scope.target_set_name} |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| target_child_rows | ${report.package_scope.target_child_rows} |
| external_mapping_rows | ${report.package_scope.external_mapping_rows} |
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
  const line = ALL_READY_MODE
    ? '| 2026-06-10 | [PKG-10BB First Edition Parent Identity Bulk Real Apply Gate Checkpoint V1](20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for all ready first-edition parent identity inserts and normal/holo child inserts. |'
    : '| 2026-06-10 | [PKG-10BA First Edition Parent Identity Real Apply Gate Checkpoint V1](20260610_pkg10ba_first_edition_parent_identity_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for base2/Jungle first-edition parent identity inserts and normal/holo child inserts. |';
  const checkpointRef = ALL_READY_MODE
    ? '20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_checkpoint_v1.md'
    : '20260610_pkg10ba_first_edition_parent_identity_real_apply_gate_checkpoint_v1.md';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes(checkpointRef)) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes(checkpointRef)
        ? line
        : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const sqlPath = dryRun.sql_artifact;
const sqlText = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(sqlText);
const { findings, beforeHash, afterHash, sql } = validate({ dryRun, sqlText, sqlHash });
const approvalText =
  `Approve real ${PACKAGE_ID} apply only. ` +
  `Fingerprint: ${PACKAGE_FINGERPRINT}. ` +
  `SQL hash: ${sqlHash}. ` +
  (ALL_READY_MODE
    ? 'Scope: 941 first-edition parent identity inserts and 941 child card_printing inserts across 11 WOTC first-edition sets; child finishes normal=761 and holo=180; source finishes first_edition_normal=761 and first_edition_holo=180; external mappings=0; 1 duplicate source fact deduped before write. '
    : 'Scope: 64 first-edition parent identity inserts and 64 child card_printing inserts for base2/Jungle; child finishes normal=48 and holo=16; source finishes first_edition_normal=48 and first_edition_holo=16; external mappings=0. ') +
  `Dry-run proof: ${beforeHash} == ${afterHash}. ` +
  'No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine. No finish-key activation.';

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10ba_first_edition_parent_identity_real_apply_gate_v1',
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
    sql_hash_sha256: sqlHash,
    target_set_key: dryRun.target_set_key,
    target_set_name: dryRun.target_set_name,
    target_parent_rows: dryRun.summary?.target_parent_rows ?? null,
    target_child_rows: dryRun.summary?.target_child_rows ?? null,
    external_mapping_rows: dryRun.summary?.external_mapping_rows ?? null,
    by_finish: dryRun.summary?.by_finish ?? {},
    by_source_finish: dryRun.summary?.by_source_finish ?? {},
    parent_identity_modifier: dryRun.parent_strategy?.printed_identity_modifier ?? null,
    finish_key_activation_allowed: false,
    external_mapping_inserts_allowed: false,
    set_inserts_allowed: false,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    global_apply_allowed: false,
    migrations_allowed: false,
  },
  dry_run_proof: {
    sql_artifact_ref: path.relative(ROOT, sqlPath).replaceAll('\\', '/'),
    sql_hash_sha256: sqlHash,
    sql_inspection: sql,
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    rollback_proof_equal: dryRun.rollback_proof_equal,
    dry_run_ok: dryRun.dry_run?.ok ?? false,
    dry_run_guard: dryRun.dry_run?.guard ?? null,
    dry_run_inserted_counts: dryRun.dry_run?.inserted ?? null,
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: approvalText,
    approval_effect:
      'This would authorize preparing and running the durable PKG-10BA base2/Jungle first-edition parent+child apply only. It does not authorize global apply, migrations, deletes, merges, unsupported cleanup, quarantine, finish-key activation, set inserts, or external mapping inserts.',
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
  sql_hash_sha256: sqlHash,
  target_parent_rows: report.package_scope.target_parent_rows,
  target_child_rows: report.package_scope.target_child_rows,
  external_mapping_rows: report.package_scope.external_mapping_rows,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: approvalText,
}, null, 2));

if (!report.pass) process.exitCode = 1;
