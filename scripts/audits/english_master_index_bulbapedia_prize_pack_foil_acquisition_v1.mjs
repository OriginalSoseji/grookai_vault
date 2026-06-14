import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const INPUT_JSON = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_prize_pack_foil_rule_review_v1/bulbapedia_prize_pack_foil_rule_review_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_prize_pack_foil_acquisition_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_prize_pack_foil_v1';
const SOURCE_KEY = 'bulbapedia_prize_pack_foil';

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
  const counts = {};
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function acceptedRows(review) {
  return (review.results ?? [])
    .filter((row) => row.status === 'review_candidate_cosmos_from_explicit_foil_rule')
    .filter((row) => row.candidate_finish_key === 'cosmos')
    .filter((row) => row.accepted_source_url && row.accepted_foil_rule_text);
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
    finish_key: 'cosmos',
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `Bulbapedia Prize Pack Series ${row.accepted_source_series}: ${row.card_name} ${row.card_number} Standard Set Foil follows Cosmos Holofoil rule`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `bulbapedia:prize-pack-series-${row.accepted_source_series}:${row.set_key}:${row.card_number}:standard-set-foil-cosmos-rule`,
    notes: `Exact Standard Set Foil card-list row. Series rule text: ${row.accepted_foil_rule_text}`,
  };
}

async function writeFixtures(rows, generatedAt, dryRun) {
  const files = [];
  if (dryRun || rows.length === 0) return files;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  for (const [setKey, setRows] of grouped) {
    const records = setRows.map((row) => fixtureRecord(row, generatedAt));
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
      generation_note: 'Generated from reviewed Bulbapedia Prize Pack Standard Set Foil rows only when page-level foil-pattern text explicitly routes the row to Cosmos Holofoil.',
      records,
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await writeJson(file, fixture);
    files.push(file);
  }
  return files;
}

function renderMarkdown(report) {
  const rows = report.results.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.accepted_finish_key,
    row.accepted_source_series,
  ]);
  return `# Bulbapedia Prize Pack Foil Acquisition V1

Generated human-source fixture lane for reviewed Prize Pack stamped cosmos finishes.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- dry_run: ${report.dry_run}

## Summary

- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['set', 'number', 'name', 'finish', 'series'], rows)}
`;
}

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const review = await readJson(INPUT_JSON);
  const rows = acceptedRows(review);
  const fixtureFiles = await writeFixtures(rows, generatedAt, options.dryRun);
  const results = rows.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    status: 'accepted_exact_bulbapedia_prize_pack_foil_cosmos',
    accepted_finish_key: 'cosmos',
    accepted_source_url: row.accepted_source_url,
    accepted_source_series: row.accepted_source_series,
    accepted_source_promotion: row.accepted_source_promotion,
    accepted_foil_rule_text: row.accepted_foil_rule_text,
  }));
  const report = {
    version: 'english_master_index_bulbapedia_prize_pack_foil_acquisition_v1',
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
    rule: 'Accept only reviewed Standard Set Foil rows where explicit Bulbapedia page-level foil-pattern text routes the exact card to Cosmos Holofoil.',
    fingerprint_sha256: sha256(stableJson(results)),
    summary: {
      records_generated: results.length,
      fixture_files_written: fixtureFiles.length,
      by_set: countBy(results, (row) => row.set_key),
      by_finish: countBy(results, (row) => row.accepted_finish_key),
    },
    fixture_dir: FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await writeJson(path.join(REPORT_DIR, 'bulbapedia_prize_pack_foil_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'bulbapedia_prize_pack_foil_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
