import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUTS = {
  pocket: path.join(OUTPUT_DIR, 'enrich13b_pocket_domain_exclusion_plan_v1.json'),
  radiantCollection: path.join(OUTPUT_DIR, 'enrich13c_radiant_collection_prefix_governance_v1.json'),
  xyPromoDuplicates: path.join(OUTPUT_DIR, 'enrich13d_promo_prefix_duplicate_adjudication_v1.json'),
  nameAliasCollisions: path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.json'),
  suffixVariants: path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.json'),
  celebrationsAliases: path.join(OUTPUT_DIR, 'enrich13g_celebrations_subset_alias_governance_v1.json'),
};

const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13h_core_identity_governance_consolidated_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13h_core_identity_governance_consolidated_plan_v1.md');

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

function asNumber(value) {
  return Number(value ?? 0);
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

const reports = Object.fromEntries(await Promise.all(
  Object.entries(INPUTS).map(async ([key, filePath]) => [key, await readJson(filePath)]),
));

const buckets = [
  {
    bucket_id: 'ENRICH-13B',
    name: 'Pocket / non-physical domain exclusion',
    source_report: INPUTS.pocket,
    rows: asNumber(reports.pocket.summary?.target_rows),
    category: 'contract_blocked',
    recommended_status: 'blocked_contract_required',
    proposed_future_package: reports.pocket.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Create a dedicated Pocket/non-physical domain contract before any dry-run.',
    write_ready_now: false,
    reason: reports.pocket.governance_decision?.reason ?? null,
  },
  {
    bucket_id: 'ENRICH-13C',
    name: 'Radiant Collection RC prefix identity',
    source_report: INPUTS.radiantCollection,
    rows: asNumber(reports.radiantCollection.summary?.target_rows),
    category: 'modifier_identity_dry_run_candidate',
    recommended_status: 'dry_run_required',
    proposed_future_package: reports.radiantCollection.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Prepare modifier-aware rollback-only dry-run for number_prefix:RC parent identity.',
    write_ready_now: false,
    reason: reports.radiantCollection.collision_explanation?.required_identity_law ?? null,
  },
  {
    bucket_id: 'ENRICH-13D',
    name: 'XY promo duplicate parent adjudication',
    source_report: INPUTS.xyPromoDuplicates,
    rows: asNumber(reports.xyPromoDuplicates.summary?.target_rows),
    category: 'duplicate_dependency_transfer_dry_run_candidate',
    recommended_status: 'dry_run_required',
    proposed_future_package: reports.xyPromoDuplicates.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Prepare dependency-transfer dry-run for deterministic duplicate XY promo parents.',
    write_ready_now: false,
    reason: reports.xyPromoDuplicates.governance_decision?.reason ?? null,
  },
  {
    bucket_id: 'ENRICH-13E',
    name: 'Name / alias collision governance',
    source_report: INPUTS.nameAliasCollisions,
    rows: asNumber(reports.nameAliasCollisions.summary?.target_rows),
    category: 'mixed_duplicate_and_manual_review',
    recommended_status: 'split_dry_run_from_manual_review',
    proposed_future_package: reports.nameAliasCollisions.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Prepare dry-run for deterministic aliases only; keep Luxray GL vs Luxray GL LV.X blocked.',
    write_ready_now: false,
    deterministic_rows: asNumber(reports.nameAliasCollisions.summary?.deterministic_alias_rows),
    blocked_rows: asNumber(reports.nameAliasCollisions.summary?.manual_blocked_rows),
    reason: reports.nameAliasCollisions.governance_decision?.reason ?? null,
  },
  {
    bucket_id: 'ENRICH-13F',
    name: 'Suffix variant collision governance',
    source_report: INPUTS.suffixVariants,
    rows: asNumber(reports.suffixVariants.summary?.target_rows),
    category: 'suffix_identity_dry_run_candidate',
    recommended_status: 'dry_run_required_with_split_lanes',
    proposed_future_package: reports.suffixVariants.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Prepare suffix-aware dry-run that separates duplicate suffix transfers from base-vs-suffix split proof.',
    write_ready_now: false,
    duplicate_suffix_rows: asNumber(reports.suffixVariants.summary?.duplicate_suffix_dependency_transfer_candidates),
    base_suffix_collision_rows: asNumber(reports.suffixVariants.summary?.base_number_suffix_collision_rows),
    reason: reports.suffixVariants.governance_decision?.reason ?? null,
  },
  {
    bucket_id: 'ENRICH-13G',
    name: 'Celebrations Classic Collection subset alias governance',
    source_report: INPUTS.celebrationsAliases,
    rows: asNumber(reports.celebrationsAliases.summary?.target_rows),
    category: 'subset_alias_dry_run_candidate',
    recommended_status: 'dry_run_required',
    proposed_future_package: reports.celebrationsAliases.proposed_future_package_shape?.package_id ?? null,
    next_action: 'Prepare subset-aware dry-run; do not backfill cel25 15A# aliases as host-set identities.',
    write_ready_now: false,
    reason: reports.celebrationsAliases.governance_decision?.reason ?? null,
  },
];

const dryRunCandidateRows = asNumber(reports.radiantCollection.summary?.target_rows)
  + asNumber(reports.xyPromoDuplicates.summary?.target_rows)
  + asNumber(reports.nameAliasCollisions.summary?.deterministic_alias_rows)
  + asNumber(reports.suffixVariants.summary?.target_rows)
  + asNumber(reports.celebrationsAliases.summary?.target_rows);

const blockedRows = asNumber(reports.pocket.summary?.target_rows)
  + asNumber(reports.nameAliasCollisions.summary?.manual_blocked_rows);

const recommendedSequence = [
  {
    order: 1,
    package_id: 'ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER-DRY-RUN',
    rows: asNumber(reports.xyPromoDuplicates.summary?.target_rows),
    mode: 'rollback_only_dry_run',
    why_first: 'Deterministic duplicate parent adjudication with suffix rows already excluded.',
    approval_required_before_execution: true,
  },
  {
    order: 2,
    package_id: 'ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN',
    rows: asNumber(reports.nameAliasCollisions.summary?.deterministic_alias_rows),
    mode: 'rollback_only_dry_run',
    why_first: 'Alias duplicate rows are separated from the one manual identity conflict.',
    approval_required_before_execution: true,
  },
  {
    order: 3,
    package_id: 'ENRICH-13C1-RADIANT-COLLECTION-PREFIX-IDENTITY-DRY-RUN',
    rows: asNumber(reports.radiantCollection.summary?.target_rows),
    mode: 'rollback_only_dry_run',
    why_first: 'RC prefix is a deterministic identity modifier, but needs modifier-aware uniqueness proof.',
    approval_required_before_execution: true,
  },
  {
    order: 4,
    package_id: 'ENRICH-13F1-SUFFIX-VARIANT-SPLIT-AND-DUPLICATE-DRY-RUN',
    rows: asNumber(reports.suffixVariants.summary?.target_rows),
    mode: 'rollback_only_dry_run',
    why_first: 'Suffix rows are identity-bearing and require split-lane proof.',
    approval_required_before_execution: true,
  },
  {
    order: 5,
    package_id: 'ENRICH-13G1-CELEBRATIONS-CLASSIC-COLLECTION-SUBSET-ALIAS-DRY-RUN',
    rows: asNumber(reports.celebrationsAliases.summary?.target_rows),
    mode: 'rollback_only_dry_run',
    why_first: 'Subset aliases must resolve to cel25c owners or suppression before any write.',
    approval_required_before_execution: true,
  },
  {
    order: 6,
    package_id: 'ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION-READINESS',
    rows: asNumber(reports.pocket.summary?.target_rows),
    mode: 'contract_first_readiness',
    why_first: 'Pocket rows are non-physical domain governance, not English physical enrichment.',
    approval_required_before_execution: true,
  },
];

const reportCore = {
  version: 'ENRICH_13H_CORE_IDENTITY_GOVERNANCE_CONSOLIDATED_PLAN_V1',
  mode: 'read_only_consolidated_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  image_writes_performed: false,
  source_reports: INPUTS,
  summary: {
    total_governed_rows: buckets.reduce((sum, bucket) => sum + bucket.rows, 0),
    dry_run_candidate_rows: dryRunCandidateRows,
    blocked_or_contract_required_rows: blockedRows,
    immediate_write_ready_rows: 0,
    deterministic_duplicate_transfer_rows: asNumber(reports.xyPromoDuplicates.summary?.target_rows)
      + asNumber(reports.nameAliasCollisions.summary?.deterministic_alias_rows),
    modifier_or_subset_identity_rows: asNumber(reports.radiantCollection.summary?.target_rows)
      + asNumber(reports.suffixVariants.summary?.target_rows)
      + asNumber(reports.celebrationsAliases.summary?.target_rows),
    pocket_domain_rows: asNumber(reports.pocket.summary?.target_rows),
    manual_review_rows: asNumber(reports.nameAliasCollisions.summary?.manual_blocked_rows),
    write_ready_now: false,
  },
  consolidation_law: {
    decision: 'core_identity_blockers_are_governed_but_not_immediate_write_ready',
    reason: 'ENRICH-13B through ENRICH-13G convert the 332 core identity blockers into deterministic lanes, but each lane still requires either a dedicated contract or a rollback-only package dry-run before any real apply.',
    hard_rules: [
      'Pocket rows are not English physical enrichment rows until a domain contract exists.',
      'RC prefixes and suffix letters are identity-bearing when source-backed.',
      'Generic name normalization cannot merge materially distinct identities.',
      'Celebrations Classic Collection aliases are subset-governed and must not become host cel25 public identities.',
      'No bucket is authorized for real apply by this report.',
    ],
  },
  buckets,
  recommended_sequence: recommendedSequence,
  safety_confirmation: {
    imports_database_client: false,
    imports_apply_runner: false,
    writes_sql: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  },
};

const fingerprint = sha256(stableJson(reportCore));
const report = {
  ...reportCore,
  generated_at: new Date().toISOString(),
  fingerprint,
};

const md = `# ENRICH-13H Core Identity Governance Consolidated Plan V1

Generated: ${report.generated_at}

Mode: read-only consolidated governance plan.

This report consolidates ENRICH-13B through ENRICH-13G. It does not authorize a real apply. It creates the operational map for future guarded dry-runs.

## Summary

- Total governed rows: ${report.summary.total_governed_rows}
- Dry-run candidate rows: ${report.summary.dry_run_candidate_rows}
- Blocked or contract-required rows: ${report.summary.blocked_or_contract_required_rows}
- Immediate write-ready rows: ${report.summary.immediate_write_ready_rows}
- Pocket domain rows: ${report.summary.pocket_domain_rows}
- Manual review rows: ${report.summary.manual_review_rows}
- Fingerprint: \`${report.fingerprint}\`

## Safety Confirmation

- DB writes performed: \`${report.db_writes_performed}\`
- Migrations created: \`${report.migrations_created}\`
- Cleanup performed: \`${report.cleanup_performed}\`
- Image writes performed: \`${report.image_writes_performed}\`
- Imports database client: \`${report.safety_confirmation.imports_database_client}\`
- Imports apply runner: \`${report.safety_confirmation.imports_apply_runner}\`

## Consolidated Buckets

${table(report.buckets, [
  { label: 'Bucket', value: (row) => row.bucket_id },
  { label: 'Rows', value: (row) => row.rows },
  { label: 'Category', value: (row) => row.category },
  { label: 'Status', value: (row) => row.recommended_status },
  { label: 'Future package', value: (row) => row.proposed_future_package },
])}

## Recommended Sequence

${table(report.recommended_sequence, [
  { label: 'Order', value: (row) => row.order },
  { label: 'Package', value: (row) => row.package_id },
  { label: 'Rows', value: (row) => row.rows },
  { label: 'Mode', value: (row) => row.mode },
  { label: 'Reason', value: (row) => row.why_first },
])}

## Governance Law

${report.consolidation_law.hard_rules.map((rule) => `- ${rule}`).join('\n')}

## Next Action

Prepare the first package in the sequence only if explicitly approved:

\`ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER-DRY-RUN\`

That next package should be rollback-only dry-run preparation and proof generation. No real apply is authorized by this report.
`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  fingerprint,
  total_governed_rows: report.summary.total_governed_rows,
  dry_run_candidate_rows: report.summary.dry_run_candidate_rows,
  blocked_or_contract_required_rows: report.summary.blocked_or_contract_required_rows,
  immediate_write_ready_rows: report.summary.immediate_write_ready_rows,
}, null, 2));
