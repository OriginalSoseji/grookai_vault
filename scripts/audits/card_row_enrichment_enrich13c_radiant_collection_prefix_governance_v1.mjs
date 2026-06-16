import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13c_radiant_collection_prefix_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13c_radiant_collection_prefix_governance_v1.md');

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
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

function isRadiantCollectionRow(row) {
  return row.classification === 'blocked_proposed_identity_collision'
    && row.sets_code === 'bw11'
    && /^RC\d+$/i.test(row.proposed_number ?? '')
    && row.parsed_source?.source_set_code === 'bw11';
}

function collisionSummary(row) {
  const owners = row.collision_owner_samples ?? [];
  return {
    card_print_id: row.card_print_id,
    card_name: row.card_name,
    proposed_set_code: row.proposed_set_code,
    proposed_number: row.proposed_number,
    proposed_number_plain: row.proposed_number_plain,
    proposed_identity_modifier: 'number_prefix:RC',
    source_external_id: row.external_ids?.tcgdex ?? null,
    current_child_count: row.dependency_counts?.child_count ?? 0,
    current_active_identity_count: row.dependency_counts?.active_identity_count ?? 0,
    current_active_mapping_count: row.dependency_counts?.active_mapping_count ?? 0,
    current_trait_count: row.dependency_counts?.trait_count ?? 0,
    current_species_count: row.dependency_counts?.species_count ?? 0,
    collision_owner_count: row.collision_owner_count ?? owners.length,
    collision_owner_samples: owners.map((owner) => ({
      owner_card_print_id: owner.owner_card_print_id,
      owner_name: owner.name,
      owner_set_code: owner.set_code,
      owner_number: owner.number,
      owner_gv_id: owner.gv_id,
      owner_child_count: owner.owner_child_count,
      owner_active_identity_count: owner.owner_active_identity_count,
      owner_active_mapping_count: owner.owner_active_mapping_count,
    })),
  };
}

const readiness = await readJson(READINESS_JSON);
const rows = (readiness.rows ?? []).filter(isRadiantCollectionRow);
const nonRcBw11Collisions = (readiness.rows ?? [])
  .filter((row) => row.classification === 'blocked_proposed_identity_collision')
  .filter((row) => row.sets_code === 'bw11')
  .filter((row) => !isRadiantCollectionRow(row));

const rowSummaries = rows.map(collisionSummary).sort((a, b) => {
  const numberA = Number(a.proposed_number.replace(/^RC/i, ''));
  const numberB = Number(b.proposed_number.replace(/^RC/i, ''));
  return numberA - numberB || a.card_name.localeCompare(b.card_name);
});

const dependencyTotals = rowSummaries.reduce((totals, row) => {
  totals.child_count += row.current_child_count;
  totals.active_identity_count += row.current_active_identity_count;
  totals.active_mapping_count += row.current_active_mapping_count;
  totals.trait_count += row.current_trait_count;
  totals.species_count += row.current_species_count;
  return totals;
}, {
  child_count: 0,
  active_identity_count: 0,
  active_mapping_count: 0,
  trait_count: 0,
  species_count: 0,
});

const report = {
  version: 'ENRICH_13C_RADIANT_COLLECTION_PREFIX_GOVERNANCE_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  summary: {
    target_rows: rows.length,
    set_code: 'bw11',
    set_name: 'Legendary Treasures',
    non_rc_bw11_collision_rows: nonRcBw11Collisions.length,
    write_ready_now: false,
    recommended_identity_strategy: 'preserve_RC_card_number_and_add_number_prefix_RC_identity_modifier_before_any_identity_backfill',
  },
  dependency_totals: dependencyTotals,
  collision_explanation: {
    observed_problem: 'The RC-prefixed source numbers currently collide with main Legendary Treasures numeric rows when the prefix is stripped into number_plain.',
    required_identity_law: 'Radiant Collection prefix is identity-bearing. RC19 is not the same parent identity as 19.',
    recommended_parent_fields_if_later_approved: {
      set_code: 'bw11',
      number: 'RC#',
      number_plain: '#',
      printed_identity_modifier: 'number_prefix:RC',
    },
    forbidden: [
      'do not overwrite numeric Legendary Treasures parent rows',
      'do not merge RC rows into main-set numeric rows',
      'do not delete collision owners',
      'do not mint GV IDs until the modifier-aware identity contract is proven',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13C1-RADIANT-COLLECTION-PREFIX-IDENTITY-DRY-RUN',
    current_status: 'not_write_ready_dry_run_required',
    expected_scope_if_later_approved: [
      '20 parent core identity updates for bw11 RC-prefixed rows',
      'printed_identity_modifier=number_prefix:RC',
      'modifier-aware active identity backfill or update plan',
      'no child writes unless separately proven necessary',
    ],
    excluded_from_scope: [
      'deletes',
      'merges',
      'main-set numeric parent writes',
      'external mapping transfers',
      'image writes',
      'migrations',
    ],
    required_before_real_apply: [
      'modifier-aware identity uniqueness dry-run',
      'collision owners unchanged proof',
      'active identity replacement/backfill proof',
      'rollback artifact for parent fields and identity rows',
    ],
  },
  rows: rowSummaries,
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  dependency_totals: report.dependency_totals,
  collision_explanation: report.collision_explanation,
  proposed_future_package_shape: report.proposed_future_package_shape,
  rows: report.rows,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# ENRICH-13C Radiant Collection Prefix Governance V1',
  '',
  'Read-only governance plan for Legendary Treasures Radiant Collection core identity blockers.',
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
  `- Non-RC bw11 collision rows: ${report.summary.non_rc_bw11_collision_rows}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended identity strategy: \`${report.summary.recommended_identity_strategy}\``,
  '',
  '## Dependency Totals',
  '',
  table(Object.entries(dependencyTotals).map(([key, value]) => ({ key, value })), [
    { label: 'dependency', value: (row) => row.key },
    { label: 'rows', value: (row) => row.value },
  ]),
  '',
  '## Identity Rule',
  '',
  report.collision_explanation.observed_problem,
  '',
  `Required law: ${report.collision_explanation.required_identity_law}`,
  '',
  'If later approved, the parent identity should preserve `number=RC#` and use `printed_identity_modifier=number_prefix:RC`. The numeric owner rows must remain untouched.',
  '',
  'Forbidden:',
  '',
  ...report.collision_explanation.forbidden.map((item) => `- ${item}`),
  '',
  '## Rows',
  '',
  table(rowSummaries, [
    { label: 'number', value: (row) => row.proposed_number },
    { label: 'name', value: (row) => row.card_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'children', value: (row) => row.current_child_count },
    { label: 'active_identity', value: (row) => row.current_active_identity_count },
    { label: 'collision_owner', value: (row) => row.collision_owner_samples[0]?.owner_name },
    { label: 'owner_number', value: (row) => row.collision_owner_samples[0]?.owner_number },
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
  'Radiant Collection can likely become a deterministic governance rule, but it needs a modifier-aware dry-run package before any write. The fix is not a merge and not a delete.',
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
