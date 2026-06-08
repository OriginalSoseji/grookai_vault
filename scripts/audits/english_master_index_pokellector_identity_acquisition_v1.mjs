import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokellector_identity_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokellector_identity_acquisition_v1';
const BASE_URL = 'https://www.pokellector.com';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = {
    sets: null,
    maxSets: null,
    dryRun: false,
  };
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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function setComparable(value) {
  return normalizeText(value)
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpok[eé]mon\b/g, ' ')
    .replace(/\btrading card game\b/g, ' ')
    .replace(/\benglish\b/g, ' ')
    .replace(/\bexpansion\b/g, ' ')
    .replace(/\bcollection\b/g, ' ')
    .replace(/\bset\b/g, ' ')
    .replace(/\bpromos?\b/g, ' promo ')
    .replace(/\bblack star\b/g, ' black star ')
    .replace(/^(ex|dp|platinum)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleParts(title) {
  const decoded = decodeHtml(title).replace(/\s+Set$/i, '');
  return decoded.split(/\s+-\s+/).map(setComparable).filter(Boolean);
}

function setMatches(linkTitle, setName) {
  const target = setComparable(setName);
  if (!target) return false;
  for (const part of titleParts(linkTitle)) {
    if (part === target) return true;
  }
  return false;
}

async function fetchText(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Grookai Master Index Audit/1.0',
        },
        signal: AbortSignal.timeout(30000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
      return text;
    } catch (error) {
      lastError = error;
      try {
        const { stdout } = await execFileAsync('curl.exe', [
          '--ssl-no-revoke',
          '--silent',
          '--show-error',
          '--location',
          '--max-time',
          '60',
          '--user-agent',
          'Grookai Master Index Audit/1.0',
          url,
        ], { timeout: 70000, maxBuffer: 20 * 1024 * 1024 });
        return stdout;
      } catch (curlError) {
        lastError = curlError;
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastError;
}

async function fetchSetDirectory() {
  const html = await fetchText(`${BASE_URL}/sets`);
  const links = [];
  const regex = /<a class="button"[^>]*href="([^"]+)"[^>]*title="([^"]+)"/g;
  for (const match of html.matchAll(regex)) {
    const href = decodeHtml(match[1]);
    const title = decodeHtml(match[2]);
    if (!href || !title) continue;
    links.push({
      href,
      title,
      url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    });
  }
  return links;
}

function chooseSetLink(set, links) {
  const direct = links.find((link) => setMatches(link.title, set.set_name));
  if (direct) return direct;
  const aliasValues = Object.values(set.source_aliases ?? {}).filter(Boolean);
  for (const alias of aliasValues) {
    const byAlias = links.find((link) => setMatches(link.title, alias));
    if (byAlias) return byAlias;
  }
  return null;
}

function parseChecklistRows(html) {
  const rows = [];
  const plaqueRegex = /<div class="plaque">\s*#([^<\s]+)\s*-\s*([^<]+)<\/div>/g;
  for (const match of html.matchAll(plaqueRegex)) {
    rows.push({
      card_number: decodeHtml(match[1]),
      card_name: decodeHtml(match[2]),
    });
  }
  return rows;
}

function factKey(row) {
  return `${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`;
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function targetFacts(gaps) {
  return (gaps.facts ?? []).filter((row) => row.gap_type === 'card_identity_second_source_needed');
}

function groupBySet(rows, setsByKey, options) {
  const grouped = new Map();
  for (const row of rows) {
    if (options.sets && !options.sets.has(normalizeText(row.set_key))) continue;
    if (!setsByKey.has(row.set_key)) continue;
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  let entries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

function buildRecords({ set, facts, checklistRows, sourceUrl, generatedAt }) {
  const targets = new Set(facts.map(factKey));
  const records = [];
  for (const row of checklistRows) {
    if (!targets.has(factKey(row))) continue;
    records.push({
      source_key: 'pokellector_set_checklist',
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      set_key: set.key,
      set_name: set.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: null,
      rarity: null,
      evidence_type: 'card_identity',
      evidence_label: `Pokellector checklist row #${row.card_number} - ${row.card_name}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pokellector:${set.key}:${row.card_number}`,
      notes: 'Collector checklist card identity evidence only. This fixture does not assert finish or printing truth.',
    });
  }
  return records;
}

async function writeFixture(set, records, sourceUrl, generatedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${set.key}.json`);
  let existingRecords = [];
  try {
    const existing = JSON.parse(await fs.readFile(file, 'utf8'));
    existingRecords = Array.isArray(existing.records) ? existing.records : [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const mergedRecords = [...existingRecords, ...records];
  const dedupedRecords = [...new Map(mergedRecords.map((record) => [
    `${record.source_key}|${normalizeNumber(record.card_number)}|${cardComparable(record.card_name)}|${record.evidence_type ?? ''}`,
    record,
  ])).values()].sort((left, right) => normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }));
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `pokellector_identity_${set.key}`,
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:pokellector_identity:${set.key}:${generatedAt}`,
    generation_note: 'Generated from Pokellector set checklist rows. Card identity only; no finish evidence is emitted.',
    records: dedupedRecords,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function writeReports({ results, fixtureFiles, generatedAt, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'POKELLECTOR_IDENTITY_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'Pokellector evidence is used only as collector checklist card identity evidence. It does not create finish or printing truth.',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pokellector_identity_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# Pokellector Identity Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['sets_attempted', payload.summary.sets_attempted],
      ['records_generated', payload.summary.records_generated],
      ['fixture_files_written', payload.summary.fixture_files_written],
      ['by_status', JSON.stringify(payload.summary.by_status)],
    ]),
    '',
    '## Rule',
    '',
    payload.rule,
    '',
    '## Sets',
    '',
    markdownTable(['set_key', 'set_name', 'status', 'target_facts', 'checklist_rows', 'records_generated', 'source_url', 'error'], results.map((row) => [
      row.set_key,
      row.set_name,
      row.status,
      row.target_facts,
      row.checklist_rows,
      row.records_generated,
      row.source_url ?? '',
      row.error ?? '',
    ])),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'pokellector_identity_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload] = await Promise.all([readJson(GAPS_PATH), readJson(SETS_PATH)]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = groupBySet(targetFacts(gaps), setsByKey, options);
  console.log(`[pokellector] target sets ${targets.length}`);
  const directory = await fetchSetDirectory();
  if (!options.dryRun) await fs.rm(FIXTURE_DIR, { recursive: true, force: true });

  const results = [];
  const fixtureFiles = [];
  for (const [setKey, facts] of targets) {
    const set = setsByKey.get(setKey);
    const link = chooseSetLink(set, directory);
    if (!link) {
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_unavailable',
        target_facts: facts.length,
        checklist_rows: 0,
        records_generated: 0,
        source_url: null,
        error: 'no_matching_pokellector_set_link',
      });
      continue;
    }
    console.log(`[pokellector] ${set.key} ${set.set_name} target facts ${facts.length}`);
    try {
      const html = await fetchText(link.url);
      const checklistRows = parseChecklistRows(html);
      const records = buildRecords({ set, facts, checklistRows, sourceUrl: link.url, generatedAt });
      const fixtureFile = await writeFixture(set, records, link.url, generatedAt, options.dryRun);
      fixtureFiles.push(fixtureFile);
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: records.length > 0 ? 'generated' : 'no_matching_card_rows',
        target_facts: facts.length,
        checklist_rows: checklistRows.length,
        records_generated: records.length,
        source_url: link.url,
        fixture_file: fixtureFile,
        error: null,
      });
    } catch (error) {
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_error',
        target_facts: facts.length,
        checklist_rows: 0,
        records_generated: 0,
        source_url: link.url,
        error: String(error.message ?? error),
      });
    }
    await sleep(150);
  }
  const report = await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(`[pokellector] records ${report.summary.records_generated}`);
  console.log(`[pokellector] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
