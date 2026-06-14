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
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const REPORT_DIR = path.join(SOURCE_DIR, 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1');
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const OUTPUT_JSON = path.join(REPORT_DIR, 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1.json');
const OUTPUT_MD = path.join(REPORT_DIR, 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1.md');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures', 'generated_pkg17h_prize_pack_active_finish_current_queue_acquisition_v1');

const PACKAGE_ID = 'PKG-17H-PRIZE-PACK-ACTIVE-FINISH-CURRENT-QUEUE-ACQUISITION';
const JUSTINBASIL_SOURCE_KEY = 'justinbasil_prize_pack_active_finish_current_queue';
const BULBAPEDIA_SOURCE_KEY = 'bulbapedia_prize_pack_active_finish_current_queue';
const JUSTINBASIL_BASE_URL = 'https://www.justinbasil.com/set-lists';
const BULBAPEDIA_API_URL = 'https://bulbapedia.bulbagarden.net/w/api.php';
const SERIES = [1, 2, 3, 4, 5, 6, 7, 8];
const BULBAPEDIA_PAGES = [
  { series: 1, title: 'Play!_Pokémon_Prize_Pack_Series_One_(TCG)' },
  { series: 2, title: 'Play!_Pokémon_Prize_Pack_Series_Two_(TCG)' },
  { series: 3, title: 'Play!_Pokémon_Prize_Pack_Series_Three_(TCG)' },
  { series: 4, title: 'Play!_Pokémon_Prize_Pack_Series_Four_(TCG)' },
  { series: 5, title: 'Play!_Pokémon_Prize_Pack_Series_Five_(TCG)' },
  { series: 6, title: 'Play!_Pokémon_Prize_Pack_Series_Six_(TCG)' },
  { series: 7, title: 'Play!_Pokémon_Prize_Pack_Series_Seven_(TCG)' },
  { series: 8, title: 'Play!_Pokémon_Prize_Pack_Series_Eight_(TCG)' },
];

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
};

const EXPANSION_TO_KEY = {
  'Sword & Shield': 'swsh1',
  'Rebel Clash': 'swsh2',
  'Darkness Ablaze': 'swsh3',
  'Vivid Voltage': 'swsh4',
  'Battle Styles': 'swsh5',
  'Chilling Reign': 'swsh6',
  'Evolving Skies': 'swsh7',
  'Fusion Strike': 'swsh8',
  'Brilliant Stars': 'swsh9',
  'Astral Radiance': 'swsh10',
  'Lost Origin': 'swsh11',
  'Silver Tempest': 'swsh12',
  'Crown Zenith': 'swsh12.5',
  'SWSH Promo': 'swshp',
  'SWSH Black Star Promos': 'swshp',
  'Scarlet & Violet': 'sv01',
  'Paldea Evolved': 'sv02',
  'Obsidian Flames': 'sv03',
  '151': 'sv03.5',
  'Paradox Rift': 'sv04',
  'Paldean Fates': 'sv04.5',
  'Temporal Forces': 'sv05',
  'Twilight Masquerade': 'sv06',
  'Shrouded Fable': 'sv06.5',
  'Stellar Crown': 'sv07',
  'Surging Sparks': 'sv08',
  'Prismatic Evolutions': 'sv08.5',
  'Journey Together': 'sv09',
  'Destined Rivals': 'sv10',
  'Scarlet & Violet Energies': 'sve',
  'SVP Promo': 'svp',
  'SVP Black Star Promos': 'svp',
};

function parseArgs(argv) {
  const options = { refreshCache: false, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--refresh-cache') options.refreshCache = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
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
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function decodeText(value) {
  return String(value ?? '')
    .replace(/\\u0026/g, '&')
    .replace(/\\u002D/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, '-')
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
    .replace(/\sgx\b/g, ' gx')
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
  return path.join(CACHE_DIR, `${sha256(url)}.cache`);
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

function splitTopLevel(value) {
  const parts = [];
  let current = '';
  let templateDepth = 0;
  let linkDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const two = value.slice(index, index + 2);
    if (two === '{{') {
      templateDepth += 1;
      current += two;
      index += 1;
    } else if (two === '}}') {
      templateDepth = Math.max(0, templateDepth - 1);
      current += two;
      index += 1;
    } else if (two === '[[') {
      linkDepth += 1;
      current += two;
      index += 1;
    } else if (two === ']]') {
      linkDepth = Math.max(0, linkDepth - 1);
      current += two;
      index += 1;
    } else if (value[index] === '|' && templateDepth === 0 && linkDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += value[index];
    }
  }
  parts.push(current);
  return parts;
}

function parseJustinBasilHtml(series, html) {
  const sourceUrl = `${JUSTINBASIL_BASE_URL}/pps${series}`;
  const entries = [];
  const pattern = /<li[^>]*>\s*<b>\s*((?:S|H)(?:\s*,\s*(?:S|H))?)\s*<\/b>\s*([^<]+?)\s+([A-Z]{2,5})\s+([A-Za-z0-9.-]+)\s*<\/li>/g;
  for (const match of html.matchAll(pattern)) {
    const setKey = SET_CODE_TO_KEY[match[3].toUpperCase()] ?? null;
    entries.push({
      source_key: JUSTINBASIL_SOURCE_KEY,
      source_kind: 'collector_reference',
      source_series: series,
      source_url: sourceUrl,
      marks: [...new Set(match[1].split(',').map((value) => value.trim()).filter(Boolean))],
      set_key: setKey,
      card_name: decodeText(match[2]),
      source_set_code: match[3].toUpperCase(),
      card_number: normalizeNumber(match[4]),
      source: 'justinbasil',
    });
  }
  return entries;
}

function fieldExpansionAndNumber(raw) {
  const promoMatch = raw.match(/\b(SWSH|SVP)(\d+)\b/i);
  if (promoMatch) {
    return {
      set_key: promoMatch[1].toUpperCase() === 'SWSH' ? 'swshp' : 'svp',
      card_number: `${promoMatch[1].toUpperCase()}${promoMatch[2]}`,
    };
  }
  const linkMatch = raw.match(/link=([^|\]]+?)(?:\s+\(TCG\))?(?:\||\])/);
  const expansion = decodeText(linkMatch?.[1] ?? '').replace(/_/g, ' ');
  const numberMatch = raw.match(/\b([A-Za-z0-9.-]+)\s*\/\s*\d+\b/);
  return {
    set_key: EXPANSION_TO_KEY[expansion] ?? null,
    card_number: numberMatch ? normalizeNumber(numberMatch[1]) : '',
  };
}

function cleanBulbapediaCardName(raw) {
  const tcgId = raw.match(/\{\{TCG ID\|[^|]+\|([^|]+)\|[^}]+\}\}/);
  let name = tcgId?.[1] ?? null;
  if (!name) {
    const link = raw.match(/\[\[[^\]|]+(?:\|([^\]]+))?\]\]/);
    if (link) name = link[1] ?? raw.match(/\[\[([^\]|]+)/)?.[1] ?? '';
  }
  if (!name) name = raw;
  const suffixes = [];
  if (/\{\{TCGV\}\}/i.test(raw)) suffixes.push('V');
  if (/\{\{TCGVMAX\}\}/i.test(raw)) suffixes.push('VMAX');
  if (/\{\{TCGVSTAR\}\}/i.test(raw)) suffixes.push('VSTAR');
  if (/\{\{TCG ex\}\}/i.test(raw)) suffixes.push('ex');
  if (/\{\{TCGGX\}\}/i.test(raw)) suffixes.push('GX');
  return decodeText(`${name.replace(/\s*\([^)]*\)\s*$/, '')}${suffixes.length ? ` ${suffixes.join(' ')}` : ''}`)
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[|\]\]/g, '')
    .trim();
}

function parseBulbapediaWikitext(page, wikitext) {
  const entries = [];
  for (const line of wikitext.split(/\r?\n/)) {
    if (!line.startsWith('{{Setlist/entry|')) continue;
    const inner = line.replace(/^\{\{Setlist\/entry\|/, '').replace(/\}\}\s*$/, '');
    const fields = splitTopLevel(inner);
    if (fields.length < 7) continue;
    const identity = fieldExpansionAndNumber(fields[0]);
    entries.push({
      source_key: BULBAPEDIA_SOURCE_KEY,
      source_kind: 'human_readable_checklist',
      source_series: page.series,
      source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`,
      set_key: identity.set_key,
      card_number: identity.card_number,
      card_name: cleanBulbapediaCardName(fields[2]),
      promotion: decodeText(fields[6]),
      source: 'bulbapedia',
    });
  }
  return entries;
}

async function loadJustinBasilEntries(options) {
  const groups = await Promise.all(SERIES.map(async (series) => {
    const url = `${JUSTINBASIL_BASE_URL}/pps${series}`;
    try {
      return parseJustinBasilHtml(series, await fetchText(url, options));
    } catch (error) {
      return [{ source: 'justinbasil', source_series: series, source_url: url, error: error.message }];
    }
  }));
  return groups.flat().filter((entry) => entry.set_key);
}

async function loadBulbapediaEntries(options) {
  const groups = await Promise.all(BULBAPEDIA_PAGES.map(async (page) => {
    const url = `${BULBAPEDIA_API_URL}?action=parse&page=${encodeURIComponent(page.title)}&prop=wikitext&format=json`;
    try {
      const payload = JSON.parse(await fetchText(url, options));
      return parseBulbapediaWikitext(page, payload.parse?.wikitext?.['*'] ?? '');
    } catch (error) {
      return [{ source: 'bulbapedia', source_series: page.series, source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`, error: error.message }];
    }
  }));
  return groups.flat().filter((entry) => entry.set_key);
}

function targetRows(pkg17a) {
  return (pkg17a.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => row.variant_key === 'prize_pack_stamp')
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
}

function entryMatches(row, entry) {
  return entry.set_key === row.set_key
    && compactNumber(entry.card_number) === compactNumber(row.card_number)
    && comparable(entry.card_name) === comparable(row.card_name);
}

function finishFromJustinBasil(entry) {
  const marks = new Set(entry.marks ?? []);
  const finishes = [];
  if (marks.has('S')) finishes.push('normal');
  if (marks.has('H')) finishes.push('cosmos');
  return finishes;
}

function finishFromBulbapedia(entry) {
  const promotion = normalizeText(entry.promotion);
  if (promotion === 'standard set') return ['normal'];
  if (promotion === 'standard set foil') return ['cosmos'];
  return [];
}

function evidenceRecord(row, entry, finishKey, generatedAt) {
  const sourceKey = entry.source === 'justinbasil' ? JUSTINBASIL_SOURCE_KEY : BULBAPEDIA_SOURCE_KEY;
  const sourceKind = entry.source === 'justinbasil' ? 'collector_reference' : 'human_readable_checklist';
  const finishLabel = finishKey === 'normal' ? 'non-holo normal' : 'cosmos holofoil';
  return {
    source_key: sourceKey,
    source_kind: sourceKind,
    source_url: entry.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    finish_key: finishKey,
    evidence_type: 'finish_presence',
    evidence_label: entry.source === 'justinbasil'
      ? `JustInBasil Prize Pack Series ${entry.source_series}: ${entry.marks.join(', ')} supports ${finishLabel} ${entry.card_name} ${entry.source_set_code} ${entry.card_number}`
      : `Bulbapedia Prize Pack Series ${entry.source_series}: ${entry.card_name} ${entry.card_number} ${entry.promotion} supports ${finishLabel}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `${sourceKey}:pps${entry.source_series}:${row.set_key}:${normalizeNumber(row.card_number)}:${finishKey}:prize_pack_stamp`,
    notes: 'Current PKG-17A exact Prize Pack stamped active-finish evidence. Accepted only when set key, card number, card name, and active finish are explicitly supported.',
  };
}

function classifyRows({ targets, justinBasilEntries, bulbapediaEntries, generatedAt }) {
  return targets.map((row) => {
    const evidence = [];
    for (const entry of justinBasilEntries.filter((candidate) => entryMatches(row, candidate))) {
      for (const finish of finishFromJustinBasil(entry)) evidence.push(evidenceRecord(row, entry, finish, generatedAt));
    }
    for (const entry of bulbapediaEntries.filter((candidate) => entryMatches(row, candidate))) {
      for (const finish of finishFromBulbapedia(entry)) evidence.push(evidenceRecord(row, entry, finish, generatedAt));
    }
    const byFinish = countBy(evidence, (record) => record.finish_key);
    const sourceKeys = [...new Set(evidence.map((record) => record.source_key))].sort();
    const finishKeys = Object.keys(byFinish).sort();
    let status = 'blocked_no_exact_prize_pack_source_match';
    let acceptedFinishKey = null;
    if (finishKeys.length === 1 && sourceKeys.length >= 2) {
      status = 'ready_two_source_exact_active_finish';
      acceptedFinishKey = finishKeys[0];
    } else if (finishKeys.length === 1 && sourceKeys.length === 1) {
      status = 'review_only_single_source_family';
      acceptedFinishKey = finishKeys[0];
    } else if (finishKeys.length > 1) {
      status = 'blocked_conflicting_finish_evidence';
    }
    return {
      ...row,
      accepted_finish_key: acceptedFinishKey,
      acquisition_status: status,
      evidence_count: evidence.length,
      source_families: sourceKeys,
      finish_counts: byFinish,
      evidence,
    };
  });
}

async function writeFixtures(rows, generatedAt, dryRun) {
  const readyRows = rows.filter((row) => row.acquisition_status === 'ready_two_source_exact_active_finish');
  const files = [];
  if (dryRun || readyRows.length === 0) return files;
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const grouped = new Map();
  for (const row of readyRows) {
    for (const record of row.evidence.filter((evidence) => evidence.finish_key === row.accepted_finish_key)) {
      const key = `${record.source_key}|${record.set_key}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    }
  }
  for (const [key, records] of grouped.entries()) {
    const [sourceKey, setKey] = key.split('|');
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${sourceKey}_${setKey}`,
      source_kind: records[0]?.source_kind ?? 'collector_reference',
      source_url: records[0]?.source_url ?? 'generated_pkg17h_prize_pack_active_finish_current_queue',
      source_status: 'available_generated_current_queue',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pkg17h_prize_pack_active_finish_current_queue:${key}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records,
    };
    const file = path.join(FIXTURE_DIR, `${sourceKey}_${setKey}.json`);
    await writeJson(file, fixture);
    files.push(file);
  }
  return files;
}

function renderMarkdown(report) {
  const readyRows = report.rows
    .filter((row) => row.acquisition_status === 'ready_two_source_exact_active_finish')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.accepted_finish_key, row.source_families.join(', ')]);
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  return `# PKG-17H Prize Pack Active Finish Current Queue Acquisition V1

Audit-only acquisition against the current PKG-17A \`prize_pack_stamp\` active-finish queue.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- target_rows: ${report.summary.target_rows}
- ready_two_source_exact_active_finish: ${report.summary.ready_two_source_exact_active_finish}
- review_only_single_source_family: ${report.summary.review_only_single_source_family}
- blocked_conflicting_finish_evidence: ${report.summary.blocked_conflicting_finish_evidence}
- blocked_no_exact_prize_pack_source_match: ${report.summary.blocked_no_exact_prize_pack_source_match}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Ready Rows

${readyRows.length ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'sources'], readyRows) : 'No rows ready.'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [pkg17a, justinBasilEntries, bulbapediaEntries] = await Promise.all([
    readJson(PKG17A_JSON),
    loadJustinBasilEntries(options),
    loadBulbapediaEntries(options),
  ]);
  const targets = targetRows(pkg17a);
  const rows = classifyRows({ targets, justinBasilEntries, bulbapediaEntries, generatedAt });
  const fixtureFiles = await writeFixtures(rows, generatedAt, options.dryRun);
  const readyRows = rows.filter((row) => row.acquisition_status === 'ready_two_source_exact_active_finish');
  const report = {
    generated_at: generatedAt,
    version: 'english_master_index_pkg17h_prize_pack_active_finish_current_queue_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: path.relative(ROOT, PKG17A_JSON).replaceAll('\\', '/'),
    },
    fixture_dir: path.relative(ROOT, FIXTURE_DIR).replaceAll('\\', '/'),
    fixture_files: fixtureFiles.map((file) => path.relative(ROOT, file).replaceAll('\\', '/')),
    fingerprint_sha256: sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      acquisition_status: row.acquisition_status,
      accepted_finish_key: row.accepted_finish_key,
      source_families: row.source_families,
    })))),
    summary: {
      target_rows: targets.length,
      justinbasil_entries: justinBasilEntries.length,
      bulbapedia_entries: bulbapediaEntries.length,
      ready_two_source_exact_active_finish: readyRows.length,
      review_only_single_source_family: rows.filter((row) => row.acquisition_status === 'review_only_single_source_family').length,
      blocked_conflicting_finish_evidence: rows.filter((row) => row.acquisition_status === 'blocked_conflicting_finish_evidence').length,
      blocked_no_exact_prize_pack_source_match: rows.filter((row) => row.acquisition_status === 'blocked_no_exact_prize_pack_source_match').length,
      by_status: countBy(rows, (row) => row.acquisition_status),
      by_ready_finish: countBy(readyRows, (row) => row.accepted_finish_key),
      by_ready_set: countBy(readyRows, (row) => row.set_key),
      fixture_files_written: fixtureFiles.length,
    },
    rows,
    next_recommended_step: readyRows.length
      ? 'Prepare a guarded rollback-only dry-run for the ready two-source prize_pack_stamp rows only.'
      : 'No prize_pack_stamp rows are ready from these sources; continue with another source family.',
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    next_recommended_step: report.next_recommended_step,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
