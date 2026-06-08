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
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_eyevo_identity_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/eyevo_identity_acquisition_v1';
const REPORT_JSON = path.join(REPORT_DIR, 'eyevo_identity_acquisition_v1.json');
const REPORT_MD = path.join(REPORT_DIR, 'eyevo_identity_acquisition_v1.md');
const BASE_URL = 'https://eyevotcg.com';

const SLUG_OVERRIDES = {
  sve: 'scarlet-violet-energy',
  mfb: 'my-first-battle',
  cel25: 'celebrations',
  dpp: 'dp-black-star-promos',
  fut2020: 'pokemon-futsal-collection',
  mee: 'mega-evolution-energy',
  svp: 'scarlet-violet-promos',
  swshp: 'sword-shield-promos',
};

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

function eyevoSlugForSet(set) {
  if (SLUG_OVERRIDES[set.key]) return SLUG_OVERRIDES[set.key];
  const pkmnCards = set.source_aliases?.pkmncards;
  if (pkmnCards) return pkmnCards;
  return slugify(set.set_name);
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\bbasic\b/g, ' ')
    .replace(/\blv\s*x\b/g, 'lv x')
    .replace(/\blv\s*\.?\s*x\b/g, 'lv x')
    .replace(/\s+/g, ' ')
    .trim();
}

function factKey(row) {
  return `${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`;
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

function parseEyevoCardRows(html) {
  const rows = [];
  const cardRegex = /<a href="\/cards\/[^"]+"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<span[^>]*>#([^<]+)<\/span>/g;
  for (const match of html.matchAll(cardRegex)) {
    rows.push({
      card_name: decodeHtml(match[1]),
      card_number: decodeHtml(match[2]),
    });
  }

  const linkRegex = /<a href="\/cards\/[^"]+"[^>]*>([^#<]+)#([^<\s]+)[^<]*<\/a>/g;
  for (const match of html.matchAll(linkRegex)) {
    rows.push({
      card_name: decodeHtml(match[1]),
      card_number: decodeHtml(match[2]),
    });
  }

  const byKey = new Map();
  for (const row of rows) {
    if (!row.card_name || !row.card_number) continue;
    byKey.set(factKey(row), row);
  }
  return [...byKey.values()];
}

function targetFacts(gaps, setsByKey, options) {
  let facts = (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'card_identity_second_source_needed')
    .filter((row) => row.set_key && row.card_number && row.card_name)
    .filter((row) => setsByKey.has(row.set_key));
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

function buildRecords({ set, facts, cards, sourceUrl, generatedAt }) {
  const sourceRowsByKey = new Map(cards.map((row) => [factKey(row), row]));
  const records = [];
  for (const fact of facts) {
    const sourceRow = sourceRowsByKey.get(factKey(fact));
    if (!sourceRow) continue;
    records.push({
      source_key: 'eyevo_set_checklist',
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: null,
      rarity: null,
      evidence_type: 'card_identity',
      evidence_label: `Eyevo checklist row #${sourceRow.card_number} - ${sourceRow.card_name}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `eyevo:${fact.set_key}:${normalizeNumber(fact.card_number)}`,
      notes: 'Eyevo checklist card identity evidence only. This fixture does not assert finish or printing truth. Eyevo pages disclose Pokemon TCG API as an upstream data provider.',
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
    source_key: `eyevo_identity_${set.key}`,
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:eyevo_identity:${set.key}:${generatedAt}`,
    generation_note: 'Generated from Eyevo set checklist rows. Card identity only; no finish evidence is emitted.',
    records: dedupedRecords,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function buildMarkdown(report) {
  const rows = report.attempts.map((row) => [
    row.set_key,
    row.set_name,
    row.status,
    row.target_facts,
    row.source_rows,
    row.records_generated,
    row.source_url ?? '',
    row.error ?? '',
  ]);
  return [
    '# Eyevo Identity Acquisition V1',
    '',
    'Audit-only source acquisition. No DB writes, migrations, cleanup, or quarantine were performed.',
    '',
    'This lane emits card identity evidence only. It does not assert finish or printing truth.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'count'], Object.entries(report.summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])),
    '',
    '## Attempts',
    '',
    markdownTable(['set_key', 'set_name', 'status', 'target_facts', 'source_rows', 'records_generated', 'source_url', 'error'], rows),
    '',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload] = await Promise.all([readJson(GAPS_PATH), readJson(SETS_PATH)]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const grouped = targetFacts(gaps, setsByKey, options);
  const attempts = [];
  let generatedRecords = 0;
  let fixtureFilesWritten = 0;

  for (const [setKey, facts] of grouped) {
    const set = setsByKey.get(setKey);
    const slug = eyevoSlugForSet(set);
    const sourceUrl = `${BASE_URL}/sets/${encodeURIComponent(slug)}/`;
    try {
      const html = await fetchHtml(sourceUrl);
      if (/Page not found|Set Not Found|No results found/i.test(html) && !html.includes('All Cards')) {
        throw new Error('Eyevo page unavailable or not a set checklist.');
      }
      const cards = parseEyevoCardRows(html);
      const records = buildRecords({ set, facts, cards, sourceUrl, generatedAt });
      const fixtureFile = await writeFixture(set, records, sourceUrl, generatedAt, options.dryRun);
      if (fixtureFile) fixtureFilesWritten += 1;
      generatedRecords += records.length;
      attempts.push({
        set_key: set.key,
        set_name: set.set_name,
        status: records.length > 0 ? 'generated' : 'no_exact_matches',
        target_facts: facts.length,
        source_rows: cards.length,
        records_generated: records.length,
        fixture_file: fixtureFile ? path.relative(process.cwd(), fixtureFile) : null,
        source_url: sourceUrl,
      });
    } catch (error) {
      attempts.push({
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_unavailable',
        target_facts: facts.length,
        source_rows: 0,
        records_generated: 0,
        fixture_file: null,
        source_url: sourceUrl,
        error: String(error.message ?? error),
      });
    }
  }

  const report = {
    generated_at: generatedAt,
    version: 'EYEVO_IDENTITY_ACQUISITION_V1',
    ...safety(),
    rule: 'Eyevo rows may support card identity only. They must not be promoted to finish truth.',
    summary: {
      target_sets: grouped.length,
      records_generated: generatedRecords,
      fixture_files_written: fixtureFilesWritten,
      by_status: Object.fromEntries(
        [...attempts.reduce((map, row) => map.set(row.status, (map.get(row.status) ?? 0) + 1), new Map()).entries()].sort(),
      ),
    },
    attempts,
  };
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    report: REPORT_JSON,
    records_generated: generatedRecords,
    fixture_files_written: fixtureFilesWritten,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
