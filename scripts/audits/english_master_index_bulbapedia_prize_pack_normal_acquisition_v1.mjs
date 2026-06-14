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
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_prize_pack_normal_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_prize_pack_normal_v1';
const SOURCE_KEY = 'bulbapedia_prize_pack_normal';
const API_URL = 'https://bulbapedia.bulbagarden.net/w/api.php';

const PAGES = [
  { series: 1, title: 'Play!_Pokémon_Prize_Pack_Series_One_(TCG)' },
  { series: 2, title: 'Play!_Pokémon_Prize_Pack_Series_Two_(TCG)' },
  { series: 3, title: 'Play!_Pokémon_Prize_Pack_Series_Three_(TCG)' },
  { series: 4, title: 'Play!_Pokémon_Prize_Pack_Series_Four_(TCG)' },
  { series: 5, title: 'Play!_Pokémon_Prize_Pack_Series_Five_(TCG)' },
  { series: 6, title: 'Play!_Pokémon_Prize_Pack_Series_Six_(TCG)' },
  { series: 7, title: 'Play!_Pokémon_Prize_Pack_Series_Seven_(TCG)' },
  { series: 8, title: 'Play!_Pokémon_Prize_Pack_Series_Eight_(TCG)' },
];

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

function decodeWikitext(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
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

function cacheFileForPage(title) {
  return path.join(CACHE_DIR, `${sha256(title)}.json`);
}

async function fetchWikitext(page, options) {
  const cacheFile = cacheFileForPage(page.title);
  if (!options.refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8')).wikitext;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const url = `${API_URL}?action=parse&page=${encodeURIComponent(page.title)}&prop=wikitext&format=json`;
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
  ], { timeout: 100000, maxBuffer: 30 * 1024 * 1024 });
  const payload = JSON.parse(stdout);
  const wikitext = payload.parse?.wikitext?.['*'] ?? '';
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, `${JSON.stringify({ page, wikitext })}\n`);
  }
  return wikitext;
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

function fieldExpansionAndNumber(raw) {
  const promoMatch = raw.match(/\b(SWSH|SVP)(\d+)\b/i);
  if (promoMatch) return {
    set_key: promoMatch[1].toUpperCase() === 'SWSH' ? 'swshp' : 'svp',
    card_number: `${promoMatch[1].toUpperCase()}${promoMatch[2]}`,
  };

  const linkMatch = raw.match(/link=([^|\]]+?)(?:\s+\(TCG\))?(?:\||\])/);
  const expansion = decodeWikitext(linkMatch?.[1] ?? '').replace(/_/g, ' ');
  const numberMatch = raw.match(/\b([A-Za-z0-9.-]+)\s*\/\s*\d+\b/);
  return {
    set_key: EXPANSION_TO_KEY[expansion] ?? null,
    card_number: numberMatch ? normalizeNumber(numberMatch[1]) : '',
    expansion,
  };
}

function cleanCardName(raw) {
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
  return decodeWikitext(`${name.replace(/\s*\([^)]*\)\s*$/, '')}${suffixes.length ? ` ${suffixes.join(' ')}` : ''}`)
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[|\]\]/g, '')
    .trim();
}

function parseEntries(page, wikitext) {
  const entries = [];
  for (const line of wikitext.split(/\r?\n/)) {
    if (!line.startsWith('{{Setlist/entry|')) continue;
    const inner = line.replace(/^\{\{Setlist\/entry\|/, '').replace(/\}\}\s*$/, '');
    const fields = splitTopLevel(inner);
    if (fields.length < 7) continue;
    const identity = fieldExpansionAndNumber(fields[0]);
    const promotion = decodeWikitext(fields[6]);
    entries.push({
      source_series: page.series,
      source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`,
      set_key: identity.set_key,
      card_number: identity.card_number,
      card_name: cleanCardName(fields[2]),
      promotion,
      status: identity.set_key ? 'parsed' : 'blocked_unmapped_expansion',
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

function classifyTargets(targets, entries) {
  const parsed = entries.filter((entry) => entry.status === 'parsed');
  const results = [];
  for (const row of targets) {
    const matches = parsed.filter((entry) => entryMatches(row, entry));
    if (matches.length === 0) {
      results.push({ ...row, status: 'blocked_no_exact_bulbapedia_prize_pack_match' });
      continue;
    }
    const normalMatches = matches.filter((entry) => normalizeText(entry.promotion) === 'standard set');
    const foilMatches = matches.filter((entry) => normalizeText(entry.promotion) === 'standard set foil');
    if (normalMatches.length === 1 && foilMatches.length === 0) {
      results.push({
        ...row,
        status: 'accepted_exact_bulbapedia_prize_pack_normal',
        accepted_finish_key: 'normal',
        accepted_source_url: normalMatches[0].source_url,
        accepted_source_series: normalMatches[0].source_series,
        accepted_source_promotion: normalMatches[0].promotion,
      });
    } else if (normalMatches.length >= 1 && foilMatches.length >= 1) {
      results.push({ ...row, status: 'blocked_multi_finish_prize_pack_requires_multi_child_package', matched_entries: matches });
    } else {
      results.push({ ...row, status: 'blocked_bulbapedia_prize_pack_foil_requires_finish_rule', matched_entries: matches });
    }
  }
  return results;
}

function fixtureRecord(row, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'human_readable_checklist',
    source_url: row.accepted_source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: 'normal',
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `Bulbapedia Prize Pack Series ${row.accepted_source_series}: ${row.card_name} ${row.card_number} Standard Set non-holo normal`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `bulbapedia:prize-pack-series-${row.accepted_source_series}:${row.set_key}:${row.card_number}:standard-set`,
    notes: 'Exact Prize Pack card-list row. Only Standard Set is accepted as normal; alternate promotion labels remain blocked for a separate pattern rule.',
  };
}

async function writeFixtures(results, generatedAt, dryRun) {
  const accepted = results.filter((row) => row.status === 'accepted_exact_bulbapedia_prize_pack_normal');
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
      source_kind: 'human_readable_checklist',
      source_url: 'https://bulbapedia.bulbagarden.net',
      source_status: 'available_generated',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      generation_note: 'Generated from Bulbapedia Prize Pack wikitext. Exact card-list row with Standard Set promotion only.',
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
    .filter((row) => row.status === 'accepted_exact_bulbapedia_prize_pack_normal')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.accepted_source_series, row.accepted_finish_key]);
  return `# Bulbapedia Prize Pack Normal Acquisition V1

Audit-only acquisition for Prize Pack stamped normal finishes.

## Safety

- dry_run: ${report.dry_run}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Rule

Only exact Bulbapedia Prize Pack card-list rows with promotion \`Standard Set\` are accepted as \`normal\`. Alternate promotion labels are not promoted here.

## Summary

- target_rows: ${report.summary.target_rows}
- source_entries_parsed: ${report.summary.source_entries_parsed}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'series', 'finish'], acceptedRows) : '_No accepted rows._'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const routing = await readJson(INPUT_JSON);
  const targets = targetRows(routing);
  const entryGroups = await Promise.all(PAGES.map(async (page) => {
    try {
      const wikitext = await fetchWikitext(page, options);
      return parseEntries(page, wikitext);
    } catch (error) {
      return [{ source_series: page.series, source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`, status: 'source_fetch_failed', error: error.message }];
    }
  }));
  const entries = entryGroups.flat();
  const results = classifyTargets(targets, entries);
  const fixtureFiles = await writeFixtures(results, generatedAt, options.dryRun);
  const accepted = results.filter((row) => row.status === 'accepted_exact_bulbapedia_prize_pack_normal');
  const report = {
    version: 'english_master_index_bulbapedia_prize_pack_normal_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net',
    rule: 'Accept only exact Prize Pack card-list rows with Standard Set promotion as normal.',
    fingerprint_sha256: sha256(stableJson(accepted.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.accepted_finish_key,
      series: row.accepted_source_series,
    })))),
    summary: {
      target_rows: targets.length,
      source_entries_parsed: entries.filter((entry) => entry.status === 'parsed').length,
      source_entry_blockers: countBy(entries.filter((entry) => entry.status !== 'parsed'), (entry) => entry.status),
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_set: countBy(accepted, (row) => row.set_key),
    },
    fixture_dir: FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await writeJson(path.join(REPORT_DIR, 'bulbapedia_prize_pack_normal_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'bulbapedia_prize_pack_normal_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
