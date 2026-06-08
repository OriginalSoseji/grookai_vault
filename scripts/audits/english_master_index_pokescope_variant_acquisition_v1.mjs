import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokescope_variants_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokescope_variant_acquisition_v1';
const BASE_URL = 'https://pokescope.app/card';
const SOURCE_KEY = 'pokescope_card_variant';

function parseArgs(argv) {
  const options = { sets: null, maxPages: null, dryRun: false, concurrency: 6 };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-pages') {
      options.maxPages = Number(next);
      index += 1;
    } else if (arg === '--concurrency') {
      options.concurrency = Number(next);
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
    .replace(/&eacute;/g, 'é')
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function finishFromLabel(label) {
  const normalized = normalizeText(label.replace(/highest/i, ''));
  if (normalized.includes('shadowless') || normalized.includes('jumbo') || normalized.includes('metal')) return null;
  if (normalized.includes('staff_stamp') || normalized.includes('staff stamp')) return 'stamped';
  if (normalized.includes('league_stamp') || normalized.includes('league stamp')) return 'stamped';
  if (normalized.includes('prerelease_stamp') || normalized.includes('prerelease stamp')) return 'stamped';
  if (normalized.includes('play_pokemon_stamp') || normalized.includes('play pokemon stamp')) return 'stamped';
  if (normalized.includes('stamp')) return 'stamped';
  if (normalized.includes('cosmos_holofoil') || normalized.includes('cosmos holofoil')) return 'cosmos';
  if (normalized.includes('cosmos_holo') || normalized.includes('cosmos holo')) return 'cosmos';
  if (normalized.includes('cracked_ice_holofoil') || normalized.includes('cracked ice holofoil')) return 'cracked_ice';
  if (normalized.includes('cracked_ice_holo') || normalized.includes('cracked ice holo')) return 'cracked_ice';
  if (normalized.includes('reverse_holofoil') || normalized.includes('reverse holofoil')) return 'reverse';
  if (normalized.includes('reverse_holo') || normalized.includes('reverse holo')) return 'reverse';
  if (normalized === 'holofoil' || normalized === 'holo') return 'holo';
  if (normalized === 'normal' || normalized === 'unlimited') return 'normal';
  return null;
}

function factKey(row) {
  return [
    row.set_key,
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
    ].includes(normalizeFinishKey(row.finish_key)));
}

function priorPokescopeFacts(printings) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes(SOURCE_KEY))
    .filter((row) => row.card_number && row.card_name && row.finish_key);
}

function mergeFacts(...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(factKey(row), row);
  }
  return [...out.values()];
}

function pageKey(row) {
  return `${row.set_key}|${normalizeNumber(row.card_number)}`;
}

function groupByPage(rows, setsByKey, options) {
  const grouped = new Map();
  for (const row of rows) {
    if (options.sets && !options.sets.has(normalizeText(row.set_key))) continue;
    const set = setsByKey.get(row.set_key);
    if (!set) continue;
    const key = pageKey(row);
    if (!grouped.has(key)) grouped.set(key, { set, card_number: normalizeNumber(row.card_number), facts: [] });
    grouped.get(key).facts.push(row);
  }
  let pages = [...grouped.values()].sort((a, b) => b.facts.length - a.facts.length || a.set.key.localeCompare(b.set.key));
  if (options.maxPages) pages = pages.slice(0, options.maxPages);
  return pages;
}

function sourceIds(set) {
  return [...new Set([
    set.pokemontcg,
    set.source_aliases?.pokemontcg_api,
    set.key,
    set.source_aliases?.tcgdex,
  ].filter(Boolean).map((value) => String(value).replace(/\./g, '')))];
}

async function fetchPage(set, cardNumber) {
  const errors = [];
  for (const sourceId of sourceIds(set)) {
    const url = `${BASE_URL}/${encodeURIComponent(sourceId)}-${encodeURIComponent(String(Number(cardNumber) || cardNumber))}/`;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Grookai Master Index Audit/1.0',
        },
        signal: AbortSignal.timeout(20000),
      });
      const html = await response.text();
      if (!response.ok || html.includes('This page could not be found') || html.includes('NEXT_NOT_FOUND')) {
        errors.push(`${response.status} ${response.statusText}: ${url}`);
        continue;
      }
      if (!html.includes('PokeScope')) {
        errors.push(`unexpected_page: ${url}`);
        continue;
      }
      return { url, html, source_id: sourceId };
    } catch (error) {
      errors.push(`${url}: ${String(error.message ?? error)}`);
    }
  }
  throw new Error(errors.join(' | '));
}

function parseCardName(html) {
  const title = html.match(/<title>([^<]+?)\s+-\s+[^<]*PokeScope<\/title>/i)?.[1];
  if (title) return decodeHtml(title);
  const alt = html.match(/<img[^>]+alt="([^"]+)"/i)?.[1];
  return alt ? decodeHtml(alt).replace(/\s+[A-Za-z0-9.]+$/g, '') : null;
}

function parseVariantLabels(html) {
  const labels = new Set();
  const sectionIndex = html.indexOf('Multiple variants available:');
  if (sectionIndex < 0) return [];
  const sectionEnd = html.indexOf('</div></div><div class="relative', sectionIndex);
  const section = html.slice(sectionIndex, sectionEnd > sectionIndex ? sectionEnd : sectionIndex + 8000);
  const regex = /<p class="text-xs mb-1 font-medium[^"]*">([\s\S]*?)<\/p>/g;
  for (const match of section.matchAll(regex)) {
    const label = decodeHtml(match[1]).replace(/\s*•\s*Highest\s*$/i, '').trim();
    const finishKey = finishFromLabel(label);
    if (finishKey) labels.add(`${finishKey}|${label}`);
  }
  return [...labels].map((entry) => {
    const [finish_key, ...labelParts] = entry.split('|');
    return { finish_key, label: labelParts.join('|') };
  });
}

function buildRecords({ set, cardNumber, facts, html, sourceUrl, generatedAt }) {
  const pageCardName = parseCardName(html);
  const variants = parseVariantLabels(html);
  const targets = new Set(facts.map(factKey));
  const records = [];
  for (const fact of facts) {
    if (pageCardName && cardComparable(pageCardName) !== cardComparable(fact.card_name)) continue;
    const variant = variants.find((row) => normalizeFinishKey(row.finish_key) === normalizeFinishKey(fact.finish_key));
    if (!variant) continue;
    const key = factKey(fact);
    if (!targets.has(key)) continue;
    records.push({
      source_key: SOURCE_KEY,
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      set_key: set.key,
      set_name: set.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: normalizeFinishKey(fact.finish_key),
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `PokeScope variant label: ${variant.label}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pokescope:${set.key}:${cardNumber}:${normalizeFinishKey(fact.finish_key)}`,
      notes: 'Exact per-card variant label from PokeScope. No set-wide finish rule or era assumption is inferred.',
    });
  }
  return records;
}

async function writeFixtures(recordsBySet, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, payload] of [...recordsBySet.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (payload.records.length === 0) continue;
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    let existingRecords = [];
    try {
      const existing = JSON.parse(await fs.readFile(file, 'utf8'));
      existingRecords = Array.isArray(existing.records) ? existing.records : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const records = [...new Map([...existingRecords, ...payload.records].map((record) => [
      [
        record.source_key,
        normalizeNumber(record.card_number),
        normalizeText(record.card_name),
        normalizeFinishKey(record.finish_key),
      ].join('|'),
      record,
    ])).values()];
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `pokescope_variants_${setKey}`,
      source_kind: 'collector_reference',
      source_url: payload.source_urls[0],
      source_status: 'available_generated',
      set_key: setKey,
      set_name: payload.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pokescope_variants:${setKey}:${generatedAt}`,
      generation_note: 'Generated from PokeScope exact per-card variant labels. No page dumps are stored.',
      records,
    };
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    files.push(file);
  }
  return files;
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
    version: 'POKESCOPE_VARIANT_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'PokeScope evidence is accepted only as exact per-card variant labels. No set-wide variant assumptions are emitted.',
    summary: {
      pages_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(results.flatMap((row) => row.generated_finishes ?? []), (row) => row),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pokescope_variant_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# PokeScope Variant Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    `- Pages attempted: ${payload.summary.pages_attempted}`,
    `- Records generated: ${payload.summary.records_generated}`,
    `- Fixture files written: ${payload.summary.fixture_files_written}`,
    `- Status counts: ${JSON.stringify(payload.summary.by_status)}`,
    `- Finish counts: ${JSON.stringify(payload.summary.by_finish)}`,
    '',
    '## Results',
    '',
    markdownTable(
      ['set', 'card', 'status', 'records', 'finishes', 'url/error'],
      results.slice(0, 1000).map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.card_number,
        row.status,
        row.records_generated,
        (row.generated_finishes ?? []).join(', '),
        row.source_url ?? row.error ?? '',
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'pokescope_variant_acquisition_v1.md'), md);
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload, printings] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const facts = mergeFacts(targetFacts(gaps), priorPokescopeFacts(printings));
  const pages = groupByPage(facts, setsByKey, options);
  let nextIndex = 0;

  async function processPage(page) {
    try {
      const { url, html, source_id: sourceId } = await fetchPage(page.set, page.card_number);
      const records = buildRecords({
        set: page.set,
        cardNumber: page.card_number,
        facts: page.facts,
        html,
        sourceUrl: url,
        generatedAt,
      });
      await sleep(40);
      return {
        set_key: page.set.key,
        set_name: page.set.set_name,
        card_number: page.card_number,
        status: records.length > 0 ? 'generated' : 'no_matching_variant_label',
        source_id: sourceId,
        source_url: url,
        target_facts: page.facts.length,
        records_generated: records.length,
        generated_finishes: records.map((row) => row.finish_key),
        records,
      };
    } catch (error) {
      await sleep(40);
      return {
        set_key: page.set.key,
        set_name: page.set.set_name,
        card_number: page.card_number,
        status: 'source_unavailable',
        source_url: null,
        target_facts: page.facts.length,
        records_generated: 0,
        error: String(error.message ?? error).slice(0, 800),
        records: [],
      };
    }
  }

  async function worker() {
    const out = [];
    while (nextIndex < pages.length) {
      const page = pages[nextIndex];
      nextIndex += 1;
      out.push(await processPage(page));
    }
    return out;
  }

  const workerCount = Math.max(1, Math.min(options.concurrency || 1, pages.length || 1));
  const workerResults = await Promise.all(Array.from({ length: workerCount }, worker));
  const results = workerResults.flat();
  const recordsBySet = new Map();
  for (const result of results) {
    if (!recordsBySet.has(result.set_key)) {
      recordsBySet.set(result.set_key, { set_name: result.set_name, source_urls: [], records: [] });
    }
    if (result.source_url) recordsBySet.get(result.set_key).source_urls.push(result.source_url);
    recordsBySet.get(result.set_key).records.push(...result.records);
    delete result.records;
  }

  const fixtureFiles = await writeFixtures(recordsBySet, generatedAt, options.dryRun);
  await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(JSON.stringify({
    target_pages: pages.length,
    records_generated: results.reduce((total, row) => total + row.records_generated, 0),
    fixture_files_written: fixtureFiles.length,
    by_status: countBy(results, (row) => row.status),
    by_finish: countBy(results.flatMap((row) => row.generated_finishes ?? []), (row) => row),
    dry_run: options.dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
