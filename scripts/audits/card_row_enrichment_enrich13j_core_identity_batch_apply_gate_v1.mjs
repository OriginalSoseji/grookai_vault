import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13j_core_identity_batch_apply_gate_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13j_core_identity_batch_apply_gate_v1.md');

const READY_PACKAGES = [
  {
    key: 'ENRICH-13D1',
    label: 'XYP duplicate dependency transfer',
    report_path: path.join(OUTPUT_DIR, 'enrich13d1_xyp_duplicate_dependency_transfer_guarded_dry_run_v1.json'),
    apply_order: 1,
  },
  {
    key: 'ENRICH-13E1',
    label: 'Name/alias duplicate transfer',
    report_path: path.join(OUTPUT_DIR, 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1.json'),
    apply_order: 2,
  },
  {
    key: 'ENRICH-13C1',
    label: 'Radiant Collection duplicate transfer',
    report_path: path.join(OUTPUT_DIR, 'enrich13c1_radiant_collection_duplicate_transfer_guarded_dry_run_v1.json'),
    apply_order: 3,
  },
  {
    key: 'ENRICH-13F1',
    label: 'Suffix duplicate transfer',
    report_path: path.join(OUTPUT_DIR, 'enrich13f1_suffix_duplicate_transfer_guarded_dry_run_v1.json'),
    apply_order: 4,
  },
  {
    key: 'ENRICH-13G1',
    label: 'Celebrations subset alias transfer',
    report_path: path.join(OUTPUT_DIR, 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1.json'),
    apply_order: 5,
  },
];

const BLOCKED_REPORTS = [
  {
    key: 'ENRICH-13B1',
    label: 'Pocket/non-physical domain exclusion',
    report_path: path.join(OUTPUT_DIR, 'enrich13b_pocket_domain_exclusion_plan_v1.json'),
  },
  {
    key: 'ENRICH-13E-MANUAL-LUXRAY',
    label: 'Luxray GL versus Luxray GL LV.X manual review',
    report_path: path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.json'),
  },
  {
    key: 'ENRICH-13F-BASE-VS-SUFFIX',
    label: 'Base-number versus suffix owner split proof required',
    report_path: path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.json'),
  },
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function targetRows(report) {
  return firstDefined(
    report.package_scope?.target_rows,
    report.package_scope?.duplicate_target_rows,
    0,
  );
}

function childRows(report) {
  return firstDefined(
    report.package_scope?.duplicate_child_printings,
    report.package_scope?.alias_child_printings,
    0,
  );
}

function externalMappings(report) {
  return firstDefined(
    report.package_scope?.duplicate_external_mappings,
    report.package_scope?.alias_external_mappings,
    0,
  );
}

function beforeHash(report) {
  return report.execution_result?.before_snapshot?.hash_sha256 ?? null;
}

function afterHash(report) {
  return report.execution_result?.after_snapshot?.hash_sha256 ?? null;
}

function blockedRows(key, report) {
  if (key === 'ENRICH-13B1') return report.summary?.target_rows ?? 0;
  if (key === 'ENRICH-13E-MANUAL-LUXRAY') return report.summary?.manual_blocked_rows ?? 0;
  if (key === 'ENRICH-13F-BASE-VS-SUFFIX') return report.summary?.base_number_suffix_collision_rows ?? 0;
  return 0;
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

const readyPackages = await Promise.all(READY_PACKAGES.map(async (pkg) => {
  const report = await readJson(pkg.report_path);
  return {
    key: pkg.key,
    label: pkg.label,
    apply_order: pkg.apply_order,
    report_path: pkg.report_path,
    package_id: report.package_id,
    pass: report.pass === true,
    dry_run_execution_status: report.dry_run_execution_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_path: report.sql_artifact?.path ?? null,
    sql_hash: report.sql_artifact?.sha256 ?? null,
    contains_commit_statement: report.sql_artifact?.contains_commit_statement ?? null,
    contains_rollback_statement: report.sql_artifact?.contains_rollback_statement ?? null,
    target_rows: targetRows(report),
    child_printings_handled: childRows(report),
    external_mappings_handled: externalMappings(report),
    before_hash: beforeHash(report),
    after_hash: afterHash(report),
    dry_run_proof_match: beforeHash(report) !== null && beforeHash(report) === afterHash(report),
    durable_after_matches_before: report.durable_after_snapshot_matches_before_snapshot === true,
    stop_findings: report.stop_findings ?? [],
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    image_writes_performed: report.image_writes_performed,
  };
}));

const blockedLanes = await Promise.all(BLOCKED_REPORTS.map(async (pkg) => {
  const report = await readJson(pkg.report_path);
  return {
    key: pkg.key,
    label: pkg.label,
    report_path: pkg.report_path,
    rows: blockedRows(pkg.key, report),
    status: pkg.key === 'ENRICH-13B1'
      ? 'blocked_domain_contract_required'
      : pkg.key === 'ENRICH-13E-MANUAL-LUXRAY'
        ? 'blocked_manual_review'
        : 'blocked_split_owner_proof_required',
  };
}));

const unsafePackages = readyPackages.filter((pkg) => (
  !pkg.pass
  || !pkg.dry_run_proof_match
  || !pkg.durable_after_matches_before
  || pkg.stop_findings.length > 0
  || pkg.db_writes_performed !== false
  || pkg.migrations_created !== false
  || pkg.cleanup_performed !== false
  || pkg.image_writes_performed !== false
  || pkg.contains_commit_statement !== false
  || pkg.contains_rollback_statement !== true
));

const batchCore = {
  version: 'ENRICH_13J_CORE_IDENTITY_BATCH_APPLY_GATE_V1',
  mode: 'read_only_batch_apply_gate',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  image_writes_performed: false,
  real_apply_authorized_by_this_report: false,
  ready_packages: readyPackages.sort((a, b) => a.apply_order - b.apply_order),
  blocked_lanes: blockedLanes,
  summary: {
    packages_in_batch: readyPackages.length,
    unsafe_package_count: unsafePackages.length,
    ready_for_single_batch_approval: unsafePackages.length === 0,
    parent_rows_in_batch: readyPackages.reduce((sum, pkg) => sum + Number(pkg.target_rows ?? 0), 0),
    child_printings_handled_in_batch: readyPackages.reduce((sum, pkg) => sum + Number(pkg.child_printings_handled ?? 0), 0),
    external_mappings_handled_in_batch: readyPackages.reduce((sum, pkg) => sum + Number(pkg.external_mappings_handled ?? 0), 0),
    blocked_rows_excluded: blockedLanes.reduce((sum, lane) => sum + Number(lane.rows ?? 0), 0),
  },
  guardrails: [
    'This is a batch approval gate only; it does not execute SQL.',
    'The batch is composed only from already-proven rollback dry-run packages.',
    'Each package SQL artifact must retain ROLLBACK and no COMMIT until a separate real-apply script is intentionally generated.',
    'Pocket/non-physical rows remain excluded.',
    'Luxray GL versus Luxray GL LV.X remains excluded.',
    'Base-number versus suffix-owner rows remain excluded.',
    'No migrations, image writes, global apply, cleanup, or unrelated enrichment are included.',
  ],
  stop_findings: unsafePackages.map((pkg) => `unsafe_or_unproven_package:${pkg.key}`),
};

const batchFingerprint = sha256(stableJson({
  version: batchCore.version,
  package_order: batchCore.ready_packages.map((pkg) => ({
    key: pkg.key,
    package_fingerprint_sha256: pkg.package_fingerprint_sha256,
    sql_hash: pkg.sql_hash,
    before_hash: pkg.before_hash,
    after_hash: pkg.after_hash,
  })),
  blocked_lanes: batchCore.blocked_lanes,
  summary: batchCore.summary,
}));

const batchApprovalText = `Approve real ENRICH-13J-CORE-IDENTITY-BATCH apply only. Batch fingerprint: ${batchFingerprint}. Scope: ${batchCore.summary.parent_rows_in_batch} parent dependency/identity rows across ${batchCore.summary.packages_in_batch} proven packages, ${batchCore.summary.child_printings_handled_in_batch} child printings handled, ${batchCore.summary.external_mappings_handled_in_batch} external mappings handled. Package fingerprints: ${batchCore.ready_packages.map((pkg) => `${pkg.key}=${pkg.package_fingerprint_sha256}`).join(', ')}. SQL hashes: ${batchCore.ready_packages.map((pkg) => `${pkg.key}=${pkg.sql_hash}`).join(', ')}. Blocked rows excluded: ${batchCore.summary.blocked_rows_excluded}. No global apply. No migrations. No image writes. No cleanup outside the listed package scopes.`;

const report = {
  ...batchCore,
  generated_at: new Date().toISOString(),
  batch_fingerprint_sha256: batchFingerprint,
  required_real_apply_approval_text_if_later_authorized: batchCore.summary.ready_for_single_batch_approval ? batchApprovalText : null,
};

const md = `# ENRICH-13J Core Identity Batch Apply Gate V1

Generated: ${report.generated_at}

Mode: read-only batch apply gate.

This report reduces the five proven ENRICH-13 packages into one batch approval unit. It does not execute SQL and does not authorize a real apply.

## Summary

- Packages in batch: ${report.summary.packages_in_batch}
- Unsafe package count: ${report.summary.unsafe_package_count}
- Ready for single batch approval: ${report.summary.ready_for_single_batch_approval}
- Parent rows in batch: ${report.summary.parent_rows_in_batch}
- Child printings handled in batch: ${report.summary.child_printings_handled_in_batch}
- External mappings handled in batch: ${report.summary.external_mappings_handled_in_batch}
- Blocked rows excluded: ${report.summary.blocked_rows_excluded}
- Batch fingerprint: \`${report.batch_fingerprint_sha256}\`
- Real apply authorized by this report: ${report.real_apply_authorized_by_this_report}

## Batch Packages

${table(report.ready_packages, [
  { label: 'Order', value: (row) => row.apply_order },
  { label: 'Package', value: (row) => row.key },
  { label: 'Rows', value: (row) => row.target_rows },
  { label: 'Children', value: (row) => row.child_printings_handled },
  { label: 'Mappings', value: (row) => row.external_mappings_handled },
  { label: 'Package fingerprint', value: (row) => row.package_fingerprint_sha256 },
  { label: 'SQL hash', value: (row) => row.sql_hash },
])}

## Excluded Blockers

${table(report.blocked_lanes, [
  { label: 'Blocker', value: (row) => row.key },
  { label: 'Rows', value: (row) => row.rows },
  { label: 'Status', value: (row) => row.status },
])}

## Guardrails

${report.guardrails.map((rule) => `- ${rule}`).join('\n')}

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${finding}`).join('\n')}

## Single Batch Approval Text

Use only after intentionally deciding to perform a real apply:

\`\`\`text
${report.required_real_apply_approval_text_if_later_authorized ?? 'Not available because one or more package gates failed.'}
\`\`\`
`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  batch_fingerprint_sha256: report.batch_fingerprint_sha256,
  ready_for_single_batch_approval: report.summary.ready_for_single_batch_approval,
  parent_rows_in_batch: report.summary.parent_rows_in_batch,
  child_printings_handled_in_batch: report.summary.child_printings_handled_in_batch,
  external_mappings_handled_in_batch: report.summary.external_mappings_handled_in_batch,
  blocked_rows_excluded: report.summary.blocked_rows_excluded,
  stop_findings: report.stop_findings,
}, null, 2));
