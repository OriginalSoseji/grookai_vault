import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13i_core_identity_apply_readiness_checkpoint_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13i_core_identity_apply_readiness_checkpoint_v1.md');

const INPUTS = [
  {
    key: '13D1',
    label: 'XYP duplicate dependency transfer',
    path: path.join(OUTPUT_DIR, 'enrich13d1_xyp_duplicate_dependency_transfer_guarded_dry_run_v1.json'),
    recommended_apply_order: 1,
  },
  {
    key: '13E1',
    label: 'Name/alias duplicate transfer',
    path: path.join(OUTPUT_DIR, 'enrich13e1_name_alias_duplicate_transfer_guarded_dry_run_v1.json'),
    recommended_apply_order: 2,
  },
  {
    key: '13C1',
    label: 'Radiant Collection duplicate transfer',
    path: path.join(OUTPUT_DIR, 'enrich13c1_radiant_collection_duplicate_transfer_guarded_dry_run_v1.json'),
    recommended_apply_order: 3,
  },
  {
    key: '13F1',
    label: 'Suffix duplicate transfer',
    path: path.join(OUTPUT_DIR, 'enrich13f1_suffix_duplicate_transfer_guarded_dry_run_v1.json'),
    recommended_apply_order: 4,
  },
  {
    key: '13G1',
    label: 'Celebrations subset alias transfer',
    path: path.join(OUTPUT_DIR, 'enrich13g1_celebrations_subset_alias_transfer_guarded_dry_run_v1.json'),
    recommended_apply_order: 5,
  },
];

const BLOCKER_INPUTS = {
  h: path.join(OUTPUT_DIR, 'enrich13h_core_identity_governance_consolidated_plan_v1.json'),
  b: path.join(OUTPUT_DIR, 'enrich13b_pocket_domain_exclusion_plan_v1.json'),
  e: path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.json'),
  f: path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.json'),
};

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

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

function scopeRows(report) {
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

function mappings(report) {
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

function packageSummary(input, report) {
  return {
    key: input.key,
    label: input.label,
    source_report: input.path,
    package_id: report.package_id,
    recommended_apply_order: input.recommended_apply_order,
    pass: report.pass === true,
    dry_run_execution_status: report.dry_run_execution_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_path: report.sql_artifact?.path ?? null,
    sql_hash: report.sql_artifact?.sha256 ?? null,
    contains_commit_statement: report.sql_artifact?.contains_commit_statement ?? null,
    contains_rollback_statement: report.sql_artifact?.contains_rollback_statement ?? null,
    target_rows: scopeRows(report),
    child_printings_handled: childRows(report),
    external_mappings_handled: mappings(report),
    before_hash: beforeHash(report),
    after_hash: afterHash(report),
    dry_run_hashes_match: beforeHash(report) === afterHash(report),
    durable_after_matches_before: report.durable_after_snapshot_matches_before_snapshot === true,
    stop_findings: report.stop_findings ?? [],
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    image_writes_performed: report.image_writes_performed,
    required_real_apply_approval_text: report.required_real_apply_approval_text,
  };
}

const loaded = await Promise.all(INPUTS.map(async (input) => packageSummary(input, await readJson(input.path))));
const blockers = {
  h: await readJson(BLOCKER_INPUTS.h),
  b: await readJson(BLOCKER_INPUTS.b),
  e: await readJson(BLOCKER_INPUTS.e),
  f: await readJson(BLOCKER_INPUTS.f),
};

const failedPackages = loaded.filter((pkg) => !pkg.pass || !pkg.dry_run_hashes_match || !pkg.durable_after_matches_before || pkg.stop_findings.length);
const unsafePackages = loaded.filter((pkg) => pkg.db_writes_performed !== false || pkg.migrations_created !== false || pkg.cleanup_performed !== false || pkg.image_writes_performed !== false || pkg.contains_commit_statement !== false || pkg.contains_rollback_statement !== true);

const reportCore = {
  version: 'ENRICH_13I_CORE_IDENTITY_APPLY_READINESS_CHECKPOINT_V1',
  mode: 'read_only_apply_readiness_checkpoint',
  generated_from: {
    dry_run_reports: Object.fromEntries(INPUTS.map((input) => [input.key, input.path])),
    blocker_reports: BLOCKER_INPUTS,
  },
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  image_writes_performed: false,
  summary: {
    dry_run_proven_packages: loaded.length - failedPackages.length,
    failed_or_blocked_dry_run_packages: failedPackages.length,
    unsafe_package_artifacts: unsafePackages.length,
    real_apply_ready_package_count: failedPackages.length === 0 && unsafePackages.length === 0 ? loaded.length : 0,
    real_apply_ready_parent_rows: failedPackages.length === 0 && unsafePackages.length === 0 ? loaded.reduce((sum, pkg) => sum + Number(pkg.target_rows ?? 0), 0) : 0,
    child_printings_handled_in_ready_packages: loaded.reduce((sum, pkg) => sum + Number(pkg.child_printings_handled ?? 0), 0),
    external_mappings_handled_in_ready_packages: loaded.reduce((sum, pkg) => sum + Number(pkg.external_mappings_handled ?? 0), 0),
    blocked_pocket_domain_rows: blockers.b.summary?.target_rows ?? 0,
    blocked_manual_name_review_rows: blockers.e.summary?.manual_blocked_rows ?? 0,
    blocked_suffix_base_rows: blockers.f.summary?.base_number_suffix_collision_rows ?? 0,
    real_apply_authorized_by_this_report: false,
  },
  safety_law: {
    decision: 'dry_run_proven_but_not_authorized_for_real_apply',
    rules: [
      'This checkpoint does not execute SQL.',
      'This checkpoint does not authorize a real apply.',
      'Real apply must use exact package approval text and matching fingerprint/hash.',
      'Pocket/non-physical rows remain blocked until a domain contract exists.',
      'Base-number versus suffix rows remain blocked from suffix-owner merge.',
      'Luxray GL versus Luxray GL LV.X remains manual review only.',
    ],
  },
  recommended_real_apply_sequence_if_approved_later: loaded.sort((a, b) => a.recommended_apply_order - b.recommended_apply_order),
  blocked_lanes: [
    {
      blocker_id: 'ENRICH-13B1',
      reason: 'Pocket/non-physical domain contract required before any write planning.',
      rows: blockers.b.summary?.target_rows ?? 0,
      status: 'blocked_contract_required',
    },
    {
      blocker_id: 'ENRICH-13E-MANUAL-LUXRAY',
      reason: 'Luxray GL versus Luxray GL LV.X is materially different text and must not be auto-merged.',
      rows: blockers.e.summary?.manual_blocked_rows ?? 0,
      status: 'blocked_manual_review',
    },
    {
      blocker_id: 'ENRICH-13F-BASE-VS-SUFFIX',
      reason: 'Base-number rows must not be merged into suffix-number owners without separate split-owner proof.',
      rows: blockers.f.summary?.base_number_suffix_collision_rows ?? 0,
      status: 'blocked_split_owner_proof_required',
    },
  ],
  stop_findings: [
    ...failedPackages.map((pkg) => `dry_run_not_ready:${pkg.key}`),
    ...unsafePackages.map((pkg) => `unsafe_artifact:${pkg.key}`),
  ],
};

const report = {
  ...reportCore,
  generated_at: new Date().toISOString(),
  fingerprint_sha256: sha256(stableJson(reportCore)),
};

const md = `# ENRICH-13I Core Identity Apply Readiness Checkpoint V1

Generated: ${report.generated_at}

Mode: read-only apply readiness checkpoint.

This checkpoint consolidates the ENRICH-13 dry-run proofs. It does not execute SQL and does not authorize a real apply.

## Summary

- Dry-run proven packages: ${report.summary.dry_run_proven_packages}
- Real-apply-ready package count: ${report.summary.real_apply_ready_package_count}
- Ready parent rows if later approved: ${report.summary.real_apply_ready_parent_rows}
- Child printings handled by ready packages: ${report.summary.child_printings_handled_in_ready_packages}
- External mappings handled by ready packages: ${report.summary.external_mappings_handled_in_ready_packages}
- Blocked Pocket/domain rows: ${report.summary.blocked_pocket_domain_rows}
- Blocked manual name-review rows: ${report.summary.blocked_manual_name_review_rows}
- Blocked suffix base rows: ${report.summary.blocked_suffix_base_rows}
- Real apply authorized by this report: ${report.summary.real_apply_authorized_by_this_report}
- Fingerprint: \`${report.fingerprint_sha256}\`

## Ready Packages

${table(report.recommended_real_apply_sequence_if_approved_later, [
  { label: 'Order', value: (row) => row.recommended_apply_order },
  { label: 'Package', value: (row) => row.key },
  { label: 'Rows', value: (row) => row.target_rows },
  { label: 'Children', value: (row) => row.child_printings_handled },
  { label: 'SQL hash', value: (row) => row.sql_hash },
  { label: 'Proof', value: (row) => row.before_hash && row.after_hash ? `${row.before_hash.slice(0, 12)} == ${row.after_hash.slice(0, 12)}` : '' },
])}

## Blocked Lanes

${table(report.blocked_lanes, [
  { label: 'Blocker', value: (row) => row.blocker_id },
  { label: 'Rows', value: (row) => row.rows },
  { label: 'Status', value: (row) => row.status },
  { label: 'Reason', value: (row) => row.reason },
])}

## Safety Law

${report.safety_law.rules.map((rule) => `- ${rule}`).join('\n')}

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${finding}`).join('\n')}

## Approval Texts

Real apply is not authorized here. If applying later, use the exact approval text from each individual dry-run report:

${report.recommended_real_apply_sequence_if_approved_later.map((pkg) => `### ${pkg.key}\n\n\`\`\`text\n${pkg.required_real_apply_approval_text}\n\`\`\``).join('\n\n')}
`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  fingerprint_sha256: report.fingerprint_sha256,
  dry_run_proven_packages: report.summary.dry_run_proven_packages,
  real_apply_ready_parent_rows: report.summary.real_apply_ready_parent_rows,
  blocked_pocket_domain_rows: report.summary.blocked_pocket_domain_rows,
  blocked_manual_name_review_rows: report.summary.blocked_manual_name_review_rows,
  blocked_suffix_base_rows: report.summary.blocked_suffix_base_rows,
  stop_findings: report.stop_findings,
}, null, 2));
