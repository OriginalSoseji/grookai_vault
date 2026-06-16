import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.md');

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

function ownerSample(row) {
  return row.collision_owner_samples?.[0] ?? null;
}

function suffixPart(number) {
  return String(number ?? '').match(/([a-z])$/i)?.[1]?.toLowerCase() ?? null;
}

function basePart(number) {
  return String(number ?? '').replace(/[a-z]$/i, '');
}

function isSuffixRelatedCollision(row) {
  if (row.classification !== 'blocked_proposed_identity_collision') return false;
  const owner = ownerSample(row);
  return Boolean(suffixPart(row.proposed_number) || suffixPart(owner?.number));
}

function lane(row) {
  const owner = ownerSample(row);
  const proposedSuffix = suffixPart(row.proposed_number);
  const ownerSuffix = suffixPart(owner?.number);
  const proposedNumber = String(row.proposed_number ?? '');
  const ownerNumber = String(owner?.number ?? '');

  if (proposedSuffix && proposedNumber.toLowerCase() === ownerNumber.toLowerCase()) {
    return 'duplicate_suffix_parent_dependency_transfer_candidate';
  }
  if (!proposedSuffix && ownerSuffix && basePart(proposedNumber).toLowerCase() === basePart(ownerNumber).toLowerCase()) {
    return 'base_number_collides_with_suffix_parent_requires_split_governance';
  }
  return 'manual_suffix_collision_review_required';
}

function rowSummary(row) {
  const owner = ownerSample(row);
  const proposedSuffix = suffixPart(row.proposed_number);
  const ownerSuffix = suffixPart(owner?.number);
  return {
    lane: lane(row),
    source_card_print_id: row.card_print_id,
    existing_owner_card_print_id: owner?.owner_card_print_id ?? null,
    set_code: row.sets_code,
    set_name: row.set_name,
    proposed_number: row.proposed_number,
    proposed_base_number: basePart(row.proposed_number),
    proposed_suffix: proposedSuffix,
    source_name: row.card_name,
    source_external_id: row.external_ids?.tcgdex ?? null,
    owner_number: owner?.number ?? null,
    owner_base_number: basePart(owner?.number),
    owner_suffix: ownerSuffix,
    owner_name: owner?.name ?? null,
    owner_gv_id: owner?.gv_id ?? null,
    source_dependencies: {
      child_count: row.dependency_counts?.child_count ?? 0,
      active_identity_count: row.dependency_counts?.active_identity_count ?? 0,
      active_mapping_count: row.dependency_counts?.active_mapping_count ?? 0,
      trait_count: row.dependency_counts?.trait_count ?? 0,
      species_count: row.dependency_counts?.species_count ?? 0,
      vault_instance_count: row.dependency_counts?.vault_instance_count ?? 0,
    },
    owner_dependencies: {
      child_count: owner?.owner_child_count ?? 0,
      active_identity_count: owner?.owner_active_identity_count ?? 0,
      active_mapping_count: owner?.owner_active_mapping_count ?? 0,
    },
    proposed_modifier_strategy: proposedSuffix
      ? `number_suffix:${proposedSuffix}`
      : ownerSuffix
        ? `base_number_preserved_separate_from_number_suffix:${ownerSuffix}`
        : 'manual_review',
  };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

const readiness = await readJson(READINESS_JSON);
const rows = (readiness.rows ?? [])
  .filter(isSuffixRelatedCollision)
  .map(rowSummary)
  .sort((a, b) => {
    const laneCompare = a.lane.localeCompare(b.lane);
    if (laneCompare !== 0) return laneCompare;
    const setCompare = a.set_code.localeCompare(b.set_code);
    if (setCompare !== 0) return setCompare;
    return a.proposed_base_number.localeCompare(b.proposed_base_number, undefined, { numeric: true })
      || String(a.proposed_suffix ?? '').localeCompare(String(b.proposed_suffix ?? ''))
      || a.source_name.localeCompare(b.source_name);
  });

const duplicateSuffixRows = rows.filter((row) => row.lane === 'duplicate_suffix_parent_dependency_transfer_candidate');
const baseCollisionRows = rows.filter((row) => row.lane === 'base_number_collides_with_suffix_parent_requires_split_governance');
const manualRows = rows.filter((row) => row.lane === 'manual_suffix_collision_review_required');

const dependencyTotals = rows.reduce((totals, row) => {
  const bucket = totals[row.lane] ??= { source: {}, owner: {} };
  for (const [key, value] of Object.entries(row.source_dependencies)) {
    bucket.source[key] = (bucket.source[key] ?? 0) + Number(value ?? 0);
  }
  for (const [key, value] of Object.entries(row.owner_dependencies)) {
    bucket.owner[key] = (bucket.owner[key] ?? 0) + Number(value ?? 0);
  }
  return totals;
}, {});

const report = {
  version: 'ENRICH_13F_SUFFIX_VARIANT_COLLISION_GOVERNANCE_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  precedent: {
    checkpoint: 'docs/checkpoints/master_index/20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md',
    rule: 'Existing base parents were preserved while suffix parents were introduced separately.',
  },
  summary: {
    target_rows: rows.length,
    duplicate_suffix_dependency_transfer_candidates: duplicateSuffixRows.length,
    base_number_suffix_collision_rows: baseCollisionRows.length,
    manual_review_rows: manualRows.length,
    lane_counts: countBy(rows, (row) => row.lane),
    set_counts: countBy(rows, (row) => row.set_code),
    write_ready_now: false,
    recommended_strategy: 'split_suffix_parent_governance_from_duplicate_suffix_dependency_transfer',
  },
  dependency_totals: dependencyTotals,
  governance_decision: {
    decision: 'suffix_letter_is_identity_bearing_when_source_backed',
    reason: 'A printed number suffix such as 65a or XY150a is not a decorative spelling difference. Base-number rows and suffix-number rows must not be merged unless a later source audit proves one side is invalid.',
    deterministic_lanes: [
      'duplicate suffix rows can become dependency-transfer candidates only when proposed number equals existing suffix owner number',
      'base-number rows colliding with suffix owners require split governance and source proof before write planning',
    ],
    forbidden: [
      'do not merge base rows into suffix owners',
      'do not delete suffix owners while base rows exist',
      'do not overwrite suffix owner parent identity',
      'do not mint or backfill GV IDs until suffix identity uniqueness is proven',
      'do not include these rows in 13D or 13E duplicate-transfer packages',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13F1-SUFFIX-VARIANT-SPLIT-AND-DUPLICATE-DRY-RUN',
    current_status: 'not_write_ready_dry_run_required',
    expected_scope_if_later_approved: [
      `${duplicateSuffixRows.length} duplicate suffix dependency-transfer simulations`,
      `${baseCollisionRows.length} base-versus-suffix split governance simulations`,
      'modifier-aware active identity uniqueness proof',
      'external mapping ownership proof',
      'child printing dedupe proof by parent and finish',
    ],
    excluded_from_scope: [
      'real apply',
      'global apply',
      'migrations',
      'image writes',
      'unsupported cleanup without separate proof',
      'base-to-suffix merge',
    ],
    required_before_real_apply: [
      'fresh dependency snapshot',
      'source proof that base and suffix are distinct or one side is invalid',
      'guarded rollback-only dry-run',
      'rollback artifact',
      'post-dry-run identity uniqueness proof',
    ],
  },
  duplicate_suffix_rows: duplicateSuffixRows,
  base_number_suffix_collision_rows: baseCollisionRows,
  manual_review_rows: manualRows,
};

report.fingerprint_sha256 = sha256(stableJson({
  precedent: report.precedent,
  summary: report.summary,
  dependency_totals: report.dependency_totals,
  governance_decision: report.governance_decision,
  proposed_future_package_shape: report.proposed_future_package_shape,
  duplicate_suffix_rows: report.duplicate_suffix_rows,
  base_number_suffix_collision_rows: report.base_number_suffix_collision_rows,
  manual_review_rows: report.manual_review_rows,
}));

await writeJson(OUTPUT_JSON, report);

const dependencyRows = Object.entries(dependencyTotals).flatMap(([laneName, groups]) => [
  ...Object.entries(groups.source).map(([key, value]) => ({ lane: laneName, side: 'source', key, value })),
  ...Object.entries(groups.owner).map(([key, value]) => ({ lane: laneName, side: 'owner', key, value })),
]);

const md = [
  '# ENRICH-13F Suffix Variant Collision Governance V1',
  '',
  'Read-only governance plan for number-suffix collision blockers.',
  '',
  '## Safety',
  '',
  '- DB writes performed: false',
  '- Migrations created: false',
  '- Cleanup performed: false',
  '- This report is not apply authority.',
  '',
  '## Summary',
  '',
  `- Target rows: ${report.summary.target_rows}`,
  `- Duplicate suffix dependency-transfer candidates: ${report.summary.duplicate_suffix_dependency_transfer_candidates}`,
  `- Base-number versus suffix collision rows: ${report.summary.base_number_suffix_collision_rows}`,
  `- Manual-review rows: ${report.summary.manual_review_rows}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended strategy: \`${report.summary.recommended_strategy}\``,
  '',
  '## Precedent',
  '',
  `- Checkpoint: \`${report.precedent.checkpoint}\``,
  `- Rule: ${report.precedent.rule}`,
  '',
  '## Lane Counts',
  '',
  table(Object.entries(report.summary.lane_counts).map(([laneName, count]) => ({ laneName, count })), [
    { label: 'lane', value: (row) => row.laneName },
    { label: 'rows', value: (row) => row.count },
  ]),
  '',
  '## Set Counts',
  '',
  table(Object.entries(report.summary.set_counts).map(([set_code, count]) => ({ set_code, count })), [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'rows', value: (row) => row.count },
  ]),
  '',
  '## Dependency Totals',
  '',
  table(dependencyRows, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'side', value: (row) => row.side },
    { label: 'dependency', value: (row) => row.key },
    { label: 'rows', value: (row) => row.value },
  ]),
  '',
  '## Governance Decision',
  '',
  `Decision: \`${report.governance_decision.decision}\``,
  '',
  report.governance_decision.reason,
  '',
  'Deterministic lanes:',
  '',
  ...report.governance_decision.deterministic_lanes.map((item) => `- ${item}`),
  '',
  'Forbidden:',
  '',
  ...report.governance_decision.forbidden.map((item) => `- ${item}`),
  '',
  '## Duplicate Suffix Rows',
  '',
  table(duplicateSuffixRows, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.proposed_number },
    { label: 'name', value: (row) => row.source_name },
    { label: 'owner_number', value: (row) => row.owner_number },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'source_children', value: (row) => row.source_dependencies.child_count },
    { label: 'owner_children', value: (row) => row.owner_dependencies.child_count },
  ]),
  '',
  '## Base Number Versus Suffix Rows',
  '',
  table(baseCollisionRows, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'base_number', value: (row) => row.proposed_number },
    { label: 'name', value: (row) => row.source_name },
    { label: 'suffix_owner_number', value: (row) => row.owner_number },
    { label: 'suffix_owner_name', value: (row) => row.owner_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'strategy', value: (row) => row.proposed_modifier_strategy },
  ]),
  '',
  '## Future Package Shape',
  '',
  `Package: \`${report.proposed_future_package_shape.package_id}\``,
  '',
  `Current status: \`${report.proposed_future_package_shape.current_status}\``,
  '',
  'Required before real apply:',
  '',
  ...report.proposed_future_package_shape.required_before_real_apply.map((item) => `- ${item}`),
  '',
  '## Conclusion',
  '',
  'Suffix collisions are not safe to collapse generically. The safe path is a modifier-aware dry-run that preserves base and suffix identities unless source proof says one side is invalid.',
  '',
  `Fingerprint: \`${report.fingerprint_sha256}\``,
  '',
].join('\n');

await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
}, null, 2));
