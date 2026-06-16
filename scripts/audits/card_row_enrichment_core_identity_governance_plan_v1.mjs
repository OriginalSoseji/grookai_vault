import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_core_identity_governance_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_core_identity_governance_plan_v1.md');

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\bex\b/g, 'ex')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardNumber(row) {
  return row.proposed_updates?.number ?? row.proposed_number ?? row.current_number ?? null;
}

function ownerSample(row) {
  return row.collision_owner_samples?.[0] ?? null;
}

function collisionGovernanceBucket(row) {
  const setCode = row.sets_code ?? row.current_set_code ?? row.proposed_set_code ?? '';
  const number = String(cardNumber(row) ?? '');
  const owner = ownerSample(row);
  const ownerNumber = String(owner?.number ?? '');
  const proposedName = normalizeName(row.card_name);
  const ownerName = normalizeName(owner?.name);

  if (setCode === 'bw11' && /^RC\d+$/i.test(number)) {
    return 'radiant_collection_prefix_identity_governance';
  }
  if (setCode === 'cel25') {
    return 'celebrations_classic_collection_subset_alias_governance';
  }
  if (/^[A-Z]+\d+$/i.test(number) && setCode.endsWith('p')) {
    return proposedName === ownerName
      ? 'promo_prefix_duplicate_name_normalization'
      : 'promo_prefix_collision_manual_review';
  }
  if (/^\d+[a-z]$/i.test(number) || /^\d+[a-z]$/i.test(ownerNumber)) {
    return 'number_suffix_variant_collision';
  }
  if (proposedName === ownerName) {
    return 'same_name_same_number_duplicate_collision';
  }
  if (/\b4$/.test(proposedName) && /\be4$/.test(ownerName)) {
    return 'platinum_owner_shorthand_alias_collision';
  }
  if (/\bg$/.test(ownerName) && !/\bg$/.test(proposedName)) {
    return 'platinum_g_suffix_name_alias_collision';
  }
  if (proposedName.replace(/\s/g, '') === ownerName.replace(/\s/g, '')) {
    return 'punctuation_or_symbol_name_alias_collision';
  }
  return 'manual_collision_adjudication_required';
}

function rowSummary(row) {
  const owner = ownerSample(row);
  return {
    card_print_id: row.card_print_id,
    set_code: row.sets_code ?? row.current_set_code,
    set_name: row.set_name,
    card_name: row.card_name,
    external_ids: row.external_ids,
    proposed_number: cardNumber(row),
    proposed_number_plain: row.proposed_number_plain,
    proposed_updates: row.proposed_updates,
    dependency_counts: row.dependency_counts,
    collision_owner_count: row.collision_owner_count,
    owner_sample: owner ? {
      card_print_id: owner.owner_card_print_id,
      name: owner.name,
      number: owner.number,
      number_plain: owner.number_plain,
      gv_id: owner.gv_id,
      child_count: owner.owner_child_count,
      active_identity_count: owner.owner_active_identity_count,
      active_mapping_count: owner.owner_active_mapping_count,
    } : null,
  };
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

const readiness = await readJson(INPUT_JSON);
const rows = readiness.rows ?? [];
const pocketRows = rows.filter((row) => row.classification === 'blocked_pocket_domain_governance_required');
const collisionRows = rows.filter((row) => row.classification === 'blocked_proposed_identity_collision');
const subsetRows = rows.filter((row) => row.classification === 'blocked_subset_alias_governance_required');

const collisionBuckets = collisionRows.map((row) => ({
  ...rowSummary(row),
  governance_bucket: collisionGovernanceBucket(row),
}));

const pocketGroups = Object.entries(countBy(pocketRows, (row) => `${row.sets_code}|${row.set_name}`))
  .map(([key, count]) => {
    const [set_code, set_name] = key.split('|');
    return { set_code, set_name, count };
  });

const collisionBucketRows = Object.entries(countBy(collisionBuckets, (row) => row.governance_bucket))
  .map(([bucket, count]) => ({ bucket, count }));

const report = {
  version: 'CARD_ROW_ENRICHMENT_CORE_IDENTITY_GOVERNANCE_PLAN_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_report_only',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: INPUT_JSON,
  summary: {
    total_core_identity_gap_rows: rows.length,
    pocket_domain_rows: pocketRows.length,
    proposed_identity_collision_rows: collisionRows.length,
    subset_alias_rows: subsetRows.length,
    write_ready_rows_now: 0,
  },
  pocket_domain_governance: {
    status: 'exclude_from_english_physical_enrichment_until_pocket_domain_decision',
    groups: pocketGroups,
    recommended_next_action: 'Create a separate Pocket/non-physical governance lane. Do not backfill these as English physical rows.',
    samples: pocketRows.slice(0, 20).map(rowSummary),
  },
  subset_alias_governance: {
    status: 'needs_subset_alias_decision_before_core_identity_write',
    recommended_next_action: 'Resolve Celebrations Classic Collection alias strategy before core identity updates.',
    rows: subsetRows.map(rowSummary),
  },
  collision_governance: {
    status: 'needs_bucket_specific_adjudication_before_write',
    by_bucket: collisionBucketRows,
    by_set: Object.entries(countBy(collisionRows, (row) => `${row.sets_code}|${row.set_name}`)).map(([key, count]) => {
      const [set_code, set_name] = key.split('|');
      return { set_code, set_name, count };
    }),
    samples_by_bucket: Object.fromEntries(collisionBucketRows.map(({ bucket }) => [
      bucket,
      collisionBuckets.filter((row) => row.governance_bucket === bucket).slice(0, 10),
    ])),
  },
  recommended_package_order: [
    {
      package_id: 'ENRICH-13B-POCKET-DOMAIN-EXCLUSION-PLAN',
      mode: 'governance_only_first',
      rows: pocketRows.length,
      reason: 'These rows are not safe to mutate as English physical enrichment.',
      writes_ready_now: false,
    },
    {
      package_id: 'ENRICH-13C-RADIANT-COLLECTION-PREFIX-GOVERNANCE',
      mode: 'design_then_dry_run',
      rows: collisionBuckets.filter((row) => row.governance_bucket === 'radiant_collection_prefix_identity_governance').length,
      reason: 'RC-prefixed numbers collide with main-set numeric rows unless prefix identity is governed.',
      writes_ready_now: false,
    },
    {
      package_id: 'ENRICH-13D-PROMO-PREFIX-DUPLICATE-ADJUDICATION',
      mode: 'design_then_dry_run',
      rows: collisionBuckets.filter((row) => row.governance_bucket.startsWith('promo_prefix')).length,
      reason: 'Promo rows appear to be duplicate/name-normalization collisions and require dependency-aware adjudication.',
      writes_ready_now: false,
    },
    {
      package_id: 'ENRICH-13E-NAME-ALIAS-COLLISION-ADJUDICATION',
      mode: 'design_then_dry_run',
      rows: collisionBuckets.filter((row) => [
        'platinum_owner_shorthand_alias_collision',
        'platinum_g_suffix_name_alias_collision',
        'punctuation_or_symbol_name_alias_collision',
        'same_name_same_number_duplicate_collision',
      ].includes(row.governance_bucket)).length,
      reason: 'Rows are blocked by name-style differences or same-name duplicates; dependency transfer/delete must be proven separately.',
      writes_ready_now: false,
    },
    {
      package_id: 'ENRICH-13F-SUFFIX-VARIANT-COLLISION-ADJUDICATION',
      mode: 'design_then_dry_run',
      rows: collisionBuckets.filter((row) => row.governance_bucket === 'number_suffix_variant_collision').length,
      reason: 'Suffix variants need explicit identity modifier/parent split rules.',
      writes_ready_now: false,
    },
  ],
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  pocket_domain_governance: report.pocket_domain_governance,
  subset_alias_governance: report.subset_alias_governance,
  collision_governance: report.collision_governance,
  recommended_package_order: report.recommended_package_order,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# Card Row Enrichment Core Identity Governance Plan V1',
  '',
  'Read-only governance plan for the remaining core identity blockers.',
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
  `- Total core identity gap rows: ${report.summary.total_core_identity_gap_rows}`,
  `- Pocket/domain rows: ${report.summary.pocket_domain_rows}`,
  `- Proposed identity collision rows: ${report.summary.proposed_identity_collision_rows}`,
  `- Subset alias rows: ${report.summary.subset_alias_rows}`,
  `- Write-ready rows now: ${report.summary.write_ready_rows_now}`,
  '',
  '## Pocket Domain Governance',
  '',
  table(pocketGroups, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'set_name', value: (row) => row.set_name },
    { label: 'rows', value: (row) => row.count },
  ]),
  '',
  'Decision: keep these out of English physical enrichment until Pocket/non-physical governance exists.',
  '',
  '## Collision Buckets',
  '',
  table(collisionBucketRows, [
    { label: 'bucket', value: (row) => row.bucket },
    { label: 'rows', value: (row) => row.count },
  ]),
  '',
  '## Collision Rows By Set',
  '',
  table(report.collision_governance.by_set, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'set_name', value: (row) => row.set_name },
    { label: 'rows', value: (row) => row.count },
  ]),
  '',
  '## Subset Alias Rows',
  '',
  table(report.subset_alias_governance.rows, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'card_name', value: (row) => row.card_name },
    { label: 'external_ids', value: (row) => JSON.stringify(row.external_ids) },
    { label: 'proposed_number', value: (row) => row.proposed_number },
  ]),
  '',
  '## Recommended Package Order',
  '',
  table(report.recommended_package_order, [
    { label: 'package', value: (row) => row.package_id },
    { label: 'mode', value: (row) => row.mode },
    { label: 'rows', value: (row) => row.rows },
    { label: 'writes_ready_now', value: (row) => row.writes_ready_now },
    { label: 'reason', value: (row) => row.reason },
  ]),
  '',
  '## Conclusion',
  '',
  'No core identity write is ready. The next safe move is bucket-specific governance, starting with Pocket exclusion and RC/subset prefix policy.',
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
  collision_buckets: report.collision_governance.by_bucket,
}, null, 2));
