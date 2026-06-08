import crypto from 'node:crypto';
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
const APPROVAL_TEMPLATE_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_record_template_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_template_guard_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_operator_approval_template_guard_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashRow(row) {
  const fingerprintPayload = {
    card_print_id: row.card_print_id,
    set_key: row.set_key,
    source_external_id: row.source_external_id,
    current_fields: row.current_fields,
    proposed_fields: row.proposed_fields,
    direct_field_changes: row.direct_field_changes,
    supported_finishes: row.supported_finishes,
    child_printing_rows_verified: row.child_printing_rows_verified,
    evidence_sources: row.evidence_sources,
  };
  return crypto.createHash('sha256').update(stableJson(fingerprintPayload)).digest('hex');
}

function packageFingerprint(fingerprints) {
  return crypto.createHash('sha256').update(stableJson(fingerprints)).digest('hex');
}

function buildReport() {
  const approvalPacket = readJson(APPROVAL_PACKET_JSON);
  const approvalTemplate = readJson(APPROVAL_TEMPLATE_JSON);
  const packetRows = approvalPacket.approval_rows || [];
  const templateEntries = approvalTemplate.approval_entries || [];
  const templateByCardPrintId = new Map(templateEntries.map((entry) => [entry.card_print_id, entry]));
  const expectedFingerprints = packetRows.map((row) => hashRow(row));
  const expectedPackageFingerprint = packageFingerprint(expectedFingerprints);
  const actualFingerprints = templateEntries.map((entry) => entry.row_fingerprint_sha256);
  const actualPackageFingerprint = approvalTemplate.package_scope?.package_fingerprint_sha256 ?? null;
  const stopFindings = [];
  const rowFindings = [];

  if (approvalPacket.approval_recorded !== false) stopFindings.push('approval_packet_already_records_approval');
  if (approvalPacket.write_ready_now !== 0) stopFindings.push('approval_packet_write_ready_nonzero');
  if (approvalTemplate.approval_recorded !== false) stopFindings.push('approval_template_records_approval');
  if (approvalTemplate.write_ready_now !== 0) stopFindings.push('approval_template_write_ready_nonzero');
  if (approvalTemplate.approval_status !== 'blank_template_no_approval_recorded') {
    stopFindings.push('approval_template_status_not_blank');
  }
  if (packetRows.length !== templateEntries.length) stopFindings.push('packet_template_row_count_mismatch');
  if (new Set(actualFingerprints).size !== actualFingerprints.length) stopFindings.push('duplicate_template_row_fingerprints');
  if (expectedPackageFingerprint !== actualPackageFingerprint) stopFindings.push('package_fingerprint_mismatch');
  if ((approvalTemplate.stop_findings || []).length !== 0) stopFindings.push('approval_template_contains_stop_findings');

  for (const packetRow of packetRows) {
    const entry = templateByCardPrintId.get(packetRow.card_print_id);
    if (!entry) {
      rowFindings.push({
        severity: 'stop',
        card_print_id: packetRow.card_print_id,
        finding: 'missing_template_entry',
      });
      continue;
    }
    const expectedFingerprint = hashRow(packetRow);
    if (entry.row_fingerprint_sha256 !== expectedFingerprint) {
      rowFindings.push({
        severity: 'stop',
        card_print_id: packetRow.card_print_id,
        finding: 'row_fingerprint_mismatch',
        expected: expectedFingerprint,
        actual: entry.row_fingerprint_sha256,
      });
    }
    if (entry.approved !== false || entry.rejected !== false || entry.needs_followup !== false) {
      rowFindings.push({
        severity: 'stop',
        card_print_id: packetRow.card_print_id,
        finding: 'template_entry_not_blank',
        approved: entry.approved,
        rejected: entry.rejected,
        needs_followup: entry.needs_followup,
      });
    }
    if (entry.operator_initials !== '' || entry.reviewed_at !== '' || entry.review_note !== '') {
      rowFindings.push({
        severity: 'stop',
        card_print_id: packetRow.card_print_id,
        finding: 'template_review_fields_not_blank',
      });
    }
    if (Number(entry.vault_items_referencing_target || 0) !== 0) {
      rowFindings.push({
        severity: 'stop',
        card_print_id: packetRow.card_print_id,
        finding: 'vault_referenced_row_present',
        vault_items_referencing_target: entry.vault_items_referencing_target,
      });
    }
  }

  const missingPacketRows = templateEntries
    .filter((entry) => !packetRows.some((row) => row.card_print_id === entry.card_print_id))
    .map((entry) => ({
      severity: 'stop',
      card_print_id: entry.card_print_id,
      finding: 'template_entry_not_in_approval_packet',
    }));
  rowFindings.push(...missingPacketRows);

  if (rowFindings.some((finding) => finding.severity === 'stop')) stopFindings.push('row_level_guard_findings_present');

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_operator_approval_template_guard_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    approval_recorded: false,
    guard_status: stopFindings.length === 0 ? 'pass_blank_template_verified_no_write' : 'stop_template_not_safe',
    purpose: 'Validate that the operator approval record template still matches the source approval packet and remains blank/non-authorizing.',
    source_artifacts: {
      approval_packet: path.relative(ROOT, APPROVAL_PACKET_JSON).replaceAll('\\', '/'),
      approval_record_template: path.relative(ROOT, APPROVAL_TEMPLATE_JSON).replaceAll('\\', '/'),
    },
    summary: {
      approval_packet_rows: packetRows.length,
      approval_template_rows: templateEntries.length,
      expected_package_fingerprint_sha256: expectedPackageFingerprint,
      actual_package_fingerprint_sha256: actualPackageFingerprint,
      row_fingerprints_expected: expectedFingerprints.length,
      row_fingerprints_actual: actualFingerprints.length,
      unique_row_fingerprints_actual: new Set(actualFingerprints).size,
      blank_entries: templateEntries.filter(
        (entry) =>
          entry.approved === false &&
          entry.rejected === false &&
          entry.needs_followup === false &&
          entry.operator_initials === '' &&
          entry.reviewed_at === '' &&
          entry.review_note === '',
      ).length,
      row_guard_findings: rowFindings.length,
      stop_findings: stopFindings.length,
      write_ready_now: 0,
      approval_recorded: false,
    },
    guard_rules: [
      'The approval template must remain blank until human approval is explicitly recorded in a separate step.',
      'The package fingerprint must match the source approval packet.',
      'Every row fingerprint must match the source approval packet.',
      'No row with vault references may pass this guard.',
      'Passing this guard does not authorize DB writes.',
    ],
    row_findings: rowFindings,
    explicit_non_authorizations: [
      'This guard is not approval.',
      'This guard is not an execution artifact.',
      'This guard is not SQL.',
      'This guard does not allow DB writes, migrations, cleanup, quarantine, insertion, deletion, or hiding.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Operator Approval Template Guard V1');
  lines.push('');
  lines.push('This report validates that the PKG-01 approval record template is still blank, fingerprinted, and non-authorizing.');
  lines.push('');
  lines.push('It is not approval, not SQL, not a migration, and not an execution artifact.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| audit_only | ${report.audit_only} |`);
  lines.push(`| guard_status | ${report.guard_status} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
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
  lines.push('| --- | --- |');
  lines.push(`| approval packet rows | ${report.summary.approval_packet_rows} |`);
  lines.push(`| approval template rows | ${report.summary.approval_template_rows} |`);
  lines.push(`| blank entries | ${report.summary.blank_entries} |`);
  lines.push(`| row guard findings | ${report.summary.row_guard_findings} |`);
  lines.push(`| expected package fingerprint | \`${report.summary.expected_package_fingerprint_sha256}\` |`);
  lines.push(`| actual package fingerprint | \`${report.summary.actual_package_fingerprint_sha256}\` |`);
  lines.push('');
  lines.push('## Guard Rules');
  lines.push('');
  for (const rule of report.guard_rules) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Row Findings');
  lines.push('');
  if (report.row_findings.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Severity | Card Print ID | Finding |');
    lines.push('| --- | --- | --- |');
    for (const finding of report.row_findings) {
      lines.push(`| ${mdEscape(finding.severity)} | ${mdEscape(finding.card_print_id)} | ${mdEscape(finding.finding)} |`);
    }
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Source approval packet: \`${report.source_artifacts.approval_packet}\``);
  lines.push(`Source approval template: \`${report.source_artifacts.approval_record_template}\``);
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
      guard_status: report.guard_status,
      approval_packet_rows: report.summary.approval_packet_rows,
      approval_template_rows: report.summary.approval_template_rows,
      blank_entries: report.summary.blank_entries,
      package_fingerprint_sha256: report.summary.actual_package_fingerprint_sha256,
      pass: report.pass,
      stop_findings: report.stop_findings.length,
      row_findings: report.row_findings.length,
      write_ready_now: report.write_ready_now,
      approval_recorded: report.approval_recorded,
      db_writes_performed: report.db_writes_performed,
      migrations_created: report.migrations_created,
      cleanup_performed: report.cleanup_performed,
      quarantine_performed: report.quarantine_performed,
    },
    null,
    2,
  ),
);
