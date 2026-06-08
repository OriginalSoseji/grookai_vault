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
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_prize_pack_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const CATEGORY_ID = 3;
const PRIZE_PACK_GROUP_ID = 22880;
const SOURCE_KEY = 'tcgcsv_prize_pack_catalog';
const BASE_URL = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}`;

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { dryRun: false, refreshCache: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
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
  return comparable(String(value ?? '')
    .replace(/\s*\(prize pack series \d+\)\s*/ig, ' ')
    .replace(/\s*-\s*[A-Z]{2,}\d+$/i, ' ')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*(?:\([^)]*\))?\s*$/i, ' ')
    .replace(/\s*-\s*\d+$/i, ' '))
    .replace(/\bex\b/g, ' ex ')
    .replace(/\bteam yell s\b/g, 'team yell')
    .replace(/\bpokemon catcher\b/g, 'pokemon catcher')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberParts(value) {
  const raw = String(value ?? '').trim();
  const [left, right] = raw.split('/');
  return {
    raw,
    number: normalizeNumber(left),
    denominator: right ? Number(String(right).replace(/\D/g, '')) : null,
  };
}

function numberCompatible(left, right) {
  return normalizeNumber(left).toLowerCase().replace(/^0+/, '') === normalizeNumber(right).toLowerCase().replace(/^0+/, '');
}

function exactFactKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number).toLowerCase(),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function setPrintedTotals(set) {
  return [
    set?.source_totals?.pokemontcg_api?.printed_total,
    set?.source_totals?.tcgdex?.official,
  ].filter((value) => Number.isFinite(Number(value))).map(Number);
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'finish_second_source_needed')
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => normalizeFinishKey(row.finish_key) === 'stamped')
    .filter((row) => row.card_number && row.card_name)
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
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
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '120',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 });
  const json = JSON.parse(stdout);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, `${JSON.stringify(json)}\n`);
  }
  return json;
}

async function prizePackProducts(options) {
  const payload = await fetchJsonCached(`${BASE_URL}/${PRIZE_PACK_GROUP_ID}/products`, `${PRIZE_PACK_GROUP_ID}_products.json`, options);
  return payload.results ?? [];
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productRecord(product) {
  const parts = numberParts(extendedValue(product, 'Number'));
  return {
    product_id: product.productId,
    product_name: product.name,
    source_url: product.url,
    card_name: product.name,
    card_number: parts.number,
    denominator: parts.denominator,
    rarity: extendedValue(product, 'Rarity'),
    raw_number: parts.raw,
  };
}

function isPromoSetKey(setKey) {
  return ['basep', 'bwp', 'dpp', 'hsp', 'mep', 'smp', 'swshp', 'svp', 'xyp'].includes(normalizeText(setKey));
}

function factMatchesProduct(fact, set, product) {
  if (!numberCompatible(fact.card_number, product.card_number)) return { ok: false, reason: 'number_mismatch' };
  if (cardComparable(fact.card_name) !== cardComparable(product.card_name)) return { ok: false, reason: 'name_mismatch' };

  if (product.denominator !== null) {
    const totals = setPrintedTotals(set);
    if (!totals.includes(product.denominator)) return { ok: false, reason: 'denominator_does_not_match_target_set' };
    return { ok: true, reason: 'exact_prize_pack_name_number_and_set_denominator_match' };
  }

  if (isPromoSetKey(fact.set_key)) {
    return { ok: true, reason: 'exact_prize_pack_promo_name_and_number_match' };
  }

  return { ok: false, reason: 'no_denominator_for_non_promo_set' };
}

function buildMatches(facts, setsByKey, products) {
  const results = [];
  const records = [];
  for (const fact of facts) {
    const set = setsByKey.get(fact.set_key);
    const reviewed = [];
    for (const product of products) {
      const validation = factMatchesProduct(fact, set, product);
      if (validation.ok || validation.reason !== 'number_mismatch') {
        reviewed.push({
          product_id: product.product_id,
          product_name: product.product_name,
          raw_number: product.raw_number,
          source_url: product.source_url,
          validation,
        });
      }
    }
    const valid = reviewed.filter((row) => row.validation.ok);
    if (valid.length === 1) {
      const product = products.find((row) => row.product_id === valid[0].product_id);
      const record = {
        source_key: SOURCE_KEY,
        source_kind: 'marketplace_checklist',
        source_url: product.source_url,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: normalizeNumber(fact.card_number),
        card_name: fact.card_name,
        finish_key: 'stamped',
        rarity: product.rarity,
        evidence_type: 'finish_presence',
        evidence_label: `TCGCSV/TCGplayer Prize Pack product ${product.product_id}: ${product.product_name} (${product.raw_number})`,
        language: 'en',
        retrieved_at: null,
        raw_snapshot_ref: `tcgcsv_prize_pack:${PRIZE_PACK_GROUP_ID}:${product.product_id}`,
        notes: 'Exact stamped finish evidence from the TCGplayer Prize Pack Series Cards catalog. Expansion-set rows require exact card name, card number, and printed-total denominator match; promo rows require exact promo number and name.',
      };
      records.push(record);
      results.push({ status: 'validated', fact, record, reviewed_candidates: valid });
    } else {
      results.push({
        status: valid.length > 1 ? 'ambiguous_multiple_prize_pack_matches' : 'no_exact_prize_pack_match',
        fact,
        valid_match_count: valid.length,
        reviewed_candidates: reviewed.slice(0, 20),
      });
    }
  }
  return { results, records };
}

function groupBySet(records) {
  const out = new Map();
  for (const record of records) {
    if (!out.has(record.set_key)) out.set(record.set_key, []);
    out.get(record.set_key).push(record);
  }
  return out;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeFixtures(records, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixtureFiles = [];
  for (const [setKey, setRecords] of groupBySet(records).entries()) {
    const stampedRecords = setRecords
      .map((record) => ({ ...record, retrieved_at: generatedAt }))
      .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
        || String(a.card_name).localeCompare(String(b.card_name)));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: SOURCE_KEY,
      source_kind: 'marketplace_checklist',
      source_url: 'https://tcgcsv.com/tcgplayer/3/22880/products',
      source_status: 'available_generated_exact_prize_pack_rows',
      set_key: setKey,
      set_name: stampedRecords[0]?.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records: stampedRecords,
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    fixtureFiles.push(file);
  }
  return fixtureFiles;
}

async function writeReport({ generatedAt, dryRun, products, facts, results, records, fixtureFiles }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const report = {
    version: 'english_master_index_tcgcsv_prize_pack_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_url: 'https://tcgcsv.com/tcgplayer/3/22880/products',
    rule: 'Prize Pack product-family rows are accepted only for stamped remaining gaps. Expansion rows require exact name, card number, and set denominator; promo rows require exact promo number and name.',
    summary: {
      target_facts: facts.length,
      prize_pack_products_parsed: products.length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      validated_by_set: countBy(results.filter((row) => row.status === 'validated'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  if (!dryRun) {
    await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_prize_pack_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    const validatedRows = results.filter((row) => row.status === 'validated').map((row) => [
      row.fact.set_key,
      row.fact.card_number,
      row.fact.card_name,
      row.fact.finish_key,
      row.record.source_url,
      row.record.evidence_label,
    ]);
    const md = [
      '# TCGCSV Prize Pack Acquisition V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      `Generated: ${generatedAt}`,
      '',
      '## Guardrail',
      '',
      report.rule,
      '',
      '## Summary',
      '',
      markdownTable(['Metric', 'Value'], Object.entries(report.summary).map(([key, value]) => [
        key,
        typeof value === 'object' ? JSON.stringify(value) : value,
      ])),
      '',
      '## Validated Rows',
      '',
      validatedRows.length
        ? markdownTable(['set', 'number', 'card', 'finish', 'source', 'evidence'], validatedRows)
        : 'None.',
      '',
    ].join('\n');
    await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_prize_pack_acquisition_v1.md'), md);
  }
  return report;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsArtifact, productPayload] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    prizePackProducts(options),
  ]);
  const facts = targetFacts(gaps);
  const setsByKey = new Map((setsArtifact.sets ?? []).map((set) => [set.key, set]));
  const products = productPayload.map(productRecord);
  const { results, records } = buildMatches(facts, setsByKey, products);
  const fixtureFiles = await writeFixtures(records, generatedAt, options.dryRun);
  const report = await writeReport({
    generatedAt,
    dryRun: options.dryRun,
    products,
    facts,
    results,
    records,
    fixtureFiles,
  });
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[tcgcsv-prize-pack] failed:', error);
  process.exitCode = 1;
});
