import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const INPUT_JSON = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1', 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1.json');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'manual_web_same_finish_split_review_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'manual_web_same_finish_split_review_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'manual_web_same_finish_split_review_v1.md');

const PACKAGE_ID = 'PKG-16D-MANUAL-WEB-SAME-FINISH-SPLIT-REVIEW';

const CURATED_ROWS = [
  {
    source_key: 'pricecharting_product_page',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-dark-explorers/jolteon-regional-championship-37',
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '37',
    card_name: 'Jolteon',
    variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Jolteon [Regional Championship] #37 page includes Reverse Foils pricing lane.',
    notes: 'Exact second-source evidence for Jolteon #37 Regional Championship reverse finish.',
  },
  {
    source_key: 'tcgplayer_league_championship_product',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/209530/pokemon-league-and-championship-cards-eevee-84-108-city-championships',
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '84',
    card_name: 'Eevee',
    variant_key: 'city_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Eevee - 84/108 (City Championships) has Reverse Holofoil listing.',
    notes: 'Exact second-source evidence for Eevee #84 City Championships reverse finish.',
  },
  {
    source_key: 'tcgplayer_league_championship_product',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/209556/pokemon-league-and-championship-cards-doublade-84-146-regional-championships',
    set_key: 'xy1',
    set_name: 'XY',
    card_number: '84',
    card_name: 'Doublade',
    variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Doublade - 84/146 (Regional Championships) page includes Reverse Holofoil pricing.',
    notes: 'Exact second-source evidence for Doublade #84 Regional Championships reverse finish.',
  },
  {
    source_key: 'card_cavern_product_page',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.cardcaverntradingcards.com/products/doublade-84-146-regionalchampionshippromo-reverseholo',
    set_key: 'xy1',
    set_name: 'XY',
    card_number: '84',
    card_name: 'Doublade',
    variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Doublade - 84/146 - Regional Championship Promo - Reverse Holo.',
    notes: 'Additional exact marketplace checklist support for Doublade #84 Regional Championships reverse finish.',
  },
  {
    source_key: 'moonshot_game_store_product_page',
    source_kind: 'marketplace_checklist',
    source_url: 'https://moonshotgamestore.com/products/pr-doublade-84-146-regional-championships-staff-reverse-holofoil',
    set_key: 'xy1',
    set_name: 'XY',
    card_number: '84',
    card_name: 'Doublade',
    variant_key: 'regional_championships_staff_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Doublade - 84/146 (Regional Championships) [Staff] (Reverse Holofoil).',
    notes: 'Exact second-source evidence for Doublade #84 Regional Championships Staff reverse finish.',
  },
  {
    source_key: 'tcgplayer_league_championship_product',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/282283/pokemon-league-and-championship-cards-roxanne-150-189-regional-championships-staff',
    set_key: 'swsh10',
    set_name: 'Astral Radiance',
    card_number: '150',
    card_name: 'Roxanne',
    variant_key: 'regional_championships_staff_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Roxanne - 150/189 (Regional Championships) [Staff] lists Reverse Holofoil condition.',
    notes: 'Exact second-source evidence for Roxanne #150 Regional Championships Staff reverse finish.',
  },
  {
    source_key: 'pricecharting_historic_sales_title',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-sun-%26-moon/professor-kukui-reverse-holo-128',
    set_key: 'sm1',
    set_name: 'Sun & Moon',
    card_number: '128',
    card_name: 'Professor Kukui',
    variant_key: 'regional_championships_stamp',
    finish_key: 'reverse',
    evidence_type: 'finish_presence',
    evidence_label: 'Professor Kukui reverse holo page includes Regional Championship Promo sales title.',
    notes: 'Review-tier second-source evidence for Professor Kukui #128 Regional Championships reverse finish.',
  },
];

const CONFLICT_REVIEW_ROWS = [
  {
    source_key: 'pricecharting_product_page',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-dark-explorers/vaporeon-championship-25',
    set_key: 'bw5',
    card_number: '25',
    card_name: 'Vaporeon',
    variant_key: 'regional_championships_staff_stamp',
    current_pkg16b_finish_key: 'reverse',
    observed_finish_key: 'holo',
    evidence_type: 'conflicting_finish_observation',
    evidence_label: 'Vaporeon Championship page/sales text uses Holo/Crosshatch Championship wording, not exact Reverse Holo.',
    notes: 'Do not promote Vaporeon reverse split rows from this source without finish adjudication.',
  },
  {
    source_key: 'pricecharting_product_page',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-xy/aegislash-85',
    set_key: 'xy1',
    card_number: '85',
    card_name: 'Aegislash',
    variant_key: 'regional_championships_stamp',
    current_pkg16b_finish_key: 'reverse',
    observed_finish_key: 'holo',
    evidence_type: 'conflicting_finish_observation',
    evidence_label: 'Aegislash page/sales text uses Crosshatch Holo Regional Championships wording.',
    notes: 'Do not promote Aegislash reverse split rows from this source without finish adjudication.',
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

function matchKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeText(row.variant_key),
    normalizeText(row.finish_key),
  ].join('|');
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.finish_key,
    row.match_status,
    row.source_url,
  ]);
  const conflicts = report.conflict_review_rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.current_pkg16b_finish_key,
    row.observed_finish_key,
    row.source_url,
  ]);
  return `# PKG-16D Manual Web Same-Finish Split Review V1

Audit-only curated second-source review for PKG-16B same-finish stamped split candidates.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- write_ready_now: ${report.write_ready_now}

## Summary

- curated_source_rows: ${report.summary.curated_source_rows}
- exact_pkg16b_matches: ${report.summary.exact_pkg16b_matches}
- unmatched_rows: ${report.summary.unmatched_rows}
- conflict_review_rows: ${report.summary.conflict_review_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Accepted Review Rows

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'match_status', 'url'], rows)}

## Conflict Review Rows

${conflicts.length ? markdownTable(['set', 'number', 'name', 'variant', 'current_finish', 'observed_finish', 'url'], conflicts) : 'No conflicts recorded.'}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const targetKeys = new Set((input.rows ?? [])
    .filter((row) => row.status === 'blocked_second_independent_source_needed')
    .map(matchKey));
  const rows = CURATED_ROWS.map((row) => ({
    ...row,
    retrieved_at: new Date().toISOString(),
    match_status: targetKeys.has(matchKey(row)) ? 'exact_pkg16b_match' : 'unmatched_pkg16b_target',
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'manual_web_same_finish_split_review_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    input_artifact: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    summary: {
      curated_source_rows: rows.length,
      exact_pkg16b_matches: rows.filter((row) => row.match_status === 'exact_pkg16b_match').length,
      unmatched_rows: rows.filter((row) => row.match_status !== 'exact_pkg16b_match').length,
      conflict_review_rows: CONFLICT_REVIEW_ROWS.length,
    },
    rows,
    conflict_review_rows: CONFLICT_REVIEW_ROWS.map((row) => ({ ...row, retrieved_at: new Date().toISOString() })),
  };
  report.fingerprint_sha256 = sha256(stableJson({
    rows: report.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      source_key: row.source_key,
      source_url: row.source_url,
      match_status: row.match_status,
    })),
    conflicts: report.conflict_review_rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      observed_finish_key: row.observed_finish_key,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    summary: report.summary,
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
