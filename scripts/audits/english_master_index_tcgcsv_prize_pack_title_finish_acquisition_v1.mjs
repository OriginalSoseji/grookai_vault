import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROUTING_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json';
const SETS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const PRODUCTS_JSON = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_prize_pack_acquisition_v1/cache/22880_products.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_prize_pack_title_finish_acquisition_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_title_finish_v1';
const SOURCE_KEY = 'tcgcsv_prize_pack_title_finish';
const PRIZE_PACK_GROUP_ID = 22880;

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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bex\b/g, ' ex ')
    .replace(/\svmax\b/g, ' vmax')
    .replace(/\svstar\b/g, ' vstar')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(String(value ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s*-\s*[A-Z]{2,}\d+$/i, ' ')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/i, ' ')
    .replace(/\s*-\s*\d+\s*$/i, ' '));
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

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function setPrintedTotals(set) {
  return [
    set?.source_totals?.pokemontcg_api?.printed_total,
    set?.source_totals?.tcgdex?.official,
  ].filter((value) => Number.isFinite(Number(value))).map(Number);
}

function titleFinish(productName) {
  const normalized = normalizeText(productName);
  if (/\bcosmo?s\s+holo(?:foil)?\b|\bcosmos\b/.test(normalized)) return 'cosmos';
  return null;
}

function targetRows(report) {
  return (report.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .filter((row) => row.proposed_variant_key === 'prize_pack_stamp');
}

function classifyTargets({ targets, products, setsByKey }) {
  const productRows = products.map(productRecord);
  const results = [];
  for (const row of targets) {
    const set = setsByKey.get(row.set_key);
    const matches = productRows.filter((product) => (
      compactNumber(product.card_number) === compactNumber(row.card_number)
      && cardComparable(product.card_name) === cardComparable(row.card_name)
      && titleFinish(product.product_name)
    ));
    if (matches.length === 0) {
      results.push({ ...row, status: 'blocked_no_exact_title_finish_match' });
      continue;
    }
    const denominatorMatches = matches.filter((product) => (
      product.denominator !== null
      && setPrintedTotals(set).includes(product.denominator)
    ));
    if (denominatorMatches.length !== 1) {
      results.push({
        ...row,
        status: denominatorMatches.length > 1
          ? 'blocked_multiple_denominator_verified_title_finish_matches'
          : 'blocked_title_finish_match_without_set_denominator_proof',
        product_candidates: matches,
      });
      continue;
    }
    const product = denominatorMatches[0];
    results.push({
      ...row,
      status: 'accepted_exact_tcgcsv_prize_pack_title_finish',
      accepted_finish_key: titleFinish(product.product_name),
      accepted_source_url: product.source_url,
      accepted_product_id: product.product_id,
      accepted_product_name: product.product_name,
      accepted_raw_number: product.raw_number,
      accepted_rarity: product.rarity,
    });
  }
  return results;
}

function fixtureRecord(row, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: row.accepted_source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.accepted_finish_key,
    rarity: row.accepted_rarity,
    evidence_type: 'finish_presence',
    evidence_label: `TCGCSV/TCGplayer Prize Pack product title: ${row.accepted_product_name}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `tcgcsv_prize_pack_title_finish:${PRIZE_PACK_GROUP_ID}:${row.accepted_product_id}`,
    notes: 'Exact active-finish evidence from TCGCSV/TCGplayer Prize Pack product title. Accepted only when card number denominator matches the target set printed total.',
  };
}

async function writeFixtures(results, generatedAt, dryRun) {
  const accepted = results.filter((row) => row.status === 'accepted_exact_tcgcsv_prize_pack_title_finish');
  const files = [];
  if (dryRun || accepted.length === 0) return files;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const bySet = new Map();
  for (const row of accepted) {
    if (!bySet.has(row.set_key)) bySet.set(row.set_key, []);
    bySet.get(row.set_key).push(row);
  }
  for (const [setKey, rows] of bySet.entries()) {
    const records = rows.map((row) => fixtureRecord(row, generatedAt));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${SOURCE_KEY}_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'https://tcgcsv.com/tcgplayer/3/22880/products',
      source_status: 'available_generated',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records,
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await writeJson(file, fixture);
    files.push(file);
  }
  return files;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_tcgcsv_prize_pack_title_finish')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.accepted_finish_key, row.accepted_product_name, row.accepted_source_url]);
  return `# TCGCSV Prize Pack Title Finish Acquisition V1

Audit-only source acquisition using exact finish phrases in TCGCSV/TCGplayer Prize Pack product titles.

## Safety

- dry_run: ${report.dry_run}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Rule

Only explicit product-title finish phrases are accepted. Generic TCGplayer price subtypes are not accepted for Prize Pack finish truth.

## Summary

- target_rows: ${report.summary.target_rows}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'finish', 'product', 'url'], acceptedRows) : 'No accepted rows.'}
`;
}

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [routing, setsPayload, productPayload] = await Promise.all([
    readJson(ROUTING_JSON),
    readJson(SETS_JSON),
    readJson(PRODUCTS_JSON),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = targetRows(routing);
  const results = classifyTargets({ targets, products: productPayload.results ?? [], setsByKey });
  const fixtureFiles = await writeFixtures(results, generatedAt, options.dryRun);
  const accepted = results.filter((row) => row.status === 'accepted_exact_tcgcsv_prize_pack_title_finish');
  const fingerprintPayload = accepted.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    accepted_finish_key: row.accepted_finish_key,
    accepted_product_id: row.accepted_product_id,
  }));
  const report = {
    version: 'english_master_index_tcgcsv_prize_pack_title_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: 'https://tcgcsv.com/tcgplayer/3/22880/products',
    rule: 'Accept only exact Prize Pack product-title finish phrases with card-number denominator matching the target set printed total.',
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      target_rows: targets.length,
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(accepted, (row) => row.accepted_finish_key),
      by_set: countBy(accepted, (row) => row.set_key),
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await writeJson(path.join(REPORT_DIR, 'tcgcsv_prize_pack_title_finish_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'tcgcsv_prize_pack_title_finish_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
