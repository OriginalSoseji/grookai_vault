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

const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_v1.json',
);
const ARTIFACT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1.json',
);
const COLLISION_AUDIT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02b_full_beta_collision_audit_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02c_full_beta_noncolliding_real_apply_gate_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02C-FULL-BETA-NONCOLLIDING';
const PACKAGE_FINGERPRINT = '53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function validateInputs({ dryRun, artifact, collisionAudit }) {
  const findings = [];
  const dryScope = dryRun.package_scope ?? {};
  const artifactScope = artifact.package_scope ?? {};

  if (dryRun.dry_run_execution_status !== 'pkg02c_full_beta_noncolliding_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_before_after_hash_mismatch');
  }
  if (dryRun.artifact_fresh_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_fresh_snapshot_drift');
  }
  if (dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_performed !== false) findings.push('dry_run_reports_real_apply');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');
  if (dryRun.sql_artifact?.contains_delete_statement !== false) findings.push('dry_run_sql_had_delete_statement');
  if (dryRun.sql_artifact?.execution_performed !== true) findings.push('dry_run_transaction_not_executed');
  if (dryRun.sql_artifact?.expected_sha256 !== dryRun.sql_artifact?.actual_sha256) {
    findings.push('dry_run_sql_hash_mismatch');
  }

  if (dryScope.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryScope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryScope.card_print_rows !== 343) findings.push('dry_run_card_print_count_not_343');
  if (dryScope.child_printing_rows !== 542) findings.push('dry_run_child_count_not_542');
  if (dryScope.vault_references_accepted !== 4) findings.push('dry_run_vault_count_not_4');
  if (dryScope.collision_rows_excluded !== 79) findings.push('dry_run_collision_exclusion_count_not_79');

  if (artifact.artifact_status !== 'pkg02c_full_beta_noncolliding_transaction_artifact_prepared_apply_blocked_no_write') {
    findings.push('artifact_status_not_ready');
  }
  if (artifact.pass !== true) findings.push('artifact_report_not_passing');
  if (artifact.db_writes_performed !== false) findings.push('artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('artifact_reports_migration');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');
  if (artifactScope.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package_id');
  if (artifactScope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if (artifactScope.card_print_rows !== 343) findings.push('artifact_card_print_count_not_343');
  if (artifactScope.child_printing_rows !== 542) findings.push('artifact_child_count_not_542');
  if (artifactScope.vault_references_accepted !== 4) findings.push('artifact_vault_count_not_4');
  if (artifactScope.collision_rows_excluded !== 79) findings.push('artifact_collision_exclusion_count_not_79');
  if (artifact.sql_artifact?.contains_commit_statement !== false) findings.push('artifact_sql_had_commit_statement');
  if (artifact.sql_artifact?.contains_rollback_statement !== true) findings.push('artifact_sql_missing_rollback_statement');
  if (artifact.sql_artifact?.contains_delete_statement !== false) findings.push('artifact_sql_had_delete_statement');

  if (collisionAudit.audit_status !== 'pkg02b_full_beta_collision_audit_complete_split_required') {
    findings.push('collision_audit_not_complete');
  }
  if (collisionAudit.summary?.non_colliding_rows !== 343) findings.push('collision_audit_noncolliding_count_not_343');
  if (collisionAudit.summary?.blocked_collision_rows !== 79) findings.push('collision_audit_blocked_count_not_79');
  if (collisionAudit.summary?.non_colliding_child_printings !== 542) findings.push('collision_audit_noncolliding_child_count_not_542');
  if (collisionAudit.summary?.blocked_collision_child_printings !== 101) {
    findings.push('collision_audit_blocked_child_count_not_101');
  }

  return findings;
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const artifact = readJson(ARTIFACT_JSON);
  const collisionAudit = readJson(COLLISION_AUDIT_JSON);
  const stopFindings = validateInputs({ dryRun, artifact, collisionAudit });
  const beforeHash = dryRun.execution_result?.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.execution_result?.after_snapshot?.hash_sha256 ?? null;
  const exactApprovalPhrase = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. Scope: 343 non-colliding card_print updates, 542 child printings preserved, 4 vault references accepted, 79 collision rows excluded. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations.`;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1',
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
      : 'blocked_before_real_apply_operator_decision',
    package_scope: {
      package_id: PACKAGE_ID,
      parent_package_id: artifact.package_scope?.parent_package_id,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      card_print_updates: 343,
      child_printings_preserved: 542,
      vault_references_accepted: 4,
      collision_rows_excluded: 79,
      collision_child_printings_excluded: 101,
      parent_table: 'public.card_prints',
      child_table: 'public.card_printings',
      allowed_parent_field_changes: ['set_code', 'number', 'name'],
      child_mutations_allowed: false,
      delete_mutations_allowed: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: dryRun.sql_artifact?.path ?? null,
      sql_artifact_hash_sha256: dryRun.sql_artifact?.actual_sha256 ?? null,
      contains_commit_statement: dryRun.sql_artifact?.contains_commit_statement ?? null,
      contains_rollback_statement: dryRun.sql_artifact?.contains_rollback_statement ?? null,
      contains_delete_statement: dryRun.sql_artifact?.contains_delete_statement ?? null,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      artifact_fresh_snapshot_matches_before_snapshot: dryRun.artifact_fresh_snapshot_matches_before_snapshot,
      stop_findings: dryRun.stop_findings ?? [],
    },
    collision_proof: {
      collision_audit_ref: path.relative(ROOT, COLLISION_AUDIT_JSON).replaceAll('\\', '/'),
      blocked_collision_rows: collisionAudit.summary?.blocked_collision_rows ?? null,
      blocked_collision_child_printings: collisionAudit.summary?.blocked_collision_child_printings ?? null,
      blocked_rows_remain_excluded: true,
      merge_dedupe_authorized: false,
    },
    rollback_proof: {
      rollback_matrix_available: Array.isArray(artifact.rollback_matrix),
      rollback_rows: artifact.rollback_matrix?.length ?? 0,
      source_artifact_snapshot_hash_sha256: artifact.fresh_snapshot?.hash_sha256 ?? null,
      source_artifact_ref: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect: 'This would authorize preparing and running the durable PKG-02C apply path only, scoped to 343 non-colliding parent card_print updates. It does not authorize global apply or any collision-row merge/dedupe/delete work.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        card_print_updates: 343,
        child_printings_preserved: 542,
        vault_references_accepted: 4,
        collision_rows_excluded: 79,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same 343 parent rows, 542 child printings, 4 vault refs, and 79 excluded collision rows.',
      'Execute a durable transaction with COMMIT only after this exact real-apply approval is present.',
      'Capture post-apply readback and compare PKG-02C rows to the Master Index target fields.',
      'Run post-apply collision and migration checks, then write a checkpoint.',
    ],
    explicit_non_authorizations: [
      'This gate is not a real apply.',
      'This gate does not record approval.',
      'This gate does not run SQL.',
      'This gate does not write to the database.',
      'This gate does not create a migration.',
      'This gate does not authorize global apply.',
      'This gate does not authorize collision-row merge, dedupe, delete, or quarantine.',
      'This gate does not authorize child printing mutations.',
    ],
    source_artifacts: {
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      final_snapshot_transaction_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
      collision_audit: path.relative(ROOT, COLLISION_AUDIT_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02C Full Beta Non-Colliding Real Apply Gate V1');
  lines.push('');
  lines.push('This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approval_gate_status | ${report.approval_gate_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Dry-Run Proof');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_proof.dry_run_execution_status} |`);
  lines.push(`| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |`);
  lines.push(`| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |`);
  lines.push(`| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| artifact_fresh_snapshot_matches_before_snapshot | ${report.dry_run_proof.artifact_fresh_snapshot_matches_before_snapshot} |`);
  lines.push(`| contains_commit_statement | ${report.dry_run_proof.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.dry_run_proof.contains_rollback_statement} |`);
  lines.push(`| contains_delete_statement | ${report.dry_run_proof.contains_delete_statement} |`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('| Scope | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| card_print updates | ${report.package_scope.card_print_updates} |`);
  lines.push(`| child printings preserved | ${report.package_scope.child_printings_preserved} |`);
  lines.push(`| vault references accepted | ${report.package_scope.vault_references_accepted} |`);
  lines.push(`| collision rows excluded | ${report.package_scope.collision_rows_excluded} |`);
  lines.push(`| collision child printings excluded | ${report.package_scope.collision_child_printings_excluded} |`);
  lines.push(`| rollback rows | ${report.rollback_proof.rollback_rows} |`);
  lines.push('');
  lines.push('## Required Approval Phrase');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_decision.exact_approval_phrase_required);
  lines.push('```');
  lines.push('');
  lines.push('## Next Step If Approved Later');
  lines.push('');
  for (const step of report.next_step_if_approved_later) lines.push(`- ${step}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-02C Full Beta Non-Colliding Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Purpose

Record the no-write real-apply gate after successful rollback-only dry-run execution for PKG-02C-FULL-BETA-NONCOLLIDING.

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| card_print_updates | ${report.package_scope.card_print_updates} |
| child_printings_preserved | ${report.package_scope.child_printings_preserved} |
| vault_references_accepted | ${report.package_scope.vault_references_accepted} |
| collision_rows_excluded | ${report.package_scope.collision_rows_excluded} |
| dry_run_before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |
| dry_run_after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| write_ready_now | ${report.write_ready_now} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Required Approval Phrase

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`

## Safety

- DB reads performed: false
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- Real apply authorized: false
- Global apply authorized: false
- Collision-row apply authorized: false

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02C Full Beta Non-Colliding Real Apply Gate Checkpoint V1](20260609_pkg02c_full_beta_noncolliding_real_apply_gate_checkpoint_v1.md) | Records the no-write real-apply gate after successful rollback-only dry run for 343 non-colliding card_print updates, requiring exact approval before any durable update. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02c_full_beta_noncolliding_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02c_full_beta_noncolliding_real_apply_gate_checkpoint_v1.md')
            ? line
            : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const report = buildReport();
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
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  dry_run_before_hash_sha256: report.dry_run_proof.before_hash_sha256,
  dry_run_after_hash_sha256: report.dry_run_proof.after_hash_sha256,
  card_print_updates: report.package_scope.card_print_updates,
  child_printings_preserved: report.package_scope.child_printings_preserved,
  vault_references_accepted: report.package_scope.vault_references_accepted,
  collision_rows_excluded: report.package_scope.collision_rows_excluded,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
