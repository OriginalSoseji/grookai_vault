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

const PREVIEW_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_dry_run_preview_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_operator_approval_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_operator_approval_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01b_fut2020_operator_approval_gate_checkpoint_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Operator Approval Gate Checkpoint V1](20260609_pkg01b_fut2020_operator_approval_gate_checkpoint_v1.md) | Records the no-write approval gate for fut2020 cards #2-#5, requiring explicit approval for parent set_code updates and eight child delete candidates before any transaction artifact. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_operator_approval_gate_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_operator_approval_gate_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function validatePreview(preview) {
  const findings = [];
  const scope = preview.package_scope ?? {};
  const summary = preview.summary ?? {};

  if (preview.preview_status !== 'pkg01b_fut2020_dry_run_preview_ready_apply_blocked_no_write') {
    findings.push('source_preview_not_ready');
  }
  if (preview.pass !== true) findings.push('source_preview_not_passing');
  if (preview.db_writes_performed !== false) findings.push('source_preview_reports_db_write');
  if (preview.migrations_created !== false) findings.push('source_preview_reports_migration');
  if (preview.cleanup_performed !== false) findings.push('source_preview_reports_cleanup');
  if (preview.quarantine_performed !== false) findings.push('source_preview_reports_quarantine');
  if (preview.apply_allowed !== false) findings.push('source_preview_allows_apply');
  if (preview.write_ready_now !== 0) findings.push('source_preview_write_ready_nonzero');
  if ((preview.stop_findings ?? []).length !== 0) findings.push('source_preview_stop_findings_present');

  if (scope.package_id !== 'PKG-01B-FUT2020') findings.push('source_preview_wrong_package_id');
  if (scope.set_key !== 'fut2020') findings.push('source_preview_wrong_set_key');
  if ((scope.target_numbers ?? []).join(',') !== '2,3,4,5') findings.push('source_preview_wrong_target_numbers');
  if (scope.card_print_rows !== 4) findings.push('source_preview_parent_row_count_not_four');
  if (scope.current_child_printings !== 12) findings.push('source_preview_child_printing_count_not_twelve');
  if (scope.expected_master_printings !== 4) findings.push('source_preview_expected_printing_count_not_four');
  if (scope.child_printing_actions_require_separate_approval !== true) {
    findings.push('source_preview_child_scope_not_separately_approved');
  }

  if (summary.parent_set_code_updates_previewed !== 4) findings.push('parent_update_count_not_four');
  if (summary.child_keep_rows !== 4) findings.push('child_keep_count_not_four');
  if (summary.child_delete_candidates_requires_approval !== 8) findings.push('child_delete_candidate_count_not_eight');
  if ((summary.unsupported_child_finishes ?? []).join(',') !== 'holo,reverse') {
    findings.push('unsupported_child_finish_set_not_holo_reverse');
  }
  if (preview.fresh_db_snapshot?.impact_counts?.parent_vault_items_found !== 0) findings.push('parent_vault_items_present');
  if (preview.fresh_db_snapshot?.impact_counts?.child_dependency_refs_found !== 0) findings.push('child_dependency_refs_present');

  return findings;
}

function buildReport() {
  const preview = readJson(PREVIEW_JSON);
  const stopFindings = validatePreview(preview);
  const scope = preview.package_scope ?? {};
  const fingerprint = scope.package_fingerprint_sha256 ?? null;
  const parentRows = preview.parent_mutation_matrix ?? [];
  const childRows = preview.child_printing_matrix ?? [];
  const childDeleteRows = childRows.filter((row) => row.action === 'delete_candidate_requires_separate_approval');
  const childKeepRows = childRows.filter((row) => row.action === 'keep');

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01b_fut2020_operator_approval_gate_v1',
    audit_only: true,
    approval_gate_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    write_ready_now: 0,
    apply_allowed: false,
    approval_gate_status: stopFindings.length === 0
      ? 'ready_for_operator_decision_apply_blocked_no_write'
      : 'blocked_before_operator_decision',
    package_scope: {
      package_id: 'PKG-01B-FUT2020',
      package_fingerprint_sha256: fingerprint,
      set_key: 'fut2020',
      set_name: 'Pokémon Futsal 2020',
      target_numbers: scope.target_numbers ?? [],
      parent_card_print_rows: parentRows.length,
      parent_set_code_updates: parentRows.length,
      child_printing_rows_current: childRows.length,
      child_printing_rows_to_keep: childKeepRows.length,
      child_delete_candidates: childDeleteRows.length,
      expected_master_printings: scope.expected_master_printings ?? null,
      parent_vault_items_found: preview.fresh_db_snapshot?.impact_counts?.parent_vault_items_found ?? null,
      child_dependency_refs_found: preview.fresh_db_snapshot?.impact_counts?.child_dependency_refs_found ?? null,
    },
    approval_scopes: {
      parent_scope: {
        approval_required: true,
        operation_class: 'parent_set_code_update',
        table: 'public.card_prints',
        field_changes: ['set_code'],
        row_count: parentRows.length,
        allowed_before_set_code: null,
        approved_after_set_code: 'fut2020',
        target_card_print_ids: parentRows.map((row) => row.card_print_id),
      },
      child_scope: {
        approval_required: true,
        operation_class: 'child_printing_delete_candidates',
        table: 'public.card_printings',
        delete_candidate_count: childDeleteRows.length,
        allowed_finish_keys: ['holo', 'reverse'],
        required_dependency_refs: 0,
        target_card_printing_ids: childDeleteRows.map((row) => row.card_printing_id),
      },
      keep_scope: {
        operation_class: 'child_printing_keep_verified',
        table: 'public.card_printings',
        keep_count: childKeepRows.length,
        required_finish_key: 'normal',
        target_card_printing_ids: childKeepRows.map((row) => row.card_printing_id),
      },
    },
    required_operator_decision: {
      decision_needed: true,
      acceptable_decisions: [
        'approve_pkg01b_fut2020_for_final_snapshot_and_guarded_dry_run_transaction_artifact',
        'reject_pkg01b_fut2020',
        'request_pkg01b_fut2020_changes',
      ],
      exact_approval_phrase_required: `Approve PKG-01B-FUT2020 for final fresh snapshot and guarded dry-run transaction artifact preparation only. Fingerprint: ${fingerprint}. Parent scope: 4 set_code updates. Child scope: 8 unsupported holo/reverse delete candidates. No real apply.`,
      approval_must_reference: {
        package_id: 'PKG-01B-FUT2020',
        package_fingerprint_sha256: fingerprint,
        parent_set_code_updates: parentRows.length,
        child_delete_candidates: childDeleteRows.length,
        child_keep_rows: childKeepRows.length,
      },
      approval_effect: 'Approval would only allow final fresh snapshot capture and a guarded dry-run transaction artifact. It would not authorize real apply.',
    },
    next_step_if_approved_later: [
      'Capture a final fresh DB snapshot for only the four fut2020 parent rows and twelve child printing rows.',
      'Verify the package fingerprint and target IDs still match this approval gate.',
      'Prepare a guarded transaction artifact that defaults to rollback and has no COMMIT statement.',
      'Include parent rollback values and exact child reinsert snapshots for every delete candidate.',
      'Run the guarded transaction artifact in dry-run only.',
      'Stop for separate real-apply approval after dry-run proof.',
    ],
    explicit_non_authorizations: [
      'This gate is not approval.',
      'This gate is not an approval record.',
      'This gate is not SQL.',
      'This gate is not a migration.',
      'This gate does not create an apply runner.',
      'This gate does not write to the DB.',
      'This gate does not delete child printings.',
      'This gate does not authorize real apply.',
    ],
    source_artifacts: {
      dry_run_preview: path.relative(ROOT, PREVIEW_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Operator Approval Gate V1');
  lines.push('');
  lines.push('This approval gate is no-write and no-approval-recorded. It makes the next human decision explicit before any transaction artifact is prepared.');
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
  lines.push('## Scope');
  lines.push('');
  lines.push('| Scope | Count | Notes |');
  lines.push('| --- | ---: | --- |');
  lines.push(`| parent set_code updates | ${report.package_scope.parent_set_code_updates} | card_prints.set_code null -> fut2020 |`);
  lines.push(`| child printings to keep | ${report.package_scope.child_printing_rows_to_keep} | normal printings verified by index |`);
  lines.push(`| child delete candidates | ${report.package_scope.child_delete_candidates} | unsupported holo/reverse, dependency refs must remain 0 |`);
  lines.push(`| child dependency refs found | ${report.package_scope.child_dependency_refs_found} | must be 0 before dry-run artifact |`);
  lines.push('');
  lines.push('## Required Approval Phrase');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_decision.exact_approval_phrase_required);
  lines.push('```');
  lines.push('');
  lines.push('## Parent Scope IDs');
  lines.push('');
  for (const id of report.approval_scopes.parent_scope.target_card_print_ids) lines.push(`- ${id}`);
  lines.push('');
  lines.push('## Child Delete Candidate IDs');
  lines.push('');
  for (const id of report.approval_scopes.child_scope.target_card_printing_ids) lines.push(`- ${id}`);
  lines.push('');
  lines.push('## Next Step If Approved Later');
  lines.push('');
  for (const step of report.next_step_if_approved_later) lines.push(`- ${step}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('None.');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-01B-FUT2020 Operator Approval Gate Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approval gate for the fut2020 cards #2-#5 reconciliation package.

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| parent_set_code_updates | ${report.package_scope.parent_set_code_updates} |
| child_printings_to_keep | ${report.package_scope.child_printing_rows_to_keep} |
| child_delete_candidates | ${report.package_scope.child_delete_candidates} |
| child_dependency_refs_found | ${report.package_scope.child_dependency_refs_found} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| write_ready_now | ${report.write_ready_now} |
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

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_operator_approval_gate_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_operator_approval_gate_v1.md\`

`;
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
  parent_set_code_updates: report.package_scope.parent_set_code_updates,
  child_delete_candidates: report.package_scope.child_delete_candidates,
  approval_recorded: report.approval_recorded,
  apply_allowed: report.apply_allowed,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
