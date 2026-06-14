import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.md');
const FIXTURE_DIR = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pkg17e_stamped_active_finish_web_evidence_v1');

const PACKAGE_ID = 'PKG-17E-STAMPED-ACTIVE-FINISH-WEB-EVIDENCE';
const TARGET_STATUS = 'stale_unstamped_base_parent_now_exists';

const EVIDENCE = [
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/charmander-eb-games-4',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '4',
    card_name: 'Charmander',
    variant_key: 'eb_games_stamp',
    finish_key: 'reverse',
    evidence_label: 'PriceCharting sales include Charmander EB Games #004 Reverse Holo.',
  },
  {
    source_key: 'pokecardvalues',
    source_kind: 'marketplace_checklist',
    source_url: 'https://pokecardvalues.co.uk/cards/Charmander-004-165-Reverse-Holo-EB-Games-Stamp-151/sv3pt5-004-3-106/',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '4',
    card_name: 'Charmander',
    variant_key: 'eb_games_stamp',
    finish_key: 'reverse',
    evidence_label: 'PokeCardValues page title identifies Charmander #004 EB Games Stamp as Reverse Holo.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/squirtle-pokemon-center-7',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '7',
    card_name: 'Squirtle',
    variant_key: 'pokemon_center_stamp',
    finish_key: 'reverse',
    evidence_label: 'PriceCharting sales include Squirtle Pokemon Center #007 Reverse Holo.',
  },
  {
    source_key: 'pokecardvalues',
    source_kind: 'marketplace_checklist',
    source_url: 'https://pokecardvalues.co.uk/cards/Squirtle-007-165-Reverse-Holo-Pokemon-Center-Stamp-151/sv3pt5-007-3-103/',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '7',
    card_name: 'Squirtle',
    variant_key: 'pokemon_center_stamp',
    finish_key: 'reverse',
    evidence_label: 'PokeCardValues page title identifies Squirtle #007 Pokemon Center Stamp as Reverse Holo.',
  },
  {
    source_key: 'tcgplayer',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/520796/pokemon-miscellaneous-cards-and-products-squirtle-007-165-pokemon-center-exclusive',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '7',
    card_name: 'Squirtle',
    variant_key: 'pokemon_center_stamp',
    finish_key: 'reverse',
    evidence_label: 'TCGplayer product identifies Squirtle #007 Pokemon Center Exclusive as Reverse Holofoil.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/voltorb-professor-program-100',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '100',
    card_name: 'Voltorb',
    variant_key: 'professor_program_stamp',
    finish_key: 'reverse',
    evidence_label: 'PriceCharting sales include Voltorb Professor Program #100 Reverse Holo.',
  },
  {
    source_key: 'tcgplayer',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/619077/pokemon-prize-pack-series-cards-ditto-132-165',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '132',
    card_name: 'Ditto',
    variant_key: 'prize_pack_stamp',
    finish_key: 'holo',
    evidence_label: 'TCGplayer Prize Pack product for Ditto #132 identifies Holofoil.',
  },
  {
    source_key: 'ebay',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.ebay.com/itm/257446815552',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '132',
    card_name: 'Ditto',
    variant_key: 'prize_pack_stamp',
    finish_key: 'holo',
    evidence_label: 'eBay product title identifies Ditto #132 Prize Pack as Holo Rare.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/mew-ex-prize-pack-151',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '151',
    card_name: 'Mew ex',
    variant_key: 'prize_pack_stamp',
    finish_key: 'holo',
    evidence_label: 'PriceCharting sales include Mew ex #151 Prize Pack Series Cards Holo.',
  },
  {
    source_key: 'tcgplayer',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/565479/pokemon-prize-pack-series-cards-mew-ex',
    set_key: 'sv03.5',
    set_name: '151',
    card_number: '151',
    card_name: 'Mew ex',
    variant_key: 'prize_pack_stamp',
    finish_key: 'holo',
    evidence_label: 'TCGplayer Prize Pack product for Mew ex identifies Holofoil.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-crown-zenith/kyogre-cosmos-holo-36',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '36',
    card_name: 'Kyogre',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'PriceCharting page identifies Kyogre #036 as Cosmos Holo and includes Prize Pack stamped sales.',
  },
  {
    source_key: 'tcgplayer',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/575895/pokemon-miscellaneous-cards-and-products-kyogre-036-159-pixel-holo',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '36',
    card_name: 'Kyogre',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'TCGplayer product for Kyogre #036 identifies the Prize Pack-style Pixel/Cosmos Holo product.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-crown-zenith/lost-vacuum-prize-pack-cosmos-holo-135',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '135',
    card_name: 'Lost Vacuum',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'PriceCharting page title identifies Lost Vacuum #135 Prize Pack Cosmos Holo.',
  },
  {
    source_key: 'ebay',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.ebay.com/itm/188264277784',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '135',
    card_name: 'Lost Vacuum',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'eBay listing identifies Lost Vacuum #135 Prize Pack as Cosmos Holo.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-crown-zenith/trekking-shoes-prize-pack-145',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '145',
    card_name: 'Trekking Shoes',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'PriceCharting sales identify Trekking Shoes #145 Prize Pack as Cosmos Holo.',
  },
  {
    source_key: 'ebay',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.ebay.com/itm/127290149704',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '145',
    card_name: 'Trekking Shoes',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'eBay listing title identifies Trekking Shoes #145 Prize Pack as Cosmos Holo.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-crown-zenith/ultra-ball-prize-pack-146',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '146',
    card_name: 'Ultra Ball',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'PriceCharting sales identify Ultra Ball #146 Prize Pack as Cosmos Holo.',
  },
  {
    source_key: 'ebay',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.ebay.com/b/Ultra-Ball-146-159-Prize-Pack-Series-Cards/2536/bn_7124592163',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '146',
    card_name: 'Ultra Ball',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'eBay category/listing titles identify Ultra Ball #146 Prize Pack examples as Cosmos/Holo.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-crown-zenith/friends-in-sinnoh-professor-program-131',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '131',
    card_name: 'Friends in Sinnoh',
    variant_key: 'professor_program_stamp',
    finish_key: 'reverse',
    evidence_label: 'PriceCharting sales include Friends in Sinnoh Professor Program #131 Reverse Holo.',
  },
  {
    source_key: 'dextcg',
    source_kind: 'collector_reference',
    source_url: 'https://dextcg.com/cards/swsh12pt5-131',
    set_key: 'swsh12.5',
    set_name: 'Crown Zenith',
    card_number: '131',
    card_name: 'Friends in Sinnoh',
    variant_key: 'professor_program_stamp',
    finish_key: 'reverse',
    evidence_label: 'DexTCG lists Friends in Sinnoh variants including Reverse Holo and Professor Program.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-Shrouded-Fable/Galvantula-002',
    set_key: 'sv06.5',
    set_name: 'Shrouded Fable',
    card_number: '2',
    card_name: 'Galvantula',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'PriceCharting search result identifies Galvantula #002 Prize Pack Cosmos Holo.',
  },
  {
    source_key: 'ebay',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.ebay.com/itm/335837500784',
    set_key: 'sv06.5',
    set_name: 'Shrouded Fable',
    card_number: '2',
    card_name: 'Galvantula',
    variant_key: 'prize_pack_stamp',
    finish_key: 'cosmos',
    evidence_label: 'eBay listing title identifies Galvantula #002 Prize Pack 6 as Cosmo Holo.',
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

function factKey(row) {
  return [
    String(row.set_key ?? '').toLowerCase(),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeText(row.variant_key ?? row.stamped_variant_key),
  ].join('|');
}

function sourceFamily(sourceKey) {
  if (sourceKey === 'pricecharting') return 'pricecharting';
  if (sourceKey === 'ebay') return 'ebay';
  if (sourceKey === 'tcgplayer') return 'tcgplayer';
  return sourceKey;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function classifyTarget(row, evidenceRows) {
  const finishes = [...new Set(evidenceRows.map((evidence) => evidence.finish_key))].sort();
  const sourceFamilies = [...new Set(evidenceRows.map((evidence) => sourceFamily(evidence.source_key)))].sort();
  let status = 'blocked_no_exact_active_finish_evidence';
  if (finishes.length > 1) status = 'blocked_conflicting_finish_evidence';
  else if (finishes.length === 1 && sourceFamilies.length >= 2) status = 'ready_for_guarded_dry_run';
  else if (finishes.length === 1) status = 'review_only_single_source_family';
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.stamped_variant_key,
    selected_base_parent_id: row.selected_base_parent_id,
    base_parent_child_finishes: row.selected_base_parent?.child_finishes ?? [],
    accepted_finish_key: finishes.length === 1 ? finishes[0] : null,
    source_family_count: sourceFamilies.length,
    source_families: sourceFamilies,
    evidence_count: evidenceRows.length,
    status,
    evidence: evidenceRows,
  };
}

function fixtureRecord(row, evidence, generatedAt) {
  return {
    source_key: evidence.source_key,
    source_kind: evidence.source_kind,
    source_url: evidence.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.accepted_finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: evidence.evidence_label,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pkg17e_web_evidence:${evidence.source_key}:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.variant_key}`,
    notes: 'Audit-only exact active-finish evidence for stamped parent readiness. This fixture does not write to the database.',
  };
}

async function writeFixtures(report) {
  const ready = report.rows.filter((row) => row.status === 'ready_for_guarded_dry_run');
  if (ready.length === 0) return [];
  const files = [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const bySet = new Map();
  for (const row of ready) {
    if (!bySet.has(row.set_key)) bySet.set(row.set_key, []);
    bySet.get(row.set_key).push(row);
  }
  for (const [setKey, rows] of bySet.entries()) {
    const records = rows.flatMap((row) => row.evidence.map((evidence) => fixtureRecord(row, evidence, report.generated_at)));
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await writeJson(file, {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `pkg17e_stamped_active_finish_web_evidence_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'multiple_urls_in_records',
      source_status: 'available_generated',
      set_key: setKey,
      set_name: rows[0]?.set_name ?? setKey,
      retrieved_at: report.generated_at,
      raw_snapshot_ref: `generated_fixture:${PACKAGE_ID}:${setKey}:${report.generated_at}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records,
    });
    files.push(path.relative(ROOT, file).replaceAll('\\', '/'));
  }
  return files;
}

function renderMarkdown(report) {
  return `# PKG-17E Stamped Active Finish Web Evidence V1

Generated: ${report.generated_at}

Audit-only targeted evidence capture for stamped rows that now have an unstamped base parent but still need exact active child finish evidence.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['evidence_rows', report.summary.evidence_rows],
    ['ready_for_guarded_dry_run', report.summary.ready_for_guarded_dry_run],
    ['review_only_single_source_family', report.summary.review_only_single_source_family],
    ['blocked_no_exact_active_finish_evidence', report.summary.blocked_no_exact_active_finish_evidence],
    ['blocked_conflicting_finish_evidence', report.summary.blocked_conflicting_finish_evidence],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Status Counts

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_status))}

## Ready For Guarded Dry-Run

${markdownTable(
    ['set', 'number', 'card', 'variant', 'finish', 'sources'],
    report.rows
      .filter((row) => row.status === 'ready_for_guarded_dry_run')
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.variant_key,
        row.accepted_finish_key,
        row.source_families.join(', '),
      ]),
  )}

## Review / Blocked Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'status', 'evidence_count'],
    report.rows
      .filter((row) => row.status !== 'ready_for_guarded_dry_run')
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.variant_key,
        row.status,
        row.evidence_count,
      ]),
  )}

## Guardrail

This report is not an apply package. Ready rows still require a separate rollback-only guarded dry-run, fingerprint, and explicit approval before any real write.
`;
}

async function main() {
  const readiness = await readJson(SOURCE_JSON);
  const targets = (readiness.rows ?? []).filter((row) => row.readiness_status === TARGET_STATUS);
  const evidenceByFact = new Map();
  for (const evidence of EVIDENCE) {
    const key = factKey(evidence);
    if (!evidenceByFact.has(key)) evidenceByFact.set(key, []);
    evidenceByFact.get(key).push(evidence);
  }
  const rows = targets.map((row) => classifyTarget(row, evidenceByFact.get(factKey(row)) ?? []));
  const payload = {
    source_fingerprint_sha256: readiness.fingerprint_sha256,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      variant_key: row.variant_key,
      accepted_finish_key: row.accepted_finish_key,
      source_families: row.source_families,
      status: row.status,
    })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      evidence_rows: EVIDENCE.length,
      ready_for_guarded_dry_run: rows.filter((row) => row.status === 'ready_for_guarded_dry_run').length,
      review_only_single_source_family: rows.filter((row) => row.status === 'review_only_single_source_family').length,
      blocked_no_exact_active_finish_evidence: rows.filter((row) => row.status === 'blocked_no_exact_active_finish_evidence').length,
      blocked_conflicting_finish_evidence: rows.filter((row) => row.status === 'blocked_conflicting_finish_evidence').length,
      by_status: countBy(rows, (row) => row.status),
      by_finish: countBy(rows.filter((row) => row.accepted_finish_key), (row) => row.accepted_finish_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
    generated_fixture_files: [],
    safety_confirmation: {
      audit_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };
  report.generated_fixture_files = await writeFixtures(report);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    generated_fixture_files: report.generated_fixture_files,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
