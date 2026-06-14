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
  'english_master_index_pkg06a_supported_finish_subset_guarded_dry_run_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg06a_supported_finish_subset_real_apply_gate_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg06a_supported_finish_subset_real_apply_gate_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg06a_supported_finish_subset_real_apply_gate_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS';
const PACKAGE_FINGERPRINT = '4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9';
const SQL_HASH = '54599d99925c9e8fcbdfe694b1bfab0fd801e45e1e3e2ffe616fcbb48de05e98';
const SOURCE_ARTIFACT_FINGERPRINT = 'a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120';

const EXPECTED_COUNTS = {
  child_printing_rows: 115,
  target_parent_rows: 115,
  set_count: 1,
  normal: 113,
  cosmos: 2,
  blocked_rows: 282,
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
  const lower = sqlText.toLowerCase().replace(/--.*$/gm, '');
  return {
    contains_begin_statement: /(^|\n)\s*begin\s*;/.test(lower),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/.test(lower),
    contains_commit_statement: /(^|\n)\s*commit\s*;/.test(lower),
    contains_update_statement: /(^|\n)\s*update\s+/.test(lower),
    contains_delete_statement: /(^|\n)\s*delete\s+/.test(lower),
    contains_insert_statement: /(^|\n)\s*insert\s+into\s+/.test(lower),
    contains_card_printings_insert: /\binsert\s+into\s+public\.card_printings\b/.test(lower),
    contains_card_prints_insert: /\binsert\s+into\s+public\.card_prints\b/.test(lower),
    contains_sets_insert: /\binsert\s+into\s+public\.sets\b/.test(lower),
    contains_external_insert: /\binsert\s+into\s+public\.external/.test(lower),
  };
}

function validateInputs({ dryRun, sqlText }) {
  const findings = [];
  const supported = dryRun.supported_subset ?? {};
  const blocked = dryRun.blocked_subset ?? {};
  const sql = countSqlStatements(sqlText);
  const proof = dryRun.rollback_proof_rows?.[0] ?? null;

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.source_artifact_fingerprint_sha256 !== SOURCE_ARTIFACT_FINGERPRINT) {
    findings.push('source_artifact_fingerprint_mismatch');
  }
  if (dryRun.dry_run_execution_status !== 'pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_status_not_passed');
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

  if (supported.child_printing_rows !== EXPECTED_COUNTS.child_printing_rows) {
    findings.push('supported_child_count_not_115');
  }
  if (supported.target_parent_rows !== EXPECTED_COUNTS.target_parent_rows) {
    findings.push('supported_parent_count_not_115');
  }
  if (supported.set_count !== EXPECTED_COUNTS.set_count) findings.push('supported_set_count_not_1');
  if (supported.finish_counts?.normal !== EXPECTED_COUNTS.normal) findings.push('normal_count_not_113');
  if (supported.finish_counts?.cosmos !== EXPECTED_COUNTS.cosmos) findings.push('cosmos_count_not_2');
  if (supported.set_counts?.pl3 !== EXPECTED_COUNTS.child_printing_rows) findings.push('pl3_count_not_115');
  if (blocked.child_printing_rows !== EXPECTED_COUNTS.blocked_rows) findings.push('blocked_count_not_282');

  if (dryRun.before_snapshot?.counts?.existing_target_child_rows !== 0) {
    findings.push('before_snapshot_existing_target_child_rows_present');
  }
  if (dryRun.before_snapshot?.counts?.planned_id_collision_rows !== 0) {
    findings.push('before_snapshot_planned_id_collision_rows_present');
  }
  if (dryRun.after_snapshot?.counts?.existing_target_child_rows !== 0) {
    findings.push('after_snapshot_existing_target_child_rows_present');
  }
  if (dryRun.after_snapshot?.counts?.planned_id_collision_rows !== 0) {
    findings.push('after_snapshot_planned_id_collision_rows_present');
  }
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) {
    findings.push('snapshot_hash_mismatch_after_rollback');
  }

  if (!proof) findings.push('rollback_proof_missing');
  if (proof) {
    if (proof.package_id !== PACKAGE_ID) findings.push('rollback_proof_wrong_package_id');
    if (proof.source_artifact_fingerprint !== SOURCE_ARTIFACT_FINGERPRINT) {
      findings.push('rollback_proof_source_artifact_fingerprint_mismatch');
    }
    if (proof.package_fingerprint !== PACKAGE_FINGERPRINT) {
      findings.push('rollback_proof_package_fingerprint_mismatch');
    }
    if (Number(proof.planned_sets) !== EXPECTED_COUNTS.set_count) {
      findings.push('rollback_proof_set_count_mismatch');
    }
    if (Number(proof.target_parent_rows) !== EXPECTED_COUNTS.target_parent_rows) {
      findings.push('rollback_proof_parent_count_mismatch');
    }
    if (Number(proof.planned_child_rows) !== EXPECTED_COUNTS.child_printing_rows) {
      findings.push('rollback_proof_child_count_mismatch');
    }
  }

  if (!sql.contains_begin_statement) findings.push('sql_missing_begin_statement');
  if (!sql.contains_rollback_statement) findings.push('sql_missing_rollback_statement');
  if (sql.contains_commit_statement) findings.push('sql_contains_commit_statement');
  if (sql.contains_update_statement) findings.push('sql_contains_update_statement');
  if (sql.contains_delete_statement) findings.push('sql_contains_delete_statement');
  if (!sql.contains_insert_statement) findings.push('sql_missing_insert_statement');
  if (!sql.contains_card_printings_insert) findings.push('sql_missing_card_printings_insert');
  if (sql.contains_card_prints_insert) findings.push('sql_contains_parent_insert');
  if (sql.contains_sets_insert) findings.push('sql_contains_set_insert');
  if (sql.contains_external_insert) findings.push('sql_contains_external_insert');

  return { findings, sql };
}

function buildReport() {
  const dryRun = readJson(DRY_RUN_JSON);
  const sqlPath = dryRun.sql_artifact_path;
  const sqlText = fs.readFileSync(sqlPath, 'utf8');
  const { findings, sql } = validateInputs({ dryRun, sqlText });
  const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
  const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
  const exactApprovalPhrase =
    `Approve real ${PACKAGE_ID} apply only. ` +
    `Fingerprint: ${PACKAGE_FINGERPRINT}. ` +
    `SQL hash: ${SQL_HASH}. ` +
    'Scope: 115 child-only card_printing inserts for pl3/Supreme Victors, finishes normal=113 and cosmos=2. ' +
    'Blocked finish-taxonomy rows remain excluded: 282. ' +
    `Dry-run proof: ${beforeHash} == ${afterHash}. ` +
    'No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.';

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg06a_supported_finish_subset_real_apply_gate_v1',
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
      source_artifact_fingerprint_sha256: SOURCE_ARTIFACT_FINGERPRINT,
      sql_hash_sha256: SQL_HASH,
      set_key: 'pl3',
      set_name: 'Supreme Victors',
      child_card_printing_inserts: EXPECTED_COUNTS.child_printing_rows,
      target_parent_rows: EXPECTED_COUNTS.target_parent_rows,
      finish_counts: {
        normal: EXPECTED_COUNTS.normal,
        cosmos: EXPECTED_COUNTS.cosmos,
      },
      blocked_finish_taxonomy_rows_excluded: EXPECTED_COUNTS.blocked_rows,
      parent_writes_allowed: false,
      child_insert_only: true,
      deletes_allowed: false,
      merges_allowed: false,
      unsupported_cleanup_allowed: false,
    },
    dry_run_proof: {
      dry_run_execution_status: dryRun.dry_run_execution_status,
      sql_artifact_ref: path.relative(ROOT, sqlPath).replaceAll('\\', '/'),
      sql_hash_sha256: dryRun.sql_hash_sha256,
      sql_contains_begin_statement: sql.contains_begin_statement,
      sql_contains_insert_statement: sql.contains_insert_statement,
      sql_contains_card_printings_insert: sql.contains_card_printings_insert,
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
    blocked_finish_taxonomy_scope: {
      blocked_rows_excluded_from_this_gate: dryRun.blocked_subset?.child_printing_rows ?? null,
      blocked_finish_counts: dryRun.blocked_subset?.finish_counts ?? {},
      reason: 'Current DB finish_keys table cannot represent these Master Index logical finish keys.',
      apply_authorized_for_blocked_rows: false,
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: exactApprovalPhrase,
      approval_effect:
        'This would authorize preparing and running the durable PKG-06A supported-finish subset apply path only, scoped to 115 child-only card_printing inserts. It does not authorize the 282 blocked finish-taxonomy rows, global apply, deletes, merges, parent writes, unsupported cleanup, or migrations.',
      approval_must_reference: {
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: PACKAGE_FINGERPRINT,
        sql_hash_sha256: SQL_HASH,
        child_card_printing_inserts: EXPECTED_COUNTS.child_printing_rows,
        target_parent_rows: EXPECTED_COUNTS.target_parent_rows,
        dry_run_before_hash_sha256: beforeHash,
        dry_run_after_hash_sha256: afterHash,
      },
    },
    next_step_if_approved_later: [
      'Capture one more final fresh DB snapshot immediately before durable apply.',
      'Verify pl3 still has the same 115 missing target child printings and no target ID collisions.',
      'Execute a durable child-insert-only transaction with COMMIT only after exact real-apply approval is present.',
      'Capture post-apply readback for the 115 child printings.',
      'Run post-apply Master Index comparison for pl3 and write a checkpoint.',
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
      'This gate does not authorize parent writes.',
      'This gate does not authorize blocked finish-taxonomy rows.',
    ],
    source_artifacts: {
      guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      sql_artifact: path.relative(ROOT, sqlPath).replaceAll('\\', '/'),
    },
    stop_findings: findings,
    pass: findings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# PKG-06A Supported Finish Subset Real Apply Gate V1');
  lines.push('');
  lines.push('This is a no-write real-apply approval gate. It records that the rollback-only supported-finish dry run passed, but it does not authorize or perform a durable apply.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approval_gate_status | ${report.approval_gate_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('| Scope | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| child card_printing inserts | ${report.package_scope.child_card_printing_inserts} |`);
  lines.push(`| target parent rows | ${report.package_scope.target_parent_rows} |`);
  lines.push(`| normal | ${report.package_scope.finish_counts.normal} |`);
  lines.push(`| cosmos | ${report.package_scope.finish_counts.cosmos} |`);
  lines.push(`| blocked finish-taxonomy rows excluded | ${report.package_scope.blocked_finish_taxonomy_rows_excluded} |`);
  lines.push('');
  lines.push('## Dry-Run Proof');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_proof.dry_run_execution_status} |`);
  lines.push(`| before_hash_sha256 | \`${report.dry_run_proof.before_hash_sha256}\` |`);
  lines.push(`| after_hash_sha256 | \`${report.dry_run_proof.after_hash_sha256}\` |`);
  lines.push(`| durable_after_snapshot_matches_before_snapshot | ${report.dry_run_proof.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| sql_contains_card_printings_insert | ${report.dry_run_proof.sql_contains_card_printings_insert} |`);
  lines.push(`| sql_contains_update_statement | ${report.dry_run_proof.sql_contains_update_statement} |`);
  lines.push(`| sql_contains_delete_statement | ${report.dry_run_proof.sql_contains_delete_statement} |`);
  lines.push(`| sql_contains_commit_statement | ${report.dry_run_proof.sql_contains_commit_statement} |`);
  lines.push(`| sql_contains_rollback_statement | ${report.dry_run_proof.sql_contains_rollback_statement} |`);
  lines.push('');
  lines.push('## Blocked Finish Taxonomy');
  lines.push('');
  lines.push('| finish_key | count |');
  lines.push('| --- | ---: |');
  for (const [finishKey, count] of Object.entries(report.blocked_finish_taxonomy_scope.blocked_finish_counts)) {
    lines.push(`| ${mdEscape(finishKey)} | ${count} |`);
  }
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
  return `# PKG-06A Supported Finish Subset Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Purpose

Record the no-write real-apply gate after successful rollback-only dry-run execution for the PKG-06A supported finish subset.

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.package_scope.sql_hash_sha256}\` |
| child_card_printing_inserts | ${report.package_scope.child_card_printing_inserts} |
| target_parent_rows | ${report.package_scope.target_parent_rows} |
| blocked_finish_taxonomy_rows_excluded | ${report.package_scope.blocked_finish_taxonomy_rows_excluded} |
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
- Parent writes authorized: false
- Blocked finish-taxonomy rows authorized: false

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06A Supported Finish Subset Real Apply Gate Checkpoint V1](20260609_pkg06a_supported_finish_subset_real_apply_gate_checkpoint_v1.md) | Records the no-write real-apply gate for 115 supported child-only pl3 printing inserts, requiring exact approval before any durable insert. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06a_supported_finish_subset_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg06a_supported_finish_subset_real_apply_gate_checkpoint_v1.md')
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
  sql_hash_sha256: report.package_scope.sql_hash_sha256,
  dry_run_before_hash_sha256: report.dry_run_proof.before_hash_sha256,
  dry_run_after_hash_sha256: report.dry_run_proof.after_hash_sha256,
  child_card_printing_inserts: report.package_scope.child_card_printing_inserts,
  blocked_finish_taxonomy_rows_excluded: report.package_scope.blocked_finish_taxonomy_rows_excluded,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
