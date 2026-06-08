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
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_binderbuilder_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/binderbuilder_acquisition_v1';
const BASE_URL = 'https://binderbuilder.app/sets';
const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { sets: null, maxSets: null, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'e')
    .trim();
}

function finishFromLabel(label) {
  const normalized = normalizeText(label);
  if (normalized.includes('shadowless') || normalized.includes('jumbo') || normalized.includes('metal')) return null;
  const aliases = {
    unlimited: 'normal',
    normal: 'normal',
    holofoil: 'holo',
    unlimited_holofoil: 'holo',
    holo: 'holo',
    reverse_holofoil: 'reverse',
    'reverse holofoil': 'reverse',
    reverse_holo: 'reverse',
    'reverse holo': 'reverse',
    cracked_ice_holofoil: 'cracked_ice',
    'cracked ice holofoil': 'cracked_ice',
    cosmos_holofoil: 'cosmos',
    'cosmos holofoil': 'cosmos',
    league_stamp: 'stamped',
    'league stamp': 'stamped',
    staff_stamp: 'stamped',
    'staff stamp': 'stamped',
    prerelease_stamp: 'stamped',
    'prerelease stamp': 'stamped',
    first_edition_unlimited: 'first_edition_normal',
    'first edition unlimited': 'first_edition_normal',
    first_edition: 'first_edition_normal',
    'first edition': 'first_edition_normal',
    first_edition_unlimited_holofoil: 'first_edition_holo',
    'first edition unlimited holofoil': 'first_edition_holo',
    first_edition_holofoil: 'first_edition_holo',
    'first edition holofoil': 'first_edition_holo',
  };
  return normalizeFinishKey(aliases[normalized] ?? null);
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function rowKey(setKey, row) {
  return [
    setKey,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => [
      'normal',
      'holo',
      'reverse',
      'stamped',
      'cosmos',
      'cracked_ice',
      'first_edition_normal',
      'first_edition_holo',
    ].includes(normalizeFinishKey(row.finish_key)));
}

function priorBinderBuilderFacts(printings) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes('binderbuilder_set_variant'))
    .filter((row) => row.card_number && row.card_name && row.finish_key);
}

function mergeFacts(...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(factKey(row), row);
  }
  return [...out.values()];
}

function groupBySet(rows, setsByKey, options) {
  const grouped = new Map();
  for (const row of rows) {
    if (options.sets && !options.sets.has(normalizeText(row.set_key))) continue;
    if (!setsByKey.has(row.set_key)) continue;
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  let entries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

async function fetchSetPageById(sourceId) {
  const url = `${BASE_URL}/${encodeURIComponent(sourceId)}`;
  let html = null;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(25000),
    });
    html = await response.text();
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  } catch (error) {
    const { stdout } = await execFileAsync('curl.exe', [
      '--ssl-no-revoke',
      '--silent',
      '--show-error',
      '--location',
      '--max-time',
      '60',
      '--user-agent',
      'Grookai Master Index Audit/1.0',
      url,
    ], { timeout: 70000, maxBuffer: 30 * 1024 * 1024 });
    html = stdout;
    if (!html || /^(fetch failed)?$/i.test(String(html).trim())) throw error;
  }
  if (html.includes('This page could not be found') || html.includes('NEXT_HTTP_ERROR_FALLBACK;404')) {
    throw new Error(`Binder Builder set not found: ${url}`);
  }
  return { url, html };
}

async function fetchSetPage(set) {
  const candidates = [set.key, set.source_aliases?.tcgdex].filter(Boolean);
  const errors = [];
  for (const candidate of [...new Set(candidates)]) {
    try {
      return await fetchSetPageById(candidate);
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
  }
  throw new Error(errors.join(' | '));
}

function parseRows(html) {
  const rows = [];
  const regex = /<p class="text-sm font-semibold truncate[^"]*" title="([^"]+)">([^<]+)<\/p><p class="text-xs text-accent font-medium truncate">([^<]+)<\/p><p class="text-xs text-muted truncate" title="([^"]+)">([^<]+)<!-- --> #<!-- -->([^<]+)<\/p>/g;
  for (const match of html.matchAll(regex)) {
    const label = decodeHtml(match[3]);
    const finishKey = finishFromLabel(label);
    if (!finishKey) continue;
    rows.push({
      card_number: decodeHtml(match[6]),
      card_name: decodeHtml(match[2]),
      finish_key: finishKey,
      source_label: label,
    });
  }
  return rows;
}

function buildRecords({ set, facts, rows, sourceUrl, generatedAt }) {
  const targets = new Set(facts.map(factKey));
  const records = [];
  const seen = new Set();
  for (const row of rows) {
    const key = rowKey(set.key, row);
    if (!targets.has(key) || seen.has(key)) continue;
    seen.add(key);
    records.push({
      source_key: 'binderbuilder_set_variant',
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      set_key: set.key,
      set_name: set.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `Binder Builder variant row #${row.card_number} - ${row.card_name} - ${row.source_label}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `binderbuilder:${set.key}:${row.card_number}:${row.finish_key}`,
      notes: 'Exact finish evidence from Binder Builder visible variant label. Shadowless, Jumbo, Metal, and unsupported labels are not emitted.',
    });
  }
  return records;
}

async function writeFixture(set, records, sourceUrl, generatedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `binderbuilder_${set.key}`,
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:binderbuilder:${set.key}:${generatedAt}`,
    generation_note: 'Generated from Binder Builder exact visible variant labels. Unsupported/product-scope labels are excluded.',
    records,
  };
  const file = path.join(FIXTURE_DIR, `${set.key}.json`);
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function writeReports({ results, fixtureFiles, generatedAt, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'BINDERBUILDER_VARIANT_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'Binder Builder evidence is used only for explicit visible variant labels mapped to supported Grookai finish keys. Shadowless, Jumbo, Metal, and ambiguous labels are ignored.',
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
  await fs.writeFile(path.join(REPORT_DIR, 'binderbuilder_variant_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# Binder Builder Variant Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['sets_attempted', payload.summary.sets_attempted],
      ['records_generated', payload.summary.records_generated],
      ['fixture_files_written', payload.summary.fixture_files_written],
      ['by_status', JSON.stringify(payload.summary.by_status)],
    ]),
    '',
    '## Rule',
    '',
    payload.rule,
    '',
    '## Sets',
    '',
    markdownTable(['set_key', 'set_name', 'status', 'target_facts', 'source_rows', 'records_generated', 'source_url', 'error'], results.map((row) => [
      row.set_key,
      row.set_name,
      row.status,
      row.target_facts,
      row.source_rows,
      row.records_generated,
      row.source_url ?? '',
      row.error ?? '',
    ])),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'binderbuilder_variant_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload, printingsPayload] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = groupBySet(mergeFacts(targetFacts(gaps), priorBinderBuilderFacts(printingsPayload)), setsByKey, options);
  console.log(`[binderbuilder] target sets ${targets.length}`);

  const results = [];
  const recordWrites = [];
  for (const [setKey, facts] of targets) {
    const set = setsByKey.get(setKey);
    console.log(`[binderbuilder] ${set.key} ${set.set_name} target facts ${facts.length}`);
    try {
      const fetched = await fetchSetPage(set);
      const rows = parseRows(fetched.html);
      const records = buildRecords({ set, facts, rows, sourceUrl: fetched.url, generatedAt });
      recordWrites.push({ set, records, sourceUrl: fetched.url });
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: records.length > 0 ? 'generated' : 'no_matching_variant_rows',
        target_facts: facts.length,
        source_rows: rows.length,
        records_generated: records.length,
        source_url: fetched.url,
        fixture_file: records.length ? path.join(FIXTURE_DIR, `${set.key}.json`) : null,
        error: null,
      });
    } catch (error) {
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_error',
        target_facts: facts.length,
        source_rows: 0,
        records_generated: 0,
        source_url: `${BASE_URL}/${encodeURIComponent(set.key)}`,
        error: String(error.message ?? error),
      });
    }
    await sleep(150);
  }
  const allSourcesFailed = results.length > 0 && results.every((row) => row.status === 'source_error');
  if (allSourcesFailed && !options.dryRun) {
    console.log('[binderbuilder] all sources failed; preserving existing fixture directory');
  }
  const fixtureFiles = [];
  if (!allSourcesFailed) {
    if (!options.dryRun) await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    for (const item of recordWrites) {
      fixtureFiles.push(await writeFixture(item.set, item.records, item.sourceUrl, generatedAt, options.dryRun));
    }
  }
  const report = await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(`[binderbuilder] records ${report.summary.records_generated}`);
  console.log(`[binderbuilder] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
