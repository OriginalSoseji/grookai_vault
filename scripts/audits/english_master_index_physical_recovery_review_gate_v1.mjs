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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_review_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_review_gate_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function sortedEntries(object) {
  return Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b));
}

function addCount(target, key, amount = 1) {
  const safeKey = key || 'unknown';
  target[safeKey] = (target[safeKey] || 0) + amount;
}

function packageFiles() {
  if (!fs.existsSync(PACKAGE_DIR)) {
    throw new Error(`Missing dry-run package directory: ${PACKAGE_DIR}`);
  }
  return fs
    .readdirSync(PACKAGE_DIR)
    .filter((name) => name.endsWith('_physical_recovery_dry_run_v1.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(PACKAGE_DIR, name));
}

function summarizePackage(filePath) {
  const data = readJson(filePath);
  const packageRows = data.package_rows || [];
  const snapshotRows = data.db_snapshot?.rows || [];
  const snapshotById = new Map(snapshotRows.map((row) => [row.card_print_id, row]));
  const byFinish = {};
  const sourceKeys = {};
  const rowInventory = packageRows.map((row) => {
    const snapshot = snapshotById.get(row.card_print_id);
    const childPrintings = snapshot?.card_printings?.length ?? 0;
    const dependencyCounts = snapshot?.dependency_counts || {};
    const finishes = row.supported_finishes || [];
    const evidenceSources = new Set();
    if (Array.isArray(row.evidence_summary)) {
      for (const evidence of row.evidence_summary) {
        if (evidence?.source_key) evidenceSources.add(evidence.source_key);
      }
    } else {
      for (const source of row.evidence_summary?.supported_sources || []) {
        evidenceSources.add(source);
      }
    }
    for (const finish of finishes) addCount(byFinish, finish);
    for (const source of evidenceSources) addCount(sourceKeys, source);
    return {
      set_key: data.target_set_key,
      set_name: data.target_set_name,
      card_print_id: row.card_print_id,
      current_grookai_name: row.current_grookai_name,
      target_card_number: row.target_card_number,
      target_card_name: row.target_card_name,
      supported_finishes: finishes,
      unsupported_finishes: row.unsupported_finishes || [],
      source_external_id: row.source_external_id,
      source_card_url: row.source_card_url,
      evidence_sources: [...evidenceSources].sort(),
      child_printings: childPrintings,
      external_mappings: dependencyCounts.external_mappings || 0,
      identity_rows: dependencyCounts.card_print_identity || 0,
      trait_rows: dependencyCounts.card_print_traits || 0,
      vault_items: dependencyCounts.vault_items || 0,
      dry_run_status: row.dry_run_status,
      mutation_authority: row.mutation_authority,
    };
  });

  const stopFindings = [];
  if (data.audit_only !== true) stopFindings.push('package_not_audit_only');
  if (data.db_writes_performed !== false) stopFindings.push('db_write_flag_not_false');
  if (data.migrations_created !== false) stopFindings.push('migration_flag_not_false');
  if (data.cleanup_performed !== false) stopFindings.push('cleanup_flag_not_false');
  if (data.quarantine_performed !== false) stopFindings.push('quarantine_flag_not_false');
  if (data.apply_paths_executed !== false) stopFindings.push('apply_path_flag_not_false');
  if (data.write_ready_now !== 0) stopFindings.push('write_ready_now_not_zero');
  if (data.write_allowed_from_this_package !== false) stopFindings.push('write_allowed_flag_not_false');
  if (data.dry_run_package_status !== 'ready_for_review_no_write') {
    stopFindings.push('package_not_ready_for_review_no_write');
  }
  if (data.summary?.db_snapshot_available !== true) stopFindings.push('db_snapshot_missing');
  if (data.summary?.blocked_rows !== 0) stopFindings.push('blocked_rows_present');
  if ((data.summary?.candidate_card_prints || 0) !== packageRows.length) {
    stopFindings.push('candidate_card_print_count_mismatch');
  }
  if ((data.summary?.db_card_prints_found || 0) !== packageRows.length) {
    stopFindings.push('db_card_print_snapshot_count_mismatch');
  }
  if ((data.summary?.db_card_printings_found || 0) !== sum(rowInventory.map((row) => row.child_printings))) {
    stopFindings.push('db_child_printing_snapshot_count_mismatch');
  }
  if (rowInventory.some((row) => row.unsupported_finishes.length > 0)) {
    stopFindings.push('unsupported_finishes_present');
  }
  if ((data.summary?.vault_items_referencing_targets || 0) !== 0) {
    stopFindings.push('vault_items_reference_targets');
  }

  return {
    file: path.relative(ROOT, filePath).replaceAll('\\', '/'),
    version: data.version,
    target_set_key: data.target_set_key,
    target_set_name: data.target_set_name,
    dry_run_package_status: data.dry_run_package_status,
    audit_only: data.audit_only,
    write_ready_now: data.write_ready_now,
    write_allowed_from_this_package: data.write_allowed_from_this_package,
    candidate_card_prints: data.summary?.candidate_card_prints || 0,
    candidate_printing_rows: data.summary?.candidate_printing_rows || 0,
    db_snapshot_available: data.summary?.db_snapshot_available === true,
    db_card_prints_found: data.summary?.db_card_prints_found || 0,
    db_card_printings_found: data.summary?.db_card_printings_found || 0,
    external_mappings_referencing_targets: data.summary?.external_mappings_referencing_targets || 0,
    identity_rows_referencing_targets: data.summary?.identity_rows_referencing_targets || 0,
    trait_rows_referencing_targets: data.summary?.trait_rows_referencing_targets || 0,
    vault_items_referencing_targets: data.summary?.vault_items_referencing_targets || 0,
    by_supported_finish: byFinish,
    evidence_source_counts: sourceKeys,
    stop_findings: stopFindings,
    row_inventory: rowInventory,
  };
}

function buildReport() {
  const packages = packageFiles().map(summarizePackage);
  const allRows = packages.flatMap((pkg) => pkg.row_inventory);
  const byFinish = {};
  const sourceCounts = {};
  for (const pkg of packages) {
    for (const [finish, count] of Object.entries(pkg.by_supported_finish)) addCount(byFinish, finish, count);
    for (const [source, count] of Object.entries(pkg.evidence_source_counts)) addCount(sourceCounts, source, count);
  }

  const packageStopFindings = packages.flatMap((pkg) =>
    pkg.stop_findings.map((finding) => ({
      set_key: pkg.target_set_key,
      set_name: pkg.target_set_name,
      finding,
    })),
  );

  const duplicateCardPrintIds = [...new Set(
    allRows
      .map((row) => row.card_print_id)
      .filter((id, index, ids) => ids.indexOf(id) !== index),
  )].sort();

  const totalSummary = {
    package_count: packages.length,
    candidate_card_prints: sum(packages.map((pkg) => pkg.candidate_card_prints)),
    candidate_printing_rows: sum(packages.map((pkg) => pkg.candidate_printing_rows)),
    db_card_prints_found: sum(packages.map((pkg) => pkg.db_card_prints_found)),
    db_card_printings_found: sum(packages.map((pkg) => pkg.db_card_printings_found)),
    external_mappings_referencing_targets: sum(packages.map((pkg) => pkg.external_mappings_referencing_targets)),
    identity_rows_referencing_targets: sum(packages.map((pkg) => pkg.identity_rows_referencing_targets)),
    trait_rows_referencing_targets: sum(packages.map((pkg) => pkg.trait_rows_referencing_targets)),
    vault_items_referencing_targets: sum(packages.map((pkg) => pkg.vault_items_referencing_targets)),
    by_supported_finish: byFinish,
    evidence_source_counts: sourceCounts,
    package_stop_findings: packageStopFindings.length,
    duplicate_card_print_ids: duplicateCardPrintIds.length,
    write_ready_now: 0,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };

  const reviewGateStatus =
    packageStopFindings.length === 0 && duplicateCardPrintIds.length === 0
      ? 'dry_run_packages_complete_review_required_no_write'
      : 'stop_review_required_before_any_apply_design';

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_physical_recovery_review_gate_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    review_gate_status: reviewGateStatus,
    conclusion:
      reviewGateStatus === 'dry_run_packages_complete_review_required_no_write'
        ? 'The physical recovery dry-run package set is complete and internally consistent, but it is still not an apply package and does not authorize DB writes.'
        : 'One or more stop findings must be resolved before any apply-package design.',
    required_before_any_write: [
      'Human review of every package row and source URL.',
      'Separate approved apply package with exact row IDs and intended mutations.',
      'Rollback artifact generated from current before-state snapshots.',
      'Post-apply verification queries reviewed and accepted.',
      'Operator approval of the exact package contents.',
    ],
    hard_rules: [
      'Dry-run package completion is not write authorization.',
      'write_ready_now must remain 0 until a separate approved apply package exists.',
      'No package may include unsupported finishes, blocked rows, or vault-owned rows.',
      'No migration, cleanup, quarantine, or apply path is part of this report.',
    ],
    summary: totalSummary,
    package_stop_findings: packageStopFindings,
    duplicate_card_print_ids: duplicateCardPrintIds,
    packages,
    row_inventory: allRows,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Physical Recovery Review Gate V1');
  lines.push('');
  lines.push('This is an audit-only review gate for the generated physical recovery dry-run packages.');
  lines.push('');
  lines.push('It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.');
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(`- review_gate_status: ${report.review_gate_status}`);
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
    'db_card_prints_found',
    'db_card_printings_found',
    'external_mappings_referencing_targets',
    'identity_rows_referencing_targets',
    'trait_rows_referencing_targets',
    'vault_items_referencing_targets',
    'package_stop_findings',
    'duplicate_card_print_ids',
  ]) {
    lines.push(`| ${key} | ${report.summary[key]} |`);
  }
  lines.push('');
  lines.push('## Finish Coverage');
  lines.push('');
  lines.push('| Finish | Rows |');
  lines.push('| --- | ---: |');
  for (const [finish, count] of sortedEntries(report.summary.by_supported_finish)) {
    lines.push(`| ${mdEscape(finish)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Evidence Source Presence');
  lines.push('');
  lines.push('| Source | Package Rows Referencing Source |');
  lines.push('| --- | ---: |');
  for (const [source, count] of sortedEntries(report.summary.evidence_source_counts)) {
    lines.push(`| ${mdEscape(source)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Packages');
  lines.push('');
  lines.push('| Set | Name | Parents | Printings | DB Parents | DB Printings | External Mappings | Identity Rows | Trait Rows | Vault Items | Stop Findings |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const pkg of report.packages) {
    lines.push(
      `| ${mdEscape(pkg.target_set_key)} | ${mdEscape(pkg.target_set_name)} | ${pkg.candidate_card_prints} | ${pkg.candidate_printing_rows} | ${pkg.db_card_prints_found} | ${pkg.db_card_printings_found} | ${pkg.external_mappings_referencing_targets} | ${pkg.identity_rows_referencing_targets} | ${pkg.trait_rows_referencing_targets} | ${pkg.vault_items_referencing_targets} | ${pkg.stop_findings.length} |`,
    );
  }
  lines.push('');
  lines.push('## Row Inventory');
  lines.push('');
  lines.push('| Set | Number | Target Name | Current Grookai Name | Card Print ID | Finishes | Sources | Children | Vault Items |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |');
  for (const row of report.row_inventory) {
    lines.push(
      `| ${mdEscape(row.set_key)} | ${mdEscape(row.target_card_number)} | ${mdEscape(row.target_card_name)} | ${mdEscape(row.current_grookai_name)} | ${mdEscape(row.card_print_id)} | ${mdEscape(row.supported_finishes.join(', '))} | ${mdEscape(row.evidence_sources.join(', '))} | ${row.child_printings} | ${row.vault_items} |`,
    );
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
  review_gate_status: report.review_gate_status,
  package_count: report.summary.package_count,
  candidate_card_prints: report.summary.candidate_card_prints,
  candidate_printing_rows: report.summary.candidate_printing_rows,
  package_stop_findings: report.summary.package_stop_findings,
  duplicate_card_print_ids: report.summary.duplicate_card_print_ids,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
