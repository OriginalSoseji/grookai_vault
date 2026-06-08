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
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_build_battle_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_build_battle_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const BULBAPEDIA_INDEX = 'https://bulbapedia.bulbagarden.net/w/index.php';
const BULBAPEDIA_WIKI = 'https://bulbapedia.bulbagarden.net/wiki';
const SOURCE_KEY = 'bulbapedia_build_battle_product';

const execFileAsync = promisify(execFile);

const PROMO_SET_ALIASES = new Map([
  ['svp promo', 'svp'],
  ['sv promo', 'svp'],
  ['swsh promo', 'swshp'],
  ['sm promo', 'smp'],
  ['xy promo', 'xyp'],
  ['bw promo', 'bwp'],
  ['dp promo', 'dpp'],
  ['hgss promo', 'hsp'],
  ['wizards black star promos', 'basep'],
]);

function parseArgs(argv) {
  const options = { sets: null, dryRun: false, refreshCache: false, maxPages: null };
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
    } else if (arg === '--max-pages') {
      options.maxPages = Number(next);
      index += 1;
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
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
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

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => ['normal', 'stamped'].includes(normalizeFinishKey(row.finish_key)));
}

function setNameComparable(value) {
  return comparable(value)
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
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

function wikiTitleForSet(setName) {
  return `${setName} Build & Battle Box (TCG)`;
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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, timeoutSeconds = 40) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain,text/x-wiki,*/*',
      'User-Agent': 'Grookai Master Index Audit/1.0',
    },
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
  return text;
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

function redirectTitle(raw) {
  const match = String(raw ?? '').match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  return match ? match[1].trim() : null;
}

function isMissingPage(raw) {
  const text = String(raw ?? '');
  return !text.trim()
    || /There is currently no text in this page/i.test(text)
    || /Bad title/i.test(text)
    || /<html/i.test(text);
}

async function fetchRawPage(title, options, redirects = 0) {
  const cacheFile = path.join(CACHE_DIR, cacheNameForTitle(title));
  if (!options.refreshCache) {
    try {
      const raw = await fs.readFile(cacheFile, 'utf8');
      return { title, raw, source_url: sourceUrlForTitle(title), raw_url: rawUrlForTitle(title), from_cache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const rawUrl = rawUrlForTitle(title);
  let raw;
  try {
    raw = await fetchText(rawUrl);
  } catch (error) {
    raw = await fetchTextViaCurl(rawUrl);
  }

  const redirected = redirectTitle(raw);
  if (redirected && redirects < 2) {
    return fetchRawPage(redirected, options, redirects + 1);
  }

  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, raw);
  }

  return { title, raw, source_url: sourceUrlForTitle(title), raw_url: rawUrl, from_cache: false };
}

function splitParagraphs(raw) {
  return String(raw ?? '')
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function tcgIds(paragraph) {
  const rows = [];
  const regex = /\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)(?:\|[^{}]*)?\}\}/g;
  for (const match of paragraph.matchAll(regex)) {
    rows.push({
      source_set_name: match[1].trim(),
      card_name: match[2].trim(),
      card_number: match[3].trim(),
    });
  }
  return rows;
}

function evidenceSegments(raw) {
  const segments = [];
  for (const paragraph of splitParagraphs(raw)) {
    const ids = tcgIds(paragraph);
    if (!ids.length) continue;

    if (/exclusive\s+Non\s+Holofoil\s+versions/i.test(paragraph)) {
      segments.push({
        finish_key: 'normal',
        evidence_type: 'finish_presence',
        evidence_label: 'Bulbapedia Build & Battle Box exclusive Non Holofoil versions',
        evidence_snippet: 'exclusive Non Holofoil versions',
        ids,
      });
    }

    if (/specially\s+stamped/i.test(paragraph) && /Prerelease/i.test(paragraph)) {
      segments.push({
        finish_key: 'stamped',
        evidence_type: 'finish_presence',
        evidence_label: 'Bulbapedia Build & Battle Box specially stamped Prerelease cards',
        evidence_snippet: 'specially stamped Prerelease cards',
        ids,
      });
    }
  }
  return segments;
}

function sourceSetKey(sourceSetName, setsByName) {
  const promoKey = PROMO_SET_ALIASES.get(setNameComparable(sourceSetName));
  if (promoKey) return promoKey;
  return setsByName.get(setNameComparable(sourceSetName))?.key ?? null;
}

function matchFact({ sourceSetName, cardNumber, cardName, finishKey, factsByCore, setsByName }) {
  const setKey = sourceSetKey(sourceSetName, setsByName);
  if (!setKey) return null;
  const core = [setKey, numberComparable(cardNumber), normalizeFinishKey(finishKey)].join('|');
  const candidates = factsByCore.get(core) ?? [];
  return candidates.find((fact) => namesCompatible(cardName, fact.card_name)) ?? null;
}

function buildRecordsForPage({ page, factsByCore, setsByName, generatedAt }) {
  const records = [];
  const ignored = [];

  if (isMissingPage(page.raw)) {
    return { records, ignored, status: 'source_unavailable' };
  }

  const segments = evidenceSegments(page.raw);
  for (const segment of segments) {
    for (const id of segment.ids) {
      const fact = matchFact({
        sourceSetName: id.source_set_name,
        cardNumber: id.card_number,
        cardName: id.card_name,
        finishKey: segment.finish_key,
        factsByCore,
        setsByName,
      });
      if (!fact) {
        ignored.push({
          source_set_name: id.source_set_name,
          card_number: id.card_number,
          card_name: id.card_name,
          finish_key: segment.finish_key,
          reason: 'no_matching_remaining_gap_fact',
        });
        continue;
      }

      records.push({
        source_key: SOURCE_KEY,
        source_kind: 'human_readable_checklist',
        source_url: page.source_url,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: normalizeFinishKey(fact.finish_key),
        rarity: null,
        evidence_type: segment.evidence_type,
        evidence_label: segment.evidence_label,
        language: 'en',
        retrieved_at: generatedAt,
        raw_snapshot_ref: `bulbapedia_build_battle:${titleParam(page.title)}:${fact.set_key}:${fact.card_number}:${normalizeFinishKey(fact.finish_key)}`,
        notes: `Exact Bulbapedia Build & Battle product-page TCG ID matched to an existing remaining gap. Evidence phrase: ${segment.evidence_snippet}.`,
      });
    }
  }

  return {
    records,
    ignored,
    status: segments.length ? (records.length ? 'generated' : 'no_matching_remaining_gap_facts') : 'no_usable_finish_segments',
  };
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

async function writeFixture(setKey, setName, records, generatedAt, dryRun) {
  if (!records.length || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${setKey}.json`);
  const existing = await readExistingFixture(file);
  const merged = [...new Map([...existing, ...records].map((record) => [fixtureRecordKey(record), record])).values()]
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key).localeCompare(String(b.finish_key)));
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `bulbapedia_build_battle_${setKey}`,
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Build_%26_Battle_Box_(TCG)',
    source_status: 'available_generated',
    set_key: setKey,
    set_name: setName,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:bulbapedia_build_battle:${setKey}:${generatedAt}`,
    generation_note: 'Generated from Bulbapedia Build & Battle product pages. Exact Non Holofoil and specially stamped Prerelease statements only; deck-list generalities are ignored.',
    records: merged,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function uniquePages(sets, options) {
  let rows = (sets.sets ?? [])
    .filter((row) => row?.set_name)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.key)) || options.sets.has(normalizeText(row.set_name)))
    .map((row) => ({
      source_set_key: row.key,
      source_set_name: row.set_name,
      title: wikiTitleForSet(row.set_name),
    }));
  rows = [...new Map(rows.map((row) => [row.title, row])).values()];
  rows.sort((a, b) => a.source_set_name.localeCompare(b.source_set_name));
  if (options.maxPages) rows = rows.slice(0, options.maxPages);
  return rows;
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

async function writeReports({ generatedAt, results, fixtureFiles, records, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'english_master_index_bulbapedia_build_battle_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_key: SOURCE_KEY,
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Build_%26_Battle_Box_(TCG)',
    summary: {
      pages_attempted: results.length,
      pages_with_usable_segments: results.filter((row) => row.usable_segments > 0).length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(records, (row) => row.finish_key),
      ignored_source_entries: results.reduce((total, row) => total + (row.ignored?.length ?? 0), 0),
    },
    safety: {
      exact_finish_only: true,
      ignored_deck_list_generalities: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
    records,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_build_battle_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const rows = results
    .filter((row) => row.status !== 'source_unavailable')
    .map((row) => [row.source_set_key, row.source_set_name, row.status, row.usable_segments, row.records_generated, row.source_url]);
  const md = [
    '# Bulbapedia Build & Battle Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    'This lane only accepts exact product-page wording for `exclusive Non Holofoil versions` and `specially stamped Prerelease cards`. General deck lists and product assumptions are ignored.',
    '',
    `Generated: ${generatedAt}`,
    '',
    markdownTable(['source set', 'name', 'status', 'usable segments', 'records', 'source URL'], rows.slice(0, 80)),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_build_battle_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, sets] = await Promise.all([readJson(GAPS_PATH), readJson(SETS_PATH)]);
  const facts = targetFacts(gaps);
  const factsByCore = buildFactsByCore(facts);
  const setsByName = buildSetsByName(sets);
  const pages = uniquePages(sets, options);
  const results = [];
  const records = [];

  console.log(`[bulbapedia-build-battle] target facts ${facts.length}`);
  console.log(`[bulbapedia-build-battle] candidate pages ${pages.length}`);

  for (const pageCandidate of pages) {
    let result;
    try {
      const page = await fetchRawPage(pageCandidate.title, options);
      const built = buildRecordsForPage({ page, factsByCore, setsByName, generatedAt });
      records.push(...built.records);
      result = {
        ...pageCandidate,
        status: built.status,
        source_url: page.source_url,
        raw_url: page.raw_url,
        from_cache: page.from_cache,
        usable_segments: evidenceSegments(page.raw).length,
        records_generated: built.records.length,
        ignored: built.ignored.slice(0, 100),
      };
    } catch (error) {
      result = {
        ...pageCandidate,
        status: 'source_error',
        source_url: sourceUrlForTitle(pageCandidate.title),
        raw_url: rawUrlForTitle(pageCandidate.title),
        usable_segments: 0,
        records_generated: 0,
        error: String(error?.message ?? error),
        ignored: [],
      };
    }
    results.push(result);
    if (result.records_generated || result.status !== 'source_unavailable') {
      console.log(`[bulbapedia-build-battle] ${result.source_set_key} ${result.status} records ${result.records_generated}`);
    }
    await sleep(150);
  }

  const dedupedRecords = [...new Map(records.map((record) => [fixtureRecordKey(record), record])).values()];
  const recordsBySet = new Map();
  for (const record of dedupedRecords) {
    if (!recordsBySet.has(record.set_key)) recordsBySet.set(record.set_key, []);
    recordsBySet.get(record.set_key).push(record);
  }

  const fixtureFiles = [];
  for (const [setKey, setRecords] of recordsBySet.entries()) {
    const fixtureFile = await writeFixture(setKey, setRecords[0].set_name, setRecords, generatedAt, options.dryRun);
    fixtureFiles.push(fixtureFile);
  }

  const report = await writeReports({ generatedAt, results, fixtureFiles, records: dedupedRecords, dryRun: options.dryRun });
  console.log(`[bulbapedia-build-battle] records ${report.summary.records_generated}`);
  console.log(`[bulbapedia-build-battle] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error('[bulbapedia-build-battle] failed:', error);
  process.exitCode = 1;
});
