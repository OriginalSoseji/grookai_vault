import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFile = promisify(execFileCallback);

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokemoncard_io_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokemoncard_io_acquisition_v1';
const REPORT_JSON = path.join(REPORT_DIR, 'pokemoncard_finish_acquisition_v1.json');
const REPORT_MD = path.join(REPORT_DIR, 'pokemoncard_finish_acquisition_v1.md');
const BASE_URL = 'https://pokemoncard.io/card';

const SUPPORTED_FINISHES = new Set(['normal', 'holo', 'reverse']);

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };
}

function parseArgs(argv) {
  const options = { sets: null, maxFacts: null, dryRun: false, refreshCache: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-facts') {
      options.maxFacts = Number(next);
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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'e')
    .replace(/&Eacute;/g, 'E')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\bbasic\b/g, ' ')
    .replace(/\blv\s*x\b/g, 'lv x')
    .replace(/\blv\s*\.?\s*x\b/g, 'lv x')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceSetCode(set) {
  return normalizeText(set.source_aliases?.pokemontcg_api ?? set.pokemontcg ?? set.key).replace(/\s+/g, '');
}

function sourceNumber(value) {
  return String(value ?? '')
    .trim()
    .replace(/^0+(?=\d)/, '')
    .toLowerCase();
}

function cardUrlForFact(fact, set) {
  return `${BASE_URL}/${slugify(fact.card_name)}-${sourceSetCode(set)}-${encodeURIComponent(sourceNumber(fact.card_number))}`;
}

function cardUrlCandidatesForFact(fact, set) {
  const candidates = [cardUrlForFact(fact, set)];
  if (/\benergy\b/i.test(fact.card_name) && !/\bbasic\b/i.test(fact.card_name)) {
    candidates.push(`${BASE_URL}/${slugify(`Basic ${fact.card_name}`)}-${sourceSetCode(set)}-${encodeURIComponent(sourceNumber(fact.card_number))}`);
  }
  return [...new Set(candidates)];
}

function finishFromLabel(value) {
  const normalized = normalizeText(value);
  const aliases = {
    normal: 'normal',
    holofoil: 'holo',
    holo: 'holo',
    'reverse holofoil': 'reverse',
    'reverse holo': 'reverse',
    reverse: 'reverse',
  };
  return normalizeFinishKey(aliases[normalized] ?? null);
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(25000),
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
    return html;
  } catch (fetchError) {
    const { stdout } = await execFile('curl.exe', [
      '--ssl-no-revoke',
      '--silent',
      '--show-error',
      '--location',
      '--max-time',
      '45',
      '--user-agent',
      'Grookai Master Index Audit/1.0',
      url,
    ], { maxBuffer: 30 * 1024 * 1024 });
    if (!stdout || /not found|404/i.test(stdout)) throw fetchError;
    return stdout;
  }
}

function parsePageIdentity(html) {
  const title = decodeHtml(String(html).match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const heading = decodeHtml(String(html).match(/#\s*([^<]+?)\s*<a[\s\S]*?\/\s*([^<\s]+)/)?.[1] ?? '');
  const setMatch = decodeHtml(String(html).match(/#\s*[^<]+?\s*<a[^>]*>([^<]+)<\/a>\s*\/\s*([^<\s]+)/)?.[1] ?? '');
  const numberMatch = decodeHtml(String(html).match(/Card Number:\s*<\/span>\s*([^<\s]+)/)?.[1] ?? '');
  return { title, heading, set_name: setMatch, card_number: numberMatch };
}

function parseTcgplayerPrintRows(html) {
  const rows = [];
  const rowRegex = /<tr[\s\S]*?<td class="px-6 py-4 whitespace-nowrap">([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  for (const match of String(html).matchAll(rowRegex)) {
    const cell = match[1];
    const labelText = decodeHtml(cell);
    const printNameMatch = labelText.match(/^(.+?)\s+(Normal|Holofoil|Reverse Holofoil)\b/i);
    const printName = printNameMatch ? printNameMatch[1].trim() : labelText;
    const finishLabels = [...cell.matchAll(/<span[^>]*>\s*(Normal|Holofoil|Reverse Holofoil)\s*<\/span>/gi)]
      .map((labelMatch) => finishFromLabel(labelMatch[1]))
      .filter(Boolean);
    const setLine = decodeHtml(cell.match(/<div class="text-sm text-gray-500[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/)?.[1] ?? '');
    for (const finishKey of finishLabels) {
      rows.push({
        print_name: printName,
        finish_key: finishKey,
        set_line: setLine,
      });
    }
  }
  return rows;
}

function validatePrintRow(fact, set, pageIdentity, printRow) {
  const numberMatches = normalizeNumber(pageIdentity.card_number || fact.card_number) === normalizeNumber(fact.card_number);
  const nameMatches = !pageIdentity.heading || cardComparable(pageIdentity.heading) === cardComparable(fact.card_name);
  const setCode = sourceSetCode(set);
  const setMatches = normalizeText(printRow.set_line).includes(normalizeText(setCode))
    || normalizeText(printRow.set_line).includes(normalizeText(set.set_name));
  const printNameMatches = cardComparable(printRow.print_name).includes(cardComparable(fact.card_name));
  const printRowNumbers = [
    ...String(printRow.print_name).matchAll(/\(([^)]+)\)/g),
    ...String(printRow.print_name).matchAll(/-\s*([A-Za-z0-9]+)\b/g),
  ].map((match) => normalizeNumber(match[1])).filter(Boolean);
  const printRowNumberMatches = printRowNumbers.length === 0 || printRowNumbers.includes(normalizeNumber(fact.card_number));
  const finishMatches = normalizeFinishKey(printRow.finish_key) === normalizeFinishKey(fact.finish_key);
  return numberMatches && nameMatches && setMatches && printNameMatches && printRowNumberMatches && finishMatches;
}

function targetFacts(gaps, setsByKey, options) {
  let facts = (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => ['finish_human_checklist_evidence_needed', 'finish_second_source_needed'].includes(row.gap_type))
    .filter((row) => SUPPORTED_FINISHES.has(normalizeFinishKey(row.finish_key)))
    .filter((row) => row.set_key && row.card_number && row.card_name && setsByKey.has(row.set_key));
  if (options.sets) facts = facts.filter((row) => options.sets.has(normalizeText(row.set_key)));
  facts = facts.sort((left, right) => (
    `${left.set_key}|${normalizeNumber(left.card_number)}|${left.finish_key}|${left.card_name}`
      .localeCompare(`${right.set_key}|${normalizeNumber(right.card_number)}|${right.finish_key}|${right.card_name}`, undefined, { numeric: true })
  ));
  return Number.isFinite(options.maxFacts) && options.maxFacts > 0 ? facts.slice(0, options.maxFacts) : facts;
}

async function tryFact(fact, set, generatedAt) {
  const sourceUrls = cardUrlCandidatesForFact(fact, set);
  const attempts = [];
  for (const sourceUrl of sourceUrls) {
    try {
      const html = await fetchHtml(sourceUrl);
      const pageIdentity = parsePageIdentity(html);
      const rows = parseTcgplayerPrintRows(html);
      const matching = rows.find((row) => validatePrintRow(fact, set, pageIdentity, row));
      if (!matching) {
        attempts.push({
          status: rows.length > 0 ? 'no_exact_print_row' : 'no_tcgplayer_print_rows',
          source_url: sourceUrl,
          source_rows: rows.length,
          page_identity: pageIdentity,
        });
        continue;
      }
      return {
        status: 'validated',
        fact,
        source_url: sourceUrl,
        attempted_urls: sourceUrls,
        source_rows: rows.length,
        page_identity: pageIdentity,
        record: {
          source_key: 'pokemoncard_io_price_breakdown',
          source_kind: 'marketplace_checklist',
          source_url: sourceUrl,
          set_name: fact.set_name,
          card_number: fact.card_number,
          card_name: fact.card_name,
          finish_key: normalizeFinishKey(fact.finish_key),
          rarity: null,
          evidence_type: 'finish_presence',
          evidence_label: `PokemonCard.io TCGplayer price breakdown row: ${matching.print_name} ${matching.finish_key}`,
          language: 'en',
          retrieved_at: generatedAt,
          raw_snapshot_ref: `pokemoncard_io:${fact.set_key}:${normalizeNumber(fact.card_number)}:${normalizeFinishKey(fact.finish_key)}`,
          notes: 'Exact finish evidence accepted only from a PokemonCard.io TCGplayer price breakdown print row. Rarity text alone is not used.',
        },
      };
    } catch (error) {
      attempts.push({
        status: 'source_unavailable',
        source_url: sourceUrl,
        source_rows: 0,
        error: String(error.message ?? error),
      });
    }
  }
  return {
    status: attempts.some((attempt) => attempt.status === 'no_exact_print_row') ? 'no_exact_print_row'
      : attempts.some((attempt) => attempt.status === 'no_tcgplayer_print_rows') ? 'no_tcgplayer_print_rows'
        : 'source_unavailable',
    fact,
    source_url: attempts[0]?.source_url ?? sourceUrls[0],
    attempted_urls: sourceUrls,
    source_rows: Math.max(0, ...attempts.map((attempt) => attempt.source_rows ?? 0)),
    attempts,
  };
}

function groupBySet(results) {
  const map = new Map();
  for (const result of results.filter((row) => row.status === 'validated')) {
    const setKey = result.fact.set_key;
    if (!map.has(setKey)) map.set(setKey, []);
    map.get(setKey).push(result);
  }
  return map;
}

async function writeFixtures(results, setsByKey, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, rows] of groupBySet(results).entries()) {
    const set = setsByKey.get(setKey);
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    let existingRecords = [];
    try {
      const existing = JSON.parse(await fs.readFile(file, 'utf8'));
      existingRecords = Array.isArray(existing.records) ? existing.records : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const merged = [...existingRecords, ...rows.map((row) => row.record)];
    const records = [...new Map(merged.map((record) => [
      `${record.source_key}|${normalizeNumber(record.card_number)}|${cardComparable(record.card_name)}|${record.finish_key}`,
      record,
    ])).values()].sort((left, right) => (
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
        || String(left.finish_key).localeCompare(String(right.finish_key))
    ));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `pokemoncard_io_finish_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'https://pokemoncard.io/',
      source_status: 'available_generated',
      set_key: set.key,
      set_name: set.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pokemoncard_io_finish:${setKey}:${generatedAt}`,
      generation_note: 'Generated from PokemonCard.io TCGplayer price breakdown print rows. Rarity text alone is ignored.',
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
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function buildMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const setRows = Object.entries(report.summary.validated_by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  const sampleRows = report.results.slice(0, 300).map((row) => [
    row.status,
    row.fact.set_key,
    row.fact.card_number,
    row.fact.card_name,
    row.fact.finish_key,
    row.source_url,
    row.source_rows,
  ]);
  return [
    '# PokemonCard.io Finish Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    report.rule,
    '',
    '## Summary',
    '',
    markdownTable(['status', 'count'], statusRows),
    '',
    '## Validated By Set',
    '',
    setRows.length ? markdownTable(['set_key', 'set_name', 'validated finish facts'], setRows) : 'No validated finish facts.',
    '',
    '## Sample Attempts',
    '',
    markdownTable(['status', 'set', 'number', 'name', 'finish', 'source_url', 'source_rows'], sampleRows),
    '',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload] = await Promise.all([readJson(GAPS_PATH), readJson(SETS_PATH)]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const facts = targetFacts(gaps, setsByKey, options);
  console.log(`[pokemoncard.io] target facts ${facts.length}`);
  const results = [];
  for (let index = 0; index < facts.length; index += 1) {
    const fact = facts[index];
    if ((index + 1) % 25 === 0 || index === 0) {
      console.log(`[pokemoncard.io] ${index + 1}/${facts.length} ${fact.set_key} ${fact.card_number} ${fact.card_name} ${fact.finish_key}`);
    }
    const set = setsByKey.get(fact.set_key);
    try {
      results.push(await tryFact(fact, set, generatedAt));
    } catch (error) {
      results.push({
        status: 'source_unavailable',
        fact,
        source_url: cardUrlForFact(fact, set),
        attempted_urls: cardUrlCandidatesForFact(fact, set),
        source_rows: 0,
        error: String(error.message ?? error),
      });
    }
  }
  const fixtureFiles = await writeFixtures(results, setsByKey, generatedAt, options.dryRun);
  const report = {
    generated_at: generatedAt,
    version: 'POKEMONCARD_IO_FINISH_ACQUISITION_V1',
    ...safety(),
    dry_run: options.dryRun,
    rule: 'PokemonCard.io evidence is accepted only when the TCGplayer price breakdown table contains an exact print row matching set, card number, card name, and finish.',
    summary: {
      attempted_facts: results.length,
      by_status: countBy(results, (row) => row.status),
      validated_by_set: countBy(results.filter((row) => row.status === 'validated'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
      records_generated: results.filter((row) => row.status === 'validated').length,
      fixture_files_written: fixtureFiles.length,
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    report: REPORT_JSON,
    records_generated: report.summary.records_generated,
    fixture_files_written: report.summary.fixture_files_written,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
