import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const PKG15K_JSON = path.join(
  DEFAULT_OUTPUT_DIR,
  'english_master_index_v1',
  'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.json',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'manual_web_stamped_finish_review_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'manual_web_stamped_finish_review_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'manual_web_stamped_finish_review_v1.md');

const PACKAGE_ID = 'PKG-15M-MANUAL-WEB-STAMPED-FINISH-REVIEW';

const CURATED_SOURCE_ROWS = [
  {
    source_key: 'bulbapedia_forbidden_light_set_list',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Forbidden_Light_(TCG)',
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '102',
    card_name: 'Beast Ring',
    expanded_variant_key: 'league_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: '102/131 Beast Ring - Reverse Holo Pokemon League Forbidden Light Season 3 promo (July 2018)',
    notes: 'Bulbapedia set list identifies Beast Ring #102/131 as a Reverse Holo Pokemon League Forbidden Light Season 3 promo.',
  },
  {
    source_key: 'nobleknight_league_championship_cards',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.nobleknight.com/P/2148463626/Beast-Ring---102-131-Pokemon-League-P-102-131-Reverse-Holo',
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '102',
    card_name: 'Beast Ring',
    expanded_variant_key: 'league_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Beast Ring - 102/131 (Pokemon League) (P) #102/131 (Reverse Holo)',
    notes: 'Noble Knight product page names the Pokemon League stamp identity and Reverse Holo finish.',
  },
  {
    source_key: 'bulbapedia_forbidden_light_set_list',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Forbidden_Light_(TCG)',
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '105',
    card_name: 'Diantha',
    expanded_variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: '105/131 Diantha - Reverse Holo Forbidden Light Season Regional Championships promo',
    notes: 'Bulbapedia set list identifies Diantha #105/131 as a Reverse Holo Regional Championships promo.',
  },
  {
    source_key: 'bulbapedia_forbidden_light_set_list',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Forbidden_Light_(TCG)',
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '105',
    card_name: 'Diantha',
    expanded_variant_key: 'regional_championships_staff_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: '105/131 Diantha - Reverse Holo Forbidden Light Season Regional Championships Staff promo',
    notes: 'Bulbapedia set list identifies Diantha #105/131 as a Reverse Holo Regional Championships Staff promo.',
  },
  {
    source_key: 'nobleknight_league_championship_cards',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.nobleknight.com/P/2148463390/Diantha---105-131-Regional-Championships-P-105-131-Reverse-Holo',
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '105',
    card_name: 'Diantha',
    expanded_variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Diantha - 105/131 (Regional Championships) (P) #105/131 (Reverse Holo)',
    notes: 'Noble Knight product page names the Regional Championships identity and Reverse Holo finish.',
  },
  {
    source_key: 'nobleknight_league_championship_cards',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.nobleknight.com/P/2148463577/Gladion---95-111-Regional-Championships-Staff-P-095-111-Reverse-Holo',
    set_key: 'sm4',
    set_name: 'Crimson Invasion',
    card_number: '95',
    card_name: 'Gladion',
    expanded_variant_key: 'regional_championships_staff_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Gladion - 95/111 (Regional Championships) [Staff] (P) #095/111 (Reverse Holo)',
    notes: 'Noble Knight product page names the Regional Championships Staff identity and Reverse Holo finish.',
  },
  {
    source_key: 'nobleknight_league_championship_cards',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.nobleknight.com/P/2148463359/Honedge---83-146-Regional-Championships-P-083-146-Reverse-Holo',
    set_key: 'xy1',
    set_name: 'XY',
    card_number: '83',
    card_name: 'Honedge',
    expanded_variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Honedge - 83/146 (Regional Championships) (P) #083/146 (Reverse Holo)',
    notes: 'Noble Knight product page names the Regional Championships identity and Reverse Holo finish.',
  },
  {
    source_key: 'pokumon_promo_database',
    source_kind: 'collector_reference',
    source_url: 'https://pokumon.com/card/oceania-championships-staff-ultra-ball-135-149-international-championships-oceania-special-print/',
    set_key: 'sm1',
    set_name: 'Sun & Moon',
    card_number: '135',
    card_name: 'Ultra Ball',
    expanded_variant_key: 'oceania_championships_staff_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Oceania Championships Staff Ultra Ball (135/149 International Championships Oceania Special Print) - Reverse Holo Staff promo',
    notes: 'Pokumon identifies the Staff Ultra Ball #135/149 Oceania Championships special print as Reverse Holo.',
  },
  {
    source_key: 'pricecharting_historic_sales_title',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-astral-radiance/roxanne-regional-championships-150',
    set_key: 'swsh10',
    set_name: 'Astral Radiance',
    card_number: '150',
    card_name: 'Roxanne',
    expanded_variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Pokemon Reverse Holo Roxanne 150/189 Regional Promo Card Astral Radiance',
    notes: 'PriceCharting historic sales table includes exact title evidence for Roxanne #150/189 Regional Promo as Reverse Holo.',
  },
  {
    source_key: 'pokumon_promo_database',
    source_kind: 'collector_reference',
    source_url: 'https://pokumon.com/card/cynthia-119a-156-regional-championships-special-print/',
    set_key: 'sm5',
    set_name: 'Ultra Prism',
    card_number: '119',
    card_name: 'Cynthia',
    expanded_variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Cynthia (119a/156 Regional Championships Special Print) - Reverse Holo Regional Championships promo',
    notes: 'Pokumon identifies Cynthia Regional Championships special print as Reverse Holo.',
  },
  {
    source_key: 'pokumon_promo_database',
    source_kind: 'collector_reference',
    source_url: 'https://pokumon.com/card/chaos-tower-94-124-national-championships-special-print/',
    set_key: 'xy10',
    set_name: 'Fates Collide',
    card_number: '94',
    card_name: 'Chaos Tower',
    expanded_variant_key: 'national_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Chaos Tower (94/124 National Championships Special Print) - Reverse Holo National Championships promo',
    notes: 'Pokumon identifies Chaos Tower #94/124 National Championships special print as Reverse Holo.',
  },
  {
    source_key: 'pokumon_promo_database',
    source_kind: 'collector_reference',
    source_url: 'https://pokumon.com/card/parallel-city-145-162-city-championships-special-print/',
    set_key: 'xy8',
    set_name: 'BREAKthrough',
    card_number: '145',
    card_name: 'Parallel City',
    expanded_variant_key: 'city_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Parallel City (145/162 City Championships Special Print) - Reverse Holo City Championships promo',
    notes: 'Pokumon identifies Parallel City #145/162 City Championships special print as Reverse Holo.',
  },
  {
    source_key: 'pokumon_promo_database',
    source_kind: 'collector_reference',
    source_url: 'https://pokumon.com/card/shinx-98-130-city-championships-special-print/',
    set_key: 'dp1',
    set_name: 'Diamond & Pearl',
    card_number: '98',
    card_name: 'Shinx',
    expanded_variant_key: 'city_championships_stamp',
    finish_key: 'normal',
    evidence_type: 'finish_presence',
    evidence_label: 'Shinx (98/130 City Championships Special Print) - Non-holo City Championships promo',
    notes: 'Pokumon identifies Shinx #98/130 City Championships special print as Non-holo.',
  },
];

const CONFLICT_REVIEW_ROWS = [
  {
    source_key: 'tcgplayer_misc_product',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/666533/pokemon-miscellaneous-cards-and-products-suicune-cosmos-holo-gamestop-exclusive',
    set_key: 'me02',
    set_name: 'Phantasmal Flames',
    card_number: '026',
    card_name: 'Suicune',
    expanded_variant_key: 'gamestop_stamp',
    current_pkg15k_finish_key: 'holo',
    observed_finish_key: 'cosmos',
    evidence_type: 'conflicting_finish_observation',
    evidence_label: 'Suicune (Cosmos Holo) (Gamestop Exclusive), #026/094',
    notes: 'This conflicts with the current PKG-15K plain holo candidate and must block plain-holo promotion until adjudicated.',
  },
  {
    source_key: 'pokescope_variant_page',
    source_kind: 'collector_reference',
    source_url: 'https://pokescope.app/card/me2-26/',
    set_key: 'me02',
    set_name: 'Phantasmal Flames',
    card_number: '026',
    card_name: 'Suicune',
    expanded_variant_key: 'gamestop_stamp',
    current_pkg15k_finish_key: 'holo',
    observed_finish_key: 'cosmos',
    evidence_type: 'conflicting_finish_observation',
    evidence_label: 'Suicune Phantasmal Flames GameStop Cosmos Holo Promo 026/094',
    notes: 'This supports treating GameStop Suicune as a cosmos/stamped identity review row rather than a plain holo child insertion.',
  },
];

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

function exactKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeText(row.card_number).replace(/^0+(?=\d)/, ''),
    normalizeText(row.card_name),
    normalizeText(row.expanded_variant_key),
    normalizeText(row.finish_key),
  ].join('|');
}

function renderMarkdown(report) {
  const usefulRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.expanded_variant_key,
    row.finish_key,
    row.source_key,
    row.match_status,
  ]);
  const conflictRows = report.conflict_review_rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.expanded_variant_key,
    row.current_pkg15k_finish_key,
    row.observed_finish_key,
    row.source_key,
  ]);

  return [
    '# Manual Web Stamped Finish Review V1',
    '',
    'Audit-only review of stable human-readable/checklist pages found during stamped blocker source acquisition.',
    '',
    '## Safety',
    '',
    `- audit_only: ${report.audit_only}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- write_ready_now: ${report.write_ready_now}`,
    '',
    '## Summary',
    '',
    `- curated_source_rows: ${report.summary.curated_source_rows}`,
    `- exact_pkg15k_matches: ${report.summary.exact_pkg15k_matches}`,
    `- unmatched_rows: ${report.summary.unmatched_rows}`,
    `- conflict_review_rows: ${report.summary.conflict_review_rows}`,
    '',
    '## Exact Source Rows',
    '',
    markdownTable(['set', 'number', 'card', 'variant', 'finish', 'source', 'match'], usefulRows),
    '',
    '## Conflict Review Rows',
    '',
    conflictRows.length
      ? markdownTable(['set', 'number', 'card', 'variant', 'current_finish', 'observed_finish', 'source'], conflictRows)
      : 'No conflict review rows.',
    '',
    '## Governance',
    '',
    '- These rows do not execute DB writes.',
    '- Stable checklist/product pages may be used by a later guarded readiness package only when exact identity and finish remain aligned.',
    '- Suicune GameStop is intentionally not promoted as plain holo because multiple sources identify the active finish as cosmos.',
    '',
  ].join('\n');
}

async function main() {
  const pkg15k = await readJson(PKG15K_JSON);
  const pkg15kKeys = new Set(pkg15k.rows.map(exactKey));
  const rows = CURATED_SOURCE_ROWS.map((row) => ({
    ...row,
    retrieved_at: new Date().toISOString(),
    raw_snapshot_ref: null,
    match_status: pkg15kKeys.has(exactKey(row)) ? 'exact_pkg15k_match' : 'not_in_pkg15k_exact_candidates',
  }));
  const conflictReviewRows = CONFLICT_REVIEW_ROWS.map((row) => ({
    ...row,
    retrieved_at: new Date().toISOString(),
    raw_snapshot_ref: null,
  }));
  const reportBase = {
    generated_at: new Date().toISOString(),
    version: 'manual_web_stamped_finish_review_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    input_artifact: path.relative(ROOT, PKG15K_JSON).replace(/\\/g, '/'),
    summary: {
      curated_source_rows: rows.length,
      exact_pkg15k_matches: rows.filter((row) => row.match_status === 'exact_pkg15k_match').length,
      unmatched_rows: rows.filter((row) => row.match_status !== 'exact_pkg15k_match').length,
      conflict_review_rows: conflictReviewRows.length,
    },
    rows,
    conflict_review_rows: conflictReviewRows,
  };
  const report = {
    ...reportBase,
    fingerprint_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      rows,
      conflict_review_rows: conflictReviewRows,
    })),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    exact_pkg15k_matches: report.summary.exact_pkg15k_matches,
    conflict_review_rows: report.summary.conflict_review_rows,
    write_ready_now: report.write_ready_now,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
