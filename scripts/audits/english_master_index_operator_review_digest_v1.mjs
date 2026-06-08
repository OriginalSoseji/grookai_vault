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

const APPROVAL_PACKET_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_packet_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_review_digest_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_operator_review_digest_v1.md');

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
  const safeKey = key || 'unknown';
  target[safeKey] = (target[safeKey] || 0) + amount;
}

function fieldChanged(row, field) {
  return Boolean(row.direct_field_changes?.[field]);
}

function classifyRow(row) {
  const changedFields = Object.keys(row.direct_field_changes || {}).sort();
  const reviewFlags = [];
  if (fieldChanged(row, 'name')) reviewFlags.push('name_change');
  if (fieldChanged(row, 'number')) reviewFlags.push('number_change');
  if (fieldChanged(row, 'set_code')) reviewFlags.push('set_code_change');
  if (!row.current_fields?.set_code) reviewFlags.push('currently_missing_set_code');
  if (!row.current_fields?.number) reviewFlags.push('currently_missing_number');
  if (String(row.proposed_fields?.number || '').match(/[A-Za-z]/)) reviewFlags.push('alphanumeric_number');
  if (Number(row.vault_items_referencing_target || 0) > 0) reviewFlags.push('vault_reference_stop');

  let review_priority = 'standard';
  if (reviewFlags.includes('vault_reference_stop')) review_priority = 'stop';
  else if (reviewFlags.includes('name_change')) review_priority = 'high';
  else if (reviewFlags.includes('alphanumeric_number')) review_priority = 'medium';

  return {
    review_priority,
    review_flags: reviewFlags,
    changed_fields: changedFields,
  };
}

function buildReport() {
  const approvalPacket = readJson(APPROVAL_PACKET_JSON);
  const rows = approvalPacket.approval_rows || [];
  const reviewedRows = rows.map((row) => ({
    ...classifyRow(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_print_id: row.card_print_id,
    source_external_id: row.source_external_id,
    source_card_url: row.source_card_url,
    current_fields: row.current_fields,
    proposed_fields: row.proposed_fields,
    child_printing_rows_verified: row.child_printing_rows_verified,
    vault_items_referencing_target: row.vault_items_referencing_target,
    evidence_sources: row.evidence_sources,
  }));

  const byPriority = {};
  const byFlag = {};
  const bySet = {};
  const byFieldChange = {};
  for (const row of reviewedRows) {
    addCount(byPriority, row.review_priority);
    addCount(bySet, row.set_key);
    for (const flag of row.review_flags) addCount(byFlag, flag);
    for (const field of row.changed_fields) addCount(byFieldChange, field);
  }

  const stopFindings = [];
  if (approvalPacket.approval_recorded !== false) stopFindings.push('approval_packet_not_in_unapproved_state');
  if (approvalPacket.write_ready_now !== 0) stopFindings.push('approval_packet_write_ready_nonzero');
  if (reviewedRows.some((row) => row.review_priority === 'stop')) stopFindings.push('vault_referenced_rows_present');

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_operator_review_digest_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    approval_recorded: false,
    approval_status: 'operator_approval_not_recorded',
    purpose: 'Condense the operator approval packet into review priorities before any approval or future write planning.',
    source_artifact: path.relative(ROOT, APPROVAL_PACKET_JSON).replaceAll('\\', '/'),
    summary: {
      approval_rows: reviewedRows.length,
      affected_sets: Object.keys(bySet).length,
      child_printing_rows_verified: reviewedRows.reduce((total, row) => total + Number(row.child_printing_rows_verified || 0), 0),
      by_review_priority: byPriority,
      by_review_flag: byFlag,
      by_changed_field: byFieldChange,
      by_set: bySet,
      write_ready_now: 0,
      approval_recorded: false,
    },
    review_order: [
      'Review high-priority name changes first.',
      'Review alphanumeric number rows next because SH/AR-style numbering can hide identity mistakes.',
      'Review standard set_code/number fill-ins by set.',
      'Do not approve any row unless source evidence and proposed fields are both accepted.',
      'Do not proceed to fresh snapshot or execution artifact until approval is explicitly recorded outside this digest.',
    ],
    high_priority_rows: reviewedRows.filter((row) => row.review_priority === 'high'),
    medium_priority_rows: reviewedRows.filter((row) => row.review_priority === 'medium'),
    standard_rows_by_set: Object.fromEntries(
      Object.entries(
        reviewedRows
          .filter((row) => row.review_priority === 'standard')
          .reduce((acc, row) => {
            if (!acc[row.set_key]) acc[row.set_key] = [];
            acc[row.set_key].push(row);
            return acc;
          }, {}),
      ).sort(([left], [right]) => left.localeCompare(right)),
    ),
    all_rows: reviewedRows,
    explicit_non_authorizations: [
      'This digest is not approval.',
      'This digest is not an execution artifact.',
      'This digest does not record operator approval.',
      'This digest does not allow DB writes, migrations, cleanup, quarantine, insertion, deletion, or hiding.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderRows(rows) {
  const lines = [];
  lines.push('| Priority | Flags | Set | Card Print ID | Source ID | Current Set | Proposed Set | Current Number | Proposed Number | Current Name | Proposed Name |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| ${mdEscape(row.review_priority)} | ${mdEscape(row.review_flags.join(', '))} | ${mdEscape(row.set_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.source_external_id)} | ${mdEscape(row.current_fields?.set_code)} | ${mdEscape(row.proposed_fields?.set_code)} | ${mdEscape(row.current_fields?.number)} | ${mdEscape(row.proposed_fields?.number)} | ${mdEscape(row.current_fields?.name)} | ${mdEscape(row.proposed_fields?.name)} |`);
  }
  return lines.join('\n');
}

function renderMarkdown(report) {
  const standardSetRows = Object.entries(report.standard_rows_by_set).map(([setKey, rows]) => [
    setKey,
    rows[0]?.set_name || '',
    rows.length,
    rows.reduce((total, row) => total + Number(row.child_printing_rows_verified || 0), 0),
  ]);

  const lines = [];
  lines.push('# English Master Index Operator Review Digest V1');
  lines.push('');
  lines.push('This digest condenses the operator approval packet into review priorities.');
  lines.push('');
  lines.push('It is not approval, not SQL, not a migration, and not an execution artifact.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| audit_only | ${report.audit_only} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| approval_status | ${report.approval_status} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| pass | ${report.pass} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| approval rows | ${report.summary.approval_rows} |`);
  lines.push(`| affected sets | ${report.summary.affected_sets} |`);
  lines.push(`| child printing rows verified | ${report.summary.child_printing_rows_verified} |`);
  lines.push(`| high priority rows | ${report.summary.by_review_priority.high || 0} |`);
  lines.push(`| medium priority rows | ${report.summary.by_review_priority.medium || 0} |`);
  lines.push(`| standard rows | ${report.summary.by_review_priority.standard || 0} |`);
  lines.push('');
  lines.push('## Review Order');
  lines.push('');
  for (const item of report.review_order) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## High Priority: Name Changes');
  lines.push('');
  lines.push(report.high_priority_rows.length ? renderRows(report.high_priority_rows) : 'None.');
  lines.push('');
  lines.push('## Medium Priority: Alphanumeric Numbering');
  lines.push('');
  lines.push(report.medium_priority_rows.length ? renderRows(report.medium_priority_rows) : 'None.');
  lines.push('');
  lines.push('## Standard Rows By Set');
  lines.push('');
  lines.push('| Set | Name | Rows | Child Printings |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const row of standardSetRows) {
    lines.push(`| ${mdEscape(row[0])} | ${mdEscape(row[1])} | ${row[2]} | ${row[3]} |`);
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Source artifact: \`${report.source_artifact}\``);
  return `${lines.join('\n')}\n`;
}

const report = buildReport();
writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  ],
  approval_rows: report.summary.approval_rows,
  high_priority_rows: report.summary.by_review_priority.high || 0,
  medium_priority_rows: report.summary.by_review_priority.medium || 0,
  standard_rows: report.summary.by_review_priority.standard || 0,
  write_ready_now: report.write_ready_now,
  approval_recorded: report.approval_recorded,
  pass: report.pass,
  stop_findings: report.stop_findings.length,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
