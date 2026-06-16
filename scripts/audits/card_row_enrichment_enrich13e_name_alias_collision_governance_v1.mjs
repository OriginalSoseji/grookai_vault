import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13e_name_alias_collision_governance_v1.md');

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

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function collisionBucket(row) {
  const setCode = row.sets_code ?? '';
  const number = String(row.proposed_number ?? '');
  const owner = ownerSample(row);
  const ownerNumber = String(owner?.number ?? '');
  const proposedName = normalizeName(row.card_name);
  const ownerName = normalizeName(owner?.name);

  if (setCode === 'bw11' && /^RC\d+$/i.test(number)) return 'radiant_collection_prefix_identity_governance';
  if (setCode === 'cel25') return 'celebrations_classic_collection_subset_alias_governance';
  if (setCode === 'xyp' && /^XY\d+[a-z]?$/i.test(number)) {
    return /^XY\d+[a-z]$/i.test(number) || /^XY\d+[a-z]$/i.test(ownerNumber)
      ? 'number_suffix_variant_collision'
      : 'promo_prefix_duplicate_name_normalization';
  }
  if (/^\d+[a-z]$/i.test(number) || /^\d+[a-z]$/i.test(ownerNumber)) return 'number_suffix_variant_collision';
  if (proposedName === ownerName) return 'same_name_same_number_duplicate_collision';
  if (/\b4$/.test(proposedName) && /\be4$/.test(ownerName)) return 'platinum_owner_shorthand_alias_collision';
  if (/\bg$/.test(ownerName) && !/\bg$/.test(proposedName)) return 'platinum_g_suffix_name_alias_collision';
  if (proposedName.replace(/\s/g, '') === ownerName.replace(/\s/g, '')) return 'punctuation_or_symbol_name_alias_collision';
  return 'manual_collision_adjudication_required';
}

const TARGET_BUCKETS = new Set([
  'same_name_same_number_duplicate_collision',
  'platinum_owner_shorthand_alias_collision',
  'platinum_g_suffix_name_alias_collision',
  'punctuation_or_symbol_name_alias_collision',
  'manual_collision_adjudication_required',
]);

function rowSummary(row) {
  const owner = ownerSample(row);
  const bucket = collisionBucket(row);
  const manualBlocked = bucket === 'manual_collision_adjudication_required';
  return {
    bucket,
    duplicate_card_print_id: row.card_print_id,
    canonical_owner_card_print_id: owner?.owner_card_print_id ?? null,
    set_code: row.sets_code,
    set_name: row.set_name,
    number: row.proposed_number,
    number_plain: row.proposed_number_plain,
    duplicate_name: row.card_name,
    canonical_owner_name: owner?.name ?? null,
    source_external_id: row.external_ids?.tcgdex ?? null,
    duplicate_dependencies: {
      child_count: row.dependency_counts?.child_count ?? 0,
      active_identity_count: row.dependency_counts?.active_identity_count ?? 0,
      active_mapping_count: row.dependency_counts?.active_mapping_count ?? 0,
      trait_count: row.dependency_counts?.trait_count ?? 0,
      species_count: row.dependency_counts?.species_count ?? 0,
      vault_instance_count: row.dependency_counts?.vault_instance_count ?? 0,
    },
    canonical_owner_dependencies: {
      child_count: owner?.owner_child_count ?? 0,
      active_identity_count: owner?.owner_active_identity_count ?? 0,
      active_mapping_count: owner?.owner_active_mapping_count ?? 0,
    },
    proposed_resolution: manualBlocked
      ? 'blocked_manual_card_name_identity_review_required'
      : 'dependency_transfer_to_existing_canonical_owner_after_guarded_dry_run',
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
const collisionRows = (readiness.rows ?? [])
  .filter((row) => row.classification === 'blocked_proposed_identity_collision');
const targetRows = collisionRows.filter((row) => TARGET_BUCKETS.has(collisionBucket(row)));
const rows = targetRows.map(rowSummary).sort((a, b) => {
  const bucketCompare = a.bucket.localeCompare(b.bucket);
  if (bucketCompare !== 0) return bucketCompare;
  const setCompare = a.set_code.localeCompare(b.set_code);
  if (setCompare !== 0) return setCompare;
  return Number(a.number) - Number(b.number) || a.duplicate_name.localeCompare(b.duplicate_name);
});

const deterministicRows = rows.filter((row) => row.bucket !== 'manual_collision_adjudication_required');
const manualRows = rows.filter((row) => row.bucket === 'manual_collision_adjudication_required');

const dependencyTotals = rows.reduce((totals, row) => {
  const target = row.bucket === 'manual_collision_adjudication_required' ? totals.manual_blocked : totals.deterministic;
  for (const [key, value] of Object.entries(row.duplicate_dependencies)) {
    target.duplicate[key] = (target.duplicate[key] ?? 0) + Number(value ?? 0);
  }
  for (const [key, value] of Object.entries(row.canonical_owner_dependencies)) {
    target.canonical_owner[key] = (target.canonical_owner[key] ?? 0) + Number(value ?? 0);
  }
  return totals;
}, {
  deterministic: { duplicate: {}, canonical_owner: {} },
  manual_blocked: { duplicate: {}, canonical_owner: {} },
});

const report = {
  version: 'ENRICH_13E_NAME_ALIAS_COLLISION_GOVERNANCE_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  summary: {
    target_rows: rows.length,
    deterministic_alias_rows: deterministicRows.length,
    manual_blocked_rows: manualRows.length,
    bucket_counts: countBy(rows, (row) => row.bucket),
    set_counts: countBy(rows, (row) => row.set_code),
    write_ready_now: false,
    recommended_strategy: 'split_deterministic_alias_duplicate_transfer_from_manual_identity_review',
  },
  dependency_totals: dependencyTotals,
  governance_decision: {
    deterministic_decision: 'duplicate_alias_rows_can_become_dependency_transfer_candidates_after_dry_run',
    manual_decision: 'manual_identity_difference_must_not_be_auto_merged',
    reason: 'Most rows are punctuation, gender-symbol, EX hyphenation, or known Platinum owner-name source alias differences. Luxray GL versus Luxray GL LV.X is materially different card-name text and must remain blocked until source evidence proves whether the duplicate row is wrong or incomplete.',
    required_dry_run_law: [
      'canonical owner row must stay',
      'duplicate dependencies must be transferred or proven zero before delete',
      'active identity uniqueness must remain zero-conflict',
      'source mappings must end on canonical owner only',
      'manual-blocked rows must be excluded',
    ],
    forbidden: [
      'do not overwrite canonical owner parent rows',
      'do not merge Luxray GL into Luxray GL LV.X without explicit evidence',
      'do not use normalized names alone for materially different suffixes',
      'do not delete dependency-bearing duplicate parents without transfer proof',
      'do not mint GV IDs for duplicate parents',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN',
    current_status: 'not_write_ready_dry_run_required',
    expected_scope_if_later_approved: [
      `${deterministicRows.length} deterministic alias duplicate adjudications`,
      'dependency transfer simulation from duplicate parent to canonical owner',
      'child printing dedupe simulation by target owner and finish',
      'active identity cleanup or deactivation simulation',
      'empty duplicate parent delete simulation only after all dependencies are transferred',
    ],
    excluded_from_scope: [
      `${manualRows.length} manual identity review row`,
      'parent core identity updates',
      'GV-ID writes',
      'image writes',
      'migrations',
      'global apply',
    ],
    required_before_real_apply: [
      'fresh dependency snapshot',
      'guarded rollback-only dry-run',
      'before/after active identity uniqueness proof',
      'before/after external mapping uniqueness proof',
      'child printing duplicate proof',
      'rollback artifact',
    ],
  },
  manual_blocked_rows: manualRows,
  deterministic_rows: deterministicRows,
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  dependency_totals: report.dependency_totals,
  governance_decision: report.governance_decision,
  proposed_future_package_shape: report.proposed_future_package_shape,
  manual_blocked_rows: report.manual_blocked_rows,
  deterministic_rows: report.deterministic_rows,
}));

await writeJson(OUTPUT_JSON, report);

const dependencyRows = [
  ...Object.entries(dependencyTotals.deterministic.duplicate).map(([key, value]) => ({ lane: 'deterministic_duplicate', key, value })),
  ...Object.entries(dependencyTotals.deterministic.canonical_owner).map(([key, value]) => ({ lane: 'deterministic_canonical_owner', key, value })),
  ...Object.entries(dependencyTotals.manual_blocked.duplicate).map(([key, value]) => ({ lane: 'manual_duplicate', key, value })),
  ...Object.entries(dependencyTotals.manual_blocked.canonical_owner).map(([key, value]) => ({ lane: 'manual_canonical_owner', key, value })),
];

const md = [
  '# ENRICH-13E Name Alias Collision Governance V1',
  '',
  'Read-only governance plan for non-promo name/alias collision blockers.',
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
  `- Deterministic alias rows: ${report.summary.deterministic_alias_rows}`,
  `- Manual-blocked rows: ${report.summary.manual_blocked_rows}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended strategy: \`${report.summary.recommended_strategy}\``,
  '',
  '## Bucket Counts',
  '',
  table(Object.entries(report.summary.bucket_counts).map(([bucket, count]) => ({ bucket, count })), [
    { label: 'bucket', value: (row) => row.bucket },
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
    { label: 'dependency', value: (row) => row.key },
    { label: 'rows', value: (row) => row.value },
  ]),
  '',
  '## Governance Decision',
  '',
  `Deterministic decision: \`${report.governance_decision.deterministic_decision}\``,
  '',
  `Manual decision: \`${report.governance_decision.manual_decision}\``,
  '',
  report.governance_decision.reason,
  '',
  'Required dry-run law:',
  '',
  ...report.governance_decision.required_dry_run_law.map((item) => `- ${item}`),
  '',
  'Forbidden:',
  '',
  ...report.governance_decision.forbidden.map((item) => `- ${item}`),
  '',
  '## Deterministic Rows',
  '',
  table(deterministicRows, [
    { label: 'bucket', value: (row) => row.bucket },
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'duplicate_name', value: (row) => row.duplicate_name },
    { label: 'canonical_owner_name', value: (row) => row.canonical_owner_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'duplicate_children', value: (row) => row.duplicate_dependencies.child_count },
  ]),
  '',
  '## Manual-Blocked Rows',
  '',
  table(manualRows, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'duplicate_name', value: (row) => row.duplicate_name },
    { label: 'canonical_owner_name', value: (row) => row.canonical_owner_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'reason', value: () => 'material_name_difference_requires_source_review' },
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
  'Most 13E rows can likely become a deterministic duplicate-transfer dry-run. The Luxray GL row is intentionally blocked because normalized name similarity is not enough for a LV.X identity difference.',
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
