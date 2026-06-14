import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const INPUT_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/justinbasil_prize_pack_finish_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_justinbasil_prize_pack_finish_v1';
const SOURCE_KEY = 'justinbasil_prize_pack_finish';
const BASE_URL = 'https://www.justinbasil.com/set-lists';

const SERIES = [1, 2, 3, 4, 5, 6, 7, 8];

const SET_CODE_TO_KEY = {
  SSH: 'swsh1',
  RCL: 'swsh2',
  DAA: 'swsh3',
  VIV: 'swsh4',
  BST: 'swsh5',
  CRE: 'swsh6',
  EVS: 'swsh7',
  FST: 'swsh8',
  BRS: 'swsh9',
  ASR: 'swsh10',
  LOR: 'swsh11',
  SIT: 'swsh12',
  CRZ: 'swsh12.5',
  SWSH: 'swshp',
  SVI: 'sv01',
  PAL: 'sv02',
  OBF: 'sv03',
  MEW: 'sv03.5',
  PAR: 'sv04',
  PAF: 'sv04.5',
  TEF: 'sv05',
  TWM: 'sv06',
  SFA: 'sv06.5',
  SCR: 'sv07',
  SSP: 'sv08',
  PRE: 'sv08.5',
  JTG: 'sv09',
  DRI: 'sv10',
  BLK: 'sv10.5b',
  WHT: 'sv10.5w',
  SVE: 'sve',
};

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
  const out = {};
  for (const row of rows) out[fn(row)] = (out[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/\\u0026/g, '&')
    .replace(/\\u002D/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparable(value) {
  return normalizeText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bbasic\s+(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy\b/g, '$1 energy')
    .replace(/\bex\b/g, ' ex ')
    .replace(/\svmax\b/g, ' vmax')
    .replace(/\svstar\b/g, ' vstar')
    .replace(/\sv\b/g, ' v')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function cacheFileForUrl(url) {
  return path.join(CACHE_DIR, `${sha256(url)}.html`);
}

async function fetchText(url, options) {
  const cacheFile = cacheFileForUrl(url);
  if (!options.refreshCache) {
    try {
      return await fs.readFile(cacheFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '90',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 100000, maxBuffer: 80 * 1024 * 1024 });
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, stdout);
  }
  return stdout;
}

function parseSeriesHtml(series, html) {
  const sourceUrl = `${BASE_URL}/pps${series}`;
  const entries = [];
  const pattern = /<li[^>]*>\s*<b>\s*((?:S|H)(?:\s*,\s*(?:S|H))?)\s*<\/b>\s*([^<]+?)\s+([A-Z]{2,5})\s+([A-Za-z0-9.-]+)\s*<\/li>/g;
  for (const match of html.matchAll(pattern)) {
    const marks = [...new Set(match[1].split(',').map((value) => value.trim()).filter(Boolean))].sort();
    const sourceSetCode = match[3].toUpperCase();
    const setKey = SET_CODE_TO_KEY[sourceSetCode] ?? null;
    entries.push({
      source_series: series,
      source_url: sourceUrl,
      source_marks: marks,
      card_name: decodeHtml(match[2]),
      source_set_code: sourceSetCode,
      set_key: setKey,
      card_number: normalizeNumber(match[4]),
      status: setKey ? 'parsed' : 'blocked_unknown_source_set_code',
    });
  }
  return entries;
}

function targetRows(report) {
  return (report.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .filter((row) => row.proposed_variant_key === 'prize_pack_stamp');
}

function entryMatches(row, entry) {
  return entry.set_key === row.set_key
    && compactNumber(entry.card_number) === compactNumber(row.card_number)
    && comparable(entry.card_name) === comparable(row.card_name);
}

function finishFromSingleMark(mark) {
  if (mark === 'S') return 'normal';
  if (mark === 'H') return 'cosmos';
  return null;
}

function classifyTargets(targets, entries) {
  const parsed = entries.filter((entry) => entry.status === 'parsed');
  const results = [];
  for (const row of targets) {
    const matches = parsed.filter((entry) => entryMatches(row, entry));
    if (matches.length === 0) {
      results.push({ ...row, status: 'blocked_no_exact_justinbasil_prize_pack_match' });
      continue;
    }

    const singleFinishMatches = matches
      .filter((entry) => entry.source_marks.length === 1)
      .map((entry) => ({ ...entry, finish_key: finishFromSingleMark(entry.source_marks[0]) }))
      .filter((entry) => entry.finish_key);
    const multiFinishMatches = matches.filter((entry) => entry.source_marks.length > 1);
    const finishKeys = [...new Set(singleFinishMatches.map((entry) => entry.finish_key))].sort();

    if (singleFinishMatches.length === 0 && multiFinishMatches.length > 0) {
      results.push({
        ...row,
        status: 'blocked_multi_finish_prize_pack_requires_multi_child_package',
        matched_entries: matches,
      });
      continue;
    }
    if (finishKeys.length !== 1) {
      results.push({
        ...row,
        status: 'blocked_ambiguous_justinbasil_prize_pack_finish',
        matched_entries: matches,
        candidate_finish_keys: finishKeys,
      });
      continue;
    }

    const accepted = singleFinishMatches[0];
    results.push({
      ...row,
      status: 'accepted_exact_justinbasil_prize_pack_finish',
      accepted_finish_key: finishKeys[0],
      accepted_source_url: accepted.source_url,
      accepted_source_series: accepted.source_series,
      accepted_source_marks: accepted.source_marks,
      accepted_source_set_code: accepted.source_set_code,
      accepted_source_card_name: accepted.card_name,
      accepted_source_card_number: accepted.card_number,
    });
  }
  return results;
}

function fixtureRecord(row, generatedAt) {
  const finishLabel = row.accepted_finish_key === 'normal' ? 'non-holo' : 'cosmos holofoil';
  return {
    source_key: SOURCE_KEY,
    source_kind: 'collector_reference',
    source_url: row.accepted_source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.accepted_finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `JustInBasil Prize Pack Series ${row.accepted_source_series}: ${row.accepted_source_marks.join(', ')} (${finishLabel}) ${row.accepted_source_card_name} ${row.accepted_source_set_code} ${row.accepted_source_card_number}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `justinbasil:pps${row.accepted_source_series}:${row.accepted_source_set_code}:${row.accepted_source_card_number}:${row.accepted_source_marks.join('-')}`,
    notes: 'Exact card-level Prize Pack finish evidence. JustInBasil defines S as non-holo and H as cosmos holofoil and states listed cards are Play! Pokemon stamped.',
  };
}

async function writeFixtures(results, generatedAt, dryRun) {
  const accepted = results.filter((row) => row.status === 'accepted_exact_justinbasil_prize_pack_finish');
  const files = [];
  if (dryRun || accepted.length === 0) return files;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const grouped = new Map();
  for (const row of accepted) {
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  for (const [setKey, rows] of grouped) {
    const records = rows.map((row) => fixtureRecord(row, generatedAt));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${SOURCE_KEY}_${setKey}`,
      source_kind: 'collector_reference',
      source_url: BASE_URL,
      source_status: 'available_generated',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      generation_note: 'Generated from JustInBasil Prize Pack set-list text. Exact source set code, card number, card name, and single S/H finish mark only.',
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
    .filter((row) => row.status === 'accepted_exact_justinbasil_prize_pack_finish')
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.accepted_finish_key,
      `PPS${row.accepted_source_series}`,
      row.accepted_source_marks.join(', '),
    ]);
  return `# JustInBasil Prize Pack Finish Acquisition V1

Audit-only source acquisition for Prize Pack stamped active finishes.

## Safety

- dry_run: ${report.dry_run}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Source Rule

JustInBasil Prize Pack pages state that \`S\` means available in non-holo and \`H\` means available in cosmos holofoil, and that the listed cards are stamped with the Play! Pokemon logo. This lane accepts only exact set-code, card-number, card-name matches with exactly one source finish mark.

## Summary

- target_rows: ${report.summary.target_rows}
- source_entries_parsed: ${report.summary.source_entries_parsed}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'finish', 'series', 'mark'], acceptedRows) : '_No accepted rows._'}

## Safety Notes

- Rows marked both \`S, H\` are blocked for a separate multi-child package.
- This script performs no DB writes.
- This script creates generated evidence fixtures only.
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const routing = await readJson(INPUT_JSON);
  const targets = targetRows(routing);
  const entryGroups = await Promise.all(SERIES.map(async (series) => {
    const url = `${BASE_URL}/pps${series}`;
    try {
      const html = await fetchText(url, options);
      return parseSeriesHtml(series, html);
    } catch (error) {
      return [{
        source_series: series,
        source_url: url,
        status: 'source_fetch_failed',
        error: error.message,
      }];
    }
  }));
  const entries = entryGroups.flat();
  const results = classifyTargets(targets, entries);
  const fixtureFiles = await writeFixtures(results, generatedAt, options.dryRun);
  const accepted = results.filter((row) => row.status === 'accepted_exact_justinbasil_prize_pack_finish');

  const report = {
    version: 'english_master_index_justinbasil_prize_pack_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'collector_reference',
    source_url: BASE_URL,
    source_reference_urls: SERIES.map((series) => `${BASE_URL}/pps${series}`),
    rule: 'Accept only exact Prize Pack set-code/card-number/card-name rows with exactly one JustInBasil S/H finish mark.',
    fingerprint_sha256: sha256(stableJson(accepted.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.accepted_finish_key,
      source_series: row.accepted_source_series,
    })))),
    summary: {
      target_rows: targets.length,
      source_entries_parsed: entries.filter((entry) => entry.status === 'parsed').length,
      source_entry_blockers: countBy(entries.filter((entry) => entry.status !== 'parsed'), (entry) => entry.status),
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(accepted, (row) => row.accepted_finish_key),
      by_set: countBy(accepted, (row) => row.set_key),
    },
    fixture_dir: FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };

  const outputJson = path.join(REPORT_DIR, 'justinbasil_prize_pack_finish_acquisition_v1.json');
  const outputMd = path.join(REPORT_DIR, 'justinbasil_prize_pack_finish_acquisition_v1.md');
  await writeJson(outputJson, report);
  await writeText(outputMd, renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
