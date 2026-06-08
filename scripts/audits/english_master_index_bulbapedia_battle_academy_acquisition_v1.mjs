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

const execFileAsync = promisify(execFile);

const QUEUE_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_remaining_finish_second_source_queue_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_battle_academy_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_battle_academy_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const BULBAPEDIA_INDEX = 'https://bulbapedia.bulbagarden.net/w/index.php';
const BULBAPEDIA_WIKI = 'https://bulbapedia.bulbagarden.net/wiki';
const SOURCE_KEY = 'bulbapedia_battle_academy_product';

const PAGES = [
  { title: 'Battle Academy 2020 (TCG)', product_key: 'battle_academy_2020' },
  { title: 'Battle Academy 2022 (TCG)', product_key: 'battle_academy_2022' },
  { title: 'Battle Academy 2024 (TCG)', product_key: 'battle_academy_2024' },
];

const PROMO_SET_ALIASES = new Map([
  ['svp promo', 'svp'],
  ['sv promo', 'svp'],
  ['swsh promo', 'swshp'],
  ['swsh promos', 'swshp'],
  ['sword shield promos', 'swshp'],
  ['sws h promos', 'swshp'],
  ['sm promo', 'smp'],
  ['xy promo', 'xyp'],
  ['bw promo', 'bwp'],
  ['dp promo', 'dpp'],
  ['hgss promo', 'hsp'],
  ['wizards black star promos', 'basep'],
]);

function parseArgs(argv) {
  const options = { dryRun: false, refreshCache: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--refresh-cache') options.refreshCache = true;
    else throw new Error(`Unknown argument: ${arg}`);
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
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\bvmax\b/g, ' vmax ')
    .replace(/\bvstar\b/g, ' vstar ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesCompatible(left, right) {
  const a = cardComparable(left);
  const b = cardComparable(right);
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

function numberComparable(value) {
  const normalized = normalizeNumber(value);
  const numericSuffix = normalized.match(/[A-Z]*0*(\d+[a-z]?)$/i);
  return numericSuffix ? numericSuffix[1].toLowerCase() : normalized.toLowerCase();
}

function setNameComparable(value) {
  return comparable(value)
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\bsword shield\b/g, 'sword shield')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleParam(title) {
  return title.replace(/\s+/g, '_');
}

function rawUrlForTitle(title) {
  return `${BULBAPEDIA_INDEX}?title=${encodeURIComponent(titleParam(title))}&action=raw`;
}

function sourceUrlForTitle(title) {
  return `${BULBAPEDIA_WIKI}/${encodeURIComponent(titleParam(title))}`;
}

function cacheNameForTitle(title) {
  return `${titleParam(title).replace(/[^A-Za-z0-9_.-]+/g, '_')}.txt`;
}

async function fetchTextViaCurl(url, timeoutSeconds = 40) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    String(timeoutSeconds),
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: (timeoutSeconds + 10) * 1000, maxBuffer: 25 * 1024 * 1024 });
  return stdout;
}

async function fetchRawPage(page, options) {
  const cacheFile = path.join(CACHE_DIR, cacheNameForTitle(page.title));
  if (!options.refreshCache) {
    try {
      const raw = await fs.readFile(cacheFile, 'utf8');
      return { ...page, raw, source_url: sourceUrlForTitle(page.title), raw_url: rawUrlForTitle(page.title), from_cache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const rawUrl = rawUrlForTitle(page.title);
  const raw = await fetchTextViaCurl(rawUrl);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, raw);
  }
  return { ...page, raw, source_url: sourceUrlForTitle(page.title), raw_url: rawUrl, from_cache: false };
}

function sourceSetKey(sourceSetName, setsByName) {
  const promoKey = PROMO_SET_ALIASES.get(setNameComparable(sourceSetName));
  if (promoKey) return promoKey;
  return setsByName.get(setNameComparable(sourceSetName))?.key ?? null;
}

function buildSetsByName(sets) {
  const map = new Map();
  for (const set of sets.sets ?? []) {
    map.set(setNameComparable(set.set_name), set);
    for (const alias of Object.values(set.source_aliases ?? {})) {
      if (alias) map.set(setNameComparable(String(alias).replace(/_\(TCG\)$/i, '').replace(/_/g, ' ')), set);
    }
  }
  return map;
}

function targetFacts(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.finish_key && normalizeFinishKey(row.finish_key) === 'stamped')
    .filter((row) => row.card_number && row.card_name);
}

function factCore(row) {
  return [
    row.set_key,
    numberComparable(row.card_number),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function buildFactsByCore(facts) {
  const map = new Map();
  for (const fact of facts) {
    const key = factCore(fact);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(fact);
  }
  return map;
}

function markEvidence(raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ');
  const hasSilhouetteRule = /cards within the decks are reprints but have colored silhouettes/i.test(text)
    || /cards? (?:in|within) the .* decks .* silhouettes/i.test(text);
  const hasDeckNumbers = /number next to the silhouette/i.test(text)
    || /order printed on their cards/i.test(text);
  if (!hasSilhouetteRule) return null;
  return {
    evidence_label: hasDeckNumbers
      ? 'Bulbapedia Battle Academy deck reprints with colored silhouettes and deck-order numbers where applicable'
      : 'Bulbapedia Battle Academy deck reprints with colored silhouettes',
    evidence_snippet: hasDeckNumbers
      ? 'cards within the decks are reprints but have colored silhouettes; Cinderace and Pikachu decks also have a number next to the silhouette'
      : 'cards within the decks are reprints but have colored silhouettes',
  };
}

function tcgIds(text) {
  const rows = [];
  const regex = /\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)(?:\|[^{}]*)?\}\}/g;
  for (const match of text.matchAll(regex)) {
    rows.push({
      source_set_name: match[1].trim(),
      card_name: match[2].trim(),
      card_number: match[3].trim(),
      raw: match[0],
    });
  }

  const linkRegex = /\[\[([^\]|]+)\(([^()]+)\s+([A-Z]*\d+[a-z]?)\)\|([^\]]+)\]\](?:\{\{TCGV\}\})?/g;
  for (const match of text.matchAll(linkRegex)) {
    rows.push({
      source_set_name: match[2].trim(),
      card_name: match[1].trim(),
      card_number: match[3].trim(),
      raw: match[0],
    });
  }
  return rows;
}

function deckListSection(raw) {
  const text = String(raw ?? '');
  const start = text.indexOf('==Deck lists==');
  if (start < 0) return '';
  const rest = text.slice(start);
  const end = rest.search(/\n==[^=]/);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function matchFact({ sourceSetName, cardNumber, cardName, factsByCore, setsByName }) {
  const setKey = sourceSetKey(sourceSetName, setsByName);
  if (!setKey) return null;
  const core = [setKey, numberComparable(cardNumber), 'stamped'].join('|');
  const candidates = factsByCore.get(core) ?? [];
  return candidates.find((fact) => namesCompatible(cardName, fact.card_name)) ?? null;
}

function fixtureRecordKey(row) {
  return [
    row.source_key,
    row.set_key,
    numberComparable(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
    row.source_url,
  ].join('|');
}

async function readExistingFixture(file) {
  try {
    const fixture = JSON.parse(await fs.readFile(file, 'utf8'));
    return fixture.records ?? [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeFixtures(records, generatedAt, dryRun) {
  if (dryRun || !records.length) return [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const bySet = new Map();
  for (const record of records) {
    if (!bySet.has(record.set_key)) bySet.set(record.set_key, []);
    bySet.get(record.set_key).push(record);
  }

  const files = [];
  for (const [setKey, setRecords] of bySet.entries()) {
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    const existing = await readExistingFixture(file);
    const merged = [...new Map([...existing, ...setRecords].map((record) => [fixtureRecordKey(record), record])).values()]
      .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
        || String(a.card_name).localeCompare(String(b.card_name))
        || String(a.finish_key).localeCompare(String(b.finish_key)));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `bulbapedia_battle_academy_${setKey}`,
      source_kind: 'human_readable_checklist',
      source_url: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_(TCG)',
      source_status: 'available_generated',
      set_key: setKey,
      set_name: setRecords[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:bulbapedia_battle_academy:${setKey}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      generation_note: 'Generated from Bulbapedia Battle Academy product pages. Exact existing stamped gap facts only; the lane requires the product page silhouette/deck-mark statement plus matching deck-list TCG ID rows.',
      records: merged,
    };
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    files.push(file);
  }
  return files;
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ generatedAt, results, records, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'english_master_index_bulbapedia_battle_academy_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_key: SOURCE_KEY,
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_(TCG)',
    rule: 'Exact stamped evidence only when a Battle Academy product page states deck cards have colored silhouettes/marks and a deck-list TCG ID row matches an existing remaining stamped gap.',
    summary: {
      pages_attempted: results.length,
      pages_with_mark_statement: results.filter((row) => row.has_mark_statement).length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.length,
      by_set: countBy(records, (row) => `${row.set_key}|${row.set_name}`),
      by_product_page: countBy(records, (row) => row.product_key),
      ignored_source_entries: results.reduce((total, row) => total + row.ignored.length, 0),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
    records,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_battle_academy_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_battle_academy_acquisition_v1.md'), [
    '# Bulbapedia Battle Academy Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    'This lane accepts only exact existing stamped gap facts from Battle Academy product pages where the page states the deck cards have colored silhouettes or deck marks.',
    '',
    `Generated: ${generatedAt}`,
    '',
    markdownTable(['product', 'status', 'mark statement', 'records', 'source URL'], results.map((row) => [
      row.product_key,
      row.status,
      row.has_mark_statement,
      row.records_generated,
      row.source_url,
    ])),
    '',
    '## Generated Records',
    '',
    markdownTable(['set', 'name', 'number', 'card', 'finish', 'evidence'], records.slice(0, 120).map((row) => [
      row.set_key,
      row.set_name,
      row.card_number,
      row.card_name,
      row.finish_key,
      row.evidence_label,
    ])),
    '',
  ].join('\n'));
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [queue, sets] = await Promise.all([readJson(QUEUE_PATH), readJson(SETS_PATH)]);
  const facts = targetFacts(queue);
  const factsByCore = buildFactsByCore(facts);
  const setsByName = buildSetsByName(sets);

  const records = [];
  const results = [];

  for (const pageDef of PAGES) {
    const page = await fetchRawPage(pageDef, options);
    const mark = markEvidence(page.raw);
    const ids = tcgIds(deckListSection(page.raw));
    const pageRecords = [];
    const ignored = [];

    if (mark) {
      for (const id of ids) {
        const fact = matchFact({
          sourceSetName: id.source_set_name,
          cardNumber: id.card_number,
          cardName: id.card_name,
          factsByCore,
          setsByName,
        });
        if (!fact) {
          ignored.push({
            source_set_name: id.source_set_name,
            card_number: id.card_number,
            card_name: id.card_name,
            reason: 'no_matching_remaining_stamped_gap_fact',
          });
          continue;
        }
        pageRecords.push({
          source_key: SOURCE_KEY,
          source_kind: 'human_readable_checklist',
          source_url: page.source_url,
          product_key: page.product_key,
          set_key: fact.set_key,
          set_name: fact.set_name,
          card_number: fact.card_number,
          card_name: fact.card_name,
          finish_key: 'stamped',
          rarity: null,
          evidence_type: 'finish_presence',
          evidence_label: mark.evidence_label,
          language: 'en',
          retrieved_at: generatedAt,
          raw_snapshot_ref: `bulbapedia_battle_academy:${page.product_key}:${fact.set_key}:${fact.card_number}:stamped`,
          notes: `Exact Battle Academy deck-list card matched to an existing remaining stamped gap. Evidence phrase: ${mark.evidence_snippet}.`,
        });
      }
    }

    records.push(...pageRecords);
    results.push({
      product_key: page.product_key,
      title: page.title,
      status: mark ? (pageRecords.length ? 'generated' : 'no_matching_remaining_gap_facts') : 'no_mark_statement',
      source_url: page.source_url,
      raw_url: page.raw_url,
      from_cache: page.from_cache,
      has_mark_statement: Boolean(mark),
      deck_entries: ids.length,
      records_generated: pageRecords.length,
      ignored: ignored.slice(0, 200),
    });
  }

  const dedupedRecords = [...new Map(records.map((record) => [fixtureRecordKey(record), record])).values()];
  const fixtureFiles = await writeFixtures(dedupedRecords, generatedAt, options.dryRun);
  const report = await writeReports({ generatedAt, results, records: dedupedRecords, fixtureFiles, dryRun: options.dryRun });
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
