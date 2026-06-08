import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  sourceAuthorityKey,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';

const MASTER_INDEX_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_FIXTURE_DIR = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures');
const SOURCE_EXHAUSTION_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const QUEUE_FILE = path.join(MASTER_INDEX_DIR, 'english_master_index_remaining_finish_second_source_queue_v1.json');

const OUTPUT_JSON = path.join(MASTER_INDEX_DIR, 'english_master_index_remaining_finish_exact_fixture_review_v1.json');
const OUTPUT_MD = path.join(MASTER_INDEX_DIR, 'english_master_index_remaining_finish_exact_fixture_review_v1.md');
const MIRROR_JSON = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_remaining_finish_exact_fixture_review_v1.json');
const MIRROR_MD = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_remaining_finish_exact_fixture_review_v1.md');

const REJECTED_SOURCE_KEYS = new Set([
  'pokemontcg_api',
  'tcgdex',
]);

function cardKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files;
}

function recordsFromFixture(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.records)) return json.records;
  if (Array.isArray(json.evidence)) return json.evidence;
  if (Array.isArray(json.rows)) return json.rows;
  return [];
}

function isUsableEvidence(row) {
  if (row.evidence_type && row.evidence_type !== 'finish_presence') return false;
  if (!row.source_url) return false;
  if (!row.source_key || REJECTED_SOURCE_KEYS.has(row.source_key)) return false;
  if (!row.set_key || !row.card_number || !row.card_name || !row.finish_key) return false;
  return true;
}

function compactEvidence(row, sourceFile) {
  return {
    source_key: row.source_key,
    source_kind: row.source_kind,
    source_authority: sourceAuthorityKey(row),
    source_url: row.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: normalizeFinishKey(row.finish_key),
    evidence_type: row.evidence_type,
    evidence_label: row.evidence_label,
    raw_snapshot_ref: row.raw_snapshot_ref,
    fixture_file: sourceFile,
    notes: row.notes,
  };
}

function increment(target, key) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + 1;
}

function topEntries(object, limit = 30) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function buildMarkdown(report) {
  const lines = [
    '# English Master Index Remaining Finish Exact Fixture Review V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'This is an audit-only exact-match review of already generated source fixtures against the remaining finish-second-source queue. It does not promote rows or mutate canonical data.',
    '',
    '## Safety',
    '',
    markdownTable(
      ['check', 'value'],
      [
        ['audit_only', report.audit_only],
        ['db_writes_performed', report.db_writes_performed],
        ['migrations_created', report.migrations_created],
        ['cleanup_performed', report.cleanup_performed],
        ['quarantine_performed', report.quarantine_performed],
        ['promotion_performed', false],
      ],
    ),
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['queue_rows', report.summary.queue_rows],
        ['fixture_records_scanned', report.summary.fixture_records_scanned],
        ['rows_with_exact_independent_fixture', report.summary.rows_with_exact_independent_fixture],
        ['exact_independent_evidence_records', report.summary.exact_independent_evidence_records],
        ['rows_without_exact_fixture', report.summary.rows_without_exact_fixture],
      ],
    ),
    '',
    '## Exact Matches By Source',
    '',
    markdownTable(['source', 'rows'], topEntries(report.summary.exact_matches_by_source, 30)),
    '',
    '## Exact Matches By Set',
    '',
    markdownTable(['set', 'rows'], topEntries(report.summary.exact_matches_by_set, 40)),
    '',
    '## Promotion Candidate Review Queue',
    '',
    markdownTable(
      ['set', 'name', 'number', 'card', 'finish', 'matching_sources', 'authorities', 'review_status'],
      report.rows_with_exact_independent_fixture.slice(0, 120).map((row) => [
        row.set_key,
        row.set_name,
        row.card_number,
        row.card_name,
        row.finish_key,
        row.matching_sources.join(', '),
        row.matching_authorities.join(', '),
        row.review_status,
      ]),
    ),
    '',
    '## Still No Exact Fixture',
    '',
    markdownTable(
      ['set', 'name', 'number', 'card', 'finish', 'current_sources'],
      report.rows_without_exact_fixture.slice(0, 120).map((row) => [
        row.set_key,
        row.set_name,
        row.card_number,
        row.card_name,
        row.finish_key,
        row.current_sources.join(', '),
      ]),
    ),
    '',
    '## Guardrail',
    '',
    'Rows in the candidate queue still require guarded staging acceptance. This review only proves that an independent exact fixture exists in local audit artifacts.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  if (!await fileExists(QUEUE_FILE)) {
    throw new Error(`Missing queue file: ${QUEUE_FILE}`);
  }

  const queue = JSON.parse(await fs.readFile(QUEUE_FILE, 'utf8'));
  const queueRows = queue.rows ?? [];
  const queueByKey = new Map(queueRows.map((row) => [cardKey(row), row]));

  const fixtureFiles = await listJsonFiles(SOURCE_FIXTURE_DIR);
  const exactMatches = new Map();
  let fixtureRecordsScanned = 0;

  for (const file of fixtureFiles) {
    let json;
    try {
      json = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      continue;
    }

    const records = recordsFromFixture(json);
    for (const record of records) {
      fixtureRecordsScanned += 1;
      if (!isUsableEvidence(record)) continue;
      const key = cardKey(record);
      if (!queueByKey.has(key)) continue;
      if (!exactMatches.has(key)) exactMatches.set(key, []);
      exactMatches.get(key).push(compactEvidence(record, path.relative('.', file)));
    }
  }

  const rowsWithExact = [];
  const rowsWithoutExact = [];
  const bySource = {};
  const bySet = {};

  for (const queueRow of queueRows) {
    const currentSources = new Set(queueRow.current_sources ?? []);
    const currentAuthorities = new Set(queueRow.current_source_authorities ?? []);
    const matches = (exactMatches.get(cardKey(queueRow)) ?? [])
      .filter((match) => !currentSources.has(match.source_key))
      .filter((match) => !currentAuthorities.has(match.source_authority));
    if (matches.length > 0) {
      for (const match of matches) {
        increment(bySource, match.source_key);
        increment(bySet, `${queueRow.set_key}|${queueRow.set_name ?? ''}`);
      }
      rowsWithExact.push({
        ...queueRow,
        matching_sources: uniqueSorted(matches.map((match) => match.source_key)),
        matching_authorities: uniqueSorted(matches.map((match) => match.source_authority)),
        matching_evidence: matches,
        review_status: 'exact_independent_fixture_found_needs_guarded_acceptance',
      });
    } else {
      rowsWithoutExact.push({
        ...queueRow,
        review_status: 'no_exact_independent_fixture_found',
      });
    }
  }

  const report = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
    rule: 'Only exact set_key + normalized card_number + normalized card_name + normalized finish_key fixture matches are considered. This report does not promote evidence.',
    summary: {
      queue_rows: queueRows.length,
      fixture_records_scanned: fixtureRecordsScanned,
      rows_with_exact_independent_fixture: rowsWithExact.length,
      exact_independent_evidence_records: rowsWithExact.reduce((total, row) => total + row.matching_evidence.length, 0),
      rows_without_exact_fixture: rowsWithoutExact.length,
      exact_matches_by_source: bySource,
      exact_matches_by_set: bySet,
    },
    rows_with_exact_independent_fixture: rowsWithExact,
    rows_without_exact_fixture: rowsWithoutExact,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  await fs.writeFile(MIRROR_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MIRROR_MD, buildMarkdown(report));

  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
