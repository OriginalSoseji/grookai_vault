import crypto from 'node:crypto';
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

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/prize_pack_current_gap_cross_source_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_prize_pack_current_gap_cross_source_v1';

const JUSTINBASIL_SOURCE_KEY = 'justinbasil_prize_pack_current_gap_finish';
const BULBAPEDIA_SOURCE_KEY = 'bulbapedia_prize_pack_current_gap_finish';
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
  BLK: 'sv10.5b',
  WHT: 'sv10.5w',
  SVE: 'sve',
};

const EXPANSION_TO_KEY = {
  'Sword & Shield': 'swsh1',
  'Rebel Clash': 'swsh2',
  'Darkness Ablaze': 'swsh3',
  "Champion's Path": 'swsh3.5',
  'Vivid Voltage': 'swsh4',
  'Shining Fates': 'swsh4.5',
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
  'Black Bolt': 'sv10.5b',
  'White Flare': 'sv10.5w',
  'Scarlet & Violet Energies': 'sve',
  'SVP Promo': 'svp',
  'SVP Black Star Promos': 'svp',
};

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
  if (promoMatch) return {
    set_key: promoMatch[1].toUpperCase() === 'SWSH' ? 'swshp' : 'svp',
    card_number: `${promoMatch[1].toUpperCase()}${promoMatch[2]}`,
  };
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
    const promotion = decodeText(fields[6]);
    entries.push({
      source_key: BULBAPEDIA_SOURCE_KEY,
      source_kind: 'human_readable_checklist',
      source_series: page.series,
      source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`,
      set_key: identity.set_key,
      card_number: identity.card_number,
      card_name: cleanBulbapediaCardName(fields[2]),
      promotion,
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

function targetRows(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'finish_second_source_needed')
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => ['normal', 'cosmos'].includes(normalizeFinishKey(row.finish_key)))
    .filter((row) => (row.sources ?? []).some((source) => /prize_pack|tcgcsv_prize_pack/i.test(source)))
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key).localeCompare(String(b.finish_key)));
}

function entryMatches(row, entry) {
  return entry.set_key === row.set_key
    && compactNumber(entry.card_number) === compactNumber(row.card_number)
    && comparable(entry.card_name) === comparable(row.card_name);
}

function finishSupportedByJustinBasil(row, entry) {
  const finish = normalizeFinishKey(row.finish_key);
  if (finish === 'normal') return entry.marks.includes('S');
  if (finish === 'cosmos') return entry.marks.includes('H');
  return false;
}

function finishSupportedByBulbapedia(row, entry) {
  const finish = normalizeFinishKey(row.finish_key);
  const promotion = normalizeText(entry.promotion);
  if (finish === 'normal') return promotion === 'standard set';
  if (finish === 'cosmos') return promotion === 'standard set foil';
  return false;
}

function classify({ targets, justinBasilEntries, bulbapediaEntries }) {
  const results = [];
  for (const row of targets) {
    const sourceKeys = new Set((row.sources ?? []).map((source) => normalizeText(source)));
    const candidates = [];
    if (!sourceKeys.has(normalizeText(JUSTINBASIL_SOURCE_KEY)) && !sourceKeys.has('justinbasil_prize_pack_finish')) {
      candidates.push(...justinBasilEntries
        .filter((entry) => entryMatches(row, entry))
        .filter((entry) => finishSupportedByJustinBasil(row, entry))
        .map((entry) => ({ row, entry, status: 'accepted_exact_justinbasil_current_gap_prize_pack_finish' })));
    }
    if (!sourceKeys.has(normalizeText(BULBAPEDIA_SOURCE_KEY)) && !sourceKeys.has('bulbapedia_prize_pack_normal') && !sourceKeys.has('bulbapedia_prize_pack_foil')) {
      candidates.push(...bulbapediaEntries
        .filter((entry) => entryMatches(row, entry))
        .filter((entry) => finishSupportedByBulbapedia(row, entry))
        .map((entry) => ({ row, entry, status: 'accepted_exact_bulbapedia_current_gap_prize_pack_finish' })));
    }

    if (candidates.length === 0) {
      results.push({ ...row, status: 'blocked_no_independent_exact_current_gap_prize_pack_match' });
    } else {
      for (const candidate of candidates) results.push(candidate);
    }
  }
  return results;
}

function fixtureRecord(result, generatedAt) {
  const row = result.row;
  const entry = result.entry;
  const sourceLabel = entry.source === 'justinbasil' ? 'JustInBasil' : 'Bulbapedia';
  const finish = normalizeFinishKey(row.finish_key);
  const finishLabel = finish === 'normal' ? 'non-holo normal' : 'cosmos holofoil';
  const sourceKey = entry.source === 'justinbasil' ? JUSTINBASIL_SOURCE_KEY : BULBAPEDIA_SOURCE_KEY;
  const sourceKind = entry.source === 'justinbasil' ? 'collector_reference' : 'human_readable_checklist';
  const evidenceLabel = entry.source === 'justinbasil'
    ? `${sourceLabel} Prize Pack Series ${entry.source_series}: ${entry.marks.join(', ')} supports ${finishLabel} ${entry.card_name} ${entry.source_set_code} ${entry.card_number}`
    : `${sourceLabel} Prize Pack Series ${entry.source_series}: ${entry.card_name} ${entry.card_number} ${entry.promotion} supports ${finishLabel}`;
  return {
    source_key: sourceKey,
    source_kind: sourceKind,
    source_url: entry.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: finish,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: evidenceLabel,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `${sourceKey}:pps${entry.source_series}:${row.set_key}:${normalizeNumber(row.card_number)}:${finish}`,
    notes: 'Current-gap exact Prize Pack cross-source evidence. Accepted only when set key, card number, card name, and requested active finish are explicitly supported by the source row.',
  };
}

async function writeFixtures(results, generatedAt, dryRun) {
  const accepted = results.filter((row) => row.entry);
  const files = [];
  if (dryRun || accepted.length === 0) return files;
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const grouped = new Map();
  for (const result of accepted) {
    const sourceKey = result.entry.source === 'justinbasil' ? JUSTINBASIL_SOURCE_KEY : BULBAPEDIA_SOURCE_KEY;
    const key = `${sourceKey}|${result.row.set_key}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(result);
  }
  for (const [key, rows] of grouped.entries()) {
    const records = rows.map((row) => fixtureRecord(row, generatedAt));
    const [sourceKey, setKey] = key.split('|');
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${sourceKey}_${setKey}`,
      source_kind: records[0]?.source_kind ?? 'collector_reference',
      source_url: records[0]?.source_url ?? 'generated_current_gap_prize_pack_cross_source',
      source_status: 'available_generated_current_gap',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:prize_pack_current_gap_cross_source:${key}:${generatedAt}`,
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
  const acceptedRows = report.results
    .filter((row) => row.entry)
    .map((row) => [
      row.entry.source,
      row.row.set_key,
      row.row.card_number,
      row.row.card_name,
      row.row.finish_key,
      row.entry.source_url,
    ]);
  return `# Prize Pack Current Gap Cross Source V1

Audit only. This report adds no DB rows and authorizes no cleanup.

Generated: ${report.generated_at}

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- target_rows: ${report.summary.target_rows}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_status))}

## Accepted

${acceptedRows.length ? markdownTable(['source', 'set', 'number', 'name', 'finish', 'url'], acceptedRows) : '_No accepted rows._'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, justinBasilEntries, bulbapediaEntries] = await Promise.all([
    readJson(GAPS_PATH),
    loadJustinBasilEntries(options),
    loadBulbapediaEntries(options),
  ]);
  const targets = targetRows(gaps);
  const results = classify({ targets, justinBasilEntries, bulbapediaEntries });
  const fixtureFiles = await writeFixtures(results, generatedAt, options.dryRun);
  const accepted = results.filter((row) => row.entry);
  const report = {
    version: 'english_master_index_prize_pack_current_gap_cross_source_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_dir: FIXTURE_DIR,
    fixture_files: fixtureFiles,
    fingerprint_sha256: sha256(stableJson(accepted.map((row) => fixtureRecord(row, generatedAt)))),
    summary: {
      target_rows: targets.length,
      justinbasil_entries: justinBasilEntries.length,
      bulbapedia_entries: bulbapediaEntries.length,
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_source: countBy(accepted, (row) => row.entry.source),
      by_finish: countBy(accepted, (row) => row.row.finish_key),
      by_set: countBy(accepted, (row) => `${row.row.set_key}|${row.row.set_name}`),
    },
    results,
  };
  await writeJson(path.join(REPORT_DIR, 'prize_pack_current_gap_cross_source_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'prize_pack_current_gap_cross_source_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[prize-pack-current-gap-cross-source] failed:', error);
  process.exitCode = 1;
});
