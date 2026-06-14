import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const POKECARDVALUES_STAMPED_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json');
const CARDTRADER_STAMPED_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'cardtrader_stamped_finish_acquisition_v1', 'cardtrader_stamped_finish_acquisition_v1.json');
const TCGCSV_STAMPED_SUBTYPE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'tcgcsv_stamped_subtype_acquisition_v1', 'tcgcsv_stamped_subtype_acquisition_v1.json');
const PRICECHARTING_PRODUCT_STAMP_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pricecharting_product_stamp_acquisition_v1', 'pricecharting_product_stamp_acquisition_v1.json');
const PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pricecharting_stamped_active_finish_acquisition_v1', 'pricecharting_stamped_active_finish_acquisition_v1.json');
const BATTLE_ACADEMY_EXACT_FINISH_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15h_battle_academy_exact_finish_extraction_v1.json');
const SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15g_remaining_stamped_source_exhaustion_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15g_remaining_stamped_source_exhaustion_v1.md');

const SOURCE_FAMILY_RULES = [
  {
    key: 'battle_academy_decklist_finish',
    variants: new Set(['battle_academy_deck_mark', 'cinderace_stamp', '42_cinderace_stamp', '31_cinderace_stamped', '17_cinderace_stamped', 'alolan_raichu_half_deck_14_stamp']),
    source_targets: [
      'TCGplayer exact product title with Battle Academy stamp/deck number and Non-Holo/Holo/Reverse',
      'Poke Card Values exact structured title with one matching Battle Academy deck-number identity and active finish',
      'Official/Bulbapedia product checklist only if it explicitly states card-level active finish',
    ],
    blocked_reason: 'existing Battle Academy sources prove deck-mark identity but not exact active child finish for each stamped identity',
  },
  {
    key: 'staff_prerelease_product_finish',
    variants: new Set(['staff_stamp', 'prerelease_stamp']),
    source_targets: [
      'TCGplayer exact product title with Staff/Prerelease and active finish',
      'Poke Card Values exact structured title with one matching Staff/Prerelease product and active finish',
      'Bulbapedia card/release row only if it names active finish on the same stamped release',
    ],
    blocked_reason: 'existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase',
  },
  {
    key: 'league_play_pokemon_finish',
    variants: new Set(['play_pokemon_stamp', 'pok_ball_stamped_player_rewards_promo_2009_2010']),
    source_targets: [
      'TCGplayer exact league/promo product with active finish',
      'CardTrader only if the source family is not Prize Pack and title names Play! Pokemon/League plus active finish',
      'Official/league checklist if card-level active finish is stated',
    ],
    blocked_reason: 'Prize Pack source-family rows are not safe substitutes for older Play! Pokemon stamped league promos',
  },
  {
    key: 'elitefourum_event_stamp_finish',
    source_predicate: (row) => (row.preserved_evidence_sources ?? []).includes('elitefourum_alternate_checklist'),
    source_targets: [
      'TCGplayer/PriceCharting/CardTrader/TCDB product rows that add active finish to the EliteFourum stamp identity',
      'Bulbapedia card release details if exact release row states active finish',
    ],
    blocked_reason: 'EliteFourum checklist is strong identity evidence but does not consistently encode active finish',
  },
  {
    key: 'sv_svp_modern_stamped_finish',
    variants: new Set(['pikachu_stamp', 'stamped', 'world_championships_2025_staff_stamp']),
    source_targets: [
      'Pokemon Center/official promo product page with exact card finish',
      'TCGplayer exact product title with stamp identity and active finish',
      'PokeScope/Poke Card Values if exact active finish is present, not just stamp identity',
    ],
    blocked_reason: 'modern promo stamp sources currently prove identity but not active child finish for ambiguous base-finish rows',
  },
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function sourceCombo(row) {
  return (row.preserved_evidence_sources ?? []).join(' + ') || 'none';
}

function classifyFamily(row) {
  for (const rule of SOURCE_FAMILY_RULES) {
    if (rule.variants?.has(row.proposed_variant_key)) return rule;
    if (rule.source_predicate?.(row)) return rule;
  }
  return {
    key: 'other_specific_stamp_finish',
    source_targets: [
      'Exact product/checklist row naming set, number, card, stamped identity, and active finish',
    ],
    blocked_reason: 'stamp identity exists but no exact active-finish source is attached to the same fact',
  };
}

function renderMarkdown(report) {
  const familyRows = Object.entries(report.summary.by_source_family).map(([family, count]) => [family, count]);
  const variantRows = Object.entries(report.summary.by_variant).map(([variant, count]) => [variant, count]);
  const sourceRows = Object.entries(report.summary.by_source_combo).slice(0, 20).map(([sources, count]) => [sources, count]);
  const sampleRows = report.rows.slice(0, 80).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.source_family,
    row.blocked_reason,
  ]);

  return `# English Master Index PKG-15G Remaining Stamped Source Exhaustion V1

Audit-only report for the remaining PKG-11B stamped rows after Poke Card Values and CardTrader exact-finish lanes.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- remaining_rows: ${report.summary.remaining_rows}
- exact_routable_rows: ${report.summary.exact_routable_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Attempted Source Lanes

${markdownTable(['source_key', 'target_rows', 'records_generated', 'status'], report.attempted_source_lanes.map((row) => [
  row.source_key,
  row.target_rows,
  row.records_generated,
  row.status,
]))}

${markdownTable(['source_family', 'rows'], familyRows)}

## Variants

${markdownTable(['variant', 'rows'], variantRows)}

## Source Combos

${markdownTable(['source_combo', 'rows'], sourceRows)}

## Sample Rows

${markdownTable(['set', 'number', 'name', 'variant', 'source_family', 'blocked_reason'], sampleRows)}

## Next Source Order

1. TCGplayer/TCGCSV product catalog rows with exact stamp identity and active finish.
2. Official or Bulbapedia product/checklist rows only where active finish is explicit.
3. Additional marketplace/checklist sources such as TCDB, Troll and Toad, or eBay Browse only as review evidence unless title proves exact set/card/number/stamp/finish.

No row in this report is write-ready.
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const pokeCardValuesStampedFinish = await readOptionalJson(POKECARDVALUES_STAMPED_FINISH_JSON);
  const cardTraderStampedFinish = await readOptionalJson(CARDTRADER_STAMPED_FINISH_JSON);
  const tcgcsvStampedSubtype = await readOptionalJson(TCGCSV_STAMPED_SUBTYPE_JSON);
  const pricechartingProductStamp = await readOptionalJson(PRICECHARTING_PRODUCT_STAMP_JSON);
  const pricechartingStampedActiveFinish = await readOptionalJson(PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON);
  const battleAcademyExactFinish = await readOptionalJson(BATTLE_ACADEMY_EXACT_FINISH_JSON);
  const sameFinishAmbiguousAdjudication = await readOptionalJson(SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON);
  const sourceRows = (input.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
  const rows = sourceRows.map((row) => {
    const family = classifyFamily(row);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      stamp_label: row.stamp_label,
      base_parent_child_finishes: row.base_parent_child_finishes ?? [],
      source_family: family.key,
      blocked_reason: family.blocked_reason,
      recommended_source_targets: family.source_targets,
      preserved_evidence_sources: row.preserved_evidence_sources ?? [],
      preserved_evidence_urls: row.preserved_evidence_urls ?? [],
      preserved_evidence_labels: row.preserved_evidence_labels ?? [],
    };
  });
  const fingerprintPayload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    source_family: row.source_family,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15g_remaining_stamped_source_exhaustion_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      pkg11b_stamped_finish_routing_readiness: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
      pokecardvalues_stamped_finish_acquisition: path.relative(ROOT, POKECARDVALUES_STAMPED_FINISH_JSON).replaceAll('\\', '/'),
      cardtrader_stamped_finish_acquisition: path.relative(ROOT, CARDTRADER_STAMPED_FINISH_JSON).replaceAll('\\', '/'),
      tcgcsv_stamped_subtype_acquisition: path.relative(ROOT, TCGCSV_STAMPED_SUBTYPE_JSON).replaceAll('\\', '/'),
      pricecharting_product_stamp_acquisition: path.relative(ROOT, PRICECHARTING_PRODUCT_STAMP_JSON).replaceAll('\\', '/'),
      pricecharting_stamped_active_finish_acquisition: path.relative(ROOT, PRICECHARTING_STAMPED_ACTIVE_FINISH_JSON).replaceAll('\\', '/'),
      battle_academy_exact_finish_extraction: path.relative(ROOT, BATTLE_ACADEMY_EXACT_FINISH_JSON).replaceAll('\\', '/'),
      same_finish_ambiguous_adjudication: path.relative(ROOT, SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON).replaceAll('\\', '/'),
    },
    attempted_source_lanes: [
      {
        source_key: 'pokecardvalues_stamped_finish',
        target_rows: pokeCardValuesStampedFinish?.summary?.target_rows ?? 0,
        records_generated: pokeCardValuesStampedFinish?.summary?.records_generated ?? 0,
        status: (pokeCardValuesStampedFinish?.summary?.records_generated ?? 0) > 0
          ? 'has_useful_exact_evidence'
          : 'exhausted_no_single_exact_active_finish_match',
      },
      {
        source_key: 'cardtrader_stamped_finish',
        target_rows: cardTraderStampedFinish?.summary?.target_rows ?? 0,
        records_generated: cardTraderStampedFinish?.summary?.records_generated ?? 0,
        status: (cardTraderStampedFinish?.summary?.records_generated ?? 0) > 0
          ? 'has_useful_exact_evidence'
          : 'exhausted_no_exact_active_finish_matches',
      },
      {
        source_key: 'bulbapedia_battle_academy_exact_finish',
        target_rows: battleAcademyExactFinish?.summary?.battle_academy_rows_reviewed ?? 0,
        records_generated: battleAcademyExactFinish?.summary?.accepted_rows_still_in_queue ?? 0,
        status: (battleAcademyExactFinish?.summary?.accepted_rows_still_in_queue ?? 0) > 0
          ? 'has_useful_exact_evidence'
          : 'exhausted_explicit_non_holo_facts_not_in_remaining_queue',
      },
      {
        source_key: 'tcgcsv_stamped_subtype',
        target_rows: tcgcsvStampedSubtype?.summary?.target_rows ?? 0,
        records_generated: tcgcsvStampedSubtype?.summary?.records_generated ?? 0,
        status: (tcgcsvStampedSubtype?.summary?.records_generated ?? 0) > 0
          ? 'has_useful_exact_evidence'
          : 'exhausted_no_exact_active_finish_matches',
      },
      {
        source_key: 'pricecharting_product_stamp',
        target_rows: pricechartingProductStamp?.summary?.target_facts ?? 0,
        records_generated: pricechartingProductStamp?.summary?.records_generated ?? 0,
        status: (pricechartingProductStamp?.summary?.records_generated ?? 0) > 0
          ? 'has_useful_stamp_identity_evidence'
          : 'exhausted_no_remaining_stamped_finish_targets',
      },
      {
        source_key: 'pricecharting_stamped_active_finish',
        target_rows: pricechartingStampedActiveFinish?.summary?.target_rows ?? 0,
        records_generated: pricechartingStampedActiveFinish?.summary?.records_generated ?? 0,
        status: (pricechartingStampedActiveFinish?.summary?.records_generated ?? 0) > 0
          ? 'has_useful_exact_active_finish_evidence'
          : 'exhausted_no_exact_active_finish_matches',
      },
      {
        source_key: 'tcgcollector_card_variants',
        target_rows: rows.filter((row) => (row.preserved_evidence_sources ?? []).includes('tcgcollector_card_variants')).length,
        records_generated: 0,
        status: 'blocked_cloudflare_challenge_for_automated_exact_finish_extraction',
      },
      {
        source_key: 'pokecardvalues_same_finish_ambiguous_adjudication',
        target_rows: sameFinishAmbiguousAdjudication?.summary?.reviewed_rows ?? 0,
        records_generated: sameFinishAmbiguousAdjudication?.summary?.same_finish_supported_rows ?? 0,
        status: 'blocked_identity_granularity_required_before_write',
      },
    ],
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      remaining_rows: rows.length,
      exact_routable_rows: 0,
      by_source_family: countBy(rows, (row) => row.source_family),
      by_variant: countBy(rows, (row) => row.proposed_variant_key),
      by_source_combo: countBy(rows, sourceCombo),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
