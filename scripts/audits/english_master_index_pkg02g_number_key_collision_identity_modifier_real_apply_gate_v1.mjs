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
  'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_v1.json',
);
const PLAN_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_gate_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_gate_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02g_number_key_collision_identity_modifier_real_apply_gate_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER';
const PACKAGE_FINGERPRINT = '6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4';

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

function validateInputs(dryRun, plan) {
  const findings = [];
  if (dryRun.dry_run_execution_status !== 'pkg02g_number_key_collision_identity_modifier_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_before_after_hash_mismatch');
  }
  if (dryRun.plan_fresh_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_fresh_snapshot_drift');
  }
  if (dryRun.db_writes_performed !== false) findings.push('dry_run_reports_db_write');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_performed !== false) findings.push('dry_run_reports_real_apply');
  if (dryRun.delete_performed !== false) findings.push('dry_run_reports_delete');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('dry_run_fingerprint_mismatch');
  }
  if (dryRun.package_scope?.number_key_collision_rows !== 58) findings.push('dry_run_collision_count_not_58');
  if (dryRun.package_scope?.parent_update_rows !== 97) findings.push('dry_run_parent_update_count_not_97');
  if (dryRun.package_scope?.blocked_target_parent_recovery_rows !== 58) {
    findings.push('dry_run_blocked_target_recovery_count_not_58');
  }
  if (dryRun.package_scope?.existing_collision_holder_modifier_rows !== 39) {
    findings.push('dry_run_existing_collision_holder_count_not_39');
  }
  if (dryRun.package_scope?.deletes_included !== false) findings.push('dry_run_scope_includes_deletes');
  if (dryRun.package_scope?.global_apply_included !== false) findings.push('dry_run_scope_includes_global_apply');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');
  if (dryRun.sql_artifact?.contains_delete_statement !== false) findings.push('dry_run_sql_had_delete_statement');
  if (dryRun.sql_artifact?.contains_update_statement !== true) findings.push('dry_run_sql_missing_update_statement');

  if (plan.plan_status !== 'pkg02g_number_key_collision_identity_modifier_plan_prepared_apply_blocked_no_write') {
    findings.push('plan_status_not_ready');
  }
  if (plan.pass !== true) findings.push('plan_report_not_passing');
  if (plan.db_writes_performed !== false) findings.push('plan_reports_db_write');
  if (plan.migrations_created !== false) findings.push('plan_reports_migration');
  if (plan.delete_performed !== false) findings.push('plan_reports_delete');
  if ((plan.stop_findings ?? []).length !== 0) findings.push('plan_stop_findings_present');
  if (plan.package_scope?.package_id !== PACKAGE_ID) findings.push('plan_wrong_package_id');
  if (plan.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('plan_fingerprint_mismatch');
  }
  if (plan.package_scope?.number_key_collision_rows !== 58) findings.push('plan_collision_count_not_58');
  if (plan.package_scope?.parent_update_rows !== 97) findings.push('plan_parent_update_count_not_97');
  if (plan.package_scope?.blocked_target_parent_recovery_rows !== 58) {
    findings.push('plan_blocked_target_recovery_count_not_58');
  }
  if (plan.package_scope?.existing_collision_holder_modifier_rows !== 39) {
    findings.push('plan_existing_collision_holder_count_not_39');
  }
  if (plan.package_scope?.deletes_included !== false) findings.push('plan_scope_includes_deletes');
  if (plan.package_scope?.global_apply_included !== false) findings.push('plan_scope_includes_global_apply');
  if (plan.package_scope?.migrations_included !== false) findings.push('plan_scope_includes_migrations');
  if (plan.simulated_unique_index_result?.final_unique_collision_count !== 0) {
    findings.push('plan_simulated_unique_collisions_present');
  }
  if (plan.sql_artifact?.contains_commit_statement !== false) findings.push('plan_sql_had_commit_statement');
  if (plan.sql_artifact?.contains_rollback_statement !== true) findings.push('plan_sql_missing_rollback_statement');
  if (plan.sql_artifact?.contains_delete_statement !== false) findings.push('plan_sql_had_delete_statement');
  if (plan.sql_artifact?.contains_update_statement !== true) findings.push('plan_sql_missing_update_statement');
  return findings;
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const plan = readJson(PLAN_JSON);
  const stopFindings = validateInputs(dryRun, plan);
  const beforeHash = dryRun.execution_result?.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.execution_result?.after_snapshot?.hash_sha256 ?? null;
  const exactApprovalPhrase = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. Scope: 58 number-key collision rows, 97 parent identity updates, no deletes. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations.`;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_gate_v1',
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
    approval_gate_status: stopFindings.length === 0
      ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
      : 'blocked_before_real_apply_operator_decision',
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      number_key_collision_rows: 58,
      parent_update_rows: 97,
      blocked_target_parent_recovery_rows: 58,
      existing_collision_holder_modifier_rows: 39,
      allowed_parent_updates: [
        'card_prints.set_code',
        'card_prints.number',
        'card_prints.name',
        'card_prints.printed_identity_modifier',
      ],
      deletes_included: false,
      global_apply_included: false,
      migrations_included: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: dryRun.sql_artifact?.path ?? null,
      sql_artifact_hash_sha256: dryRun.sql_artifact?.actual_sha256 ?? null,
      contains_commit_statement: dryRun.sql_artifact?.contains_commit_statement ?? null,
      contains_rollback_statement: dryRun.sql_artifact?.contains_rollback_statement ?? null,
      contains_delete_statement: dryRun.sql_artifact?.contains_delete_statement ?? null,
      contains_update_statement: dryRun.sql_artifact?.contains_update_statement ?? null,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      plan_fresh_snapshot_matches_before_snapshot: dryRun.plan_fresh_snapshot_matches_before_snapshot,
      stop_findings: dryRun.stop_findings ?? [],
    },
    plan_proof: {
      source_artifact_ref: path.relative(ROOT, PLAN_JSON).replaceAll('\\', '/'),
      source_artifact_snapshot_hash_sha256: plan.current_snapshot?.hash_sha256 ?? null,
      simulated_final_unique_collision_count: plan.simulated_unique_index_result?.final_unique_collision_count ?? null,
      sql_artifact_ref: plan.sql_artifact?.path ?? null,
      sql_artifact_hash_sha256: plan.sql_artifact?.sha256 ?? null,
      parent_update_rows: plan.parent_update_rows?.length ?? 0,
      collision_plan_rows: plan.collision_plan_rows?.length ?? 0,
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect: 'This would authorize preparing and running the durable PKG-02G apply path only, scoped to 97 parent identity updates for 58 number-key collision rows. It does not authorize deletes, global apply, cleanup, quarantine, or migrations.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        number_key_collision_rows: 58,
        parent_update_rows: 97,
        deletes_included: false,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same 58 number-key collision rows, 97 parent identity updates, and zero simulated unique collision groups.',
      'Execute a durable transaction with COMMIT only after this exact real-apply approval is present.',
      'Capture post-apply readback and verify all 97 parent identity updates landed, no deletes occurred, and unique identity collisions remain zero.',
      'Run post-apply preflight and checkpoint.',
    ],
    explicit_non_authorizations: [
      'This gate is not a real apply.',
      'This gate does not record approval.',
      'This gate does not run SQL.',
      'This gate does not write to the database.',
      'This gate does not create a migration.',
      'This gate does not authorize global apply.',
      'This gate does not authorize deletes.',
      'This gate does not authorize cleanup or quarantine.',
    ],
    source_artifacts: {
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      plan_artifact: path.relative(ROOT, PLAN_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02G Number-Key Collision Identity Modifier Real Apply Gate V1');
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
  lines.push(`| number_key_collision_rows | ${report.package_scope.number_key_collision_rows} |`);
  lines.push(`| parent_update_rows | ${report.package_scope.parent_update_rows} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| delete_performed | ${report.delete_performed} |`);
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
  lines.push(`| plan_fresh_snapshot_matches_before_snapshot | ${report.dry_run_proof.plan_fresh_snapshot_matches_before_snapshot} |`);
  lines.push(`| contains_commit_statement | ${report.dry_run_proof.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.dry_run_proof.contains_rollback_statement} |`);
  lines.push(`| contains_delete_statement | ${report.dry_run_proof.contains_delete_statement} |`);
  lines.push('');
  lines.push('## Plan Proof');
  lines.push('');
  lines.push(`- Simulated final unique collision count: ${report.plan_proof.simulated_final_unique_collision_count}`);
  lines.push(`- Parent update rows: ${report.plan_proof.parent_update_rows}`);
  lines.push(`- Collision plan rows: ${report.plan_proof.collision_plan_rows}`);
  lines.push('');
  lines.push('## Required Approval Phrase');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_decision.exact_approval_phrase_required);
  lines.push('```');
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02G Number-Key Collision Identity Modifier Real Apply Gate Checkpoint V1](20260609_pkg02g_number_key_collision_identity_modifier_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate after successful rollback-only dry run for 58 number-key collision rows and 97 parent identity updates. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02g_number_key_collision_identity_modifier_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02g_number_key_collision_identity_modifier_real_apply_gate_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
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
  number_key_collision_rows: report.package_scope.number_key_collision_rows,
  parent_update_rows: report.package_scope.parent_update_rows,
  simulated_final_unique_collision_count: report.plan_proof.simulated_final_unique_collision_count,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  delete_performed: report.delete_performed,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
