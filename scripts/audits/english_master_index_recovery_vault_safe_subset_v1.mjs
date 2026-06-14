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

const REVIEW_GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_review_gate_v1.json');
const APPLY_DESIGN_JSON = path.join(AUDIT_DIR, 'english_master_index_physical_recovery_apply_design_v1.json');
const WRITE_READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_write_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_recovery_vault_safe_subset_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_recovery_vault_safe_subset_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_recovery_vault_safe_subset_checkpoint_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function packageRow(pkg) {
  return {
    set_key: pkg.target_set_key,
    set_name: pkg.target_set_name,
    package_file: pkg.file,
    candidate_card_prints: Number(pkg.candidate_card_prints ?? 0),
    candidate_printing_rows: Number(pkg.candidate_printing_rows ?? 0),
    db_card_prints_found: Number(pkg.db_card_prints_found ?? 0),
    db_card_printings_found: Number(pkg.db_card_printings_found ?? 0),
    vault_items_referencing_targets: Number(pkg.vault_items_referencing_targets ?? 0),
    external_mappings_referencing_targets: Number(pkg.external_mappings_referencing_targets ?? 0),
    identity_rows_referencing_targets: Number(pkg.identity_rows_referencing_targets ?? 0),
    trait_rows_referencing_targets: Number(pkg.trait_rows_referencing_targets ?? 0),
    stop_findings: pkg.stop_findings ?? [],
    status: Number(pkg.vault_items_referencing_targets ?? 0) === 0
      ? 'vault_safe_future_review_candidate'
      : 'blocked_vault_references_require_ownership_review',
  };
}

function validate(report) {
  const findings = [];
  if (report.review_gate_status !== 'stop_review_required_before_any_apply_design') {
    findings.push('review_gate_status_unexpected');
  }
  if (report.apply_design_status !== 'apply_design_blocked_stop_findings_present') {
    findings.push('apply_design_status_unexpected');
  }
  if (report.write_ready_now !== 0) findings.push('write_ready_now_nonzero');
  if (report.summary.total_packages !== report.summary.safe_packages + report.summary.blocked_packages) {
    findings.push('package_split_count_mismatch');
  }
  if (report.summary.safe_vault_items_referencing_targets !== 0) {
    findings.push('safe_subset_has_vault_references');
  }
  if (report.db_writes_performed !== false) findings.push('db_write_performed');
  if (report.migrations_created !== false) findings.push('migration_created');
  if (report.cleanup_performed !== false) findings.push('cleanup_performed');
  if (report.quarantine_performed !== false) findings.push('quarantine_performed');
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Recovery Vault-Safe Subset V1');
  lines.push('');
  lines.push('This report splits the refreshed physical-recovery dry-run packages into a no-vault-reference subset and a vault-blocked subset.');
  lines.push('');
  lines.push('It is audit-only: no DB writes, migrations, cleanup, quarantine, or apply execution were performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| split_status | ${report.split_status} |`);
  lines.push(`| review_gate_status | ${report.review_gate_status} |`);
  lines.push(`| apply_design_status | ${report.apply_design_status} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| Total packages | ${report.summary.total_packages} |`);
  lines.push(`| Safe packages | ${report.summary.safe_packages} |`);
  lines.push(`| Safe card_print rows | ${report.summary.safe_candidate_card_prints} |`);
  lines.push(`| Safe child printings | ${report.summary.safe_candidate_printing_rows} |`);
  lines.push(`| Blocked packages | ${report.summary.blocked_packages} |`);
  lines.push(`| Blocked card_print rows | ${report.summary.blocked_candidate_card_prints} |`);
  lines.push(`| Blocked child printings | ${report.summary.blocked_candidate_printing_rows} |`);
  lines.push(`| Blocked vault references | ${report.summary.blocked_vault_items_referencing_targets} |`);
  lines.push('');
  lines.push('## Safe Packages');
  lines.push('');
  lines.push('| Set | Name | Cards | Printings | Vault refs | Status |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const pkg of report.safe_packages) {
    lines.push(`| ${mdEscape(pkg.set_key)} | ${mdEscape(pkg.set_name)} | ${pkg.candidate_card_prints} | ${pkg.candidate_printing_rows} | ${pkg.vault_items_referencing_targets} | ${pkg.status} |`);
  }
  lines.push('');
  lines.push('## Vault-Blocked Packages');
  lines.push('');
  lines.push('| Set | Name | Cards | Printings | Vault refs | Status |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const pkg of report.blocked_packages) {
    lines.push(`| ${mdEscape(pkg.set_key)} | ${mdEscape(pkg.set_name)} | ${pkg.candidate_card_prints} | ${pkg.candidate_printing_rows} | ${pkg.vault_items_referencing_targets} | ${pkg.status} |`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('None.');
  else for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# Recovery Vault-Safe Subset Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| split_status | ${report.split_status} |
| total_packages | ${report.summary.total_packages} |
| safe_packages | ${report.summary.safe_packages} |
| safe_candidate_card_prints | ${report.summary.safe_candidate_card_prints} |
| safe_candidate_printing_rows | ${report.summary.safe_candidate_printing_rows} |
| blocked_packages | ${report.summary.blocked_packages} |
| blocked_candidate_card_prints | ${report.summary.blocked_candidate_card_prints} |
| blocked_candidate_printing_rows | ${report.summary.blocked_candidate_printing_rows} |
| blocked_vault_items_referencing_targets | ${report.summary.blocked_vault_items_referencing_targets} |
| write_ready_now | ${report.write_ready_now} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- No apply package is authorized by this split.
- Vault-blocked packages remain blocked until ownership impact is reviewed.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_recovery_vault_safe_subset_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_recovery_vault_safe_subset_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [Recovery Vault-Safe Subset Checkpoint V1](20260609_recovery_vault_safe_subset_checkpoint_v1.md) | Splits refreshed post-FUT2020 physical-recovery packages into 15 no-vault-reference packages and 3 vault-blocked packages; no writes or migrations. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_recovery_vault_safe_subset_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_recovery_vault_safe_subset_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const reviewGate = readJson(REVIEW_GATE_JSON);
const applyDesign = readJson(APPLY_DESIGN_JSON);
const writeReadiness = readJson(WRITE_READINESS_JSON);
const packages = (reviewGate.packages ?? []).map(packageRow);
const safePackages = packages.filter((pkg) => pkg.vault_items_referencing_targets === 0);
const blockedPackages = packages.filter((pkg) => pkg.vault_items_referencing_targets > 0);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_recovery_vault_safe_subset_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  split_status: 'vault_safe_subset_prepared_no_write',
  review_gate_status: reviewGate.review_gate_status,
  apply_design_status: applyDesign.apply_design_status,
  write_ready_now: writeReadiness.summary?.write_ready_now ?? null,
  source_artifacts: {
    review_gate: path.relative(ROOT, REVIEW_GATE_JSON).replaceAll('\\', '/'),
    apply_design: path.relative(ROOT, APPLY_DESIGN_JSON).replaceAll('\\', '/'),
    write_readiness: path.relative(ROOT, WRITE_READINESS_JSON).replaceAll('\\', '/'),
  },
  summary: {
    total_packages: packages.length,
    total_candidate_card_prints: sum(packages, 'candidate_card_prints'),
    total_candidate_printing_rows: sum(packages, 'candidate_printing_rows'),
    safe_packages: safePackages.length,
    safe_candidate_card_prints: sum(safePackages, 'candidate_card_prints'),
    safe_candidate_printing_rows: sum(safePackages, 'candidate_printing_rows'),
    safe_vault_items_referencing_targets: sum(safePackages, 'vault_items_referencing_targets'),
    blocked_packages: blockedPackages.length,
    blocked_candidate_card_prints: sum(blockedPackages, 'candidate_card_prints'),
    blocked_candidate_printing_rows: sum(blockedPackages, 'candidate_printing_rows'),
    blocked_vault_items_referencing_targets: sum(blockedPackages, 'vault_items_referencing_targets'),
  },
  safe_packages: safePackages,
  blocked_packages: blockedPackages,
  stop_findings: [],
  pass: false,
};

report.stop_findings = validate(report);
report.pass = report.stop_findings.length === 0;

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
  split_status: report.split_status,
  safe_packages: report.summary.safe_packages,
  safe_candidate_card_prints: report.summary.safe_candidate_card_prints,
  safe_candidate_printing_rows: report.summary.safe_candidate_printing_rows,
  blocked_packages: report.summary.blocked_packages,
  blocked_candidate_card_prints: report.summary.blocked_candidate_card_prints,
  blocked_candidate_printing_rows: report.summary.blocked_candidate_printing_rows,
  blocked_vault_items_referencing_targets: report.summary.blocked_vault_items_referencing_targets,
  write_ready_now: report.write_ready_now,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
