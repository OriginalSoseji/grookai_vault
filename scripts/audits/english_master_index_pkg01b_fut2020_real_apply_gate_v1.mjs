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

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01b_fut2020_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-01B-FUT2020';
const PACKAGE_FINGERPRINT = 'c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function validateInputs(dryRun, artifact) {
  const findings = [];
  const dryScope = dryRun.package_scope ?? {};
  const artifactScope = artifact.package_scope ?? {};
  const sqlArtifact = dryRun.sql_artifact ?? {};

  if (dryRun.dry_run_execution_status !== 'pkg01b_fut2020_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRun.transaction_artifact_executed !== true) findings.push('dry_run_transaction_not_executed');
  if (dryRun.dry_run_update_delete_executed_inside_rolled_back_transaction !== true) {
    findings.push('dry_run_update_delete_not_rolled_back');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_before_after_hash_mismatch');
  }
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.apply_allowed !== false) findings.push('dry_run_allows_apply');
  if (dryRun.write_ready_now !== 0) findings.push('dry_run_write_ready_nonzero');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');

  if (dryScope.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryScope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryScope.parent_card_print_rows !== 4) findings.push('dry_run_parent_count_not_four');
  if (dryScope.transient_parent_set_code_updates !== 4) findings.push('dry_run_parent_update_count_not_four');
  if (dryScope.transient_child_delete_candidates !== 8) findings.push('dry_run_child_delete_count_not_eight');
  if (dryScope.child_keep_rows !== 4) findings.push('dry_run_child_keep_count_not_four');
  if ((dryScope.allowed_parent_field_changes ?? []).join(',') !== 'set_code') {
    findings.push('dry_run_parent_field_scope_not_set_code');
  }
  if ((dryScope.allowed_child_delete_finish_keys ?? []).join(',') !== 'holo,reverse') {
    findings.push('dry_run_child_delete_finish_scope_not_holo_reverse');
  }

  if (sqlArtifact.contains_commit_statement !== false) findings.push('sql_artifact_contains_commit_statement');
  if (sqlArtifact.contains_rollback_statement !== true) findings.push('sql_artifact_missing_rollback_statement');

  if (artifact.artifact_status !== 'pkg01b_fut2020_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('artifact_status_not_ready');
  }
  if (artifact.pass !== true) findings.push('artifact_report_not_passing');
  if (artifactScope.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package_id');
  if (artifactScope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if (artifactScope.parent_set_code_updates !== 4) findings.push('artifact_parent_update_count_not_four');
  if (artifactScope.child_delete_candidates !== 8) findings.push('artifact_child_delete_count_not_eight');
  if (artifactScope.child_keep_rows !== 4) findings.push('artifact_child_keep_count_not_four');
  if (artifact.fresh_snapshot?.impact_counts?.parent_vault_items_found !== 0) {
    findings.push('artifact_parent_vault_refs_present');
  }
  if (artifact.fresh_snapshot?.impact_counts?.child_dependency_refs_found !== 0) {
    findings.push('artifact_child_dependency_refs_present');
  }
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');

  return findings;
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const artifact = readJson(ARTIFACT_JSON);
  const stopFindings = validateInputs(dryRun, artifact);
  const beforeHash = dryRun.verification_summary?.before_hash_sha256 ?? null;
  const afterHash = dryRun.verification_summary?.after_hash_sha256 ?? null;
  const exactApprovalPhrase = `Approve real PKG-01B-FUT2020 apply only. Fingerprint: ${PACKAGE_FINGERPRINT}. Parent scope: 4 set_code updates. Child scope: 8 unsupported holo/reverse deletes. Dry-run proof: ${beforeHash} == ${afterHash}. No global apply. No migrations.`;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01b_fut2020_real_apply_gate_v1',
    audit_only: true,
    approval_gate_only: true,
    real_apply_gate_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
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
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      set_key: 'fut2020',
      set_name: 'Pokémon Futsal 2020',
      target_numbers: ['2', '3', '4', '5'],
      parent_set_code_updates: 4,
      child_delete_candidates: 8,
      child_keep_rows: 4,
      parent_table: 'public.card_prints',
      child_table: 'public.card_printings',
      allowed_parent_field_changes: ['set_code'],
      allowed_child_delete_finish_keys: ['holo', 'reverse'],
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: dryRun.sql_artifact?.artifact_ref ?? null,
      sql_artifact_hash_sha256: dryRun.sql_artifact?.artifact_hash_sha256 ?? null,
      contains_commit_statement: dryRun.sql_artifact?.contains_commit_statement ?? null,
      contains_rollback_statement: dryRun.sql_artifact?.contains_rollback_statement ?? null,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      stop_findings: dryRun.stop_findings ?? [],
    },
    rollback_proof: {
      rollback_matrix_available: Array.isArray(artifact.rollback_matrix),
      rollback_parent_rows: artifact.rollback_matrix?.length ?? 0,
      rollback_child_reinsert_snapshots: (artifact.rollback_matrix ?? []).reduce(
        (sum, row) => sum + (row.child_printing_reinsert_snapshot_for_delete_candidates ?? []).length,
        0,
      ),
      source_artifact_snapshot_hash_sha256: artifact.fresh_snapshot?.snapshot_hash_sha256 ?? null,
      source_artifact_ref: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect: 'This would authorize preparing and running the durable PKG-01B apply path only, still scoped to the same four parent rows and eight child delete candidates. It does not authorize global apply.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        parent_set_code_updates: 4,
        child_delete_candidates: 8,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same four parent rows, eight child delete candidates, four keep rows, zero vault refs, and zero child dependency refs.',
      'Execute a durable transaction with COMMIT only after this exact real-apply approval is present.',
      'Capture post-apply readback and compare Grookai to the Master Index for fut2020 cards #2-#5.',
      'Write a post-apply checkpoint with rollback instructions and no global scope creep.',
    ],
    explicit_non_authorizations: [
      'This gate is not a real apply.',
      'This gate does not record approval.',
      'This gate does not run SQL.',
      'This gate does not write to the database.',
      'This gate does not create a migration.',
      'This gate does not authorize global apply.',
      'This gate does not authorize cleanup or quarantine outside PKG-01B-FUT2020.',
    ],
    source_artifacts: {
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      final_snapshot_transaction_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Real Apply Gate V1');
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
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
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
  lines.push(`| contains_commit_statement | ${report.dry_run_proof.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.dry_run_proof.contains_rollback_statement} |`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('| Scope | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| parent set_code updates | ${report.package_scope.parent_set_code_updates} |`);
  lines.push(`| child delete candidates | ${report.package_scope.child_delete_candidates} |`);
  lines.push(`| child keep rows | ${report.package_scope.child_keep_rows} |`);
  lines.push(`| rollback child reinsert snapshots | ${report.rollback_proof.rollback_child_reinsert_snapshots} |`);
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
  return `# PKG-01B-FUT2020 Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Purpose

Record the no-write real-apply gate after successful rollback-only dry-run execution for PKG-01B-FUT2020.

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| parent_set_code_updates | ${report.package_scope.parent_set_code_updates} |
| child_delete_candidates | ${report.package_scope.child_delete_candidates} |
| rollback_child_reinsert_snapshots | ${report.rollback_proof.rollback_child_reinsert_snapshots} |
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

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_real_apply_gate_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_real_apply_gate_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Real Apply Gate Checkpoint V1](20260609_pkg01b_fut2020_real_apply_gate_checkpoint_v1.md) | Records the no-write real-apply gate after successful rollback-only dry run for fut2020 cards #2-#5, requiring exact approval before any durable parent update or child delete. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_real_apply_gate_checkpoint_v1.md')
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
  parent_set_code_updates: report.package_scope.parent_set_code_updates,
  child_delete_candidates: report.package_scope.child_delete_candidates,
  rollback_child_reinsert_snapshots: report.rollback_proof.rollback_child_reinsert_snapshots,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
