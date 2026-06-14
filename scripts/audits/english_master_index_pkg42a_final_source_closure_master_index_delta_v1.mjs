import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const COMPLETION_EXPORT_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_completion_v1', 'english_master_index_master_admissible_export_v1.json');
const SV03_PRINTINGS_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'sv03', 'printings.json');
const SV03_EVIDENCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'sv03', 'evidence.json');
const SVP_PRINTINGS_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'svp', 'printings.json');
const SVP_EVIDENCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'svp', 'evidence.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg42a_final_source_closure_master_index_delta_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg42a_final_source_closure_master_index_delta_v1.md');

const PACKAGE_ID = 'PKG-42A-FINAL-SOURCE-CLOSURE-MASTER-INDEX-DELTA';

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

function authority(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function rowKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.finish_key].join('|').toLowerCase();
}

function evidenceKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.finish_key ?? '', row.source_url].join('|').toLowerCase();
}

function sortPrintings(rows) {
  return [...rows].sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.finish_key).localeCompare(String(right.finish_key))
  ));
}

function upsertMasterPrinting(rows, row) {
  const key = rowKey(row);
  const index = rows.findIndex((existing) => rowKey(existing) === key);
  if (index === -1) {
    rows.push(row);
    return { action: 'inserted', row };
  }
  const before = rows[index];
  rows[index] = {
    ...before,
    ...row,
    sources: [...new Set([...(before.sources ?? []), ...(row.sources ?? [])])],
    source_authorities: [...new Set([...(before.source_authorities ?? []), ...(row.source_authorities ?? [])])],
    source_kinds: [...new Set([...(before.source_kinds ?? []), ...(row.source_kinds ?? [])])],
    evidence_urls: [...new Set([...(before.evidence_urls ?? []), ...(row.evidence_urls ?? [])])],
  };
  rows[index].source_count = rows[index].sources.length;
  rows[index].evidence_count = rows[index].evidence_urls.length;
  rows[index].status = row.status;
  return { action: before.status === row.status ? 'updated' : 'promoted', row: rows[index], before };
}

function appendUnique(rows, additions, keyFn) {
  const existing = new Set(rows.map(keyFn));
  const inserted = [];
  for (const row of additions) {
    if (existing.has(keyFn(row))) continue;
    rows.push(row);
    existing.add(keyFn(row));
    inserted.push(row);
  }
  return inserted;
}

const masterRows = [
  {
    fact_type: 'printing_finish',
    key: 'obsidian flames|196|town store|stamped',
    status: 'master_verified',
    set_key: 'sv03',
    set_name: 'Obsidian Flames',
    card_number: '196',
    card_name: 'Town Store',
    finish_key: 'stamped',
    rarity_values: ['Uncommon'],
    sources: ['thepricedex_price_list', 'bulbapedia_prize_pack_series_six'],
    source_kinds: ['human_readable_checklist', 'marketplace_checklist'],
    evidence_urls: [
      'https://www.thepricedex.com/set/sv3/obsidian-flames/price-list',
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Six_(TCG)',
    ],
    evidence_note: 'Bulbapedia lists Obsidian Flames Town Store 196 in Prize Pack Series Six as Standard Set Foil and the set rule states foil cards use Cosmos Holofoil except Pokemon ex and ACE SPEC cards.',
  },
  {
    fact_type: 'printing_finish',
    key: 'scarlet violet black star promos|224|paradise resort|normal',
    status: 'master_verified',
    set_key: 'svp',
    set_name: 'Scarlet & Violet Black Star Promos',
    card_number: '224',
    card_name: 'Paradise Resort',
    finish_key: 'normal',
    rarity_values: ['Promo'],
    sources: ['tcgdex', 'pkmncards_card_page', 'thepricedex_price_list'],
    source_kinds: ['collector_reference', 'marketplace_checklist', 'structured_api'],
    evidence_urls: [
      'https://api.tcgdex.net/v2/en/cards/svp-224',
      'https://pkmncards.com/card/paradise-resort-scarlet-violet-promos-svp-224/',
      'https://www.thepricedex.com/set/svp/scarlet-and-violet-black-star-promos/price-list',
    ],
    evidence_note: 'Exact SVP 224 Paradise Resort base promo row, distinct from the staff-stamped row.',
  },
  {
    fact_type: 'printing_finish',
    key: 'scarlet violet black star promos|500|terapagos friends|normal',
    status: 'master_verified',
    set_key: 'svp',
    set_name: 'Scarlet & Violet Black Star Promos',
    card_number: '500',
    card_name: 'Terapagos & Friends',
    finish_key: 'normal',
    rarity_values: ['Promo'],
    sources: ['tcgdex', 'tcgcollector_card_page'],
    source_kinds: ['collector_reference', 'structured_api'],
    evidence_urls: [
      'https://api.tcgdex.net/v2/en/cards/svp-500',
      'https://www.tcgcollector.com/cards/46604/terapagos-and-friends-scarlet-and-violet-promos-no-500',
    ],
    evidence_note: 'Exact SVP No. 500 Terapagos & Friends promo evidence. This closes the existing DB normal row without adding a new jumbo modifier.',
  },
].map((row) => ({
  ...row,
  source_count: row.sources.length,
  source_authorities: [...new Set(row.evidence_urls.map(authority))],
  evidence_count: row.evidence_urls.length,
}));

const routeRows = [
  {
    set_key: 'sv03',
    set_name: 'Obsidian Flames',
    card_number: '196',
    card_name: 'Town Store',
    variant_key: 'play_pokemon_stamp',
    selected_base_parent_id: '18fbf76a-a9c5-4247-9ea5-0d8d2207ad65',
    base_parent_child_finishes: ['cosmos'],
    accepted_finish_key: 'cosmos',
    source_family_count: 2,
    source_families: ['bulbapedia', 'thepricedex'],
    evidence_count: 2,
    status: 'ready_for_guarded_dry_run',
    route_origin: PACKAGE_ID,
    requires_parent_identity_backfill: false,
    requires_child_replacement: false,
    evidence: [
      {
        source_key: 'thepricedex_price_list',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.thepricedex.com/set/sv3/obsidian-flames/price-list',
        evidence_label: 'ThePriceDex lists Town Store #196 stamped Prize Pack family evidence.',
      },
      {
        source_key: 'bulbapedia_prize_pack_series_six',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Six_(TCG)',
        evidence_label: 'Bulbapedia Prize Pack Series Six lists Town Store 196 as Standard Set Foil; set rule maps applicable foil rows to Cosmos Holofoil.',
      },
    ],
  },
  {
    set_key: 'svp',
    set_name: 'Scarlet & Violet Black Star Promos',
    card_number: '224',
    card_name: 'Paradise Resort',
    variant_key: 'world_championships_2025_staff_stamp',
    selected_base_parent_id: '4b575fd9-1e87-4992-bae5-826795a4bfbd',
    base_parent_child_finishes: ['normal'],
    accepted_finish_key: 'normal',
    source_family_count: 4,
    source_families: ['gamenerdz', 'pricecharting', 'tcgplayer', 'thepricedex'],
    evidence_count: 4,
    status: 'ready_for_guarded_dry_run',
    route_origin: PACKAGE_ID,
    requires_parent_identity_backfill: true,
    requires_child_replacement: false,
    evidence: [
      {
        source_key: 'pricecharting_csv_product_stamp',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/paradise-resort-world-championships-2025-staff-224',
        evidence_label: 'PriceCharting identifies Paradise Resort #224 World Championships 2025 Staff.',
      },
      {
        source_key: 'thepricedex_price_list',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.thepricedex.com/set/svp/scarlet-and-violet-black-star-promos/price-list',
        evidence_label: 'ThePriceDex supports SVP #224 Paradise Resort staff-stamped listing.',
      },
      {
        source_key: 'tcgplayer_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/649234/pokemon-sv-scarlet-and-violet-promo-cards-paradise-resort-224-world-championships-2025-staff',
        evidence_label: 'TCGplayer product page distinguishes Paradise Resort #224 World Championships 2025 Staff.',
      },
      {
        source_key: 'gamenerdz_product_page',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.gamenerdz.com/paradise-resort-224-world-championships-2025-staff-224-sv-scarlet-violet-promo-cards',
        evidence_label: 'GameNerdz product page distinguishes Paradise Resort #224 World Championships 2025 Staff.',
      },
    ],
  },
];

function publishableRows(rows) {
  return rows.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    language: 'en',
    source_count: row.source_count,
    sources: row.sources,
    source_kinds: row.source_kinds,
    status: row.status,
    evidence_urls: row.evidence_urls,
  }));
}

function evidenceRows(rows) {
  return rows.flatMap((row) => row.evidence_urls.map((sourceUrl, index) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    source_url: sourceUrl,
    source_key: row.sources[index],
    source_kind: row.source_kinds[index] ?? row.source_kinds[0],
  })));
}

function renderMarkdown(report) {
  return `# PKG-42A Final Source Closure Master Index Delta V1

Docs-only Master Index closure for the final supported source facts before the last identity backfill dry-run.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint_sha256', report.fingerprint_sha256],
    ['master_rows_inserted', report.summary.master_rows_inserted],
    ['master_rows_promoted', report.summary.master_rows_promoted],
    ['route_rows', report.summary.route_rows],
    ['completion_export_rows_inserted', report.summary.completion_export_rows_inserted],
    ['publishable_rows_inserted', report.summary.publishable_rows_inserted],
    ['publishable_evidence_rows_inserted', report.summary.publishable_evidence_rows_inserted],
  ])}

## Master Index Changes

${markdownTable(
    ['action', 'set', 'number', 'card', 'finish', 'sources'],
    report.master_changes.map((item) => [
      item.action,
      item.row.set_key,
      item.row.card_number,
      item.row.card_name,
      item.row.finish_key,
      item.row.sources.join(', '),
    ]),
  )}

## Route Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'active_finish', 'identity_backfill'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.accepted_finish_key,
      String(row.requires_parent_identity_backfill),
    ]),
  )}
`;
}

const master = await readJson(PRINTINGS_JSON);
const completionExport = await readJson(COMPLETION_EXPORT_JSON);
const sv03Printings = await readJson(SV03_PRINTINGS_JSON);
const sv03Evidence = await readJson(SV03_EVIDENCE_JSON);
const svpPrintings = await readJson(SVP_PRINTINGS_JSON);
const svpEvidence = await readJson(SVP_EVIDENCE_JSON);

const masterChanges = masterRows.map((row) => upsertMasterPrinting(master.printings, row));
const publishable = publishableRows(masterRows);
const evidence = evidenceRows(masterRows);
const addedCompletionPrintings = appendUnique(completionExport.printings, publishable, rowKey);
const addedSv03Printings = appendUnique(sv03Printings.printings, publishable.filter((row) => row.set_key === 'sv03'), rowKey);
const addedSvpPrintings = appendUnique(svpPrintings.printings, publishable.filter((row) => row.set_key === 'svp'), rowKey);
const addedSv03Evidence = appendUnique(sv03Evidence.evidence, evidence.filter((row) => row.set_key === 'sv03'), evidenceKey);
const addedSvpEvidence = appendUnique(svpEvidence.evidence, evidence.filter((row) => row.set_key === 'svp'), evidenceKey);

master.printings = sortPrintings(master.printings);
completionExport.printings = sortPrintings(completionExport.printings);
sv03Printings.printings = sortPrintings(sv03Printings.printings);
svpPrintings.printings = sortPrintings(svpPrintings.printings);

await writeJson(PRINTINGS_JSON, master);
await writeJson(COMPLETION_EXPORT_JSON, completionExport);
await writeJson(SV03_PRINTINGS_JSON, sv03Printings);
await writeJson(SV03_EVIDENCE_JSON, sv03Evidence);
await writeJson(SVP_PRINTINGS_JSON, svpPrintings);
await writeJson(SVP_EVIDENCE_JSON, svpEvidence);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg42a_final_source_closure_master_index_delta_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifacts: {
    printings_json: path.relative(ROOT, PRINTINGS_JSON),
    completion_export_json: path.relative(ROOT, COMPLETION_EXPORT_JSON),
    sv03_printings_json: path.relative(ROOT, SV03_PRINTINGS_JSON),
    sv03_evidence_json: path.relative(ROOT, SV03_EVIDENCE_JSON),
    svp_printings_json: path.relative(ROOT, SVP_PRINTINGS_JSON),
    svp_evidence_json: path.relative(ROOT, SVP_EVIDENCE_JSON),
  },
  summary: {
    master_rows_inserted: masterChanges.filter((item) => item.action === 'inserted').length,
    master_rows_promoted: masterChanges.filter((item) => item.action === 'promoted').length,
    master_rows_updated: masterChanges.filter((item) => item.action === 'updated').length,
    route_rows: routeRows.length,
    route_rows_requiring_identity_backfill: routeRows.filter((row) => row.requires_parent_identity_backfill).length,
    completion_export_rows_inserted: addedCompletionPrintings.length,
    publishable_rows_inserted: addedSv03Printings.length + addedSvpPrintings.length,
    publishable_evidence_rows_inserted: addedSv03Evidence.length + addedSvpEvidence.length,
  },
  master_changes: masterChanges,
  rows: routeRows,
  safety_confirmation: {
    docs_only: true,
    no_db_writes: true,
    no_migrations: true,
    not_apply_authority: true,
  },
};

report.fingerprint_sha256 = sha256(stableJson({
  package_id: PACKAGE_ID,
  master_rows: masterRows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    sources: row.sources,
    evidence_urls: row.evidence_urls,
  })),
  route_rows: routeRows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    accepted_finish_key: row.accepted_finish_key,
    selected_base_parent_id: row.selected_base_parent_id,
    evidence_urls: row.evidence.map((item) => item.source_url),
  })),
}));

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
