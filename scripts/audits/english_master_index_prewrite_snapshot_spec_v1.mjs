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

const APPROVAL_TEMPLATE_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_record_template_v1.json');
const APPROVAL_GUARD_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_template_guard_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_prewrite_snapshot_spec_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_prewrite_snapshot_spec_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function addCount(target, key, amount = 1) {
  const safeKey = String(key ?? '').trim() || 'unknown';
  target[safeKey] = (target[safeKey] || 0) + Number(amount || 0);
}

function summarizeRows(entries) {
  const bySet = {};
  const byPriority = {};
  const byChangedField = {};
  const bySourceStrength = {};
  let childPrintingRows = 0;
  for (const entry of entries) {
    addCount(bySet, entry.set_key);
    addCount(byPriority, entry.review_priority);
    addCount(bySourceStrength, entry.source_strength);
    childPrintingRows += Number(entry.child_printing_rows_verified || 0);
    for (const field of Object.keys(entry.direct_field_changes || {})) addCount(byChangedField, field);
  }
  return {
    card_print_rows: entries.length,
    child_printing_rows_verified: childPrintingRows,
    affected_sets: Object.keys(bySet).length,
    by_set: bySet,
    by_review_priority: byPriority,
    by_changed_field: byChangedField,
    by_source_strength: bySourceStrength,
  };
}

function buildReport() {
  const approvalTemplate = readJson(APPROVAL_TEMPLATE_JSON);
  const approvalGuard = readJson(APPROVAL_GUARD_JSON);
  const entries = approvalTemplate.approval_entries || [];
  const stopFindings = [];

  if (approvalTemplate.approval_recorded !== false) stopFindings.push('approval_template_records_approval');
  if (approvalTemplate.write_ready_now !== 0) stopFindings.push('approval_template_write_ready_nonzero');
  if (approvalGuard.guard_status !== 'pass_blank_template_verified_no_write') {
    stopFindings.push('approval_template_guard_not_passing');
  }
  if (approvalGuard.write_ready_now !== 0) stopFindings.push('approval_guard_write_ready_nonzero');
  if ((approvalGuard.row_findings || []).length !== 0) stopFindings.push('approval_guard_row_findings_present');
  if (entries.some((entry) => Number(entry.vault_items_referencing_target || 0) !== 0)) {
    stopFindings.push('vault_referenced_rows_present');
  }

  const summary = summarizeRows(entries);
  const requiredSnapshotRows = [
    {
      table: 'card_prints',
      key: 'id',
      expected_min_rows: entries.length,
      purpose: 'Capture before-state parent identity/display fields for every approved card_print_id.',
      required_columns: ['id', 'set_id', 'set_code', 'number', 'number_plain', 'name', 'updated_at'],
    },
    {
      table: 'card_printings',
      key: 'card_print_id',
      expected_min_rows: summary.child_printing_rows_verified,
      purpose: 'Verify child printing rows still match the reviewed master-verified finish scope.',
      required_columns: ['id', 'card_print_id', 'finish', 'variant', 'printing_key', 'updated_at'],
    },
    {
      table: 'external_mappings',
      key: 'card_print_id',
      expected_min_rows: 0,
      purpose: 'Detect source ownership drift before future mutation.',
      required_columns: ['id', 'card_print_id', 'source', 'external_id', 'is_active', 'updated_at'],
    },
    {
      table: 'card_print_identity',
      key: 'card_print_id',
      expected_min_rows: 0,
      purpose: 'Detect active identity/domain-hash drift before future mutation.',
      required_columns: ['id', 'card_print_id', 'domain_hash', 'is_active', 'updated_at'],
    },
    {
      table: 'card_print_traits',
      key: 'card_print_id',
      expected_min_rows: 0,
      purpose: 'Detect trait drift before future mutation.',
      required_columns: ['id', 'card_print_id', 'updated_at'],
    },
    {
      table: 'vault_items',
      key: 'card_print_id',
      expected_exact_rows: 0,
      purpose: 'Stop if any target row has gained vault ownership references.',
      required_columns: ['id', 'card_print_id', 'owner_id', 'updated_at'],
    },
  ];

  const snapshotTargets = entries.map((entry) => ({
    card_print_id: entry.card_print_id,
    row_fingerprint_sha256: entry.row_fingerprint_sha256,
    set_key: entry.set_key,
    set_name: entry.set_name,
    review_priority: entry.review_priority,
    current_fields_from_review_snapshot: entry.current_fields,
    proposed_fields_under_review: entry.proposed_fields,
    direct_field_changes_under_review: entry.direct_field_changes,
    child_printing_rows_verified: entry.child_printing_rows_verified,
    vault_items_referencing_target_at_review_time: entry.vault_items_referencing_target,
  }));

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_prewrite_snapshot_spec_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    db_reads_performed: false,
    write_ready_now: 0,
    approval_recorded: false,
    spec_status: stopFindings.length === 0 ? 'prewrite_snapshot_spec_complete_approval_required_no_write' : 'stop_prewrite_snapshot_spec_not_safe',
    purpose: 'Define the exact fresh before-state snapshot requirements for PKG-01 after future approval, without taking the snapshot or creating an execution artifact.',
    source_artifacts: {
      approval_record_template: path.relative(ROOT, APPROVAL_TEMPLATE_JSON).replaceAll('\\', '/'),
      approval_template_guard: path.relative(ROOT, APPROVAL_GUARD_JSON).replaceAll('\\', '/'),
    },
    package_scope: {
      package_id: 'PKG-01',
      package_fingerprint_sha256: approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null,
      approval_guard_status: approvalGuard.guard_status,
      ...summary,
    },
    required_snapshot_rows: requiredSnapshotRows,
    snapshot_targets: snapshotTargets,
    future_snapshot_stop_rules: [
      'Stop if approval has not been explicitly recorded before snapshot capture.',
      'Stop if package_fingerprint_sha256 differs from the guarded approval template.',
      'Stop if any target card_print_id is missing from the fresh snapshot.',
      'Stop if any target has gained vault_items references.',
      'Stop if child printing row counts differ from reviewed master-verified counts without documented explanation.',
      'Stop if active external mappings or identity rows indicate ownership drift.',
      'Stop if the future snapshot is older than the future execution artifact.',
    ],
    explicit_non_authorizations: [
      'This specification is not approval.',
      'This specification does not capture a DB snapshot.',
      'This specification is not SQL.',
      'This specification is not a migration.',
      'This specification is not an execution artifact.',
      'This specification does not allow DB writes, cleanup, quarantine, insertion, deletion, or hiding.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Prewrite Snapshot Spec V1');
  lines.push('');
  lines.push('This is a no-write specification for the future fresh before-state snapshot required after approval.');
  lines.push('');
  lines.push('It does not capture a snapshot, execute SQL, create a migration, or authorize writes.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| audit_only | ${report.audit_only} |`);
  lines.push(`| spec_status | ${report.spec_status} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| pass | ${report.pass} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Package Scope');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| card_print_rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| child_printing_rows_verified | ${report.package_scope.child_printing_rows_verified} |`);
  lines.push(`| affected_sets | ${report.package_scope.affected_sets} |`);
  lines.push(`| approval_guard_status | ${report.package_scope.approval_guard_status} |`);
  lines.push('');
  lines.push('## Required Snapshot Content');
  lines.push('');
  lines.push('| Table | Key | Expected | Purpose | Required Columns |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.required_snapshot_rows) {
    const expected = row.expected_exact_rows != null
      ? `exact ${row.expected_exact_rows}`
      : `min ${row.expected_min_rows}`;
    lines.push(`| ${mdEscape(row.table)} | ${mdEscape(row.key)} | ${mdEscape(expected)} | ${mdEscape(row.purpose)} | ${mdEscape(row.required_columns.join(', '))} |`);
  }
  lines.push('');
  lines.push('## Future Snapshot Stop Rules');
  lines.push('');
  for (const rule of report.future_snapshot_stop_rules) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Target Summary By Set');
  lines.push('');
  lines.push('| Set | Rows |');
  lines.push('| --- | ---: |');
  for (const [setKey, count] of Object.entries(report.package_scope.by_set).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(setKey)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Source approval template: \`${report.source_artifacts.approval_record_template}\``);
  lines.push(`Source approval guard: \`${report.source_artifacts.approval_template_guard}\``);
  return `${lines.join('\n')}\n`;
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      generated_files: [
        path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
        path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      ],
      spec_status: report.spec_status,
      package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
      card_print_rows: report.package_scope.card_print_rows,
      child_printing_rows_verified: report.package_scope.child_printing_rows_verified,
      affected_sets: report.package_scope.affected_sets,
      db_reads_performed: report.db_reads_performed,
      write_ready_now: report.write_ready_now,
      approval_recorded: report.approval_recorded,
      pass: report.pass,
      stop_findings: report.stop_findings.length,
      db_writes_performed: report.db_writes_performed,
      migrations_created: report.migrations_created,
      cleanup_performed: report.cleanup_performed,
      quarantine_performed: report.quarantine_performed,
    },
    null,
    2,
  ),
);
