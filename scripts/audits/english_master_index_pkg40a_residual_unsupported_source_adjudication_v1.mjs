import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CURRENT_UNSUPPORTED_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const MASTER_PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1.md');

const PACKAGE_ID = 'PKG-40A-RESIDUAL-UNSUPPORTED-SOURCE-ADJUDICATION';

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

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '');
}

function rowKey(row) {
  return [
    normalizeText(row.set_code ?? row.set_key),
    normalizeNumber(row.card_number ?? row.number),
    normalizeText(row.card_name),
    normalizeText(row.finish_key),
    normalizeText(row.printed_identity_modifier),
    normalizeText(row.variant_key),
  ].join('|');
}

function masterKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeText(row.finish_key),
  ].join('|');
}

function evidence(sourceKey, sourceKind, sourceUrl, evidenceLabel) {
  return { source_key: sourceKey, source_kind: sourceKind, source_url: sourceUrl, evidence_label: evidenceLabel };
}

// This is an adjudication fixture, not a truth mutation. Each ready row still needs
// a dedicated guarded package before any DB state can change.
const ADJUDICATIONS = [
  {
    match: ['col1', '33', 'Snorlax', 'holo', '', 'staff_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'staff_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-call-of-legends/snorlax-staff-pre-release-33', 'PriceCharting identifies Snorlax #33 Staff Pre-Release as a holo Call of Legends printing.'),
      evidence('goldin_auction_page', 'collector_reference', 'https://goldin.co/item/2011-pokemon-call-of-legends-prerelease-staff-holo-33-snorlax-psa-gempopl7', 'Goldin identifies 2011 Call of Legends Prerelease Staff Holo #33 Snorlax.'),
    ],
  },
  {
    match: ['g1', '14', 'Ponyta', 'holo', '', 'stamped'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'stamped',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-generations/ponyta-toys-r-us-14', 'PriceCharting identifies Ponyta #14 Toys R Us stamped promo as holo.'),
      evidence('pokecardvalues_checklist', 'collector_reference', 'https://pokecardvalues.co.uk/cards/ponyta-14-83-holo-toys-r-us-promo-generations/g1-14-1-91/', 'PokeCardValues identifies Ponyta #14 Generations Toys R Us promo as holo.'),
    ],
  },
  {
    match: ['np', '25', 'Flygon', 'holo', '', 'winner_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'winner_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('bulbapedia_card_page_release_info', 'human_readable_checklist', 'https://bulbapedia.bulbagarden.net/wiki/Flygon_(Nintendo_Promo_25)', 'Bulbapedia documents the Nintendo Promo #25 Flygon Winner stamped release.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/np/nintendo-black-star-promos/price-list', 'ThePriceDex Nintendo Black Star Promos list carries the Flygon #25 stamped promo evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl1', '112', 'PlusPower', 'holo', '', 'player_rewards_crosshatch_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'player_rewards_crosshatch_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pokumon_player_rewards_special_print', 'collector_reference', 'https://pokumon.com/card/pluspower-112-127-player-rewards-program-special-print/', 'Pokumon identifies PlusPower #112 as a Player Rewards Program special print.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/pl1/platinum/price-list', 'ThePriceDex Platinum list carries PlusPower #112 special print evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl2', '102', 'Upper Energy', 'holo', '', 'player_rewards_crosshatch_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'player_rewards_crosshatch_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pokumon_player_rewards_special_print', 'collector_reference', 'https://pokumon.com/card/upper-energy-102-111-player-rewards-program-special-print/', 'Pokumon identifies Upper Energy #102 as a Player Rewards Program special print.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/pl2/rising-rivals/price-list', 'ThePriceDex Rising Rivals list carries Upper Energy #102 special print evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl2', '33', 'Snorlax', 'holo', '', 'league_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'league_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pricecharting_csv_product', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-rising-rivals/snorlax-pokemon-league-holo-33', 'PriceCharting identifies Snorlax #33 Rising Rivals Pokemon League Holo.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/pl2/rising-rivals/price-list', 'ThePriceDex Rising Rivals list carries Snorlax #33 league stamped evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl2', '92', "Lucian's Assignment", 'holo', '', 'player_rewards_crosshatch_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'player_rewards_crosshatch_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pokumon_player_rewards_special_print', 'collector_reference', 'https://pokumon.com/card/lucians-assignment-92-111-player-rewards-program-special-print/', 'Pokumon identifies Lucian\'s Assignment #92 as a Player Rewards Program special print.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/pl2/rising-rivals/price-list', 'ThePriceDex Rising Rivals list carries Lucian\'s Assignment #92 special print evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl2', '97', 'Underground Expedition', 'holo', '', 'player_rewards_crosshatch_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'player_rewards_crosshatch_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence + parent identity backfill dry-run',
    evidence: [
      evidence('pricecharting_csv_product', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-rising-rivals/underground-expedition-crosshatch-holo-97', 'PriceCharting identifies Underground Expedition #97 as Crosshatch Holo.'),
      evidence('thepricedex_price_list', 'marketplace_checklist', 'https://www.thepricedex.com/set/pl2/rising-rivals/price-list', 'ThePriceDex Rising Rivals list carries Underground Expedition #97 special print evidence used by the Master Index.'),
    ],
  },
  {
    match: ['pl3', '106', 'Gible', 'holo', '', 'staff_stamp'],
    proposed_status: 'active_finish_conflict_replace_with_reverse_review_ready',
    proposed_active_finish_key: 'reverse',
    proposed_variant_key: 'staff_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40C reverse stamped replacement dry-run after route proof',
    evidence: [
      evidence('pokemonflashfire_product_page', 'collector_reference', 'https://pokemonflashfire.com/product/gible-staff-106147-reverse-holo-pokemon-league-promo/', 'Pokemon Flashfire identifies Gible #106 Staff as Reverse Holo / Crosshatch Holofoil.'),
      evidence('pokecardvalues_checklist', 'collector_reference', 'https://pokecardvalues.co.uk/cards/gible-106-147-reverse-holo-unlimited-supreme-victors/pl3-106-3-1/', 'PokeCardValues lists Gible #106 Staff City Championships as Reverse Holo.'),
    ],
  },
  {
    match: ['smp', '198', 'Bulbasaur', 'normal', '', 'pikachu_stamp'],
    proposed_status: 'active_finish_conflict_replace_with_holo_review_ready',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'pikachu_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40C holo stamped replacement dry-run after Master Index delta',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-promo/bulbasaur-stamped-sm198', 'PriceCharting identifies Bulbasaur SM198 Detective Pikachu stamped sales as holo.'),
      evidence('coolstuffinc_product_page', 'marketplace_checklist', 'https://www.coolstuffinc.com/p/Pokemon/Bulbasaur%2B%28Detective%2BPikachu%2BStamp%29%2B-%2BSM198', 'CoolStuffInc identifies Bulbasaur SM198 as Detective Pikachu stamped.'),
    ],
  },
  {
    match: ['smp', '65', 'Alolan Raichu', 'normal', '', 'battle_academy_deck_mark'],
    proposed_status: 'master_index_delta_and_identity_backfill_ready',
    proposed_active_finish_key: 'normal',
    proposed_variant_key: 'battle_academy_deck_mark',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40D Battle Academy Master Index delta + identity backfill dry-run',
    evidence: [
      evidence('pokumon_battle_academy_page', 'collector_reference', 'https://pokumon.com/card/non-holo-56-stamp-alolan-raichu-sm65-english-promo/', 'Pokumon identifies Alolan Raichu SM65 Battle Academy #56 stamp as non-holo.'),
      evidence('ebay_product_page', 'marketplace_checklist', 'https://www.ebay.com/itm/186075562807', 'eBay product title identifies Alolan Raichu SM65 Battle Academy as Non-Holo Promo.'),
    ],
  },
  {
    match: ['sv03', '196', 'Town Store', 'cosmos', 'play_pokemon_stamp', 'play_pokemon_stamp'],
    proposed_status: 'stamped_active_finish_route_ready',
    proposed_active_finish_key: 'cosmos',
    proposed_variant_key: 'play_pokemon_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'PKG-40B stamped route evidence dry-run',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-obsidian-flames/town-store-play-pokemon-prize-pack-196', 'PriceCharting identifies Town Store #196 Play Pokemon Prize Pack product evidence.'),
      evidence('tcgplayer_product_page', 'marketplace_checklist', 'https://www.tcgplayer.com/product/509788/pokemon-sv03-obsidian-flames-town-store', 'TCGplayer identifies Town Store #196 in Obsidian Flames; route remains active-finish review because the public page is base-product oriented.'),
    ],
  },
  {
    match: ['svp', '224', 'Paradise Resort', 'normal', '', 'world_championships_2025_staff_stamp'],
    proposed_status: 'stamped_active_finish_route_and_identity_backfill_needs_finish_confirmation',
    proposed_active_finish_key: 'normal',
    proposed_variant_key: 'world_championships_2025_staff_stamp',
    required_master_fact: 'stamped',
    recommended_next_package: 'manual finish confirmation before dry-run',
    evidence: [
      evidence('tcgplayer_product_page', 'marketplace_checklist', 'https://www.tcgplayer.com/product/649234/pokemon-sv-scarlet-and-violet-promo-cards-paradise-resort-224-world-championships-2025-staff', 'TCGplayer identifies Paradise Resort #224 World Championships 2025 Staff.'),
      evidence('gamenerdz_product_page', 'marketplace_checklist', 'https://www.gamenerdz.com/paradise-resort-224-world-championships-2025-staff-224-sv-scarlet-violet-promo-cards', 'GameNerdz identifies Paradise Resort #224 World Championships 2025 Staff.'),
    ],
  },
  {
    match: ['svp', '224', 'Paradise Resort', 'normal', '', ''],
    proposed_status: 'master_index_delta_needs_finish_confirmation',
    proposed_active_finish_key: 'normal',
    proposed_variant_key: '',
    required_master_fact: 'normal',
    recommended_next_package: 'manual finish confirmation before dry-run',
    evidence: [
      evidence('slabadvisor_catalog_page', 'collector_reference', 'https://www.slabadvisor.com/browse/pokemon/svp', 'Slab Advisor lists Paradise Resort #224 World Championships 2025 and separate Staff variant rows.'),
      evidence('ebay_category_page', 'marketplace_checklist', 'https://www.ebay.com/b/Paradise-Resort-Pokemon-TCG-Cards/2536/bn_7124869754', 'eBay category/listings show Paradise Resort SVP 224 World Championship 2025 examples, including staff and non-staff listings.'),
    ],
  },
  {
    match: ['svp', '500', 'Terapagos & Friends', 'normal', '', ''],
    proposed_status: 'master_index_delta_needs_second_exact_source',
    proposed_active_finish_key: 'normal',
    proposed_variant_key: '',
    required_master_fact: 'normal',
    recommended_next_package: 'source acquisition before dry-run',
    evidence: [
      evidence('pricecharting_search_page', 'marketplace_checklist', 'https://www.pricecharting.com/search-products?q=terapagos+%26amp%3Bamp%3B+friends+jumbo&type=prices', 'PriceCharting search result includes Terapagos & Friends under Pokemon Promo.'),
      evidence('slabadvisor_catalog_page', 'collector_reference', 'https://www.slabadvisor.com/browse/pokemon/svp', 'Slab Advisor lists Terapagos & Friends #500 in the SVP catalog.'),
    ],
  },
  {
    match: ['g1', '28', 'Jolteon-EX', 'reverse', '', 'a'],
    proposed_status: 'delete_candidate_no_reverse_evidence_after_holo_suffix_verified',
    proposed_active_finish_key: 'holo',
    proposed_variant_key: 'a',
    required_master_fact: 'holo',
    recommended_next_package: 'PKG-40E dependency-zero child delete dry-run',
    evidence: [
      evidence('tcgplayer_product_page', 'marketplace_checklist', 'https://www.tcgplayer.com/product/131697/pokemon-alternate-art-promos-jolteon-ex-28a-83', 'TCGplayer identifies Jolteon EX #28a alternate art promo product.'),
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-generations/jolteon-ex-28a', 'PriceCharting identifies Jolteon EX #28a sales as holo/full-art promo; no reverse evidence found in current source pass.'),
    ],
  },
  {
    match: ['np', '35', 'Pikachu δ', 'reverse', 'delta_species', ''],
    proposed_status: 'delete_candidate_no_reverse_evidence_holo_normal_preserved',
    proposed_active_finish_key: null,
    proposed_variant_key: '',
    required_master_fact: null,
    recommended_next_package: 'PKG-40E dependency-zero child delete dry-run',
    evidence: [
      evidence('serebii_set_database', 'human_readable_checklist', 'https://www.serebii.net/card/nintendopromo/', 'Serebii lists Nintendo Promo #35 Pikachu δ but does not provide exact reverse evidence for this card.'),
      evidence('pokegym_trade_thread', 'collector_reference', 'https://pokegym.net/community/index.php?threads%2Fw-secret-reuniclus-h-landorus-ex-various-bits-and-pieces.126161%2Fpost-2223262=', 'PokeGym historical discussion explicitly notes Nintendo Promo #35 Pikachu δ is not reverse holo.'),
    ],
  },
  {
    match: ['xyp', '177', 'Karen', 'holo', '', 'XY'],
    proposed_status: 'delete_candidate_suffix_normalization_duplicate',
    proposed_active_finish_key: null,
    proposed_variant_key: 'XY',
    required_master_fact: null,
    recommended_next_package: 'PKG-40E dependency-zero child delete dry-run',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-promo/karen-xy177a', 'PriceCharting identifies the holo printing as Karen XY177a, not XY177 with variant XY.'),
      evidence('noble_knight_product_page', 'marketplace_checklist', 'https://www.nobleknight.com/P/2148465200/Karen-P-XY177a-Holo', 'Noble Knight identifies Karen holo as XY177a.'),
    ],
  },
  {
    match: ['xyp', '177', 'Karen', 'reverse', '', 'XY'],
    proposed_status: 'delete_candidate_no_reverse_evidence_suffix_normalization_duplicate',
    proposed_active_finish_key: null,
    proposed_variant_key: 'XY',
    required_master_fact: null,
    recommended_next_package: 'PKG-40E dependency-zero child delete dry-run',
    evidence: [
      evidence('pricecharting_sales_page', 'marketplace_checklist', 'https://www.pricecharting.com/game/pokemon-promo/karen-xy177a', 'PriceCharting identifies the alternate suffix printing as holo XY177a; no reverse evidence found.'),
      evidence('noble_knight_product_page', 'marketplace_checklist', 'https://www.nobleknight.com/P/2148465200/Karen-P-XY177a-Holo', 'Noble Knight identifies Karen XY177a as holo.'),
    ],
  },
];

function findRows(payload) {
  if (Array.isArray(payload.unsupported_rows)) return payload.unsupported_rows;
  if (Array.isArray(payload.rows)) return payload.rows;
  return [];
}

function buildMasterFactMap(masterPayload) {
  const map = new Map();
  for (const row of masterPayload.printings ?? []) {
    if (row.status !== 'master_verified') continue;
    map.set(masterKey(row), row);
  }
  return map;
}

function toMatchKey(match) {
  const [setKey, number, cardName, finishKey, modifier, variant] = match;
  return [normalizeText(setKey), normalizeNumber(number), normalizeText(cardName), normalizeText(finishKey), normalizeText(modifier), normalizeText(variant)].join('|');
}

function currentRowMatchKey(row) {
  return rowKey({
    set_code: row.set_code ?? row.set_key,
    card_number: row.card_number ?? row.number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printed_identity_modifier: row.printed_identity_modifier,
    variant_key: row.variant_key,
  });
}

function classifySummary(rows) {
  const byStatus = {};
  const byPackage = {};
  for (const row of rows) {
    byStatus[row.proposed_status] = (byStatus[row.proposed_status] ?? 0) + 1;
    byPackage[row.recommended_next_package] = (byPackage[row.recommended_next_package] ?? 0) + 1;
  }
  return { by_status: byStatus, by_recommended_next_package: byPackage };
}

function renderMarkdown(report) {
  return `# PKG-40A Residual Unsupported Source Adjudication V1

Audit-only classification of the current residual unsupported rows after PKG-39A.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_performed: ${report.real_apply_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint_sha256', report.fingerprint_sha256],
    ['input_unsupported_rows', report.summary.input_unsupported_rows],
    ['adjudicated_rows', report.summary.adjudicated_rows],
    ['unmatched_rows', report.summary.unmatched_rows],
    ['source_evidence_rows', report.summary.source_evidence_rows],
  ])}

## Status Buckets

${markdownTable(['status', 'count'], Object.entries(report.summary.by_status).map(([key, value]) => [key, value]))}

## Recommended Next Packages

${markdownTable(['next package', 'count'], Object.entries(report.summary.by_recommended_next_package).map(([key, value]) => [key, value]))}

## Rows

${markdownTable(
    ['set', 'number', 'card', 'current_finish', 'variant', 'status', 'next package'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.current_finish_key,
      row.current_variant_key || '',
      row.proposed_status,
      row.recommended_next_package,
    ]),
  )}

## Guardrail

This report is not a delete/apply authority by itself. Rows marked ready still require a dedicated dry-run package, dependency proof, fingerprint, and explicit real-apply approval before any DB write.
`;
}

const currentUnsupported = await readJson(CURRENT_UNSUPPORTED_JSON);
const masterPrintings = await readJson(MASTER_PRINTINGS_JSON);
const currentRows = findRows(currentUnsupported);
const masterFacts = buildMasterFactMap(masterPrintings);
const adjudicationByKey = new Map(ADJUDICATIONS.map((row) => [toMatchKey(row.match), row]));

const rows = currentRows.map((row) => {
  const key = currentRowMatchKey(row);
  const adjudication = adjudicationByKey.get(key);
  const setKey = row.set_code ?? row.set_key;
  const cardNumber = row.card_number ?? row.number;
  const requiredMasterFactKey = adjudication?.required_master_fact
    ? masterKey({
      set_key: setKey,
      card_number: cardNumber,
      card_name: row.card_name,
      finish_key: adjudication.required_master_fact,
    })
    : null;
  const requiredMasterFact = requiredMasterFactKey ? masterFacts.get(requiredMasterFactKey) : null;
  return {
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    set_key: setKey,
    card_number: cardNumber,
    card_name: row.card_name,
    current_finish_key: row.finish_key,
    current_printed_identity_modifier: row.printed_identity_modifier ?? '',
    current_variant_key: row.variant_key ?? '',
    current_lane: row.lane,
    dependency_refs: {
      vault_item_instance_refs: Number(row.vault_item_instance_refs ?? 0),
      external_printing_mapping_refs: Number(row.external_printing_mapping_refs ?? 0),
      canon_warehouse_candidate_refs: Number(row.canon_warehouse_candidate_refs ?? 0),
      truth_review_refs: Number(row.truth_review_refs ?? 0),
      justtcg_mapping_refs: Number(row.justtcg_mapping_refs ?? 0),
    },
    proposed_status: adjudication?.proposed_status ?? 'unmatched_needs_manual_review',
    proposed_active_finish_key: adjudication?.proposed_active_finish_key ?? null,
    proposed_variant_key: adjudication?.proposed_variant_key ?? null,
    required_master_fact_finish_key: adjudication?.required_master_fact ?? null,
    required_master_fact_exists: Boolean(requiredMasterFact),
    required_master_fact_sources: requiredMasterFact?.sources ?? [],
    evidence: adjudication?.evidence ?? [],
    evidence_count: adjudication?.evidence?.length ?? 0,
    recommended_next_package: adjudication?.recommended_next_package ?? 'manual review before dry-run',
  };
});

const summaryBuckets = classifySummary(rows);
const unmatchedRows = rows.filter((row) => row.proposed_status === 'unmatched_needs_manual_review');
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  real_apply_performed: false,
  source_artifacts: {
    current_unsupported_json: path.relative(ROOT, CURRENT_UNSUPPORTED_JSON),
    master_printings_json: path.relative(ROOT, MASTER_PRINTINGS_JSON),
  },
  summary: {
    input_unsupported_rows: currentRows.length,
    adjudicated_rows: rows.length - unmatchedRows.length,
    unmatched_rows: unmatchedRows.length,
    source_evidence_rows: rows.reduce((sum, row) => sum + row.evidence_count, 0),
    ...summaryBuckets,
  },
  rows,
  unmatched_rows: unmatchedRows,
  safety_confirmation: {
    no_db_writes: true,
    no_migrations: true,
    no_deletes: true,
    no_merges: true,
    no_quarantine: true,
    not_apply_authority: true,
  },
};

report.fingerprint_sha256 = sha256(stableJson({
  package_id: PACKAGE_ID,
  rows: rows.map((row) => ({
    card_printing_id: row.card_printing_id,
    proposed_status: row.proposed_status,
    proposed_active_finish_key: row.proposed_active_finish_key,
    proposed_variant_key: row.proposed_variant_key,
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
