import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const REPORT_LABEL = process.env.CAMEO_SEARCH_REPORT_LABEL ?? '20260520';
const JSON_PATH = path.join(OUT_DIR, `cameo_search_v1_source_audit_${REPORT_LABEL}.json`);
const MD_PATH = path.join(OUT_DIR, `cameo_search_v1_source_audit_${REPORT_LABEL}.md`);

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

const DATA_TAB_NAMES = new Set([
  'Gen 1',
  'Gen 2',
  'Gen 3',
  'Gen 4',
  'Gen 5',
  'Gen 6',
  'Gen 7',
  'Gen 8',
  'Gen 9',
  'Trainers',
]);

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
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
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
      continue;
    }

    if (char === '"') {
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

function classifyNotes(noteRaw) {
  const note = normalizeText(noteRaw);
  const qualifiers = [];

  if (!note) return qualifiers;
  if (note.includes('jumbo')) qualifiers.push('jumbo');
  if (note.includes('partial') || note.includes('partially visible') || note.includes('not entirely in frame')) {
    qualifiers.push('partial_visibility');
  }
  if (note.includes('silhouette')) qualifiers.push('silhouette');
  if (note.includes('picture') || note.includes('photo')) qualifiers.push('picture');
  if (note.includes('disguise')) qualifiers.push('disguise');
  if (note.includes('toy') || note.includes('costume') || note.includes('plush')) {
    qualifiers.push('toy_or_costume');
  }
  if (
    note.includes('japanese') ||
    note.includes('korean') ||
    note.includes('chinese') ||
    note.includes('not released in english') ||
    note.includes('non english')
  ) {
    qualifiers.push('non_english');
  }

  if (qualifiers.length === 0) qualifiers.push('unknown_note');
  return qualifiers;
}

function getColumn(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return '';
}

function toObjects(rows) {
  const headers = rows.shift() ?? [];
  return {
    headers,
    rows: rows
      .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
      .filter((row) => Object.values(row).some((value) => cleanText(value))),
  };
}

function increment(map, key, amount = 1) {
  const resolvedKey = key || '(blank)';
  map.set(resolvedKey, (map.get(resolvedKey) ?? 0) + amount);
}

function topEntries(map, limit = 20) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
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

    const cardNameRaw = cleanText(getColumn(row, ['Card name']));
    const setNameRaw = cleanText(getColumn(row, ['Set']));
    const numberRaw = cleanText(getColumn(row, ['#']));
    const notesRaw = cleanText(getColumn(row, ['Notes']));
    const qualifiers = classifyNotes(notesRaw);
    const sourceRowIndex = index + 2;
    const sourceIdentity = {
      source_tab: tab.name,
      source_gid: tab.gid,
      source_row_index: sourceRowIndex,
      cameo_subject_type: subjectType,
      cameo_subject_name: activeSubject,
      pokemon_ndex: subjectType === 'pokemon' ? activeNdex : null,
      card_name_raw: cardNameRaw,
      set_name_raw: setNameRaw,
      number_raw: numberRaw,
      notes_raw: notesRaw,
      cameo_qualifiers: qualifiers,
    };

    return {
      ...sourceIdentity,
      source_row_hash: sha256(JSON.stringify(sourceIdentity)),
      has_subject: Boolean(activeSubject),
      has_card_name: Boolean(cardNameRaw),
      has_set_name: Boolean(setNameRaw),
      has_number: Boolean(numberRaw),
      has_notes: Boolean(notesRaw),
      source_match_risk: classifyMatchRisk(sourceIdentity),
    };
  });
}

function classifyMatchRisk(row) {
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

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Source Audit');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Audit-only ingestion of the public cameo workbook. No DB writes, migrations, resolver changes, or app changes were performed.');
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push(`- ${report.source_url}`);
  lines.push(`- Workbook hash: \`${report.workbook_html_hash}\``);
  lines.push('');
  lines.push('## Tabs');
  lines.push('');
  lines.push('| Tab | GID | Rows | Headers |');
  lines.push('| --- | --- | ---: | --- |');
  for (const tab of report.tabs) {
    const headerSummary = tab.name === 'Main'
      ? 'Source policy / workbook instructions'
      : tab.headers.join(' / ');
    lines.push(`| ${tab.name} | ${tab.gid} | ${tab.row_count} | ${headerSummary} |`);
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data rows: ${report.summary.data_rows}`);
  lines.push(`- Pokemon cameo rows: ${report.summary.pokemon_rows}`);
  lines.push(`- Trainer cameo rows: ${report.summary.trainer_rows}`);
  lines.push(`- Rows with card name: ${report.summary.rows_with_card_name}`);
  lines.push(`- Rows with set name: ${report.summary.rows_with_set_name}`);
  lines.push(`- Rows with number: ${report.summary.rows_with_number}`);
  lines.push(`- Rows with notes: ${report.summary.rows_with_notes}`);
  lines.push(`- Distinct Pokemon subjects: ${report.summary.distinct_pokemon_subjects}`);
  lines.push(`- Distinct trainer subjects: ${report.summary.distinct_trainer_subjects}`);
  lines.push('');
  lines.push('## Source Risk Buckets');
  lines.push('');
  lines.push('| Bucket | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.risk_buckets) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Cameo Qualifiers');
  lines.push('');
  lines.push('| Qualifier | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.qualifier_counts) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Largest Source Sets');
  lines.push('');
  lines.push('| Source set name | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.top_source_sets) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Next Gate');
  lines.push('');
  lines.push('The next lane should be a no-write card match dry-run against `card_prints` and set aliases. Rows must be classified before any cameo relationship table or search resolver integration is proposed.');
  lines.push('');
  lines.push('Required dry-run classifications:');
  lines.push('');
  for (const classification of report.required_future_match_classifications) {
    lines.push(`- \`${classification}\``);
  }
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations.');
  lines.push('- No search resolver changes.');
  lines.push('- No app changes.');
  lines.push('- No Species Dex denominator changes.');
  lines.push('- No scanner changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const workbookHtml = await fetchText(SOURCE_URL);
  const tabs = parseTabsFromHtml(workbookHtml);
  const tabReports = [];
  const sourceRows = [];

  for (const tab of tabs) {
    const csv = await fetchText(`${CSV_BASE_URL}${tab.gid}`);
    const parsed = toObjects(parseCsv(csv));
    const dataRows = DATA_TAB_NAMES.has(tab.name) ? buildSourceRows(tab, parsed.rows) : [];
    tabReports.push({
      name: tab.name,
      gid: tab.gid,
      row_count: parsed.rows.length,
      data_row_count: dataRows.length,
      headers: parsed.headers,
      csv_hash: sha256(csv),
    });
    sourceRows.push(...dataRows);
  }

  const qualifierCounts = new Map();
  const riskCounts = new Map();
  const setCounts = new Map();
  const pokemonSubjects = new Set();
  const trainerSubjects = new Set();

  for (const row of sourceRows) {
    if (row.cameo_subject_type === 'pokemon' && row.cameo_subject_name) {
      pokemonSubjects.add(normalizeText(row.cameo_subject_name));
    }
    if (row.cameo_subject_type === 'trainer' && row.cameo_subject_name) {
      trainerSubjects.add(normalizeText(row.cameo_subject_name));
    }
    for (const qualifier of row.cameo_qualifiers) increment(qualifierCounts, qualifier);
    for (const risk of row.source_match_risk) increment(riskCounts, risk);
    increment(setCounts, row.set_name_raw);
  }

  const report = {
    generated_at: new Date().toISOString(),
    source_url: SOURCE_URL,
    workbook_id: WORKBOOK_ID,
    workbook_html_hash: sha256(workbookHtml),
    tabs: tabReports,
    summary: {
      data_rows: sourceRows.length,
      pokemon_rows: sourceRows.filter((row) => row.cameo_subject_type === 'pokemon').length,
      trainer_rows: sourceRows.filter((row) => row.cameo_subject_type === 'trainer').length,
      rows_with_card_name: sourceRows.filter((row) => row.has_card_name).length,
      rows_with_set_name: sourceRows.filter((row) => row.has_set_name).length,
      rows_with_number: sourceRows.filter((row) => row.has_number).length,
      rows_with_notes: sourceRows.filter((row) => row.has_notes).length,
      distinct_pokemon_subjects: pokemonSubjects.size,
      distinct_trainer_subjects: trainerSubjects.size,
      qualifier_counts: topEntries(qualifierCounts, 50),
      risk_buckets: topEntries(riskCounts, 50),
      top_source_sets: topEntries(setCounts, 30),
    },
    required_future_match_classifications: [
      'APPROVED_MATCH',
      'BLOCKED_SET_ALIAS_MISSING',
      'BLOCKED_CARD_NOT_FOUND',
      'BLOCKED_NUMBER_MISSING',
      'BLOCKED_AMBIGUOUS_CARD',
      'BLOCKED_PARENT_VARIANT_AMBIGUITY',
      'BLOCKED_NON_ENGLISH_SCOPE',
      'NEEDS_MANUAL_REVIEW',
    ],
    sample_rows: sourceRows.slice(0, 50),
  };

  await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MD_PATH, buildMarkdown(report));

  console.log(JSON.stringify({
    status: 'ok',
    json_path: path.relative(ROOT, JSON_PATH),
    md_path: path.relative(ROOT, MD_PATH),
    data_rows: report.summary.data_rows,
    pokemon_rows: report.summary.pokemon_rows,
    trainer_rows: report.summary.trainer_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
