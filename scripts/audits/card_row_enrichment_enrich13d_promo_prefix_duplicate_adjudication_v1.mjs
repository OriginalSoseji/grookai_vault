import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13d_promo_prefix_duplicate_adjudication_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13d_promo_prefix_duplicate_adjudication_v1.md');

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

function isXyPromoCollision(row) {
  return row.classification === 'blocked_proposed_identity_collision'
    && row.sets_code === 'xyp'
    && /^XY\d+[a-z]?$/i.test(row.proposed_number ?? '');
}

function isSuffixVariant(row) {
  const owner = ownerSample(row);
  return /^XY\d+[a-z]$/i.test(row.proposed_number ?? '')
    || /^XY\d+[a-z]$/i.test(owner?.number ?? '');
}

function isDuplicateNameNormalization(row) {
  const owner = ownerSample(row);
  return isXyPromoCollision(row)
    && !isSuffixVariant(row)
    && normalizeName(row.card_name) === normalizeName(owner?.name)
    && String(row.proposed_number ?? '') === String(owner?.number ?? '');
}

function rowSummary(row) {
  const owner = ownerSample(row);
  return {
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
    adjudication: 'duplicate_parent_same_xy_promo_number_name_normalization',
  };
}

const readiness = await readJson(READINESS_JSON);
const allXyPromoCollisions = (readiness.rows ?? []).filter(isXyPromoCollision);
const targetRows = allXyPromoCollisions.filter(isDuplicateNameNormalization);
const suffixRows = allXyPromoCollisions.filter(isSuffixVariant);
const manualRows = allXyPromoCollisions.filter((row) => !isDuplicateNameNormalization(row) && !isSuffixVariant(row));
const rows = targetRows.map(rowSummary).sort((a, b) => {
  const aNum = Number(String(a.number).replace(/^XY/i, ''));
  const bNum = Number(String(b.number).replace(/^XY/i, ''));
  return aNum - bNum || a.duplicate_name.localeCompare(b.duplicate_name);
});

const dependencyTotals = rows.reduce((totals, row) => {
  for (const [key, value] of Object.entries(row.duplicate_dependencies)) {
    totals.duplicate[key] = (totals.duplicate[key] ?? 0) + Number(value ?? 0);
  }
  for (const [key, value] of Object.entries(row.canonical_owner_dependencies)) {
    totals.canonical_owner[key] = (totals.canonical_owner[key] ?? 0) + Number(value ?? 0);
  }
  return totals;
}, { duplicate: {}, canonical_owner: {} });

const report = {
  version: 'ENRICH_13D_PROMO_PREFIX_DUPLICATE_ADJUDICATION_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  summary: {
    target_rows: rows.length,
    set_code: 'xyp',
    set_name: 'XY Black Star Promos',
    excluded_suffix_variant_rows_for_enrich13f: suffixRows.length,
    manual_review_rows: manualRows.length,
    write_ready_now: false,
    recommended_strategy: 'dependency_transfer_to_existing_canonical_owner_then_empty_duplicate_parent_delete_after_guarded_dry_run',
  },
  dependency_totals: dependencyTotals,
  governance_decision: {
    decision: 'do_not_core_identity_backfill_duplicate_rows',
    reason: 'Each target row already has an existing canonical owner with the same XY promo number and a normalized equivalent name. Updating the duplicate parent into that identity would collide; the safe future path is dependency-aware duplicate adjudication.',
    required_dry_run_law: [
      'canonical owner row must stay',
      'duplicate row dependencies must be transferred or proven safe to delete',
      'active identity uniqueness must remain zero-conflict',
      'source external mapping ownership must end on canonical owner only',
      'child printings must dedupe by canonical owner and finish',
      'no suffix-related variants may be included in this package',
    ],
    forbidden: [
      'do not overwrite canonical owner parent rows',
      'do not treat duplicate rows as new identities',
      'do not merge suffix-related variants in this lane',
      'do not delete dependency-bearing duplicate parents without transfer proof',
      'do not mint GV IDs for duplicate parents',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER-DRY-RUN',
    current_status: 'not_write_ready_dry_run_required',
    expected_scope_if_later_approved: [
      '58 duplicate xyp parent adjudications',
      'dependency transfer simulation from duplicate parent to canonical owner',
      'child printing dedupe simulation by target owner and finish',
      'active identity cleanup or deactivation simulation',
      'empty duplicate parent delete simulation only after all dependencies are transferred',
    ],
    excluded_from_scope: [
      '5 XY suffix-related variant rows',
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
  excluded_suffix_rows: suffixRows.map((row) => ({
    card_print_id: row.card_print_id,
    card_name: row.card_name,
    proposed_number: row.proposed_number,
    source_external_id: row.external_ids?.tcgdex ?? null,
    owner_number: ownerSample(row)?.number ?? null,
    reason: 'suffix_related_variant_requires_ENRICH_13F_identity_modifier_policy',
  })),
  rows,
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  dependency_totals: report.dependency_totals,
  governance_decision: report.governance_decision,
  proposed_future_package_shape: report.proposed_future_package_shape,
  excluded_suffix_rows: report.excluded_suffix_rows,
  rows: report.rows,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# ENRICH-13D Promo Prefix Duplicate Adjudication V1',
  '',
  'Read-only governance plan for XY Black Star Promo duplicate identity blockers.',
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
  `- Set: ${report.summary.set_code} / ${report.summary.set_name}`,
  `- Excluded suffix-related rows for ENRICH-13F: ${report.summary.excluded_suffix_variant_rows_for_enrich13f}`,
  `- Manual review rows: ${report.summary.manual_review_rows}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended strategy: \`${report.summary.recommended_strategy}\``,
  '',
  '## Dependency Totals',
  '',
  table([
    ...Object.entries(dependencyTotals.duplicate).map(([key, value]) => ({ side: 'duplicate', key, value })),
    ...Object.entries(dependencyTotals.canonical_owner).map(([key, value]) => ({ side: 'canonical_owner', key, value })),
  ], [
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
  'Required dry-run law:',
  '',
  ...report.governance_decision.required_dry_run_law.map((item) => `- ${item}`),
  '',
  'Forbidden:',
  '',
  ...report.governance_decision.forbidden.map((item) => `- ${item}`),
  '',
  '## Target Rows',
  '',
  table(rows, [
    { label: 'number', value: (row) => row.number },
    { label: 'duplicate_name', value: (row) => row.duplicate_name },
    { label: 'canonical_owner_name', value: (row) => row.canonical_owner_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'duplicate_children', value: (row) => row.duplicate_dependencies.child_count },
    { label: 'owner_children', value: (row) => row.canonical_owner_dependencies.child_count },
  ]),
  '',
  '## Excluded Suffix Rows',
  '',
  table(report.excluded_suffix_rows, [
    { label: 'number', value: (row) => row.proposed_number },
    { label: 'owner_number', value: (row) => row.owner_number },
    { label: 'name', value: (row) => row.card_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'reason', value: (row) => row.reason },
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
  'This bucket can likely become a deterministic duplicate resolution package, but it is not a core identity update. It needs a dependency-transfer dry-run before any real apply.',
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
