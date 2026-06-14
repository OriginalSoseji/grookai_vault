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

const READINESS_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg05a_missing_set_insert_readiness_v1.json',
);
const ARTIFACT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1.json',
);
const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg05a_guarded_dry_run_execution_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg05a_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg05a_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS';
const READINESS_FINGERPRINT =
  'da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1';

const EXPECTED_COUNTS = {
  selected_sets: 4,
  planned_set_inserts: 4,
  planned_parent_inserts: 72,
  planned_child_printing_inserts: 80,
  planned_external_mapping_inserts: 72,
};

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

function countSqlStatements(sqlText) {
  const lower = sqlText.toLowerCase();
  return {
    contains_begin_statement: /(^|\n)\s*begin\s*;/.test(lower),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/.test(lower),
    contains_commit_statement: /(^|\n)\s*commit\s*;/.test(lower),
    contains_update_statement: /(^|\n)\s*update\s+/m.test(lower),
    contains_delete_statement: /(^|\n)\s*delete\s+/m.test(lower),
    contains_insert_statement: /(^|\n)\s*insert\s+into\s+/m.test(lower),
  };
}

function getReadinessSummary(readiness) {
  const summary = readiness.summary ?? readiness.readiness_summary ?? {};
  const selectedSets = readiness.selected_sets ?? readiness.eligible_sets ?? readiness.sets ?? [];
  return {
    selected_sets: selectedSets,
    counts: {
      selected_sets: selectedSets.length,
      planned_set_inserts:
        summary.planned_set_inserts ??
        summary.expected_set_inserts ??
        readiness.package_scope?.counts?.planned_set_inserts ??
        selectedSets.length,
      planned_parent_inserts:
        summary.planned_parent_inserts ??
        summary.expected_parent_rows ??
        readiness.package_scope?.counts?.planned_parent_inserts ??
        selectedSets.reduce((sum, set) => sum + Number(set.expected_parent_rows ?? 0), 0),
      planned_child_printing_inserts:
        summary.planned_child_printing_inserts ??
        summary.expected_child_printings ??
        readiness.package_scope?.counts?.planned_child_printing_inserts ??
        selectedSets.reduce((sum, set) => sum + Number(set.expected_child_printings ?? 0), 0),
      planned_external_mapping_inserts:
        summary.planned_external_mapping_inserts ??
        summary.expected_external_mappings ??
        readiness.package_scope?.counts?.planned_external_mapping_inserts ??
        selectedSets.reduce((sum, set) => sum + Number(set.expected_parent_rows ?? 0), 0),
    },
  };
}

function validateInputs({
  readiness,
  artifact,
  dryRun,
  sqlText,
  expectedArtifactFingerprint,
  expectedDryRunHash,
}) {
  const findings = [];
  const readinessSummary = getReadinessSummary(readiness);
  const artifactSummary = artifact.summary ?? {};
  const dryCounts = dryRun.package_scope?.counts ?? {};
  const sql = countSqlStatements(sqlText);
  const rollbackProof = dryRun.rollback_proof_rows?.[0] ?? {};

  if (dryRun.dry_run_execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_status_not_passed');
  }
  if (dryRun.transaction_artifact_executed !== true) findings.push('dry_run_transaction_not_executed');
  if (dryRun.dry_run_insert_executed_inside_rolled_back_transaction !== true) {
    findings.push('dry_run_insert_not_executed_inside_rollback');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_before_after_hash_mismatch');
  }
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
  if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
  if (dryRun.real_apply_authorized !== false) findings.push('dry_run_reports_real_apply_authorized');
  if (dryRun.write_ready_now !== 0) findings.push('dry_run_write_ready_nonzero');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');

  if (dryRun.source_artifact?.source_readiness_fingerprint_sha256 !== READINESS_FINGERPRINT) {
    findings.push('dry_run_readiness_fingerprint_mismatch');
  }
  if (dryRun.source_artifact?.artifact_fingerprint_sha256 !== expectedArtifactFingerprint) {
    findings.push('dry_run_artifact_fingerprint_mismatch');
  }
  if (dryRun.before_snapshot?.hash_sha256 !== expectedDryRunHash) {
    findings.push('dry_run_before_hash_unexpected');
  }
  if (dryRun.after_snapshot?.hash_sha256 !== expectedDryRunHash) {
    findings.push('dry_run_after_hash_unexpected');
  }

  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package_id');
  if (artifact.source_readiness_fingerprint_sha256 !== READINESS_FINGERPRINT) {
    findings.push('artifact_readiness_fingerprint_mismatch');
  }
  if (artifact.artifact_fingerprint_sha256 !== expectedArtifactFingerprint) {
    findings.push('artifact_fingerprint_mismatch');
  }
  if (artifact.db_writes_performed !== false) findings.push('artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('artifact_reports_migration');
  if (artifact.cleanup_performed !== false) findings.push('artifact_reports_cleanup');
  if (artifact.quarantine_performed !== false) findings.push('artifact_reports_quarantine');
  if (artifact.apply_paths_executed !== false) findings.push('artifact_reports_apply_path');
  if (artifact.write_ready_now !== 0) findings.push('artifact_write_ready_nonzero');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');
  if (artifact.fresh_snapshot?.available !== true) findings.push('artifact_fresh_snapshot_unavailable');
  if (artifact.fresh_snapshot?.hash_sha256 !== expectedDryRunHash) {
    findings.push('artifact_fresh_snapshot_hash_unexpected');
  }
  if (artifact.fresh_snapshot?.impact_counts?.existing_set_rows !== 0) {
    findings.push('artifact_existing_set_rows_present');
  }
  if (artifact.fresh_snapshot?.impact_counts?.existing_parent_rows !== 0) {
    findings.push('artifact_existing_parent_rows_present');
  }
  if (artifact.fresh_snapshot?.impact_counts?.existing_child_printing_rows !== 0) {
    findings.push('artifact_existing_child_printing_rows_present');
  }

  if (readiness.package_id && readiness.package_id !== PACKAGE_ID) findings.push('readiness_wrong_package_id');
  if (
    readiness.fingerprint_sha256 &&
    readiness.fingerprint_sha256 !== READINESS_FINGERPRINT
  ) {
    findings.push('readiness_fingerprint_mismatch');
  }
  if (
    readiness.package_fingerprint_sha256 &&
    readiness.package_fingerprint_sha256 !== READINESS_FINGERPRINT
  ) {
    findings.push('readiness_package_fingerprint_mismatch');
  }
  if (readiness.db_writes_performed === true) findings.push('readiness_reports_db_write');
  if (readiness.migrations_created === true) findings.push('readiness_reports_migration');
  if ((readiness.stop_findings ?? []).length !== 0) findings.push('readiness_stop_findings_present');

  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (readinessSummary.counts[key] !== expected) findings.push(`readiness_${key}_not_${expected}`);
    if (artifactSummary[key] !== undefined && artifactSummary[key] !== expected) {
      findings.push(`artifact_${key}_not_${expected}`);
    }
    if (dryCounts[key] !== undefined && dryCounts[key] !== expected) {
      findings.push(`dry_run_${key}_not_${expected}`);
    }
  }

  if (rollbackProof.package_id !== PACKAGE_ID) findings.push('rollback_proof_wrong_package_id');
  if (rollbackProof.readiness_fingerprint !== READINESS_FINGERPRINT) {
    findings.push('rollback_proof_readiness_fingerprint_mismatch');
  }
  if (rollbackProof.artifact_fingerprint !== expectedArtifactFingerprint) {
    findings.push('rollback_proof_artifact_fingerprint_mismatch');
  }
  if (rollbackProof.planned_sets !== EXPECTED_COUNTS.planned_set_inserts) {
    findings.push('rollback_proof_set_count_mismatch');
  }
  if (rollbackProof.planned_parent_rows !== EXPECTED_COUNTS.planned_parent_inserts) {
    findings.push('rollback_proof_parent_count_mismatch');
  }
  if (rollbackProof.planned_child_rows !== EXPECTED_COUNTS.planned_child_printing_inserts) {
    findings.push('rollback_proof_child_count_mismatch');
  }

  if (sql.contains_begin_statement !== true) findings.push('sql_missing_begin_statement');
  if (sql.contains_rollback_statement !== true) findings.push('sql_missing_rollback_statement');
  if (sql.contains_commit_statement !== false) findings.push('sql_contains_commit_statement');
  if (sql.contains_update_statement !== false) findings.push('sql_contains_update_statement');
  if (sql.contains_delete_statement !== false) findings.push('sql_contains_delete_statement');
  if (sql.contains_insert_statement !== true) findings.push('sql_missing_insert_statement');

  return { findings, readinessSummary, sql };
}

function buildReport() {
  const readiness = readJson(READINESS_JSON);
  const artifact = readJson(ARTIFACT_JSON);
  const dryRun = readJson(DRY_RUN_JSON);
  const sqlArtifactPath = artifact.sql_artifact_path ?? dryRun.source_artifact?.sql_path;
  const sqlText = fs.readFileSync(sqlArtifactPath, 'utf8');
  const expectedArtifactFingerprint = artifact.artifact_fingerprint_sha256;
  const expectedDryRunHash = artifact.fresh_snapshot?.hash_sha256;
  const { findings, readinessSummary, sql } = validateInputs({
    readiness,
    artifact,
    dryRun,
    sqlText,
    expectedArtifactFingerprint,
    expectedDryRunHash,
  });
  const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
  const exactApprovalPhrase =
    `Approve real PKG-05A apply only. Fingerprint: ${expectedArtifactFingerprint}. ` +
    `Readiness fingerprint: ${READINESS_FINGERPRINT}. ` +
    'Scope: 4 set inserts, 72 parent card_print inserts, 80 child card_printing inserts, 72 external mappings. ' +
    `Dry-run proof: ${beforeHash} == ${afterHash}. ` +
    'No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg05a_real_apply_gate_v1',
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
      readiness_fingerprint_sha256: READINESS_FINGERPRINT,
      artifact_fingerprint_sha256: expectedArtifactFingerprint,
      selected_sets: readinessSummary.selected_sets.map((set) => ({
        set_key: set.set_key,
        set_name: set.set_name,
        expected_parent_rows: set.expected_parent_rows,
        expected_child_printings: set.expected_child_printings,
      })),
      planned_set_inserts: EXPECTED_COUNTS.planned_set_inserts,
      planned_parent_card_print_inserts: EXPECTED_COUNTS.planned_parent_inserts,
      planned_child_card_printing_inserts: EXPECTED_COUNTS.planned_child_printing_inserts,
      planned_external_mapping_inserts: EXPECTED_COUNTS.planned_external_mapping_inserts,
      parent_table: 'public.card_prints',
      child_table: 'public.card_printings',
      set_table: 'public.sets',
      mapping_table: 'public.external_mappings',
      allowed_mutation_class_if_later_approved: 'insert_only',
      updates_allowed: false,
      deletes_allowed: false,
      merges_allowed: false,
      unsupported_cleanup_allowed: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: path.relative(ROOT, sqlArtifactPath).replaceAll('\\', '/'),
      sql_hash_sha256: dryRun.source_artifact?.sql_hash_sha256 ?? null,
      sql_contains_begin_statement: sql.contains_begin_statement,
      sql_contains_insert_statement: sql.contains_insert_statement,
      sql_contains_update_statement: sql.contains_update_statement,
      sql_contains_delete_statement: sql.contains_delete_statement,
      sql_contains_commit_statement: sql.contains_commit_statement,
      sql_contains_rollback_statement: sql.contains_rollback_statement,
      before_hash_sha256: beforeHash,
      after_hash_sha256: afterHash,
      durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
      rollback_proof_rows: dryRun.rollback_proof_rows ?? [],
      stop_findings: dryRun.stop_findings ?? [],
    },
    final_snapshot_proof: {
      source_artifact_ref: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
      fresh_snapshot_available: artifact.fresh_snapshot?.available ?? null,
      fresh_snapshot_hash_sha256: artifact.fresh_snapshot?.hash_sha256 ?? null,
      existing_set_rows: artifact.fresh_snapshot?.impact_counts?.existing_set_rows ?? null,
      existing_parent_rows: artifact.fresh_snapshot?.impact_counts?.existing_parent_rows ?? null,
      existing_child_printing_rows:
        artifact.fresh_snapshot?.impact_counts?.existing_child_printing_rows ?? null,
      planned_set_inserts: artifact.summary?.planned_set_inserts ?? null,
      planned_parent_inserts: artifact.summary?.planned_parent_inserts ?? null,
      planned_child_printing_inserts: artifact.summary?.planned_child_printing_inserts ?? null,
      planned_external_mapping_inserts: artifact.summary?.planned_external_mapping_inserts ?? null,
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect:
        'This would authorize preparing and running the durable PKG-05A apply path only, scoped to four fully master-verified missing sets. It does not authorize global apply, deletes, merges, unsupported cleanup, identity modifier work, or migrations.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        readiness_fingerprint_sha256: READINESS_FINGERPRINT,
        artifact_fingerprint_sha256: expectedArtifactFingerprint,
        planned_set_inserts: EXPECTED_COUNTS.planned_set_inserts,
        planned_parent_card_print_inserts: EXPECTED_COUNTS.planned_parent_inserts,
        planned_child_card_printing_inserts: EXPECTED_COUNTS.planned_child_printing_inserts,
        planned_external_mapping_inserts: EXPECTED_COUNTS.planned_external_mapping_inserts,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify the same four target sets are still absent and the same 72 parent rows, 80 child printings, and 72 external mappings are planned.',
      'Execute a durable insert-only transaction with COMMIT only after this exact real-apply approval is present.',
      'Capture post-apply readback for the four sets, parent card_prints, child card_printings, and external mappings.',
      'Run a read-only Master Index comparison for the four inserted sets and write a post-apply checkpoint.',
    ],
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
      'This gate does not authorize identity modifier work.',
    ],
    source_artifacts: {
      readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
      final_snapshot_transaction_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      sql_artifact: path.relative(ROOT, sqlArtifactPath).replaceAll('\\', '/'),
    },
    stop_findings: findings,
    pass: findings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-05A Real Apply Gate V1');
  lines.push('');
  lines.push('This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approval_gate_status | ${report.approval_gate_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| readiness_fingerprint_sha256 | \`${report.package_scope.readiness_fingerprint_sha256}\` |`);
  lines.push(`| artifact_fingerprint_sha256 | \`${report.package_scope.artifact_fingerprint_sha256}\` |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('| Scope | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| set inserts | ${report.package_scope.planned_set_inserts} |`);
  lines.push(`| parent card_print inserts | ${report.package_scope.planned_parent_card_print_inserts} |`);
  lines.push(`| child card_printing inserts | ${report.package_scope.planned_child_card_printing_inserts} |`);
  lines.push(`| external mapping inserts | ${report.package_scope.planned_external_mapping_inserts} |`);
  lines.push('');
  lines.push('## Selected Sets');
  lines.push('');
  lines.push('| set_key | set_name | parent_rows | child_printings |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const set of report.package_scope.selected_sets) {
    lines.push(`| ${mdEscape(set.set_key)} | ${mdEscape(set.set_name)} | ${set.expected_parent_rows} | ${set.expected_child_printings} |`);
  }
  lines.push('');
  lines.push('## Dry-Run Proof');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_proof.dry_run_execution_status} |`);
  lines.push(`| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |`);
  lines.push(`| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |`);
  lines.push(`| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| sql_contains_insert_statement | ${report.dry_run_proof.sql_contains_insert_statement} |`);
  lines.push(`| sql_contains_update_statement | ${report.dry_run_proof.sql_contains_update_statement} |`);
  lines.push(`| sql_contains_delete_statement | ${report.dry_run_proof.sql_contains_delete_statement} |`);
  lines.push(`| sql_contains_commit_statement | ${report.dry_run_proof.sql_contains_commit_statement} |`);
  lines.push(`| sql_contains_rollback_statement | ${report.dry_run_proof.sql_contains_rollback_statement} |`);
  lines.push('');
  lines.push('## Final Snapshot Proof');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| existing_set_rows | ${report.final_snapshot_proof.existing_set_rows} |`);
  lines.push(`| existing_parent_rows | ${report.final_snapshot_proof.existing_parent_rows} |`);
  lines.push(`| existing_child_printing_rows | ${report.final_snapshot_proof.existing_child_printing_rows} |`);
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
  return `# PKG-05A Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Purpose

Record the no-write real-apply gate after successful rollback-only dry-run execution for PKG-05A missing fully master-verified set inserts.

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| readiness_fingerprint_sha256 | \`${report.package_scope.readiness_fingerprint_sha256}\` |
| artifact_fingerprint_sha256 | \`${report.package_scope.artifact_fingerprint_sha256}\` |
| planned_set_inserts | ${report.package_scope.planned_set_inserts} |
| planned_parent_card_print_inserts | ${report.package_scope.planned_parent_card_print_inserts} |
| planned_child_card_printing_inserts | ${report.package_scope.planned_child_card_printing_inserts} |
| planned_external_mapping_inserts | ${report.package_scope.planned_external_mapping_inserts} |
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
- Durable DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- Real apply authorized: false
- Global apply authorized: false
- Deletes authorized: false
- Merges authorized: false
- Unsupported cleanup authorized: false

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg05a_real_apply_gate_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg05a_real_apply_gate_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-05A Real Apply Gate Checkpoint V1](20260609_pkg05a_real_apply_gate_checkpoint_v1.md) | Records the no-write real-apply gate after successful rollback-only dry run for four missing fully master-verified set inserts, requiring exact approval before any durable insert. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg05a_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg05a_real_apply_gate_checkpoint_v1.md')
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
  readiness_fingerprint_sha256: report.package_scope.readiness_fingerprint_sha256,
  artifact_fingerprint_sha256: report.package_scope.artifact_fingerprint_sha256,
  dry_run_before_hash_sha256: report.dry_run_proof.before_hash_sha256,
  dry_run_after_hash_sha256: report.dry_run_proof.after_hash_sha256,
  planned_set_inserts: report.package_scope.planned_set_inserts,
  planned_parent_card_print_inserts: report.package_scope.planned_parent_card_print_inserts,
  planned_child_card_printing_inserts: report.package_scope.planned_child_card_printing_inserts,
  planned_external_mapping_inserts: report.package_scope.planned_external_mapping_inserts,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
