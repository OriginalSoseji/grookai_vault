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
const REVIEW_DIGEST_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_review_digest_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_record_template_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_operator_approval_record_template_v1.md');

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

function classifySourceStrength(row) {
  const sources = new Set(row.evidence_sources || []);
  const hasApi = sources.has('tcgdex') || sources.has('pokemontcg_api');
  const hasChecklist =
    sources.has('reverseholo_set_checklist') ||
    sources.has('tcgplayer_price_guide') ||
    sources.has('tcgcsv_tcgplayer_catalog') ||
    sources.has('thepricedex_price_list');
  if (hasApi && hasChecklist) return 'api_plus_checklist_or_market_reference';
  if (hasChecklist) return 'checklist_or_market_reference_only';
  if (hasApi) return 'api_only_review_required';
  return 'source_review_required';
}

function buildReport() {
  const approvalPacket = readJson(APPROVAL_PACKET_JSON);
  const reviewDigest = readJson(REVIEW_DIGEST_JSON);
  const rows = approvalPacket.approval_rows || [];
  const digestRowsById = new Map((reviewDigest.all_rows || []).map((row) => [row.card_print_id, row]));
  const stopFindings = [];

  if (approvalPacket.approval_recorded !== false) stopFindings.push('approval_packet_already_records_approval');
  if (approvalPacket.write_ready_now !== 0) stopFindings.push('approval_packet_write_ready_nonzero');
  if (reviewDigest.approval_recorded !== false) stopFindings.push('review_digest_already_records_approval');
  if (reviewDigest.write_ready_now !== 0) stopFindings.push('review_digest_write_ready_nonzero');
  if (rows.some((row) => Number(row.vault_items_referencing_target || 0) !== 0)) {
    stopFindings.push('vault_referenced_rows_present');
  }

  const approvalEntries = rows.map((row) => {
    const digestRow = digestRowsById.get(row.card_print_id) || {};
    return {
      approved: false,
      rejected: false,
      needs_followup: false,
      operator_initials: '',
      reviewed_at: '',
      review_note: '',
      row_fingerprint_sha256: hashRow(row),
      review_priority: digestRow.review_priority || 'standard',
      review_flags: digestRow.review_flags || [],
      source_strength: classifySourceStrength(row),
      set_key: row.set_key,
      set_name: row.set_name,
      card_print_id: row.card_print_id,
      source_external_id: row.source_external_id,
      source_card_url: row.source_card_url,
      current_fields: row.current_fields,
      proposed_fields: row.proposed_fields,
      direct_field_changes: row.direct_field_changes,
      child_printing_rows_verified: row.child_printing_rows_verified,
      vault_items_referencing_target: row.vault_items_referencing_target,
      evidence_sources: row.evidence_sources || [],
    };
  });

  const fingerprints = approvalEntries.map((entry) => entry.row_fingerprint_sha256);
  const packageFingerprint = crypto
    .createHash('sha256')
    .update(stableJson(fingerprints))
    .digest('hex');

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_operator_approval_record_template_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    approval_recorded: false,
    approval_status: 'blank_template_no_approval_recorded',
    purpose: 'Provide a blank, fingerprinted approval record template for later human approval without authorizing or executing writes.',
    source_artifacts: {
      approval_packet: path.relative(ROOT, APPROVAL_PACKET_JSON).replaceAll('\\', '/'),
      review_digest: path.relative(ROOT, REVIEW_DIGEST_JSON).replaceAll('\\', '/'),
    },
    package_scope: {
      package_id: 'PKG-01',
      card_print_rows_requiring_approval: approvalEntries.length,
      child_printing_rows_verified: approvalEntries.reduce(
        (total, row) => total + Number(row.child_printing_rows_verified || 0),
        0,
      ),
      affected_set_count: new Set(approvalEntries.map((row) => row.set_key)).size,
      package_fingerprint_sha256: packageFingerprint,
      row_fingerprint_count: fingerprints.length,
      unique_row_fingerprint_count: new Set(fingerprints).size,
    },
    approval_record_rules: [
      'This template is blank and records no approval.',
      'A future approval record must keep the same package_fingerprint_sha256 or explain why the package changed.',
      'Every approved row must be explicitly marked approved with operator initials and reviewed_at.',
      'Rejected or follow-up rows must not enter any future execution artifact.',
      'Approval still does not permit writes until a fresh snapshot and separate dry-run-default transactional execution artifact exist.',
    ],
    approval_entries: approvalEntries,
    explicit_non_authorizations: [
      'This template is not approval.',
      'This template is not SQL.',
      'This template is not a migration.',
      'This template is not an execution artifact.',
      'This template does not allow DB writes, cleanup, quarantine, insertion, deletion, or hiding.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0 && fingerprints.length === new Set(fingerprints).size,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Operator Approval Record Template V1');
  lines.push('');
  lines.push('This is a blank, fingerprinted approval record template for PKG-01.');
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
  lines.push('## Package Fingerprint');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| card_print rows requiring approval | ${report.package_scope.card_print_rows_requiring_approval} |`);
  lines.push(`| child printing rows verified | ${report.package_scope.child_printing_rows_verified} |`);
  lines.push(`| affected sets | ${report.package_scope.affected_set_count} |`);
  lines.push(`| unique row fingerprints | ${report.package_scope.unique_row_fingerprint_count} |`);
  lines.push('');
  lines.push('## Approval Record Rules');
  lines.push('');
  for (const rule of report.approval_record_rules) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('## Blank Approval Entries');
  lines.push('');
  lines.push('| Approved | Rejected | Followup | Priority | Set | Card Print ID | Source ID | Fingerprint | Current | Proposed | Sources |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of report.approval_entries) {
    const current = `${row.current_fields?.set_code || ''}/${row.current_fields?.number || ''}/${row.current_fields?.name || ''}`;
    const proposed = `${row.proposed_fields?.set_code || ''}/${row.proposed_fields?.number || ''}/${row.proposed_fields?.name || ''}`;
    lines.push(
      `| ${row.approved} | ${row.rejected} | ${row.needs_followup} | ${mdEscape(row.review_priority)} | ${mdEscape(row.set_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.source_external_id)} | \`${row.row_fingerprint_sha256.slice(0, 16)}...\` | ${mdEscape(current)} | ${mdEscape(proposed)} | ${mdEscape(row.evidence_sources.join(', '))} |`,
    );
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Source approval packet: \`${report.source_artifacts.approval_packet}\``);
  lines.push(`Source review digest: \`${report.source_artifacts.review_digest}\``);
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
      package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
      approval_rows: report.package_scope.card_print_rows_requiring_approval,
      unique_row_fingerprints: report.package_scope.unique_row_fingerprint_count,
      approval_recorded: report.approval_recorded,
      write_ready_now: report.write_ready_now,
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
