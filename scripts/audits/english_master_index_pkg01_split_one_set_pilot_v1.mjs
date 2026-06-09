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

const RECONCILE_PREVIEW_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_reconcile_dry_run_preview_v1.json');
const APPROVAL_GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_operator_approval_gate_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_split_one_set_pilot_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01_split_one_set_pilot_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function packageFingerprint(packageId, rows) {
  return sha256(stableJson({
    package_id: packageId,
    source_package_id: 'PKG-01',
    row_fingerprints: rows.map((row) => row.row_fingerprint_sha256).sort(),
  }));
}

function summarizeRows(rows) {
  const bySet = {};
  const byChangedField = {};
  let childPrintingRows = 0;
  let vaultItems = 0;
  for (const row of rows) {
    bySet[row.set_key] = (bySet[row.set_key] ?? 0) + 1;
    childPrintingRows += Number(row.child_printing_rows_current ?? row.child_printing_rows_expected ?? 0);
    vaultItems += Number(row.dependency_counts?.vault_items ?? 0);
    for (const field of row.allowed_changed_fields ?? []) {
      byChangedField[field] = (byChangedField[field] ?? 0) + 1;
    }
  }
  return {
    card_print_rows: rows.length,
    child_printing_rows_verified: childPrintingRows,
    affected_sets: Object.keys(bySet).length,
    vault_items_referencing_targets: vaultItems,
    by_set: bySet,
    by_changed_field: byChangedField,
  };
}

function setSummaries(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.set_key)) {
      grouped.set(row.set_key, {
        set_key: row.set_key,
        set_name: row.set_name,
        rows: [],
      });
    }
    grouped.get(row.set_key).rows.push(row);
  }
  return [...grouped.values()]
    .map((group) => ({
      set_key: group.set_key,
      set_name: group.set_name,
      ...summarizeRows(group.rows),
      has_name_changes: group.rows.some((row) => (row.allowed_changed_fields ?? []).includes('name')),
      max_changed_fields_per_row: Math.max(...group.rows.map((row) => (row.allowed_changed_fields ?? []).length)),
    }))
    .sort((left, right) =>
      left.card_print_rows - right.card_print_rows ||
      Number(left.has_name_changes) - Number(right.has_name_changes) ||
      left.max_changed_fields_per_row - right.max_changed_fields_per_row ||
      left.set_key.localeCompare(right.set_key));
}

function selectPilotSet(rows) {
  return setSummaries(rows)
    .filter((summary) => summary.vault_items_referencing_targets === 0)
    .filter((summary) => !summary.has_name_changes)
    .sort((left, right) =>
      left.card_print_rows - right.card_print_rows ||
      Object.keys(left.by_changed_field).length - Object.keys(right.by_changed_field).length ||
      left.child_printing_rows_verified - right.child_printing_rows_verified ||
      left.set_key.localeCompare(right.set_key))[0];
}

function buildReport() {
  const reconcilePreview = readJson(RECONCILE_PREVIEW_JSON);
  const approvalGate = readJson(APPROVAL_GATE_JSON);
  const stopFindings = [];
  if (reconcilePreview.preview_status !== 'dry_run_reconcile_preview_complete_apply_blocked_no_approval') {
    stopFindings.push('reconcile_preview_not_ready');
  }
  if ((reconcilePreview.stop_findings ?? []).length !== 0) stopFindings.push('reconcile_preview_stop_findings_present');
  if (approvalGate.approval_gate_status !== 'ready_for_operator_decision_apply_blocked_no_write') {
    stopFindings.push('operator_approval_gate_not_ready');
  }
  if (approvalGate.approval_recorded !== false) stopFindings.push('approval_already_recorded');
  if (approvalGate.write_ready_now !== 0) stopFindings.push('approval_gate_write_ready_nonzero');

  const allRows = reconcilePreview.mutation_matrix ?? [];
  const rollbackById = new Map((reconcilePreview.rollback_matrix ?? []).map((row) => [row.card_print_id, row]));
  const pilotSet = selectPilotSet(allRows);
  if (!pilotSet) stopFindings.push('no_safe_one_set_pilot_candidate');

  const pilotRows = pilotSet ? allRows.filter((row) => row.set_key === pilotSet.set_key) : [];
  const remainderRows = pilotSet ? allRows.filter((row) => row.set_key !== pilotSet.set_key) : allRows;
  const pilotRollbackRows = pilotRows.map((row) => rollbackById.get(row.card_print_id)).filter(Boolean);
  const remainderRollbackRows = remainderRows.map((row) => rollbackById.get(row.card_print_id)).filter(Boolean);
  const pilotSummary = summarizeRows(pilotRows);
  const remainderSummary = summarizeRows(remainderRows);
  const pilotFingerprint = packageFingerprint('PKG-01A', pilotRows);
  const remainderFingerprint = packageFingerprint('PKG-01B', remainderRows);

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01_split_one_set_pilot_v1',
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    approval_recorded: false,
    write_ready_now: 0,
    apply_allowed: false,
    split_status: stopFindings.length === 0
      ? 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
      : 'pkg01_split_blocked_stop_findings_present',
    source_package: {
      package_id: 'PKG-01',
      package_fingerprint_sha256: reconcilePreview.package_scope?.package_fingerprint_sha256 ?? null,
      card_print_rows: reconcilePreview.package_scope?.card_print_rows ?? allRows.length,
      child_printing_rows_verified: reconcilePreview.package_scope?.child_printing_rows_verified ?? null,
      approval_gate_status: approvalGate.approval_gate_status,
    },
    pilot_package: {
      package_id: 'PKG-01A',
      package_fingerprint_sha256: pilotFingerprint,
      source_package_id: 'PKG-01',
      source_package_fingerprint_sha256: reconcilePreview.package_scope?.package_fingerprint_sha256 ?? null,
      set_key: pilotSet?.set_key ?? null,
      set_name: pilotSet?.set_name ?? null,
      selection_reason: 'Lowest-blast-radius one-set pilot: one target row, one child printing, only set_code changes, zero vault references.',
      status: stopFindings.length === 0
        ? 'ready_for_operator_decision_apply_blocked_no_write'
        : 'blocked',
      ...pilotSummary,
      mutation_matrix: pilotRows,
      rollback_matrix: pilotRollbackRows,
      required_approval_reference: {
        package_id: 'PKG-01A',
        package_fingerprint_sha256: pilotFingerprint,
        set_key: pilotSet?.set_key ?? null,
        card_print_rows: pilotSummary.card_print_rows,
        child_printing_rows_verified: pilotSummary.child_printing_rows_verified,
      },
    },
    remainder_package: {
      package_id: 'PKG-01B',
      package_fingerprint_sha256: remainderFingerprint,
      source_package_id: 'PKG-01',
      status: 'blocked_until_pkg01a_pilot_verified_no_write',
      ...remainderSummary,
      mutation_matrix: remainderRows,
      rollback_matrix: remainderRollbackRows,
    },
    candidate_set_summaries: setSummaries(allRows),
    next_step_if_pilot_approved_later: [
      'Record explicit approval for PKG-01A only, referencing the PKG-01A fingerprint.',
      'Capture a final fresh DB snapshot for the PKG-01A row only.',
      'Create a guarded dry-run-default transaction artifact for PKG-01A only.',
      'Run PKG-01A transaction artifact in dry-run.',
      'Apply only after separate explicit apply approval.',
      'Verify PKG-01A post-apply before considering PKG-01B remainder batches.',
    ],
    explicit_non_authorizations: [
      'This split is not approval.',
      'This split is not SQL.',
      'This split is not a migration.',
      'This split does not create an apply runner.',
      'This split does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.',
      'PKG-01B remainder rows must not be included in the one-set pilot execution artifact.',
    ],
    source_artifacts: {
      reconcile_dry_run_preview: path.relative(ROOT, RECONCILE_PREVIEW_JSON).replaceAll('\\', '/'),
      operator_approval_gate: path.relative(ROOT, APPROVAL_GATE_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01 Split One-Set Pilot V1');
  lines.push('');
  lines.push('This report splits PKG-01 into a one-set pilot package and a blocked remainder package.');
  lines.push('');
  lines.push('It does not record approval, write to the DB, create SQL, create a migration, or create an apply runner.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| split_status | ${report.split_status} |`);
  lines.push(`| approval_recorded | ${report.approval_recorded} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Pilot Package');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| package_id | ${report.pilot_package.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.pilot_package.package_fingerprint_sha256}\` |`);
  lines.push(`| set_key | ${report.pilot_package.set_key} |`);
  lines.push(`| set_name | ${report.pilot_package.set_name} |`);
  lines.push(`| status | ${report.pilot_package.status} |`);
  lines.push(`| card_print_rows | ${report.pilot_package.card_print_rows} |`);
  lines.push(`| child_printing_rows_verified | ${report.pilot_package.child_printing_rows_verified} |`);
  lines.push(`| vault_items_referencing_targets | ${report.pilot_package.vault_items_referencing_targets} |`);
  lines.push(`| changed_fields | ${Object.entries(report.pilot_package.by_changed_field).map(([key, value]) => `${key}: ${value}`).join(', ')} |`);
  lines.push('');
  lines.push(`Selection reason: ${report.pilot_package.selection_reason}`);
  lines.push('');
  lines.push('## Remainder Package');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| package_id | ${report.remainder_package.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.remainder_package.package_fingerprint_sha256}\` |`);
  lines.push(`| status | ${report.remainder_package.status} |`);
  lines.push(`| card_print_rows | ${report.remainder_package.card_print_rows} |`);
  lines.push(`| child_printing_rows_verified | ${report.remainder_package.child_printing_rows_verified} |`);
  lines.push(`| affected_sets | ${report.remainder_package.affected_sets} |`);
  lines.push('');
  lines.push('## Candidate Sets');
  lines.push('');
  lines.push('| Set | Name | Rows | Child Printings | Changed Fields | Name Changes | Vault Items |');
  lines.push('| --- | --- | ---: | ---: | --- | --- | ---: |');
  for (const set of report.candidate_set_summaries) {
    const fields = Object.entries(set.by_changed_field).map(([key, value]) => `${key}: ${value}`).join(', ');
    lines.push(`| ${set.set_key} | ${set.set_name} | ${set.card_print_rows} | ${set.child_printing_rows_verified} | ${fields} | ${set.has_name_changes} | ${set.vault_items_referencing_targets} |`);
  }
  lines.push('');
  lines.push('## Next Step If Pilot Approved Later');
  lines.push('');
  for (const step of report.next_step_if_pilot_approved_later) lines.push(`- ${step}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
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
      split_status: report.split_status,
      pilot_package_id: report.pilot_package.package_id,
      pilot_set_key: report.pilot_package.set_key,
      pilot_card_print_rows: report.pilot_package.card_print_rows,
      pilot_child_printing_rows_verified: report.pilot_package.child_printing_rows_verified,
      remainder_card_print_rows: report.remainder_package.card_print_rows,
      remainder_child_printing_rows_verified: report.remainder_package.child_printing_rows_verified,
      approval_recorded: report.approval_recorded,
      write_ready_now: report.write_ready_now,
      apply_allowed: report.apply_allowed,
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
