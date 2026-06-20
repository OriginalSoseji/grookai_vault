import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, normalizeNumber, normalizeText, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const REPORT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17s_league_reverse_second_source_v1.json');
const REPORT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17s_league_reverse_second_source_v1.md');
const FIXTURE_JSON = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pkg17s_league_reverse_second_source_v1', 'league_reverse_second_sources_v1.json');

const PACKAGE_ID = 'PKG-17S-LEAGUE-REVERSE-SECOND-SOURCE';

const SOURCE_ROWS = [
  {
    source_key: 'pokecardvalues_league_reverse_exact',
    source_kind: 'collector_reference',
    source_url: 'https://pokecardvalues.co.uk/cards/bebes-search-89-111-reverse-holo-league-promo-rising-rivals/pl2-89-3-41/',
    set_key: 'pl2',
    set_name: 'Rising Rivals',
    card_number: '89',
    card_name: "Bebe's Search",
    finish_key: 'reverse',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    evidence_label: "PokeCardValues identifies Bebe's Search 89/111 as Reverse Holo League Promo.",
  },
  {
    source_key: 'pokecardvalues_league_reverse_exact',
    source_kind: 'collector_reference',
    source_url: 'https://pokecardvalues.co.uk/cards/volkners-philosophy-98-111-reverse-holo-league-promo-rising-rivals/pl2-98-3-41/',
    set_key: 'pl2',
    set_name: 'Rising Rivals',
    card_number: '98',
    card_name: "Volkner's Philosophy",
    finish_key: 'reverse',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    evidence_label: "PokeCardValues identifies Volkner's Philosophy 98/111 as Reverse Holo League Promo.",
  },
  {
    source_key: 'tcgplayer_league_reverse_exact',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/231418/pokemon-league-and-championship-cards-poliwrath-21-95-league-promo',
    set_key: 'hgss2',
    set_name: 'HS-Unleashed',
    card_number: '21',
    card_name: 'Poliwrath',
    finish_key: 'reverse',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    evidence_label: 'TCGplayer League & Championship Cards product identifies Poliwrath 21/95 League Promo with Reverse Holofoil listings.',
  },
];

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function exactKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    row.variant_key,
    row.finish_key,
  ].join('|');
}

function renderMarkdown(report) {
  return [
    '# PKG-17S League Reverse Second Source V1',
    '',
    'Audit-only fixture for second-source exact League reverse evidence.',
    '',
    markdownTable(['metric', 'value'], [
      ['source_rows_reviewed', report.summary.source_rows_reviewed],
      ['current_queue_matches', report.summary.current_queue_matches],
      ['fixture_records_written', report.summary.fixture_records_written],
      ['write_ready_now', report.write_ready_now],
    ]),
    '',
    markdownTable(['set', 'number', 'name', 'source', 'url'], report.records.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.source_key,
      row.source_url,
    ])),
    '',
  ].join('\n');
}

async function main() {
  const queue = await readJson(PKG17A_JSON);
  const currentKeys = new Set((queue.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .map((row) => exactKey({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key ?? 'reverse',
    })));
  const records = SOURCE_ROWS
    .filter((row) => currentKeys.has(exactKey(row)))
    .map((row) => ({
      ...row,
      evidence_type: 'finish_presence',
      evidence_text_or_label: row.evidence_label,
      language: 'en',
      retrieved_at: new Date().toISOString(),
      raw_snapshot_ref: `${row.source_key}:${row.set_key}:${row.card_number}:${row.variant_key}:${row.finish_key}`,
      notes: 'Accepted only as source evidence. No DB writes are performed by this fixture generator.',
    }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17s_league_reverse_second_source_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: rel(PKG17A_JSON),
      fixture_json: rel(FIXTURE_JSON),
    },
    fingerprint_sha256: sha256(stableJson(records)),
    summary: {
      source_rows_reviewed: SOURCE_ROWS.length,
      current_queue_matches: records.length,
      fixture_records_written: records.length,
    },
    records,
  };

  await writeJson(FIXTURE_JSON, {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_status: 'manual_url_label_fixture',
    generated_at: report.generated_at,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    records,
  });
  await writeJson(REPORT_JSON, report);
  await writeText(REPORT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(REPORT_JSON),
    output_md: rel(REPORT_MD),
    fixture_json: rel(FIXTURE_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
