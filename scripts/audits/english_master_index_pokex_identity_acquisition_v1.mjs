import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFile = promisify(execFileCallback);

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokex_identity_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokex_identity_acquisition_v1';
const REPORT_JSON = path.join(REPORT_DIR, 'pokex_identity_acquisition_v1.json');
const REPORT_MD = path.join(REPORT_DIR, 'pokex_identity_acquisition_v1.md');
const CHECKLIST_INDEX_URL = 'https://scanpokemon.com/checklist/';

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
  const options = { sets: null, maxSets: null, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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

function comparable(value) {
  return normalizeText(value)
    .replace(/\bpokemon\b/g, '')
    .replace(/\bpokémon\b/g, '')
    .replace(/\btcg\b/g, '')
    .replace(/\bex\b/g, 'ex')
    .replace(/\bscarlet violet\b/g, 'scarlet violet')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, 'lv x')
    .replace(/\blv\s*\.?\s*x\b/g, 'lv x')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
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
    ], { maxBuffer: 20 * 1024 * 1024 });
    if (!stdout || /Page Not Found/i.test(stdout)) {
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }
    return stdout;
  }
}

function parsePokexSetIndex(html) {
  const candidates = [];
  const regex = /"url":"(https:\/\/scanpokemon\.com\/checklist\/[^"]+\/)","name":"([^"]+?) checklist"/g;
  for (const match of html.matchAll(regex)) {
    candidates.push({
      source_url: decodeHtml(match[1]),
      set_name: decodeHtml(match[2]),
      comparable_name: comparable(decodeHtml(match[2])),
    });
  }
  const linkRegex = /href="(\/checklist\/[^"]+\/)"[^>]*>([^<]+?)<\/a>/g;
  for (const match of html.matchAll(linkRegex)) {
    const label = decodeHtml(match[2]).replace(/\s+checklist$/i, '');
    if (!label || /browse|checklists/i.test(label)) continue;
    candidates.push({
      source_url: `https://scanpokemon.com${match[1]}`,
      set_name: label,
      comparable_name: comparable(label),
    });
  }
  const byUrl = new Map();
  for (const row of candidates) byUrl.set(row.source_url, row);
  return [...byUrl.values()];
}

function findSetSource(setName, indexRows) {
  const wanted = comparable(setName);
  const exact = indexRows.find((row) => row.comparable_name === wanted);
  if (exact) return exact;
  return indexRows.find((row) => row.comparable_name.includes(wanted) || wanted.includes(row.comparable_name)) ?? null;
}

function parseChecklistCards(html) {
  const cards = [];
  const jsonLdRegex = /"url":"https:\/\/scanpokemon\.com\/card\/([^/"]+)\/([^"]+)","name":"([^"]+?) #([^"]+?)"/g;
  for (const match of html.matchAll(jsonLdRegex)) {
    cards.push({
      source_set_code: decodeHtml(match[1]),
      card_number: decodeHtml(match[2]),
      card_name: decodeHtml(match[3]),
      source_number_label: decodeHtml(match[4]),
    });
  }
  const rowRegex = /href="\/card\/([^/"]+)\/([^"]+)"[^>]*>[\s\S]*?<span class="font-mono[^"]*">#([^<]+)<\/span>[\s\S]*?<span class="block truncate text-sm font-semibold text-white[^"]*">([^<]+)<\/span>/g;
  for (const match of html.matchAll(rowRegex)) {
    cards.push({
      source_set_code: decodeHtml(match[1]),
      card_number: decodeHtml(match[2]),
      card_name: decodeHtml(match[4]),
      source_number_label: decodeHtml(match[3]),
    });
  }
  const byKey = new Map();
  for (const row of cards) {
    const key = `${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`;
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

function targetFacts(gaps, options) {
  let facts = (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'card_identity_second_source_needed')
    .filter((row) => row.set_key && row.card_number && row.card_name);
  if (options.sets) facts = facts.filter((row) => options.sets.has(normalizeText(row.set_key)));
  const bySet = new Map();
  for (const fact of facts) {
    if (!bySet.has(fact.set_key)) bySet.set(fact.set_key, []);
    bySet.get(fact.set_key).push(fact);
  }
  let entries = [...bySet.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

function buildRecords({ facts, cards, sourceUrl, generatedAt }) {
  const cardsByKey = new Map(cards.map((row) => [`${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`, row]));
  const records = [];
  for (const fact of facts) {
    const key = `${normalizeNumber(fact.card_number)}|${cardComparable(fact.card_name)}`;
    const card = cardsByKey.get(key);
    if (!card) continue;
    records.push({
      source_key: 'pokex_set_checklist',
      source_kind: 'human_readable_checklist',
      source_url: sourceUrl,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: null,
      rarity: null,
      evidence_type: 'card_identity',
      evidence_label: `Pokex checklist row #${card.source_number_label || card.card_number} - ${card.card_name}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pokex:${fact.set_key}:${normalizeNumber(fact.card_number)}`,
      notes: 'Pokex checklist card identity evidence only. This fixture does not assert finish or printing truth.',
    });
  }
  return records;
}

async function readExistingRecords(file) {
  try {
    const payload = await readJson(file);
    return Array.isArray(payload.records) ? payload.records : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeFixture({ setKey, setName, sourceUrl, records, generatedAt, dryRun }) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${setKey}.json`);
  const merged = new Map();
  for (const row of await readExistingRecords(file)) {
    merged.set(`${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`, row);
  }
  for (const row of records) {
    merged.set(`${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`, row);
  }
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `pokex_identity_${setKey}`,
    source_kind: 'human_readable_checklist',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: setKey,
    set_name: setName,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:pokex_identity:${setKey}:${generatedAt}`,
    generation_note: 'Generated from Pokex set checklist rows. Card identity only; no finish evidence is emitted.',
    records: [...merged.values()].sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })),
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(GAPS_PATH);
  const indexRows = parsePokexSetIndex(await fetchHtml(CHECKLIST_INDEX_URL));
  const results = [];
  const fixtureFiles = [];

  await fs.mkdir(REPORT_DIR, { recursive: true });

  for (const [setKey, facts] of targetFacts(gaps, options)) {
    const setName = facts[0]?.set_name ?? setKey;
    const source = findSetSource(setName, indexRows);
    if (!source) {
      results.push({
        set_key: setKey,
        set_name: setName,
        status: 'source_unavailable',
        target_facts: facts.length,
        source_rows: 0,
        records_generated: 0,
        source_url: null,
        fixture_file: null,
        error: 'No exact Pokex checklist set match found.',
      });
      continue;
    }

    try {
      const html = await fetchHtml(source.source_url);
      const cards = parseChecklistCards(html);
      const records = buildRecords({ facts, cards, sourceUrl: source.source_url, generatedAt });
      const fixtureFile = await writeFixture({
        setKey,
        setName,
        sourceUrl: source.source_url,
        records,
        generatedAt,
        dryRun: options.dryRun,
      });
      if (fixtureFile) fixtureFiles.push(fixtureFile);
      results.push({
        set_key: setKey,
        set_name: setName,
        status: records.length > 0 ? 'generated' : 'no_exact_matches',
        target_facts: facts.length,
        source_rows: cards.length,
        records_generated: records.length,
        source_url: source.source_url,
        fixture_file: fixtureFile,
        error: null,
      });
    } catch (error) {
      results.push({
        set_key: setKey,
        set_name: setName,
        status: 'source_error',
        target_facts: facts.length,
        source_rows: 0,
        records_generated: 0,
        source_url: source.source_url,
        fixture_file: null,
        error: String(error.message ?? error),
      });
    }
  }

  const byStatus = {};
  for (const row of results) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  const summary = {
    target_sets: results.length,
    records_generated: results.reduce((sum, row) => sum + row.records_generated, 0),
    fixture_files_written: fixtureFiles.length,
    by_status: byStatus,
  };
  const payload = {
    version: 'english_master_index_pokex_identity_acquisition_v1',
    generated_at: generatedAt,
    ...safety(),
    source_key: 'pokex_set_checklist',
    rule: 'Pokex evidence is identity-only. No finish or printing facts are emitted from this lane.',
    summary,
    fixture_dir: FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, [
    '# Pokex Identity Acquisition V1',
    '',
    'Audit only. Generated evidence is card identity only and does not assert finish or printing truth.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Safety',
    '',
    markdownTable(['field', 'value'], Object.entries(safety())),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], Object.entries(summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])),
    '',
    '## Results',
    '',
    markdownTable(
      ['set', 'status', 'targets', 'source rows', 'records', 'source URL', 'fixture'],
      results.map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.status,
        row.target_facts,
        row.source_rows,
        row.records_generated,
        row.source_url ?? '',
        row.fixture_file ?? '',
      ]),
    ),
    '',
  ].join('\n'));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[pokex-identity] failed:', error);
  process.exitCode = 1;
});
