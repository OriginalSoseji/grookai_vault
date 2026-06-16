import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const MASTER_CARDS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_cards_v1.json';
const MASTER_PRINTINGS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13g_celebrations_subset_alias_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13g_celebrations_subset_alias_governance_v1.md');

const TARGET_CLASSIFICATION = 'blocked_subset_alias_governance_required';
const TARGET_SET = 'cel25';
const CANONICAL_SUBSET = 'cel25c';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

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

async function readLiveRows(cardNames) {
  const cs = connectionString();
  if (!cs) return { available: false, reason: 'missing_connection_string', rows: [] };
  const client = new Client({ connectionString: cs, application_name: 'card_row_enrichment_enrich13g_celebrations_subset_alias_governance_v1' });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         s.name as set_name,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.gv_id,
         cp.printed_identity_modifier,
         coalesce((select count(*)::int from public.card_printings cpr where cpr.card_print_id = cp.id), 0) as child_count,
         coalesce((select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id and cpi.is_active = true), 0) as active_identity_count,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id and coalesce(em.active, true) = true), 0) as active_mapping_count
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.set_code = any($1::text[])
         and cp.name = any($2::text[])
       order by cp.set_code, cp.name, cp.number`,
      [[TARGET_SET, CANONICAL_SUBSET], cardNames],
    );
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function masterRowsFor(rows, name) {
  const targetName = normalizeName(name);
  return rows
    .filter((row) => [TARGET_SET, CANONICAL_SUBSET].includes(row.set_key))
    .filter((row) => normalizeName(row.card_name) === targetName)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      status: row.status,
      source_count: row.source_count,
      sources: row.sources,
      finish_key: row.finish_key,
    }));
}

function canonicalNumberFromAlias(number) {
  const match = String(number ?? '').match(/^(\d+)A\d+$/i);
  return match?.[1] ?? null;
}

const readiness = await readJson(READINESS_JSON);
const masterCards = await readJson(MASTER_CARDS_JSON);
const masterPrintings = await readJson(MASTER_PRINTINGS_JSON);

const targetRows = (readiness.rows ?? [])
  .filter((row) => row.classification === TARGET_CLASSIFICATION)
  .filter((row) => row.sets_code === TARGET_SET)
  .sort((a, b) => String(a.proposed_number).localeCompare(String(b.proposed_number), undefined, { numeric: true }));

const live = await readLiveRows([...new Set(targetRows.map((row) => row.card_name))]);

const rows = targetRows.map((row) => {
  const canonicalNumber = canonicalNumberFromAlias(row.proposed_number);
  const liveMatches = live.rows.filter((liveRow) => normalizeName(liveRow.name) === normalizeName(row.card_name));
  return {
    card_print_id: row.card_print_id,
    source_set_code: row.sets_code,
    source_set_name: row.set_name,
    source_number: row.proposed_number,
    source_number_plain: row.proposed_number_plain,
    source_external_id: row.external_ids?.tcgdex ?? null,
    card_name: row.card_name,
    dependency_counts: row.dependency_counts,
    canonical_subset_set_code: CANONICAL_SUBSET,
    canonical_subset_number: canonicalNumber,
    recommended_resolution: 'subset_alias_relocation_or_suppression_dry_run_required',
    master_cards: masterRowsFor(masterCards.cards ?? [], row.card_name),
    master_printings: masterRowsFor(masterPrintings.printings ?? [], row.card_name),
    live_matches: liveMatches,
  };
});

const report = {
  version: 'ENRICH_13G_CELEBRATIONS_SUBSET_ALIAS_GOVERNANCE_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  master_sources: {
    cards: MASTER_CARDS_JSON,
    printings: MASTER_PRINTINGS_JSON,
  },
  live_database_read: live.available,
  live_database_read_reason: live.reason,
  summary: {
    target_rows: rows.length,
    source_set_code: TARGET_SET,
    canonical_subset_set_code: CANONICAL_SUBSET,
    target_source_numbers: rows.map((row) => row.source_number),
    write_ready_now: false,
    recommended_strategy: 'do_not_backfill_cel25_15A_aliases_as_host_physical_identity',
  },
  governance_decision: {
    decision: 'classic_collection_rows_are_subset_governed',
    reason: 'Existing Master Index suppression governance treats Celebrations Classic Collection as subset cel25c. TCGdex-like cel25 15A# aliases should not be written as host-set parent identity until a subset relocation/suppression dry-run proves the right owner and dependency behavior.',
    deterministic_law: [
      '15A# source aliases are source evidence, not direct public parent numbers',
      'canonical subset set_code is cel25c',
      'canonical subset number is derived from the numeric prefix before A',
      'host cel25 duplicate evidence must be suppressed from DB reconciliation or relocated to the subset owner',
    ],
    forbidden: [
      'do not backfill card_prints.set_code=cel25 and number=15A# as final English physical identity',
      'do not create new host-set Classic Collection parents without subset proof',
      'do not merge distinct Classic Collection names just because they share canonical number 15',
      'do not delete source rows without dependency transfer proof',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13G1-CELEBRATIONS-CLASSIC-COLLECTION-SUBSET-ALIAS-DRY-RUN',
    current_status: 'not_write_ready_dry_run_required',
    expected_scope_if_later_approved: [
      '4 cel25 15A# alias rows',
      'resolve each alias against cel25c subset identity',
      'simulate relocation, mapping transfer, or source-evidence suppression',
      'prove child, trait, species, active identity, and external mapping behavior',
    ],
    excluded_from_scope: [
      'real apply',
      'global apply',
      'migrations',
      'image writes',
      'unsupported cleanup',
      'host cel25 public identity creation for 15A# aliases',
    ],
    required_before_real_apply: [
      'fresh dependency snapshot',
      'subset owner existence proof',
      'active identity uniqueness proof',
      'external mapping transfer or suppression proof',
      'rollback artifact',
    ],
  },
  rows,
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  governance_decision: report.governance_decision,
  proposed_future_package_shape: report.proposed_future_package_shape,
  rows: report.rows,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# ENRICH-13G Celebrations Subset Alias Governance V1',
  '',
  'Read-only governance plan for Celebrations Classic Collection subset alias blockers.',
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
  `- Source set code: ${report.summary.source_set_code}`,
  `- Canonical subset set code: ${report.summary.canonical_subset_set_code}`,
  `- Source numbers: ${report.summary.target_source_numbers.join(', ')}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended strategy: \`${report.summary.recommended_strategy}\``,
  '',
  '## Governance Decision',
  '',
  `Decision: \`${report.governance_decision.decision}\``,
  '',
  report.governance_decision.reason,
  '',
  'Deterministic law:',
  '',
  ...report.governance_decision.deterministic_law.map((item) => `- ${item}`),
  '',
  'Forbidden:',
  '',
  ...report.governance_decision.forbidden.map((item) => `- ${item}`),
  '',
  '## Rows',
  '',
  table(rows, [
    { label: 'source_number', value: (row) => row.source_number },
    { label: 'card_name', value: (row) => row.card_name },
    { label: 'source_id', value: (row) => row.source_external_id },
    { label: 'canonical_subset', value: (row) => row.canonical_subset_set_code },
    { label: 'canonical_number', value: (row) => row.canonical_subset_number },
    { label: 'children', value: (row) => row.dependency_counts?.child_count },
    { label: 'active_mapping', value: (row) => row.dependency_counts?.active_mapping_count },
    { label: 'live_matches', value: (row) => row.live_matches.length },
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
  'These rows are not safe as direct cel25 15A# parent backfills. They need a subset-aware dry-run that resolves them against cel25c or suppresses the host aliases as source evidence.',
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
