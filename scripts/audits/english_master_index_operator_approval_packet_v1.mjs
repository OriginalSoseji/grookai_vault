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

const DB_IMPACT_JSON = path.join(AUDIT_DIR, 'english_master_index_db_impact_translation_v1.json');
const APPLY_DESIGN_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_apply_design_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_operator_approval_packet_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_operator_approval_packet_v1.md');

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

function buildSetApprovalItems(mutationRows) {
  const bySet = new Map();
  for (const row of mutationRows) {
    if (!bySet.has(row.set_key)) {
      bySet.set(row.set_key, {
        set_key: row.set_key,
        set_name: row.set_name,
        card_print_ids: [],
        card_print_rows: 0,
        child_printing_rows_verified: 0,
        changed_fields: {},
        vault_items_referencing_targets: 0,
        evidence_sources: {},
        row_review_status: 'operator_review_required',
      });
    }
    const item = bySet.get(row.set_key);
    item.card_print_ids.push(row.card_print_id);
    item.card_print_rows += 1;
    item.child_printing_rows_verified += Number(row.before_child_printing_count || 0);
    item.vault_items_referencing_targets += Number(row.dependency_counts?.vault_items || 0);
    for (const field of Object.keys(row.field_changes || {})) addCount(item.changed_fields, field);
    for (const source of row.evidence_sources || []) addCount(item.evidence_sources, source);
  }
  return [...bySet.values()].sort((a, b) => a.set_key.localeCompare(b.set_key));
}

function buildApprovalRows(mutationRows) {
  return mutationRows.map((row) => ({
    approval_checkbox: false,
    set_key: row.set_key,
    set_name: row.set_name,
    card_print_id: row.card_print_id,
    source_external_id: row.source_external_id,
    source_card_url: row.source_card_url,
    current_fields: row.before_fields,
    proposed_fields: row.target_parent_fields,
    generated_readback_expected: row.expected_generated_readback,
    direct_field_changes: row.field_changes,
    rollback_fields_from_snapshot: row.rollback_parent_fields,
    supported_finishes: row.supported_finishes,
    child_printing_rows_verified: row.before_child_printing_count,
    vault_items_referencing_target: row.dependency_counts?.vault_items || 0,
    external_mappings_referencing_target: row.dependency_counts?.external_mappings || 0,
    identity_rows_referencing_target: row.dependency_counts?.card_print_identity || 0,
    trait_rows_referencing_target: row.dependency_counts?.card_print_traits || 0,
    evidence_sources: row.evidence_sources || [],
    row_status: 'approval_required_no_write',
  }));
}

function buildReport() {
  const dbImpact = readJson(DB_IMPACT_JSON);
  const applyDesign = readJson(APPLY_DESIGN_JSON);
  const mutationRows = applyDesign.mutation_rows || [];
  const approvalRows = buildApprovalRows(mutationRows);
  const setApprovalItems = buildSetApprovalItems(mutationRows);
  const stopFindings = [];

  if (dbImpact.current_db_effect?.database_changed_by_this_work !== false) {
    stopFindings.push('db_impact_reports_current_db_changed');
  }
  if (dbImpact.future_db_effect_if_separately_approved_later?.write_ready_now !== 0) {
    stopFindings.push('db_impact_write_ready_nonzero');
  }
  if (applyDesign.write_ready_now !== 0) stopFindings.push('apply_design_write_ready_nonzero');
  if (applyDesign.summary?.stop_findings !== 0) stopFindings.push('apply_design_stop_findings_present');
  if (approvalRows.some((row) => row.vault_items_referencing_target !== 0)) {
    stopFindings.push('vault_items_reference_approval_target');
  }

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_operator_approval_packet_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    approval_recorded: false,
    approval_status: 'operator_approval_not_recorded',
    purpose: 'Provide a concrete human review packet for the future PKG-01 physical recovery candidate without authorizing or executing writes.',
    package_scope: {
      package_id: 'PKG-01',
      package_name: 'Physical missing-set recovery - master-verified subset',
      card_print_rows_requiring_approval: approvalRows.length,
      child_printing_rows_verified: approvalRows.reduce((acc, row) => acc + Number(row.child_printing_rows_verified || 0), 0),
      affected_set_count: setApprovalItems.length,
      direct_fields_under_review: applyDesign.direct_parent_fields_under_design || [],
      generated_or_readback_fields_not_directly_assigned: applyDesign.generated_or_readback_fields_not_directly_assigned || [],
    },
    required_signoff_checklist: [
      {
        id: 'row_list_reviewed',
        required: true,
        checked: false,
        description: 'Every card_print_id in this packet has been reviewed against the before and proposed fields.',
      },
      {
        id: 'source_evidence_reviewed',
        required: true,
        checked: false,
        description: 'Source URLs/evidence sources have been reviewed for every proposed row.',
      },
      {
        id: 'fresh_snapshot_required',
        required: true,
        checked: false,
        description: 'A fresh production before-state snapshot will be captured immediately before any future execution.',
      },
      {
        id: 'rollback_required',
        required: true,
        checked: false,
        description: 'Rollback values will be regenerated from the fresh snapshot, not copied from this packet.',
      },
      {
        id: 'transactional_execution_artifact_required',
        required: true,
        checked: false,
        description: 'A separate dry-run-default transactional execution artifact must exist before any write.',
      },
      {
        id: 'post_apply_verification_required',
        required: true,
        checked: false,
        description: 'Post-apply verification must run inside the future transaction before commit.',
      },
    ],
    explicit_non_authorizations: [
      'This packet is not operator approval.',
      'This packet is not an execution artifact.',
      'This packet is not SQL.',
      'This packet must not be copied into a migration.',
      'This packet does not allow DB writes.',
      'This packet does not allow cleanup, quarantine, hiding, insertion, or deletion.',
    ],
    set_approval_items: setApprovalItems,
    approval_rows: approvalRows,
    source_artifacts: {
      db_impact_translation: path.relative(ROOT, DB_IMPACT_JSON).replaceAll('\\', '/'),
      apply_design: path.relative(ROOT, APPLY_DESIGN_JSON).replaceAll('\\', '/'),
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Operator Approval Packet V1');
  lines.push('');
  lines.push('This is a no-write human review packet for the future PKG-01 physical recovery candidate.');
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
  lines.push('## Package Scope');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| card_print rows requiring approval | ${report.package_scope.card_print_rows_requiring_approval} |`);
  lines.push(`| child printing rows verified | ${report.package_scope.child_printing_rows_verified} |`);
  lines.push(`| affected sets | ${report.package_scope.affected_set_count} |`);
  lines.push('');
  lines.push('Direct fields under review: `set_code`, `number`, `name`.');
  lines.push('');
  lines.push('`number_plain` is generated/readback-only and is not directly assigned by this design.');
  lines.push('');
  lines.push('## Required Signoff Checklist');
  lines.push('');
  lines.push('| Required | Checked | ID | Description |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of report.required_signoff_checklist) {
    lines.push(`| ${item.required} | ${item.checked} | ${mdEscape(item.id)} | ${mdEscape(item.description)} |`);
  }
  lines.push('');
  lines.push('## Affected Sets');
  lines.push('');
  lines.push('| Set | Name | Rows | Child Printings | Changed Fields | Vault Refs | Status |');
  lines.push('| --- | --- | ---: | ---: | --- | ---: | --- |');
  for (const item of report.set_approval_items) {
    const fields = Object.entries(item.changed_fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([field, count]) => `${field}:${count}`)
      .join(', ');
    lines.push(`| ${mdEscape(item.set_key)} | ${mdEscape(item.set_name)} | ${item.card_print_rows} | ${item.child_printing_rows_verified} | ${mdEscape(fields)} | ${item.vault_items_referencing_targets} | ${mdEscape(item.row_review_status)} |`);
  }
  lines.push('');
  lines.push('## Row Approval Matrix');
  lines.push('');
  lines.push('| Approved | Set | Card Print ID | Source ID | Current Set | Proposed Set | Current Number | Proposed Number | Current Name | Proposed Name | Child Printings | Vault Refs |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |');
  for (const row of report.approval_rows) {
    lines.push(`| ${row.approval_checkbox} | ${mdEscape(row.set_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.source_external_id)} | ${mdEscape(row.current_fields?.set_code)} | ${mdEscape(row.proposed_fields?.set_code)} | ${mdEscape(row.current_fields?.number)} | ${mdEscape(row.proposed_fields?.number)} | ${mdEscape(row.current_fields?.name)} | ${mdEscape(row.proposed_fields?.name)} | ${row.child_printing_rows_verified} | ${row.vault_items_referencing_target} |`);
  }
  lines.push('');
  lines.push('## Explicit Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Source Artifacts');
  lines.push('');
  lines.push(`- DB impact translation: \`${report.source_artifacts.db_impact_translation}\``);
  lines.push(`- Apply design: \`${report.source_artifacts.apply_design}\``);
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
  approval_recorded: report.approval_recorded,
  write_ready_now: report.write_ready_now,
  card_print_rows_requiring_approval: report.package_scope.card_print_rows_requiring_approval,
  affected_sets: report.package_scope.affected_set_count,
  pass: report.pass,
  stop_findings: report.stop_findings.length,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
