import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const PACKAGE_DIR = path.join(AUDIT_DIR, 'dry_run_packages');
const REVIEW_GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_review_gate_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_apply_design_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_apply_design_v1.md');

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

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function packageFiles() {
  return fs
    .readdirSync(PACKAGE_DIR)
    .filter((name) => name.endsWith('_physical_recovery_dry_run_v1.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(PACKAGE_DIR, name));
}

function normalizeEmpty(value) {
  if (value === undefined || value === null) return null;
  const stringValue = String(value);
  return stringValue.length === 0 ? null : stringValue;
}

function buildMutationRows(packages) {
  const rows = [];
  for (const pkg of packages) {
    const snapshotById = new Map((pkg.db_snapshot?.rows || []).map((row) => [row.card_print_id, row]));
    for (const packageRow of pkg.package_rows || []) {
      const snapshot = snapshotById.get(packageRow.card_print_id);
      const before = snapshot?.card_print || {};
      const target = packageRow.target_parent_fields || {};
      const directTargetFields = {
        set_code: target.set_code ?? pkg.target_set_key,
        number: target.number ?? packageRow.target_card_number,
        name: target.name ?? packageRow.target_card_name,
      };
      const expectedGeneratedReadback = {
        number_plain: target.number_plain ?? packageRow.target_card_number,
      };
      const beforeFields = {
        set_code: normalizeEmpty(before.set_code),
        number: normalizeEmpty(before.number),
        name: normalizeEmpty(before.name),
        number_plain: normalizeEmpty(before.number_plain),
        set_id: before.set_id ?? null,
      };
      const fieldChanges = {};
      for (const field of Object.keys(directTargetFields)) {
        if (normalizeEmpty(before[field]) !== normalizeEmpty(directTargetFields[field])) {
          fieldChanges[field] = {
            before: beforeFields[field],
            after: directTargetFields[field],
          };
        }
      }
      rows.push({
        set_key: pkg.target_set_key,
        set_name: pkg.target_set_name,
        card_print_id: packageRow.card_print_id,
        source_external_id: packageRow.source_external_id,
        source_card_url: packageRow.source_card_url,
        before_fields: beforeFields,
        target_parent_fields: directTargetFields,
        expected_generated_readback: expectedGeneratedReadback,
        rollback_parent_fields: {
          set_code: beforeFields.set_code,
          number: beforeFields.number,
          name: beforeFields.name,
        },
        field_changes: fieldChanges,
        supported_finishes: packageRow.supported_finishes || [],
        target_printing_count: (packageRow.target_printings || []).length,
        before_child_printing_count: snapshot?.card_printings?.length ?? 0,
        dependency_counts: snapshot?.dependency_counts || {},
        evidence_sources: packageRow.evidence_summary?.supported_sources || [],
        mutation_design_status: 'approval_required_no_write',
      });
    }
  }
  return rows;
}

function buildPackageSummaries(packages, mutationRows) {
  return packages.map((pkg) => {
    const rows = mutationRows.filter((row) => row.set_key === pkg.target_set_key);
    const changedFields = {};
    for (const row of rows) {
      for (const field of Object.keys(row.field_changes)) addCount(changedFields, field);
    }
    return {
      set_key: pkg.target_set_key,
      set_name: pkg.target_set_name,
      candidate_card_prints: pkg.summary?.candidate_card_prints || rows.length,
      candidate_printing_rows: pkg.summary?.candidate_printing_rows || sum(rows.map((row) => row.target_printing_count)),
      db_snapshot_available: pkg.summary?.db_snapshot_available === true,
      db_card_prints_found: pkg.summary?.db_card_prints_found || 0,
      db_card_printings_found: pkg.summary?.db_card_printings_found || 0,
      vault_items_referencing_targets: pkg.summary?.vault_items_referencing_targets || 0,
      changed_fields: changedFields,
      design_status: 'approval_required_no_write',
    };
  });
}

function buildVerificationPlan(packages) {
  const packageChecks = packages.map((pkg) => ({
    set_key: pkg.target_set_key,
    set_name: pkg.target_set_name,
    expected_parent_rows: pkg.summary?.candidate_card_prints || 0,
    expected_child_printing_rows: pkg.summary?.candidate_printing_rows || 0,
    required_checks: [
      'All target parent rows resolve to the intended set_code.',
      'Child printing row count is unchanged.',
      'No unsupported finish rows are introduced.',
      'Vault item references remain unchanged.',
      'Identity, trait, and external mapping counts remain explainable.',
    ],
  }));
  return {
    package_checks: packageChecks,
    global_checks: [
      {
        name: 'all_target_parent_rows_resolved',
        expected: sum(packageChecks.map((check) => check.expected_parent_rows)),
      },
      {
        name: 'all_target_child_printings_unchanged',
        expected: sum(packageChecks.map((check) => check.expected_child_printing_rows)),
      },
      {
        name: 'vault_items_referencing_targets',
        expected: 0,
      },
      {
        name: 'unsupported_finishes_in_target_rows',
        expected: 0,
      },
    ],
  };
}

function buildReport() {
  const reviewGate = readJson(REVIEW_GATE_JSON);
  const packages = packageFiles().map(readJson);
  const mutationRows = buildMutationRows(packages);
  const packageSummaries = buildPackageSummaries(packages, mutationRows);
  const changedFields = {};
  const rowsBySet = {};
  for (const row of mutationRows) {
    addCount(rowsBySet, row.set_key);
    for (const field of Object.keys(row.field_changes)) addCount(changedFields, field);
  }
  const stopFindings = [];
  if (reviewGate.review_gate_status !== 'dry_run_packages_complete_review_required_no_write') {
    stopFindings.push('review_gate_not_complete');
  }
  if (reviewGate.summary?.package_stop_findings !== 0) stopFindings.push('review_gate_package_stop_findings_present');
  if (reviewGate.summary?.duplicate_card_print_ids !== 0) stopFindings.push('review_gate_duplicate_card_print_ids_present');
  if (mutationRows.some((row) => row.dependency_counts?.vault_items !== 0)) stopFindings.push('vault_items_reference_targets');
  if (mutationRows.some((row) => row.before_child_printing_count !== row.target_printing_count)) {
    stopFindings.push('child_printing_count_differs_from_target_printing_count');
  }

  const designStatus = stopFindings.length === 0
    ? 'apply_design_complete_approval_required_no_write'
    : 'apply_design_blocked_stop_findings_present';

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_physical_recovery_apply_design_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    apply_design_status: designStatus,
    approval_status: 'operator_approval_required_before_any_write',
    conclusion: designStatus === 'apply_design_complete_approval_required_no_write'
      ? 'The PKG-01 physical recovery apply design is complete enough for human review, but it is not executable and does not authorize writes.'
      : 'Stop findings must be resolved before this can be reviewed as an apply design.',
    source_review_gate: path.relative(ROOT, REVIEW_GATE_JSON).replaceAll('\\', '/'),
    summary: {
      package_count: packageSummaries.length,
      candidate_card_prints: mutationRows.length,
      candidate_printing_rows: sum(mutationRows.map((row) => row.target_printing_count)),
      before_child_printing_rows: sum(mutationRows.map((row) => row.before_child_printing_count)),
      vault_items_referencing_targets: sum(mutationRows.map((row) => row.dependency_counts?.vault_items || 0)),
      external_mappings_referencing_targets: sum(mutationRows.map((row) => row.dependency_counts?.external_mappings || 0)),
      identity_rows_referencing_targets: sum(mutationRows.map((row) => row.dependency_counts?.card_print_identity || 0)),
      trait_rows_referencing_targets: sum(mutationRows.map((row) => row.dependency_counts?.card_print_traits || 0)),
      changed_fields: changedFields,
      rows_by_set: rowsBySet,
      stop_findings: stopFindings.length,
      write_ready_now: 0,
    },
    hard_rules: [
      'This is not an executable apply package.',
      'This report must not be copied into a migration.',
      'No write may occur until a separate operator-approved execution artifact exists.',
      'Rollback values must be regenerated from a fresh DB snapshot immediately before any future write.',
      'Post-apply verification must pass before any transaction commit in a future execution path.',
    ],
    required_before_any_write: [
      'Human review of every before_fields and target_parent_fields row.',
      'Explicit operator approval of exact card_print_id list.',
      'Fresh read-only before-state snapshot from production immediately before execution.',
      'Dedicated transactional execution script with dry-run default and apply flag blocked unless explicitly approved.',
      'Rollback matrix regenerated from the fresh snapshot.',
      'Post-apply verification checks run inside the same transaction before commit.',
    ],
    direct_parent_fields_under_design: ['set_code', 'number', 'name'],
    generated_or_readback_fields_not_directly_assigned: ['number_plain'],
    stop_findings: stopFindings,
    package_summaries: packageSummaries,
    verification_plan: buildVerificationPlan(packages),
    mutation_rows: mutationRows,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Physical Recovery Apply Design V1');
  lines.push('');
  lines.push('This is an audit-only apply design packet for PKG-01 physical missing-set recovery.');
  lines.push('');
  lines.push('It is not executable, not approved, and does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.');
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(`- apply_design_status: ${report.apply_design_status}`);
  lines.push(`- approval_status: ${report.approval_status}`);
  lines.push(`- conclusion: ${report.conclusion}`);
  lines.push(`- write_ready_now: ${report.write_ready_now}`);
  lines.push(`- db_writes_performed: ${report.db_writes_performed}`);
  lines.push(`- migrations_created: ${report.migrations_created}`);
  lines.push(`- cleanup_performed: ${report.cleanup_performed}`);
  lines.push(`- quarantine_performed: ${report.quarantine_performed}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  for (const key of [
    'package_count',
    'candidate_card_prints',
    'candidate_printing_rows',
    'before_child_printing_rows',
    'external_mappings_referencing_targets',
    'identity_rows_referencing_targets',
    'trait_rows_referencing_targets',
    'vault_items_referencing_targets',
    'stop_findings',
    'write_ready_now',
  ]) {
    lines.push(`| ${key} | ${report.summary[key]} |`);
  }
  lines.push('');
  lines.push('## Changed Parent Fields');
  lines.push('');
  lines.push('| Field | Rows |');
  lines.push('| --- | ---: |');
  for (const [field, count] of Object.entries(report.summary.changed_fields).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${mdEscape(field)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Packages');
  lines.push('');
  lines.push('| Set | Name | Parents | Printings | Changed Fields | Vault Items | Status |');
  lines.push('| --- | --- | ---: | ---: | --- | ---: | --- |');
  for (const pkg of report.package_summaries) {
    const fields = Object.entries(pkg.changed_fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([field, count]) => `${field}:${count}`)
      .join(', ');
    lines.push(`| ${mdEscape(pkg.set_key)} | ${mdEscape(pkg.set_name)} | ${pkg.candidate_card_prints} | ${pkg.candidate_printing_rows} | ${mdEscape(fields)} | ${pkg.vault_items_referencing_targets} | ${pkg.design_status} |`);
  }
  lines.push('');
  lines.push('## Mutation Design Matrix');
  lines.push('');
  lines.push('| Set | Card Print ID | Before Set | After Set | Before Number | After Number | Before Name | After Name | Generated Readback | Children | Vault Items |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |');
  for (const row of report.mutation_rows) {
    lines.push(`| ${mdEscape(row.set_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.before_fields.set_code)} | ${mdEscape(row.target_parent_fields.set_code)} | ${mdEscape(row.before_fields.number)} | ${mdEscape(row.target_parent_fields.number)} | ${mdEscape(row.before_fields.name)} | ${mdEscape(row.target_parent_fields.name)} | ${mdEscape(`number_plain=${row.expected_generated_readback.number_plain}`)} | ${row.before_child_printing_count} | ${row.dependency_counts?.vault_items || 0} |`);
  }
  lines.push('');
  lines.push('## Rollback Design');
  lines.push('');
  lines.push('Rollback must restore only the directly assigned parent fields for the exact `card_print_id` list from a fresh pre-write snapshot.');
  lines.push('');
  lines.push('| Set | Card Print ID | Rollback Set | Rollback Number | Rollback Name |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.mutation_rows) {
    lines.push(`| ${mdEscape(row.set_key)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.rollback_parent_fields.set_code)} | ${mdEscape(row.rollback_parent_fields.number)} | ${mdEscape(row.rollback_parent_fields.name)} |`);
  }
  lines.push('');
  lines.push('## Verification Plan');
  lines.push('');
  lines.push('| Check | Expected |');
  lines.push('| --- | ---: |');
  for (const check of report.verification_plan.global_checks) {
    lines.push(`| ${mdEscape(check.name)} | ${mdEscape(check.expected)} |`);
  }
  lines.push('');
  lines.push('## Required Before Any Write');
  lines.push('');
  for (const item of report.required_before_any_write) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Hard Rules');
  lines.push('');
  for (const item of report.hard_rules) lines.push(`- ${item}`);
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
  apply_design_status: report.apply_design_status,
  approval_status: report.approval_status,
  package_count: report.summary.package_count,
  candidate_card_prints: report.summary.candidate_card_prints,
  candidate_printing_rows: report.summary.candidate_printing_rows,
  stop_findings: report.summary.stop_findings,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
