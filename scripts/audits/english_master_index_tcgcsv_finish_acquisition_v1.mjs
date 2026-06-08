import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const CATEGORY_ID = 3;
const BASE_URL = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}`;

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { sets: null, dryRun: false, refreshCache: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(String(value ?? '').replace(/\s*\([^)]*\)\s*/g, ' '))
    .replace(/\b(team aqua|team magma|team galactic) s\b/g, '$1')
    .replace(/\bimposter professor oak\b/g, 'impostor professor oak')
    .replace(/\btechnical mach g\b/g, 'technical machine')
    .replace(/\bblend energy gfpd\b/g, 'blend energy grass fire psychic darkness')
    .replace(/\bblend energy wlfm\b/g, 'blend energy water lightning fighting metal')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|swsh|sm|xy|bw|dp|ex|me)\d+(?:pt\d+)?\s+/g, ' ')
    .replace(/^sve\s+/g, ' ')
    .replace(/^mep\s+/g, ' ')
    .replace(/\bblack star promos\b/g, 'black star promos')
    .replace(/\s+/g, ' ')
    .trim();
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productCardName(product) {
  return String(product.name ?? '')
    .replace(/\s*\(#?\d+\s*-\s*(?:non-?holo|holo)\)\s*/ig, ' ')
    .split(/\s+-\s+/)[0]
    .trim();
}

function finishFromSubtype(value) {
  const normalized = comparable(value);
  if (normalized === 'normal') return 'normal';
  if (normalized === 'holofoil' || normalized === 'holo') return 'holo';
  if (normalized === 'reverse holofoil' || normalized === 'reverse holo') return 'reverse';
  if (normalized.includes('1st edition holo')) return 'first_edition_holo';
  if (normalized.includes('1st edition') || normalized.includes('first edition')) return 'first_edition_normal';
  if (normalized.includes('cosmos')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  if (normalized.includes('stamp')) return 'stamped';
  return null;
}

function isRarityHoloOrHigher(value) {
  const normalized = comparable(value);
  return /\b(holo|ultra rare|secret rare|illustration rare|special illustration rare|double rare|rare holo|ace spec|hyper rare)\b/.test(normalized);
}

function isGenericNormalPriceBucket({ finishKey, product, price }) {
  if (finishKey !== 'normal') return false;
  const subtype = comparable(price.subTypeName);
  if (subtype !== 'normal') return false;
  const rarity = extendedValue(product, 'Rarity');
  if (!isRarityHoloOrHigher(rarity)) return false;
  const productName = comparable(product.name);
  return !/\b(non holo|nonholo|non foil|nonfoil)\b/.test(productName);
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function cardIdentityKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
  ].join('|');
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function priorTcgcsvFacts(printings, options) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes('tcgcsv_tcgplayer_catalog'))
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function mergeFacts(...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(factKey(row), row);
  }
  return [...out.values()];
}

async function fetchJsonCached(url, cacheName, options) {
  const cacheFile = path.join(CACHE_DIR, cacheName);
  if (!options.refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  let stdout = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      ({ stdout } = await execFileAsync('curl.exe', [
        '--ssl-no-revoke',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '120',
        '--user-agent',
        'Grookai Master Index Audit/1.0',
        url,
      ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 }));
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  if (stdout === null) throw lastError;
  const json = JSON.parse(stdout);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, `${JSON.stringify(json)}\n`);
  }
  return json;
}

async function fetchGroups(options) {
  const payload = await fetchJsonCached(`${BASE_URL}/groups`, 'groups.json', options);
  return payload.results ?? [];
}

async function fetchGroupProductsAndPrices(groupId, options) {
  const [productsPayload, pricesPayload] = await Promise.all([
    fetchJsonCached(`${BASE_URL}/${groupId}/products`, `${groupId}_products.json`, options),
    fetchJsonCached(`${BASE_URL}/${groupId}/prices`, `${groupId}_prices.json`, options),
  ]);
  return {
    products: productsPayload.results ?? [],
    prices: pricesPayload.results ?? [],
  };
}

const GROUP_NAME_ALIASES_BY_SET = {
  basep: ['WoTC Promo', 'Wizards Black Star Promos'],
  bwp: ['Black and White Promos', 'BW Black Star Promos'],
  dpp: ['Diamond and Pearl Promos', 'DP Black Star Promos'],
  hsp: ['HGSS Promos', 'HGSS Black Star Promos'],
  mep: ['ME: Mega Evolution Promo', 'MEP Black Star Promos'],
  np: ['Nintendo Promos', 'Nintendo Black Star Promos'],
  smp: ['SM Promos', 'SM Black Star Promos'],
  swshp: ['SWSH: Sword & Shield Promo Cards', 'SWSH Black Star Promos'],
  svp: ['SV: Scarlet & Violet Promo Cards', 'Scarlet & Violet Black Star Promos'],
  xyp: ['XY Promos', 'XY Black Star Promos'],
  '2023sv': ["McDonald's Promos 2023", "McDonald's Collection 2023"],
  '2024sv': ["McDonald's Promos 2024", "McDonald's Collection 2024"],
  mcd11: ["McDonald's Promos 2011", "McDonald's Collection 2011"],
  mcd12: ["McDonald's Promos 2012", "McDonald's Collection 2012"],
  mcd14: ["McDonald's Promos 2014", "McDonald's Collection 2014"],
  mcd15: ["McDonald's Promos 2015", "McDonald's Collection 2015"],
  mcd16: ["McDonald's Promos 2016", "McDonald's Collection 2016"],
  mcd17: ["McDonald's Promos 2017", "McDonald's Collection 2017"],
  mcd18: ["McDonald's Promos 2018", "McDonald's Collection 2018"],
  mcd19: ["McDonald's Promos 2019", "McDonald's Collection 2019"],
  mcd22: ["McDonald's Promos 2022", "McDonald's Collection 2022"],
  sm1: ['SM Base Set'],
  'tk-bw-e': ['BW Trainer Kit: Excadrill & Zoroark'],
  'tk-bw-z': ['BW Trainer Kit: Excadrill & Zoroark'],
  'tk-dp-l': ['DP Trainer Kit: Manaphy & Lucario'],
  'tk-dp-m': ['DP Trainer Kit: Manaphy & Lucario'],
  'tk-hs-g': ['HGSS Trainer Kit: Gyarados & Raichu'],
  'tk-hs-r': ['HGSS Trainer Kit: Gyarados & Raichu'],
  'tk-sm-l': ['SM Trainer Kit: Lycanroc & Alolan Raichu'],
  'tk-sm-r': ['SM Trainer Kit: Lycanroc & Alolan Raichu'],
  'tk-xy-b': ['XY Trainer Kit: Bisharp & Wigglytuff'],
  'tk-xy-latia': ['XY Trainer Kit: Latias & Latios'],
  'tk-xy-latio': ['XY Trainer Kit: Latias & Latios'],
  'tk-xy-n': ['XY Trainer Kit: Sylveon & Noivern'],
  'tk-xy-p': ['XY Trainer Kit: Pikachu Libre & Suicune'],
  'tk-xy-su': ['XY Trainer Kit: Pikachu Libre & Suicune'],
  'tk-xy-sy': ['XY Trainer Kit: Sylveon & Noivern'],
  'tk-xy-w': ['XY Trainer Kit: Bisharp & Wigglytuff'],
};

function matchingGroups(setKey, setName, groups) {
  const target = setComparable(setName);
  const aliases = new Set([target, ...(GROUP_NAME_ALIASES_BY_SET[setKey] ?? []).map(setComparable)]);
  return groups.filter((group) => {
    const name = setComparable(group.name);
    for (const alias of aliases) {
      if (name === alias || name.endsWith(alias) || alias.endsWith(name)) return true;
    }
    return false;
  });
}

function buildRecordsForSet({ facts, group, products, prices, generatedAt }) {
  const productsById = new Map(products.map((product) => [product.productId, product]));
  const targetKeys = new Set(facts.map(factKey));
  const factsByIdentity = new Map();
  for (const fact of facts) {
    const key = cardIdentityKey(fact);
    if (!factsByIdentity.has(key)) factsByIdentity.set(key, []);
    factsByIdentity.get(key).push(fact);
  }
  const records = [];
  const alternateFinishMatches = [];
  for (const price of prices) {
    const finishKey = finishFromSubtype(price.subTypeName);
    if (!finishKey) continue;
    const product = productsById.get(price.productId);
    if (!product) continue;
    if (isGenericNormalPriceBucket({ finishKey, product, price })) continue;
    const number = extendedValue(product, 'Number');
    if (!number) continue;
    const candidate = {
      set_key: facts[0]?.set_key,
      card_number: normalizeNumber(String(number).split('/')[0]),
      card_name: productCardName(product),
      finish_key: finishKey,
    };
    const exactKey = factKey(candidate);
    if (!targetKeys.has(exactKey)) {
      const identityFacts = (factsByIdentity.get(cardIdentityKey(candidate)) ?? [])
        .filter((fact) => fact.gap_type);
      for (const fact of identityFacts) {
        const targetFinish = normalizeFinishKey(fact.finish_key);
        const observedFinish = normalizeFinishKey(finishKey);
        if (targetFinish === observedFinish) continue;
        alternateFinishMatches.push({
          set_key: fact.set_key,
          set_name: fact.set_name,
          card_number: fact.card_number,
          card_name: fact.card_name,
          target_finish_key: targetFinish,
          observed_finish_key: observedFinish,
          target_status: fact.status,
          target_sources: fact.sources ?? [],
          candidate_source_key: 'tcgcsv_tcgplayer_catalog',
          candidate_source_kind: 'marketplace_checklist',
          candidate_authority: 'tcgplayer.com',
          candidate_url: product.url,
          evidence_label: `TCGCSV/TCGplayer product ${product.productId} price subtype ${price.subTypeName}`,
          rarity: extendedValue(product, 'Rarity'),
          raw_snapshot_ref: `tcgcsv:${group.groupId}:${product.productId}:${price.subTypeName}`,
          retrieved_at: generatedAt,
          review_status: 'alternate_finish_observed_for_gap_fact',
          notes: 'Exact set, card number, and card name matched a remaining finish gap, but TCGCSV/TCGplayer reported a different explicit price subtype. This is manual-review evidence, not mutation authority.',
        });
      }
      continue;
    }
    const fact = facts.find((row) => factKey(row) === exactKey);
    records.push({
      source_key: 'tcgcsv_tcgplayer_catalog',
      source_kind: 'marketplace_checklist',
      source_url: product.url,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: normalizeFinishKey(fact.finish_key),
      rarity: extendedValue(product, 'Rarity'),
      evidence_type: 'finish_presence',
      evidence_label: `TCGCSV/TCGplayer product ${product.productId} price subtype ${price.subTypeName}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `tcgcsv:${group.groupId}:${product.productId}:${price.subTypeName}`,
      notes: 'Generated from TCGCSV TCGplayer products joined to price subTypeName. Exact set, number, name, and finish match only.',
    });
  }
  return {
    records: [...new Map(records.map((record) => [factKey(record), record])).values()],
    alternateFinishMatches: [
      ...new Map(alternateFinishMatches.map((record) => [
        [
          record.set_key,
          normalizeNumber(record.card_number),
          cardComparable(record.card_name),
          record.target_finish_key,
          record.observed_finish_key,
          record.candidate_url,
        ].join('|'),
        record,
      ])).values(),
    ],
  };
}

async function writeFixture(setKey, setName, records, generatedAt, dryRun) {
  if (!records.length || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${setKey}.json`);
  let existing = [];
  try {
    const fixture = JSON.parse(await fs.readFile(file, 'utf8'));
    existing = fixture.records ?? [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const merged = [...new Map([...existing, ...records].map((record) => [factKey(record), record])).values()]
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key).localeCompare(String(b.finish_key)));
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `tcgcsv_finish_${setKey}`,
    source_kind: 'marketplace_checklist',
    source_url: 'https://tcgcsv.com/docs',
    source_status: 'available_generated',
    set_key: setKey,
    set_name: setName,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:tcgcsv:${setKey}:${generatedAt}`,
    generation_note: 'Generated from TCGCSV TCGplayer catalog product and price subtype data. Exact finish evidence only.',
    records: merged,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ generatedAt, results, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const alternateRows = results.flatMap((row) => row.alternate_finish_evidence ?? []);
  const candidateUnconfirmedAlternateRows = alternateRows
    .filter((row) => row.target_status === 'candidate_unconfirmed')
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
  const payload = {
    version: 'english_master_index_tcgcsv_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_url: 'https://tcgcsv.com/docs',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      alternate_finish_matches: results.reduce((total, row) => total + row.alternate_finish_matches, 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(results.flatMap((row) => row.records ?? []), (row) => normalizeFinishKey(row.finish_key)),
      by_alternate_observed_finish: countBy(
        results.flatMap((row) => row.alternate_finish_evidence ?? []),
        (row) => normalizeFinishKey(row.observed_finish_key),
      ),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const alternateReviewPayload = {
    version: 'tcgcsv_candidate_unconfirmed_alternate_finish_review_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'These rows are manual-review conflict signals only. They do not authorize deletion, cleanup, hiding, quarantine, or promotion.',
    summary: {
      candidate_unconfirmed_alternate_finish_rows: candidateUnconfirmedAlternateRows.length,
      by_target_finish: countBy(candidateUnconfirmedAlternateRows, (row) => normalizeFinishKey(row.target_finish_key)),
      by_observed_finish: countBy(candidateUnconfirmedAlternateRows, (row) => normalizeFinishKey(row.observed_finish_key)),
      affected_sets: new Set(candidateUnconfirmedAlternateRows.map((row) => row.set_key)).size,
    },
    rows: candidateUnconfirmedAlternateRows,
  };
  await fs.writeFile(
    path.join(REPORT_DIR, 'tcgcsv_candidate_unconfirmed_alternate_finish_review_v1.json'),
    `${JSON.stringify(alternateReviewPayload, null, 2)}\n`,
  );
  const alternateReviewMd = [
    '# TCGCSV Candidate-Unconfirmed Alternate Finish Review V1',
    '',
    'Audit only. These rows are manual-review conflict signals only and are not mutation authority.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      Object.entries(alternateReviewPayload.summary).map(([key, value]) => [
        key,
        value instanceof Set ? value.size : typeof value === 'object' ? JSON.stringify(value) : value,
      ]),
    ),
    '',
    '## Candidate-Unconfirmed Alternate Finish Rows',
    '',
    candidateUnconfirmedAlternateRows.length
      ? markdownTable(
        ['set', 'card', 'name', 'target finish', 'observed finish', 'source', 'evidence'],
        candidateUnconfirmedAlternateRows.map((row) => [
          row.set_key,
          row.card_number,
          row.card_name,
          row.target_finish_key,
          row.observed_finish_key,
          row.candidate_url,
          row.evidence_label,
        ]),
      )
      : 'None.',
    '',
    '## Safety Confirmation',
    '',
    '```json',
    JSON.stringify({
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    }, null, 2),
    '```',
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_candidate_unconfirmed_alternate_finish_review_v1.md'), alternateReviewMd);
  const rows = results.map((row) => [
    row.set_key,
    row.set_name,
    row.status,
    row.target_facts,
    row.records_generated,
    row.alternate_finish_matches,
    row.group_names.join('; '),
  ]);
  const md = [
    '# TCGCSV Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    markdownTable(['set', 'name', 'status', 'target facts', 'records', 'alternate finishes', 'groups'], rows),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, printings] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const facts = mergeFacts(targetFacts(gaps, options), priorTcgcsvFacts(printings, options));
  const factsBySet = new Map();
  for (const fact of facts) {
    if (!factsBySet.has(fact.set_key)) factsBySet.set(fact.set_key, []);
    factsBySet.get(fact.set_key).push(fact);
  }
  console.log(`[tcgcsv] target sets ${factsBySet.size}`);
  const groups = await fetchGroups(options);
  const results = [];
  const fixtureFiles = [];
  for (const [setKey, setFacts] of factsBySet.entries()) {
    const setName = setFacts[0].set_name;
    const groupsForSet = matchingGroups(setKey, setName, groups);
    const records = [];
    const alternateFinishMatches = [];
    for (const group of groupsForSet) {
      const { products, prices } = await fetchGroupProductsAndPrices(group.groupId, options);
      const built = buildRecordsForSet({ facts: setFacts, group, products, prices, generatedAt });
      records.push(...built.records);
      alternateFinishMatches.push(...built.alternateFinishMatches);
    }
    const deduped = [...new Map(records.map((record) => [factKey(record), record])).values()];
    const dedupedAlternateFinishMatches = [
      ...new Map(alternateFinishMatches.map((record) => [
        [
          record.set_key,
          normalizeNumber(record.card_number),
          cardComparable(record.card_name),
          record.target_finish_key,
          record.observed_finish_key,
          record.candidate_url,
        ].join('|'),
        record,
      ])).values(),
    ];
    const fixtureFile = await writeFixture(setKey, setName, deduped, generatedAt, options.dryRun);
    fixtureFiles.push(fixtureFile);
    results.push({
      set_key: setKey,
      set_name: setName,
      status: groupsForSet.length === 0
        ? 'source_unavailable'
        : deduped.length
          ? 'generated'
          : dedupedAlternateFinishMatches.length
            ? 'alternate_finish_observed'
            : 'no_exact_matches',
      target_facts: setFacts.length,
      group_names: groupsForSet.map((group) => group.name),
      records_generated: deduped.length,
      alternate_finish_matches: dedupedAlternateFinishMatches.length,
      fixture_file: fixtureFile,
      records: deduped,
      alternate_finish_evidence: dedupedAlternateFinishMatches,
    });
    console.log(`[tcgcsv] ${setKey} ${setName} records ${deduped.length} alternate finishes ${dedupedAlternateFinishMatches.length}`);
  }
  const report = await writeReports({ generatedAt, results, fixtureFiles, dryRun: options.dryRun });
  console.log(`[tcgcsv] records ${report.summary.records_generated}`);
  console.log(`[tcgcsv] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error('[tcgcsv] failed:', error);
  process.exitCode = 1;
});
