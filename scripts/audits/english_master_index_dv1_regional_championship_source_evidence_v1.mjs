import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_dv1_regional_championship_source_evidence_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_dv1_regional_championship_source_evidence_v1.md');

const EVIDENCE_ROWS = [
  {
    set_key: 'dv1',
    set_name: 'Dragon Vault',
    card_number: '6',
    card_name: 'Bagon',
    current_queue_variant_key: 'league_stamp',
    observed_variant_key: 'regional_championships_stamp',
    observed_stamp_label: 'Regional Championships Stamp',
    observed_finish_family: 'crosshatch_holo',
    active_finish_recommendation: 'needs_finish_taxonomy_adjudication',
    status: 'source_agreed_taxonomy_blocked',
    reason_blocked: 'Sources support a Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.',
    evidence_sources: [
      {
        source_key: 'tcgplayer',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/232883/pokemon-league-and-championship-cards-bagon-6-20-regional-championships',
        evidence_label: 'TCGplayer product: Bagon - 6/20 (Regional Championships).',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-dragon-vault/bagon-regional-championships-6',
        evidence_label: 'PriceCharting product: Bagon [Regional Championships] #6.',
      },
      {
        source_key: 'cardtrader',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.cardtrader.com/en/cards/114410-bagon-regional-championships-holo-promo-6-20-league-promos',
        evidence_label: 'CardTrader product: Bagon Regional Championships Holo Promo 6/20.',
      },
      {
        source_key: 'pokecardvalues',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/bagon-6-20-reverse-holo-staff-regional-championships-dragon-vault/dv1-6-3-83/',
        evidence_label: 'Poke Card Values related Dragon Vault Regional Championships/Staff page family.',
      },
    ],
  },
  {
    set_key: 'dv1',
    set_name: 'Dragon Vault',
    card_number: '7',
    card_name: 'Shelgon',
    current_queue_variant_key: 'league_stamp',
    observed_variant_key: 'regional_championships_stamp',
    observed_stamp_label: 'Regional Championships Stamp',
    observed_finish_family: 'crosshatch_holo',
    active_finish_recommendation: 'needs_finish_taxonomy_adjudication',
    status: 'source_agreed_taxonomy_blocked',
    reason_blocked: 'Sources support a Winter Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.',
    evidence_sources: [
      {
        source_key: 'bulbapedia_card_page',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Shelgon_(Dragon_Vault_7)',
        evidence_label: 'Bulbapedia card page notes a 2014 Winter Regional Championships participant print.',
      },
      {
        source_key: 'bulbapedia_set_page',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG)',
        evidence_label: 'Bulbapedia Dragon Vault set page lists Shelgon 7/20 Regional and Staff crosshatch promo rows.',
      },
      {
        source_key: 'tcgplayer',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/251200/pokemon-league-and-championship-cards-shelgon-7-20-regional-championships',
        evidence_label: 'TCGplayer product: Shelgon - 7/20 (Regional Championships).',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-dragon-vault/shelgon-regional-championship-7',
        evidence_label: 'PriceCharting product: Shelgon [Regional Championship] #7.',
      },
      {
        source_key: 'cardtrader',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.cardtrader.com/en/cards/114413-shelgon-winter-regional-championships-holo-promo-007-020-dragon-vault',
        evidence_label: 'CardTrader product: Shelgon Winter Regional Championships Holo Promo 007/020.',
      },
      {
        source_key: 'pokecardvalues',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/shelgon-7-20-reverse-holo-regional-championships-dragon-vault/dv1-7-3-60/',
        evidence_label: 'Poke Card Values product: Shelgon 7/20 Regional Championships.',
      },
    ],
  },
  {
    set_key: 'dv1',
    set_name: 'Dragon Vault',
    card_number: '8',
    card_name: 'Salamence',
    current_queue_variant_key: 'league_stamp',
    observed_variant_key: 'regional_championships_stamp',
    observed_stamp_label: 'Regional Championships Stamp',
    observed_finish_family: 'crosshatch_holo',
    active_finish_recommendation: 'needs_finish_taxonomy_adjudication',
    status: 'source_agreed_taxonomy_blocked',
    reason_blocked: 'Sources support a Spring Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.',
    evidence_sources: [
      {
        source_key: 'bulbapedia_card_page',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Salamence_(Dragon_Vault_8)',
        evidence_label: 'Bulbapedia card page notes a Spring Regional Championships crosshatch print and separate Staff version.',
      },
      {
        source_key: 'bulbapedia_set_page',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG)',
        evidence_label: 'Bulbapedia Dragon Vault set page lists Salamence 8/20 Regional and Staff crosshatch promo rows.',
      },
      {
        source_key: 'tcgplayer',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/227091/pokemon-league-and-championship-cards-salamence-8-20-regional-championships',
        evidence_label: 'TCGplayer product: Salamence - 8/20 (Regional Championships).',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-dragon-vault/salamence-regional-championship-8',
        evidence_label: 'PriceCharting product: Salamence [Regional Championship] #8.',
      },
      {
        source_key: 'pokecardvalues',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/shelgon-7-20-reverse-holo-regional-championships-dragon-vault/dv1-7-3-60/',
        evidence_label: 'Poke Card Values related Dragon Vault Regional Championships family includes Salamence 8/20 Regional Championships.',
      },
    ],
  },
];

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
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function buildMarkdown(report) {
  return `# DV1 Regional Championship Source Evidence V1

Audit-only evidence capture for the remaining Dragon Vault league-stamp queue rows.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['source_agreed_taxonomy_blocked', report.summary.by_status.source_agreed_taxonomy_blocked ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Finding

The three remaining Dragon Vault rows are not generic \`league_stamp\` facts. External sources consistently point to Regional Championships crosshatch promo lanes. This is strong evidence for source acquisition, but not a DB write package until taxonomy is governed.

Required governance before write:

- Convert generic \`league_stamp\` queue rows to exact \`regional_championships_stamp\` where supported.
- Decide whether \`crosshatch_holo\` maps to an active finish key such as \`reverse\`, remains display metadata, or requires a future finish key.
- Keep Staff Regional Championships separate from non-Staff Regional Championships.

## Rows

${markdownTable(
    ['set', 'number', 'card', 'current variant', 'observed variant', 'finish family', 'status', 'sources'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.current_queue_variant_key,
      row.observed_variant_key,
      row.observed_finish_family,
      row.status,
      row.evidence_sources.length,
    ]),
  )}

## Evidence

${report.rows.map((row) => `### ${row.set_key} ${row.card_number} ${row.card_name}

Status: ${row.status}

Blocked reason: ${row.reason_blocked}

${markdownTable(
    ['source', 'kind', 'label', 'url'],
    row.evidence_sources.map((source) => [
      source.source_key,
      source.source_kind,
      source.evidence_label,
      source.source_url,
    ]),
  )}`).join('\n\n')}
`;
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_dv1_regional_championship_source_evidence_v1',
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
    },
    summary: {
      target_rows: EVIDENCE_ROWS.length,
      write_ready_now: 0,
      by_status: countBy(EVIDENCE_ROWS, (row) => row.status),
      by_observed_variant_key: countBy(EVIDENCE_ROWS, (row) => row.observed_variant_key),
      by_observed_finish_family: countBy(EVIDENCE_ROWS, (row) => row.observed_finish_family),
    },
    rows: EVIDENCE_ROWS,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: report.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      current_queue_variant_key: row.current_queue_variant_key,
      observed_variant_key: row.observed_variant_key,
      observed_finish_family: row.observed_finish_family,
      status: row.status,
      urls: row.evidence_sources.map((source) => source.source_url).sort(),
    })),
  }));

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    summary: report.summary,
    fingerprint_sha256: report.fingerprint_sha256,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
