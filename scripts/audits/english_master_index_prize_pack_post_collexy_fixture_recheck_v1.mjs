import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const INPUT_JSON = path.join(
  DEFAULT_OUTPUT_DIR,
  'english_master_index_v1',
  'english_master_index_stamped_special_post_collexy_source_packet_v1.json',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'prize_pack_post_collexy_fixture_recheck_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'prize_pack_post_collexy_fixture_recheck_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'prize_pack_post_collexy_fixture_recheck_v1.md');

const PACKAGE_ID = 'PRIZE-PACK-POST-COLLEXY-FIXTURE-RECHECK-V1';
const FIXTURE_ROOTS = [
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_prize_pack_current_gap_cross_source_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/official_pokemon_prize_pack_pdf_acquisition_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_title_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_justinbasil_prize_pack_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_prize_pack_foil_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_prize_pack_normal_v1',
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
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function identityKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number).toLowerCase().replace(/^0+(?=\d)/, ''),
    normalizeText(row.card_name),
  ].join('|');
}

function sourceAuthority(sourceKey) {
  const key = normalizeText(sourceKey);
  if (key.includes('bulbapedia')) return 'bulbapedia';
  if (key.includes('justinbasil')) return 'justinbasil';
  if (key.includes('tcgcsv')) return 'tcgcsv';
  if (key.includes('official')) return 'official_pokemon';
  return key || 'unknown';
}

function isPreservationRecord(record) {
  return (
    normalizeText(record.raw_snapshot_ref).includes('source preservation')
    || normalizeText(record.evidence_label).includes('preserved')
    || normalizeText(record.notes).includes('preserves previously promoted')
  );
}

function isPrizePackRecord(record) {
  const joined = normalizeText([
    record.source_key,
    record.source_url,
    record.evidence_label,
    record.raw_snapshot_ref,
    record.notes,
  ].filter(Boolean).join(' '));
  return joined.includes('prize pack');
}

async function listJsonFiles(root) {
  const output = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.json')) output.push(full);
    }
  }
  await walk(root);
  return output;
}

function recordsFromFixture(filePath, value) {
  const rows = Array.isArray(value) ? value : (value.records ?? value.rows ?? []);
  if (!Array.isArray(rows)) return [];
  return rows.map((record) => ({
    ...record,
    fixture_file: rel(filePath),
    fixture_source_key: value.source_key ?? null,
    fixture_source_url: value.source_url ?? null,
  }));
}

async function loadFixtureRecords() {
  const allFiles = [];
  for (const root of FIXTURE_ROOTS) {
    allFiles.push(...await listJsonFiles(path.join(ROOT, root)));
  }
  const records = [];
  for (const filePath of allFiles) {
    const fixture = await readJson(filePath);
    records.push(...recordsFromFixture(filePath, fixture));
  }
  return {
    files: allFiles.map(rel).sort(),
    records: records.filter((record) => record.set_key && record.card_number && record.card_name),
  };
}

function targetRows(input) {
  return (input.rows ?? [])
    .filter((row) => row.next_source_family === 'official_prize_pack_or_product_pdf_recheck')
    .filter((row) => row.action_bucket === 'prize_pack_second_source')
    .sort((left, right) => (
      String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));
}

function classifyTarget(row, records) {
  const exactRecords = records
    .filter((record) => identityKey(record) === identityKey(row))
    .filter(isPrizePackRecord);
  const finishGroups = new Map();
  for (const record of exactRecords) {
    const finishKey = record.finish_key ?? 'unknown';
    if (!finishGroups.has(finishKey)) finishGroups.set(finishKey, []);
    finishGroups.get(finishKey).push(record);
  }
  const finishes = [...finishGroups.entries()].map(([finishKey, group]) => {
    const authorities = [...new Set(group.map((record) => sourceAuthority(record.source_key ?? record.fixture_source_key)))].sort();
    const independentAuthorities = [...new Set(group
      .filter((record) => !isPreservationRecord(record))
      .map((record) => sourceAuthority(record.source_key ?? record.fixture_source_key)))].sort();
    return {
      finish_key: finishKey,
      records: group.map((record) => ({
        source_key: record.source_key ?? record.fixture_source_key,
        source_kind: record.source_kind,
        source_url: record.source_url ?? record.fixture_source_url,
        evidence_label: record.evidence_label,
        raw_snapshot_ref: record.raw_snapshot_ref,
        fixture_file: record.fixture_file,
        preservation_only: isPreservationRecord(record),
      })),
      source_count: authorities.length,
      independent_source_count: independentAuthorities.length,
      source_authorities: authorities,
      independent_source_authorities: independentAuthorities,
    };
  }).sort((left, right) => (
    Number(right.independent_source_count) - Number(left.independent_source_count)
    || String(left.finish_key).localeCompare(String(right.finish_key))
  ));

  let status = 'no_exact_fixture_match';
  if (finishes.some((finish) => finish.independent_source_count >= 2)) {
    status = 'multi_source_finish_review_candidate_no_write';
  } else if (finishes.some((finish) => finish.independent_source_count === 1)) {
    status = 'single_independent_source_review_only';
  } else if (finishes.length > 0) {
    status = 'preservation_only_review_blocked';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_groups: finishes,
    exact_fixture_match_count: exactRecords.length,
    candidate_finish_keys: finishes.map((finish) => finish.finish_key),
    status,
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const rows = report.rows
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.candidate_finish_keys.join(', ') || '-',
      row.exact_fixture_match_count,
      row.status,
    ]);

  return [
    '# Prize Pack Post-Collexy Fixture Recheck V1',
    '',
    'Audit-only comparison of the current post-Collexy Prize Pack queue against preserved Prize Pack source fixtures.',
    '',
    '## Safety',
    '',
    `- audit_only: ${report.audit_only}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- write_ready_now: ${report.write_ready_now}`,
    '',
    '## Summary',
    '',
    `- target_rows: ${report.summary.target_rows}`,
    `- fixture_files_loaded: ${report.summary.fixture_files_loaded}`,
    `- fixture_records_loaded: ${report.summary.fixture_records_loaded}`,
    `- rows_with_exact_fixture_match: ${report.summary.rows_with_exact_fixture_match}`,
    `- multi_source_finish_review_candidates: ${report.summary.multi_source_finish_review_candidates}`,
    `- write_ready_now: ${report.write_ready_now}`,
    `- fingerprint_sha256: \`${report.fingerprint_sha256}\``,
    '',
    markdownTable(['status', 'rows'], statusRows),
    '',
    '## Target Rows',
    '',
    rows.length
      ? markdownTable(['set', 'number', 'card', 'stamp', 'candidate finishes', 'matches', 'status'], rows)
      : '_No target rows._',
    '',
    '## Governance',
    '',
    '- This pass compares existing fixture evidence only.',
    '- Preservation-only TCGCSV rows are not treated as new independent evidence.',
    '- Multi-source review candidates still require separate adjudication before any dry-run package can be prepared.',
    '- No DB writes, migrations, cleanup, or apply occurred.',
    '',
  ].join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const targets = targetRows(input);
  const fixtures = await loadFixtureRecords();
  const rows = targets.map((row) => classifyTarget(row, fixtures.records));
  const reportBase = {
    generated_at: new Date().toISOString(),
    version: 'prize_pack_post_collexy_fixture_recheck_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_performed: false,
    write_ready_now: 0,
    input_artifact: rel(INPUT_JSON),
    fixture_roots: FIXTURE_ROOTS,
    fixture_files: fixtures.files,
    summary: {
      target_rows: targets.length,
      fixture_files_loaded: fixtures.files.length,
      fixture_records_loaded: fixtures.records.length,
      rows_with_exact_fixture_match: rows.filter((row) => row.exact_fixture_match_count > 0).length,
      multi_source_finish_review_candidates: rows.filter((row) => row.status === 'multi_source_finish_review_candidate_no_write').length,
      by_status: countBy(rows, (row) => row.status),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };
  const report = {
    ...reportBase,
    fingerprint_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      input_artifact: reportBase.input_artifact,
      fixture_roots: reportBase.fixture_roots,
      rows,
    })),
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    target_rows: report.summary.target_rows,
    rows_with_exact_fixture_match: report.summary.rows_with_exact_fixture_match,
    multi_source_finish_review_candidates: report.summary.multi_source_finish_review_candidates,
    write_ready_now: report.write_ready_now,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
