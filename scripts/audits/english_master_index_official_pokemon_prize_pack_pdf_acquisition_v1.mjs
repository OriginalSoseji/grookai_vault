import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'official_pokemon_prize_pack_pdf_acquisition_v1');
const CACHE_DIR = path.join(SOURCE_DIR, 'cache');
const OUTPUT_JSON = path.join(SOURCE_DIR, 'official_pokemon_prize_pack_pdf_acquisition_v1.json');
const OUTPUT_MD = path.join(SOURCE_DIR, 'official_pokemon_prize_pack_pdf_acquisition_v1.md');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures', 'official_pokemon_prize_pack_pdf_acquisition_v1');
const QUEUE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.json');

const PACKAGE_ID = 'OFFICIAL-POKEMON-PRIZE-PACK-PDF-ACQUISITION-V1';
const SOURCE_KEY = 'official_pokemon_prize_pack_pdf';
const BASE_URL = 'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist';
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
  SVE: 'sve',
  BLK: 'zsv10.5',
  WHT: 'rsv10.5',
  MEG: 'me01',
  PHF: 'me02',
  M1S: 'me03',
  M1L: 'me04',
};

const COLUMN_STARTS = [14, 163, 312, 462];
const COLUMN_ENDS = [154, 303, 453, 612];
const STANDARD_OFFSET = 118;
const FOIL_OFFSET = 129;

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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

function comparableName(value) {
  return normalizeText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))));
}

function seriesUrl(series) {
  return `${BASE_URL}/prize_pack_series_${series}_web_cardlist_en.pdf`;
}

async function downloadPdf(series) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const pdfPath = path.join(CACHE_DIR, `series${series}.pdf`);
  try {
    const stat = await fs.stat(pdfPath);
    if (stat.size > 10000) return pdfPath;
    await fs.rm(pdfPath, { force: true });
  } catch {
    // download below
  }
  await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    '90',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    '--output',
    pdfPath,
    seriesUrl(series),
  ], { timeout: 100000, maxBuffer: 20 * 1024 * 1024 });
  const stat = await fs.stat(pdfPath);
  if (stat.size < 10000) throw new Error(`downloaded_pdf_too_small_series_${series}`);
  return pdfPath;
}

async function pdfToBbox(series, pdfPath) {
  const htmlPath = path.join(CACHE_DIR, `series${series}_bbox.html`);
  await execFileAsync('pdftotext', ['-bbox-layout', pdfPath, htmlPath], { timeout: 100000, maxBuffer: 20 * 1024 * 1024 });
  return fs.readFile(htmlPath, 'utf8');
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseWords(xml) {
  const words = [];
  const pattern = /<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g;
  for (const match of xml.matchAll(pattern)) {
    words.push({
      xMin: Number(match[1]),
      yMin: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: decodeXml(match[5]),
    });
  }
  return words;
}

function groupLines(words) {
  const entryWords = words
    .filter((word) => word.yMin > 90 && word.yMin < 735)
    .filter((word) => !['Pokémon', 'TCG:', 'Prize', 'Pack—Series', 'Card', 'List'].includes(word.text));
  const lines = [];
  for (const word of entryWords.sort((left, right) => left.yMin - right.yMin || left.xMin - right.xMin)) {
    const line = lines.find((candidate) => Math.abs(candidate.y - word.yMin) < 2.2);
    if (line) {
      line.words.push(word);
      line.y = Math.min(line.y, word.yMin);
    } else {
      lines.push({ y: word.yMin, words: [word] });
    }
  }
  return lines.map((line) => ({ ...line, words: line.words.sort((left, right) => left.xMin - right.xMin) }));
}

function columnIndexForX(x) {
  return COLUMN_STARTS.findIndex((start, index) => x >= start - 4 && x < COLUMN_ENDS[index]);
}

function parseColumnEntry({ series, line, columnIndex }) {
  const columnStart = COLUMN_STARTS[columnIndex];
  const words = line.words.filter((word) => columnIndexForX(word.xMin) === columnIndex);
  if (words.length < 3) return null;

  const standard = words.some((word) => word.text === '■' && Math.abs(word.xMin - (columnStart + STANDARD_OFFSET)) < 8);
  const foil = words.some((word) => word.text === '■' && Math.abs(word.xMin - (columnStart + FOIL_OFFSET)) < 8);
  if (!standard && !foil) return null;

  const nonBoxWords = words.filter((word) => word.text !== '■');
  const tokens = nonBoxWords.map((word) => word.text);
  let setCode = null;
  let cardNumber = null;
  let codeIndex = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index].replace(/[^A-Za-z0-9.]/g, '');
    const promoMatch = token.match(/^(SWSH|SVP)(\d+)$/i);
    if (promoMatch) {
      setCode = promoMatch[1].toUpperCase();
      cardNumber = `${setCode}${promoMatch[2]}`;
      codeIndex = index;
      break;
    }
    if (/^[A-Z0-9]{2,5}$/i.test(token) && SET_CODE_TO_KEY[token.toUpperCase()] && tokens[index + 1]) {
      setCode = token.toUpperCase();
      cardNumber = tokens[index + 1].replace(/[^A-Za-z0-9.-]/g, '');
      codeIndex = index;
      break;
    }
  }
  if (!setCode || !cardNumber || codeIndex <= 0) return null;
  const cardName = tokens.slice(0, codeIndex).join(' ').replace(/\s+/g, ' ').trim();
  if (!cardName) return null;

  const finishes = [];
  if (standard) finishes.push('normal');
  if (foil) finishes.push('cosmos');
  return {
    source_key: SOURCE_KEY,
    source_kind: 'official_gallery',
    source_url: seriesUrl(series),
    source_series: series,
    set_key: SET_CODE_TO_KEY[setCode],
    source_set_code: setCode,
    card_number: cardNumber,
    card_name: cardName,
    variant_key: 'prize_pack_stamp',
    finishes,
    evidence_label: `Official Pokémon Prize Pack Series ${series} checklist: ${cardName} ${setCode} ${cardNumber} supports ${finishes.map((finish) => (finish === 'normal' ? 'standard set' : 'standard set foil')).join(' and ')}`,
    raw_snapshot_ref: `${SOURCE_KEY}:series${series}:${setCode}:${cardNumber}:${cardName}:${finishes.join('+')}`,
  };
}

function parseSeries(series, xml) {
  const entries = [];
  for (const line of groupLines(parseWords(xml))) {
    for (let columnIndex = 0; columnIndex < COLUMN_STARTS.length; columnIndex += 1) {
      const entry = parseColumnEntry({ series, line, columnIndex });
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

async function loadOfficialEntries() {
  const all = [];
  const sourceDownloads = [];
  for (const series of SERIES) {
    try {
      const pdfPath = await downloadPdf(series);
      const xml = await pdfToBbox(series, pdfPath);
      const entries = parseSeries(series, xml);
      sourceDownloads.push({
        series,
        source_url: seriesUrl(series),
        source_status: 'available',
        pdf_path: rel(pdfPath),
        parsed_entries: entries.length,
      });
      all.push(...entries);
    } catch (error) {
      sourceDownloads.push({
        series,
        source_url: seriesUrl(series),
        source_status: 'unavailable',
        error: error?.message ?? String(error),
        parsed_entries: 0,
      });
    }
  }
  return { entries: all, sourceDownloads };
}

function targetRows(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.action_bucket === 'prize_pack_second_source')
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || compactNumber(left.card_number).localeCompare(compactNumber(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function priorClosureByKey(closure) {
  const map = new Map();
  for (const row of closure.rows ?? []) {
    const key = [row.set_key, compactNumber(row.card_number), comparableName(row.card_name)].join('|');
    map.set(key, row);
  }
  return map;
}

function targetKey(row) {
  return [row.set_key, compactNumber(row.card_number), comparableName(row.card_name)].join('|');
}

function officialMatches(row, entries) {
  return entries.filter((entry) => entry.set_key === row.set_key
    && compactNumber(entry.card_number) === compactNumber(row.card_number)
    && comparableName(entry.card_name) === comparableName(row.card_name));
}

function evidenceRecord(row, entry, finishKey, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'official_gallery',
    source_url: entry.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    finish_key: finishKey,
    evidence_type: 'finish_presence',
    evidence_label: `Official Pokémon Prize Pack Series ${entry.source_series} checklist supports ${finishKey === 'normal' ? 'standard set' : 'standard set foil'} for ${row.card_name} ${entry.source_set_code} ${entry.card_number}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `${entry.raw_snapshot_ref}:${finishKey}`,
    notes: 'Official Pokémon Prize Pack checklist PDF. Standard set is mapped to normal; standard set foil is mapped to cosmos for Prize Pack stamped active-finish governance.',
  };
}

function classifyTargets({ targets, entries, closure, generatedAt }) {
  const closureMap = priorClosureByKey(closure);
  return targets.map((row) => {
    const prior = closureMap.get(targetKey(row)) ?? null;
    const matches = officialMatches(row, entries);
    const officialFinishes = [...new Set(matches.flatMap((entry) => entry.finishes))].sort();
    const officialEvidence = matches.flatMap((entry) => entry.finishes.map((finishKey) => evidenceRecord(row, entry, finishKey, generatedAt)));
    const priorAcceptedFinish = prior?.accepted_finish_key ?? null;
    const priorFinishKeys = Object.keys(prior?.finish_counts ?? {}).sort();
    const priorSourceFamilies = prior?.source_families ?? [];

    let status = 'no_official_exact_match';
    let usefulFinishKey = null;
    if (officialFinishes.length > 1) {
      status = 'official_conflicting_normal_and_foil';
    } else if (officialFinishes.length === 1 && priorAcceptedFinish && officialFinishes[0] === priorAcceptedFinish) {
      status = 'useful_second_source_match';
      usefulFinishKey = officialFinishes[0];
    } else if (officialFinishes.length === 1 && priorAcceptedFinish && officialFinishes[0] !== priorAcceptedFinish) {
      status = 'official_conflicts_with_prior_accepted_finish';
    } else if (officialFinishes.length === 1 && priorFinishKeys.length === 1 && officialFinishes[0] === priorFinishKeys[0] && priorSourceFamilies.length > 0) {
      status = 'useful_second_source_match';
      usefulFinishKey = officialFinishes[0];
    } else if (officialFinishes.length === 1 && priorFinishKeys.length > 1) {
      status = 'official_single_finish_may_resolve_prior_conflict';
      usefulFinishKey = officialFinishes[0];
    } else if (officialFinishes.length === 1) {
      status = 'official_single_source_only';
      usefulFinishKey = officialFinishes[0];
    }

    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      prior_closure_status: prior?.closure_status ?? null,
      prior_accepted_finish_key: priorAcceptedFinish,
      prior_finish_counts: prior?.finish_counts ?? {},
      prior_source_families: priorSourceFamilies,
      official_match_count: matches.length,
      official_finishes: officialFinishes,
      useful_finish_key: usefulFinishKey,
      acquisition_status: status,
      official_evidence: officialEvidence,
      source_urls: [...new Set(officialEvidence.map((evidence) => evidence.source_url))],
    };
  });
}

async function writeFixtures(rows, generatedAt) {
  const usefulRows = rows.filter((row) => row.acquisition_status === 'useful_second_source_match');
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  if (usefulRows.length === 0) return [];
  const records = usefulRows.flatMap((row) => row.official_evidence.filter((evidence) => evidence.finish_key === row.useful_finish_key));
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'official_gallery',
    source_url: BASE_URL,
    source_status: 'available_generated_current_queue',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:${PACKAGE_ID}:${generatedAt}`,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    records,
  };
  const filePath = path.join(FIXTURE_DIR, 'official_pokemon_prize_pack_pdf_useful_second_source_matches.json');
  await writeJson(filePath, fixture);
  return [filePath];
}

function buildMarkdown(report) {
  const usefulRows = report.rows
    .filter((row) => row.acquisition_status === 'useful_second_source_match')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.useful_finish_key, row.prior_closure_status, row.source_urls.join(', ')]);
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const conflictRows = report.rows
    .filter((row) => row.acquisition_status.includes('conflict'))
    .slice(0, 25)
    .map((row) => [row.set_key, row.card_number, row.card_name, row.prior_closure_status, JSON.stringify(row.prior_finish_counts), row.official_finishes.join(', ')]);

  return `# Official Pokemon Prize Pack PDF Acquisition V1

Audit-only source acquisition from official Pokemon Prize Pack checklist PDFs.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

${markdownTable(['metric', 'value'], [
  ['target_rows', report.summary.target_rows],
  ['official_entries_parsed', report.summary.official_entries_parsed],
  ['useful_second_source_matches', report.summary.useful_second_source_matches],
  ['official_single_finish_may_resolve_prior_conflict', report.summary.official_single_finish_may_resolve_prior_conflict],
  ['official_conflicting_normal_and_foil', report.summary.official_conflicting_normal_and_foil],
  ['no_official_exact_match', report.summary.no_official_exact_match],
  ['fixture_files_written', report.summary.fixture_files_written],
  ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
])}

## Status Counts

${markdownTable(['status', 'rows'], statusRows)}

## Useful Second-Source Matches

${usefulRows.length ? markdownTable(['set', 'number', 'card', 'finish', 'prior_status', 'source_urls'], usefulRows) : 'No useful second-source matches.'}

## Conflict/Review Rows

${conflictRows.length ? markdownTable(['set', 'number', 'card', 'prior_status', 'prior_finish_counts', 'official_finishes'], conflictRows) : 'No conflict rows.'}

## Guardrail

This report does not authorize inserts. Useful rows may only move to a separate guarded dry-run package if the official PDF evidence and prior independent source evidence agree on the exact active finish.
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [queue, closure, official] = await Promise.all([
    readJson(QUEUE_JSON),
    readJson(CLOSURE_JSON),
    loadOfficialEntries(),
  ]);
  const targets = targetRows(queue);
  const rows = classifyTargets({ targets, entries: official.entries, closure, generatedAt });
  const fixtureFiles = await writeFixtures(rows, generatedAt);
  const usefulRows = rows.filter((row) => row.acquisition_status === 'useful_second_source_match');
  const report = {
    generated_at: generatedAt,
    version: 'official_pokemon_prize_pack_pdf_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      queue: rel(QUEUE_JSON),
      prize_pack_closure: rel(CLOSURE_JSON),
    },
    source_downloads: official.sourceDownloads,
    fixture_dir: rel(FIXTURE_DIR),
    fixture_files: fixtureFiles.map(rel),
    summary: {
      target_rows: targets.length,
      official_entries_parsed: official.entries.length,
      useful_second_source_matches: usefulRows.length,
      official_single_finish_may_resolve_prior_conflict: rows.filter((row) => row.acquisition_status === 'official_single_finish_may_resolve_prior_conflict').length,
      official_conflicting_normal_and_foil: rows.filter((row) => row.acquisition_status === 'official_conflicting_normal_and_foil').length,
      no_official_exact_match: rows.filter((row) => row.acquisition_status === 'no_official_exact_match').length,
      by_status: countBy(rows, (row) => row.acquisition_status),
      by_useful_finish: countBy(usefulRows, (row) => row.useful_finish_key),
      fixture_files_written: fixtureFiles.length,
    },
    rows,
    next_recommended_step: usefulRows.length
      ? 'Prepare a rollback-only guarded dry-run package for useful_second_source_match rows only.'
      : 'No official PDF rows are dry-run-ready; continue source acquisition.',
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      prior_closure_status: row.prior_closure_status,
      prior_accepted_finish_key: row.prior_accepted_finish_key,
      official_finishes: row.official_finishes,
      acquisition_status: row.acquisition_status,
      useful_finish_key: row.useful_finish_key,
    })),
  }));
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    next_recommended_step: report.next_recommended_step,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
