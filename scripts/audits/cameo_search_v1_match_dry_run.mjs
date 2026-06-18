import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const REPORT_LABEL = process.env.CAMEO_SEARCH_REPORT_LABEL ?? '20260520';
const BASELINE_JSON_PATH = path.join(OUT_DIR, 'cameo_search_v1_match_dry_run_20260520.json');
const JSON_PATH = path.join(OUT_DIR, `cameo_search_v1_phase3_alias_replay_dry_run_${REPORT_LABEL}.json`);
const MD_PATH = path.join(OUT_DIR, `cameo_search_v1_phase3_alias_replay_dry_run_${REPORT_LABEL}.md`);
const SOURCE_SET_ALIAS_PATH = path.join(ROOT, 'data', 'cameo_search_v1', 'source_set_aliases_v1.json');

const WORKBOOK_ID = '18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY';
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${WORKBOOK_ID}/htmlview`;
const CSV_BASE_URL = `https://docs.google.com/spreadsheets/d/${WORKBOOK_ID}/gviz/tq?tqx=out:csv&gid=`;

const FALLBACK_TABS = [
  { name: 'Main', gid: '1923267969' },
  { name: 'Gen 1', gid: '0' },
  { name: 'Gen 2', gid: '2112540589' },
  { name: 'Gen 3', gid: '1642805847' },
  { name: 'Gen 4', gid: '623394955' },
  { name: 'Gen 5', gid: '907311085' },
  { name: 'Gen 6', gid: '1750206679' },
  { name: 'Gen 7', gid: '2096460131' },
  { name: 'Gen 8', gid: '692781906' },
  { name: 'Gen 9', gid: '1784063283' },
  { name: 'Trainers', gid: '36967854' },
];

const DATA_TAB_NAMES = new Set(FALLBACK_TABS.map((tab) => tab.name).filter((name) => name !== 'Main'));

const SOURCE_SET_ALIAS_OVERRIDES = new Map(
  [
    ['151', ['151', 'scarlet violet 151', 'scarlet and violet 151', 'sv03 5', 'sv3pt5']],
    ['mega evolution', ['mega evolution', 'me01', 'me1']],
    ['phantasmal flames', ['phantasmal flames', 'me02', 'me2']],
    ['ascended heroes', ['ascended heroes', 'me03', 'me3']],
    ['crown zenith', ['crown zenith', 'swsh12 5', 'swsh12pt5']],
    ['champions path', ['champions path', 'swsh3 5', 'swsh35']],
    ['shining fates', ['shining fates', 'swsh4 5', 'swsh45']],
    ['shining legends', ['shining legends', 'sm3 5', 'sm35']],
    ['hidden fates', ['hidden fates', 'sm11 5', 'sm115']],
    ['paldean fates', ['paldean fates', 'sv04 5', 'sv4pt5']],
    ['prismatic evolutions', ['prismatic evolutions', 'sv8pt5', 'sv08 5']],
    ['scarlet violet', ['scarlet violet', 'scarlet and violet', 'sv01', 'sv1']],
    ['scarlet & violet', ['scarlet violet', 'scarlet and violet', 'sv01', 'sv1']],
    ['temporal forces', ['temporal forces', 'sv05', 'sv5']],
    ['twilight masquerade', ['twilight masquerade', 'sv06', 'sv6']],
    ['stellar crown', ['stellar crown', 'sv07', 'sv7']],
    ['surging sparks', ['surging sparks', 'sv08', 'sv8']],
    ['journey together', ['journey together', 'sv09', 'sv9']],
    ['obsidian flames', ['obsidian flames', 'sv03', 'sv3']],
    ['paradox rift', ['paradox rift', 'sv04', 'sv4']],
    ['sword shield promos', ['sword shield promos', 'swsh promos', 'swshp', 'swsh']],
    ['swsh promos', ['swsh promos', 'sword shield promos', 'swshp', 'swsh']],
    ['sun moon promos', ['sun moon promos', 'sm promos', 'smp', 'sm']],
    ['sm promos', ['sm promos', 'sun moon promos', 'smp', 'sm']],
    ['xy promos', ['xy promos', 'xyp', 'xy']],
    ['wizards promos', ['wizards promos', 'basep', 'wotc promos', 'wizards black star promos']],
  ].map(([source, aliases]) => [normalizeText(source), aliases.map(normalizeText)]),
);

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeText(value) {
  return cleanText(value)
    ?.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/pokemon/g, ' ')
    .replace(/pokémon/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function normalizeName(value) {
  return normalizeText(value)
    .replace(/\bex\b/g, 'ex')
    .replace(/\bstar\b/g, 'star')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  const text = cleanText(value);
  if (!text) return '';
  const normalized = text
    .toLowerCase()
    .replace(/^0+(?=\d)/, '')
    .replace(/\s+/g, '')
    .trim();
  return normalized;
}

function decodeHtml(value) {
  return String(value)
    .replace(/\\x3d/g, '=')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'GrookaiVault-CameoSearchAudit/1.0' } }, (res) => {
        if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400 && res.headers.location) {
          fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} failed with HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function parseTabsFromHtml(html) {
  const decoded = decodeHtml(html);
  const tabs = [];
  const regex = /items\.push\(\{name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]*gid=([0-9-]+)"/g;
  let match;
  while ((match = regex.exec(decoded)) !== null) {
    tabs.push({ name: match[1], gid: match[2] });
  }
  return tabs.length > 0 ? tabs : FALLBACK_TABS;
}

function toObjects(rows) {
  const headers = rows.shift() ?? [];
  return rows
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
    .filter((row) => Object.values(row).some((value) => cleanText(value)));
}

function getColumn(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return '';
}

function classifyNotes(noteRaw) {
  const note = normalizeText(noteRaw);
  const qualifiers = [];
  if (!note) return qualifiers;
  if (note.includes('jumbo')) qualifiers.push('jumbo');
  if (note.includes('partial') || note.includes('partially visible')) qualifiers.push('partial_visibility');
  if (note.includes('silhouette')) qualifiers.push('silhouette');
  if (note.includes('picture') || note.includes('photo')) qualifiers.push('picture');
  if (note.includes('disguise')) qualifiers.push('disguise');
  if (note.includes('toy') || note.includes('costume') || note.includes('plush')) qualifiers.push('toy_or_costume');
  if (note.includes('japanese') || note.includes('korean') || note.includes('chinese') || note.includes('not released in english')) {
    qualifiers.push('non_english');
  }
  if (qualifiers.length === 0) qualifiers.push('unknown_note');
  return qualifiers;
}

function classifySourceRisk(row) {
  const risks = [];
  if (!row.cameo_subject_name) risks.push('BLOCKED_SUBJECT_MISSING');
  if (!row.card_name_raw) risks.push('BLOCKED_CARD_NAME_MISSING');
  if (!row.set_name_raw) risks.push('BLOCKED_SET_NAME_MISSING');
  if (!row.number_raw) risks.push('BLOCKED_NUMBER_MISSING');
  if (row.cameo_qualifiers.includes('jumbo')) risks.push('NEEDS_JUMBO_REVIEW');
  if (row.cameo_qualifiers.includes('non_english')) risks.push('NEEDS_LANGUAGE_SCOPE_REVIEW');
  if (row.cameo_qualifiers.includes('unknown_note')) risks.push('NEEDS_NOTE_REVIEW');
  return risks.length > 0 ? risks : ['SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN'];
}

function buildSourceRows(tab, rows) {
  const subjectType = tab.name === 'Trainers' ? 'trainer' : 'pokemon';
  let activeNdex = null;
  let activeSubject = null;

  return rows.map((row, index) => {
    const ndexRaw = cleanText(getColumn(row, ['Ndex', '']));
    const subjectRaw = cleanText(getColumn(row, ['Cameo Pokémon', 'Cameo Pokemon', 'Cameo Trainer']));
    if (ndexRaw) activeNdex = ndexRaw;
    if (subjectRaw) activeSubject = subjectRaw;
    const sourceRow = {
      source_tab: tab.name,
      source_gid: tab.gid,
      source_row_index: index + 2,
      cameo_subject_type: subjectType,
      cameo_subject_name: activeSubject,
      pokemon_ndex: subjectType === 'pokemon' ? activeNdex : null,
      card_name_raw: cleanText(getColumn(row, ['Card name'])),
      set_name_raw: cleanText(getColumn(row, ['Set'])),
      number_raw: cleanText(getColumn(row, ['#'])),
      notes_raw: cleanText(getColumn(row, ['Notes'])),
    };
    sourceRow.cameo_qualifiers = classifyNotes(sourceRow.notes_raw);
    sourceRow.source_match_risk = classifySourceRisk(sourceRow);
    sourceRow.source_row_hash = sha256(JSON.stringify(sourceRow));
    return sourceRow;
  });
}

async function fetchSourceRows() {
  const html = await fetchText(SOURCE_URL);
  const tabs = parseTabsFromHtml(html);
  const rows = [];
  for (const tab of tabs) {
    if (!DATA_TAB_NAMES.has(tab.name)) continue;
    const csv = await fetchText(`${CSV_BASE_URL}${tab.gid}`);
    rows.push(...buildSourceRows(tab, toObjects(parseCsv(csv))));
  }
  return { workbook_hash: sha256(html), rows };
}

function addAlias(index, alias, set, source) {
  const key = normalizeText(alias);
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  const existing = index.get(key);
  if (!existing.some((entry) => entry.set.id === set.id)) {
    existing.push({ set, source });
  }
}

async function loadSourceSetAliases() {
  const raw = await fs.readFile(SOURCE_SET_ALIAS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const aliases = Array.isArray(parsed.aliases) ? parsed.aliases : [];
  return {
    path: path.relative(ROOT, SOURCE_SET_ALIAS_PATH),
    hash: sha256(raw),
    aliases,
    intentionally_unmapped: Array.isArray(parsed.intentionally_unmapped) ? parsed.intentionally_unmapped : [],
  };
}

async function loadBaselineSummary() {
  try {
    const raw = await fs.readFile(BASELINE_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      path: path.relative(ROOT, BASELINE_JSON_PATH),
      summary: parsed.summary ?? null,
    };
  } catch {
    return null;
  }
}

function buildSetIndex(sets, sourceAliasFile) {
  const index = new Map();
  const setByCode = new Map(sets.map((set) => [normalizeText(set.code), set]));
  for (const set of sets) {
    for (const value of [set.name, set.code, set.printed_set_abbrev]) {
      addAlias(index, value, set, 'db_field');
    }
    const name = normalizeText(set.name);
    if (name.startsWith('scarlet and violet ')) {
      addAlias(index, name.replace(/^scarlet and violet /, ''), set, 'derived_without_era');
    }
    if (name.startsWith('sword and shield ')) {
      addAlias(index, name.replace(/^sword and shield /, ''), set, 'derived_without_era');
    }
    if (name.endsWith(' promos')) {
      addAlias(index, name.replace(/ promos$/, ' p promos'), set, 'derived_promo_alias');
    }
  }
  for (const [sourceAlias, targetAliases] of SOURCE_SET_ALIAS_OVERRIDES.entries()) {
    for (const targetAlias of targetAliases) {
      for (const entry of index.get(targetAlias) ?? []) {
        addAlias(index, sourceAlias, entry.set, 'curated_source_alias');
      }
    }
  }
  for (const alias of sourceAliasFile.aliases) {
    const sourceSetName = cleanText(alias.source_set_name);
    const targetSetCode = normalizeText(alias.target_set_code);
    const targetSet = setByCode.get(targetSetCode);
    if (!sourceSetName || !targetSet) continue;
    addAlias(index, sourceSetName, targetSet, 'source_owned_alias_file');
  }
  return index;
}

function compactCard(row) {
  return {
    card_print_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
  };
}

function classifyMatch(row, setIndex, cardsBySetId) {
  const setKey = normalizeText(row.set_name_raw);
  const setEntries = setIndex.get(setKey) ?? [];
  const distinctSetEntries = [...new Map(setEntries.map((entry) => [entry.set.id, entry])).values()];

  if (distinctSetEntries.length === 0) {
    return {
      classification: 'BLOCKED_SET_ALIAS_MISSING',
      reason: 'Source set name did not resolve to a canonical set alias.',
      set_candidates: [],
      card_candidates: [],
    };
  }
  if (distinctSetEntries.length > 1) {
    return {
      classification: 'NEEDS_MANUAL_REVIEW',
      reason: 'Source set name resolved to multiple canonical set candidates.',
      set_candidates: distinctSetEntries.map((entry) => ({ ...entry.set, alias_source: entry.source })),
      card_candidates: [],
    };
  }

  const set = distinctSetEntries[0].set;
  const cards = cardsBySetId.get(set.id) ?? [];
  const sourceNumber = normalizeNumber(row.number_raw);
  const sourceName = normalizeName(row.card_name_raw);
  const numberMatches = cards.filter((card) => {
    const numbers = [card.number, card.number_plain].map(normalizeNumber).filter(Boolean);
    return numbers.includes(sourceNumber);
  });
  const exactMatches = numberMatches.filter((card) => normalizeName(card.name) === sourceName);

  if (exactMatches.length === 1) {
    return {
      classification: 'APPROVED_MATCH',
      reason: 'Matched exactly by resolved set, source number, and normalized card name.',
      set_candidates: [{ ...set, alias_source: distinctSetEntries[0].source }],
      card_candidates: exactMatches.map(compactCard),
      approved_card_print_id: exactMatches[0].id,
      approved_gv_id: exactMatches[0].gv_id,
    };
  }

  if (exactMatches.length > 1) {
    return {
      classification: 'BLOCKED_AMBIGUOUS_CARD',
      reason: 'Resolved set and card identity matched multiple card_print rows.',
      set_candidates: [{ ...set, alias_source: distinctSetEntries[0].source }],
      card_candidates: exactMatches.slice(0, 10).map(compactCard),
      candidate_count: exactMatches.length,
    };
  }

  const sameNumberDifferentName = numberMatches.slice(0, 10).map(compactCard);
  return {
    classification: 'BLOCKED_CARD_NOT_FOUND',
    reason: numberMatches.length > 0
      ? 'Resolved set and number exist, but normalized card name did not match.'
      : 'Resolved set exists, but source number did not match a card_print row.',
    set_candidates: [{ ...set, alias_source: distinctSetEntries[0].source }],
    card_candidates: sameNumberDifferentName,
    same_number_candidate_count: numberMatches.length,
  };
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map, limit = 30) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Phase 3 Set Alias Replay Dry Run');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('No-write deterministic card matching replay for only the source rows classified as `SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN` in Phase 1, with source-owned set aliases loaded from the Phase 3 alias file.');
  lines.push('');
  lines.push('## Alias File');
  lines.push('');
  lines.push(`- Path: \`${report.alias_file.path}\``);
  lines.push(`- Hash: \`${report.alias_file.hash}\``);
  lines.push(`- Active aliases: ${report.alias_file.active_aliases}`);
  lines.push(`- Intentionally unmapped aliases: ${report.alias_file.intentionally_unmapped_count}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source rows loaded: ${report.summary.source_rows}`);
  lines.push(`- Match-ready rows evaluated: ${report.summary.match_ready_rows}`);
  lines.push(`- Approved matches: ${report.summary.classification_counts.APPROVED_MATCH ?? 0}`);
  lines.push(`- Ambiguous card matches: ${report.summary.classification_counts.BLOCKED_AMBIGUOUS_CARD ?? 0}`);
  lines.push(`- Set alias missing: ${report.summary.classification_counts.BLOCKED_SET_ALIAS_MISSING ?? 0}`);
  lines.push(`- Card not found: ${report.summary.classification_counts.BLOCKED_CARD_NOT_FOUND ?? 0}`);
  lines.push(`- Manual review: ${report.summary.classification_counts.NEEDS_MANUAL_REVIEW ?? 0}`);
  if (report.baseline_comparison) {
    lines.push(`- Approved lift vs Phase 2: ${report.baseline_comparison.approved_match_delta}`);
    lines.push(`- Set-alias-missing reduction vs Phase 2: ${report.baseline_comparison.blocked_set_alias_missing_delta}`);
    lines.push(`- Card-not-found delta vs Phase 2: ${report.baseline_comparison.blocked_card_not_found_after - report.baseline_comparison.blocked_card_not_found_before}`);
    lines.push(`- Ambiguous-card delta vs Phase 2: ${report.baseline_comparison.blocked_ambiguous_card_after - report.baseline_comparison.blocked_ambiguous_card_before}`);
  }
  lines.push('');
  lines.push('## Classification Counts');
  lines.push('');
  lines.push('| Classification | Rows |');
  lines.push('| --- | ---: |');
  for (const [classification, count] of Object.entries(report.summary.classification_counts)) {
    lines.push(`| ${classification} | ${count} |`);
  }
  lines.push('');
  lines.push('## Top Missing Set Aliases');
  lines.push('');
  lines.push('| Source set | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.top_missing_set_aliases) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Top Card-Not-Found Sets');
  lines.push('');
  lines.push('| Source set | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.top_card_not_found_sets) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Sample Approved Matches');
  lines.push('');
  lines.push('| Source tab/row | Cameo | Source card | Matched GV-ID |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.samples.approved_matches) {
    lines.push(`| ${row.source_tab}:${row.source_row_index} | ${row.cameo_subject_name} | ${row.card_name_raw} ${row.set_name_raw} #${row.number_raw} | ${row.approved_gv_id ?? ''} |`);
  }
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(report.summary.classification_counts.APPROVED_MATCH > 0
    ? 'Cameo search remains viable, but promotion should only include approved matches after a reviewed schema/write plan. Missing set aliases and card-not-found rows need a separate alias/remediation plan.'
    : 'Cameo search is not ready for promotion because no deterministic approved matches were produced.');
  lines.push('');
  lines.push('Rows that became `BLOCKED_CARD_NOT_FOUND` or `BLOCKED_AMBIGUOUS_CARD` after alias resolution remain blocked. The alias file only resolves set labels; it does not loosen card-name or number matching.');
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations.');
  lines.push('- No search integration.');
  lines.push('- No app changes.');
  lines.push('- No Species Dex denominator changes.');
  lines.push('- No scanner changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { workbook_hash, rows: sourceRows } = await fetchSourceRows();
  const matchReadyRows = sourceRows.filter((row) => row.source_match_risk.length === 1 && row.source_match_risk[0] === 'SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN');
  const sourceAliasFile = await loadSourceSetAliases();
  const baselineSummary = await loadBaselineSummary();

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');
  const client = new pg.Client({
    connectionString,
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_match_dry_run:readonly',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');
    const { rows: sets } = await client.query(`
      select
        id::text,
        code,
        name,
        printed_set_abbrev
      from public.sets
      where game = 'pokemon'
    `);
    const { rows: cards } = await client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_id::text,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.printed_identity_modifier
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where s.game = 'pokemon'
         or lower(coalesce(cp.set_code, '')) <> ''
    `);
    await client.query('commit');

    const setIndex = buildSetIndex(sets, sourceAliasFile);
    const cardsBySetId = new Map();
    for (const card of cards) {
      if (!cardsBySetId.has(card.set_id)) cardsBySetId.set(card.set_id, []);
      cardsBySetId.get(card.set_id).push(card);
    }

    const results = matchReadyRows.map((row) => ({
      ...row,
      ...classifyMatch(row, setIndex, cardsBySetId),
    }));

    const classificationCounts = {};
    const missingSetCounts = new Map();
    const cardNotFoundSetCounts = new Map();
    for (const result of results) {
      classificationCounts[result.classification] = (classificationCounts[result.classification] ?? 0) + 1;
      if (result.classification === 'BLOCKED_SET_ALIAS_MISSING') increment(missingSetCounts, result.set_name_raw);
      if (result.classification === 'BLOCKED_CARD_NOT_FOUND') increment(cardNotFoundSetCounts, result.set_name_raw);
    }

    const report = {
      generated_at: new Date().toISOString(),
      source_url: SOURCE_URL,
      workbook_hash,
      db_read_mode: 'transaction read only',
      alias_file: {
        path: sourceAliasFile.path,
        hash: sourceAliasFile.hash,
        active_aliases: sourceAliasFile.aliases.length,
        intentionally_unmapped_count: sourceAliasFile.intentionally_unmapped.length,
        aliases: sourceAliasFile.aliases,
        intentionally_unmapped: sourceAliasFile.intentionally_unmapped,
      },
      summary: {
        source_rows: sourceRows.length,
        match_ready_rows: matchReadyRows.length,
        db_sets_loaded: sets.length,
        db_card_prints_loaded: cards.length,
        classification_counts: classificationCounts,
        top_missing_set_aliases: topEntries(missingSetCounts),
        top_card_not_found_sets: topEntries(cardNotFoundSetCounts),
      },
      samples: {
        approved_matches: results.filter((row) => row.classification === 'APPROVED_MATCH').slice(0, 25),
        ambiguous_cards: results.filter((row) => row.classification === 'BLOCKED_AMBIGUOUS_CARD').slice(0, 25),
        missing_set_aliases: results.filter((row) => row.classification === 'BLOCKED_SET_ALIAS_MISSING').slice(0, 25),
        card_not_found: results.filter((row) => row.classification === 'BLOCKED_CARD_NOT_FOUND').slice(0, 25),
        manual_review: results.filter((row) => row.classification === 'NEEDS_MANUAL_REVIEW').slice(0, 25),
      },
      results,
      baseline_comparison: baselineSummary?.summary ? {
        baseline_path: baselineSummary.path,
        approved_match_before: baselineSummary.summary.classification_counts?.APPROVED_MATCH ?? 0,
        approved_match_after: classificationCounts.APPROVED_MATCH ?? 0,
        approved_match_delta: (classificationCounts.APPROVED_MATCH ?? 0) - (baselineSummary.summary.classification_counts?.APPROVED_MATCH ?? 0),
        blocked_set_alias_missing_before: baselineSummary.summary.classification_counts?.BLOCKED_SET_ALIAS_MISSING ?? 0,
        blocked_set_alias_missing_after: classificationCounts.BLOCKED_SET_ALIAS_MISSING ?? 0,
        blocked_set_alias_missing_delta: (baselineSummary.summary.classification_counts?.BLOCKED_SET_ALIAS_MISSING ?? 0) - (classificationCounts.BLOCKED_SET_ALIAS_MISSING ?? 0),
        blocked_card_not_found_before: baselineSummary.summary.classification_counts?.BLOCKED_CARD_NOT_FOUND ?? 0,
        blocked_card_not_found_after: classificationCounts.BLOCKED_CARD_NOT_FOUND ?? 0,
        blocked_ambiguous_card_before: baselineSummary.summary.classification_counts?.BLOCKED_AMBIGUOUS_CARD ?? 0,
        blocked_ambiguous_card_after: classificationCounts.BLOCKED_AMBIGUOUS_CARD ?? 0,
      } : null,
      confirmations: {
        db_writes: false,
        migrations: false,
        search_integration: false,
        app_changes: false,
      },
    };

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));
    console.log(JSON.stringify({
      status: 'ok',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      match_ready_rows: matchReadyRows.length,
      classification_counts: classificationCounts,
      alias_file: sourceAliasFile.path,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failures after read-only query errors
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
