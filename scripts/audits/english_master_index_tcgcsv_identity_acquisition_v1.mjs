import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_identity_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_identity_acquisition_v1';
const CACHE_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_acquisition_v1/cache';
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

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|swsh|sm|xy|bw|dp|ex|me)\d+(?:pt\d+)?\s+/g, ' ')
    .replace(/^sve\s+/g, ' ')
    .replace(/^mep\s+/g, ' ')
    .replace(/\bblack star promos\b/g, 'black star promos')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value);
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productCardName(product) {
  return String(product.name ?? '').split(/\s+-\s+/)[0].trim();
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
  ].join('|');
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'card_identity_second_source_needed')
    .filter((row) => row.card_number && row.card_name)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
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

async function fetchProducts(groupId, options) {
  const payload = await fetchJsonCached(`${BASE_URL}/${groupId}/products`, `${groupId}_products.json`, options);
  return payload.results ?? [];
}

function matchingGroups(setName, groups) {
  const target = setComparable(setName);
  return groups.filter((group) => {
    const name = setComparable(group.name);
    return name === target || name.endsWith(target) || target.endsWith(name);
  });
}

function buildRecordsForSet({ facts, group, products, generatedAt }) {
  const targets = new Set(facts.map(factKey));
  const records = [];
  for (const product of products) {
    const number = extendedValue(product, 'Number');
    if (!number) continue;
    const candidate = {
      set_key: facts[0]?.set_key,
      card_number: normalizeNumber(String(number).split('/')[0]),
      card_name: productCardName(product),
    };
    if (!targets.has(factKey(candidate))) continue;
    const fact = facts.find((row) => factKey(row) === factKey(candidate));
    records.push({
      source_key: 'tcgcsv_tcgplayer_catalog_identity',
      source_kind: 'marketplace_checklist',
      source_url: product.url,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: null,
      rarity: extendedValue(product, 'Rarity'),
      evidence_type: 'card_identity',
      evidence_label: `TCGCSV/TCGplayer product ${product.productId} ${product.name}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `tcgcsv_identity:${group.groupId}:${product.productId}`,
      notes: 'Generated from TCGCSV TCGplayer product catalog. Exact set, number, and name match only; no finish truth is emitted.',
    });
  }
  return [...new Map(records.map((record) => [factKey(record), record])).values()];
}

async function writeFixture(setKey, setName, records, generatedAt, dryRun) {
  if (!records.length || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${setKey}.json`);
  let existingRecords = [];
  try {
    const existing = JSON.parse(await fs.readFile(file, 'utf8'));
    existingRecords = Array.isArray(existing.records) ? existing.records : [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const deduped = [...new Map([...existingRecords, ...records].map((record) => [factKey(record), record])).values()];
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `tcgcsv_identity_${setKey}`,
    source_kind: 'marketplace_checklist',
    source_url: 'https://tcgcsv.com/docs',
    source_status: 'available_generated',
    set_key: setKey,
    set_name: setName,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:tcgcsv_identity:${setKey}:${generatedAt}`,
    generation_note: 'Generated from TCGCSV TCGplayer catalog product rows. Card identity only; no finish evidence is emitted.',
    records: deduped,
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
  const payload = {
    version: 'english_master_index_tcgcsv_identity_acquisition_v1',
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
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_identity_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# TCGCSV Identity Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    markdownTable(
      ['set', 'name', 'status', 'target facts', 'records', 'groups'],
      results.map((row) => [row.set_key, row.set_name, row.status, row.target_facts, row.records_generated, row.group_names.join('; ')]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcsv_identity_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(GAPS_PATH);
  const facts = targetFacts(gaps, options);
  const factsBySet = new Map();
  for (const fact of facts) {
    if (!factsBySet.has(fact.set_key)) factsBySet.set(fact.set_key, []);
    factsBySet.get(fact.set_key).push(fact);
  }
  console.log(`[tcgcsv-identity] target sets ${factsBySet.size}`);
  const groups = await fetchGroups(options);
  const results = [];
  const fixtureFiles = [];
  for (const [setKey, setFacts] of factsBySet.entries()) {
    const setName = setFacts[0].set_name;
    const groupsForSet = matchingGroups(setName, groups);
    const records = [];
    for (const group of groupsForSet) {
      const products = await fetchProducts(group.groupId, options);
      records.push(...buildRecordsForSet({ facts: setFacts, group, products, generatedAt }));
    }
    const deduped = [...new Map(records.map((record) => [factKey(record), record])).values()];
    const fixtureFile = await writeFixture(setKey, setName, deduped, generatedAt, options.dryRun);
    fixtureFiles.push(fixtureFile);
    results.push({
      set_key: setKey,
      set_name: setName,
      status: groupsForSet.length === 0 ? 'source_unavailable' : deduped.length ? 'generated' : 'no_exact_matches',
      target_facts: setFacts.length,
      group_names: groupsForSet.map((group) => group.name),
      records_generated: deduped.length,
      fixture_file: fixtureFile,
    });
    console.log(`[tcgcsv-identity] ${setKey} ${setName} records ${deduped.length}`);
  }
  const report = await writeReports({ generatedAt, results, fixtureFiles, dryRun: options.dryRun });
  console.log(`[tcgcsv-identity] records ${report.summary.records_generated}`);
  console.log(`[tcgcsv-identity] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error('[tcgcsv-identity] failed:', error);
  process.exitCode = 1;
});
