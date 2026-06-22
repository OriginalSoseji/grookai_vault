import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const INPUT_JSON = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'english_master_index_collexy_stamp_taxonomy_governance_v1.json');
const FIXTURE_DIR = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_collexy_governed_stamp_finish_v1');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'collexy_governed_stamp_finish_v1.json');
const REPORT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'collexy_governed_stamp_finish_v1');
const REPORT_JSON = path.join(REPORT_DIR, 'collexy_governed_stamp_finish_v1.json');
const REPORT_MD = path.join(REPORT_DIR, 'collexy_governed_stamp_finish_v1.md');

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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

function renderMarkdown(report) {
  return [
    '# Collexy Governed Stamp Finish Fixture V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit-only. No DB writes, no migrations, no apply.',
    '',
    'This fixture contains only Collexy rows that passed stamp taxonomy governance as source-delta review candidates. It does not promote rows by itself.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['candidate_rows', report.summary.candidate_rows],
      ['fixture_records', report.summary.fixture_records],
      ['write_ready_now', report.summary.write_ready_now],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ]),
    '',
    '## Records',
    '',
    markdownTable(['set', 'number', 'card', 'variant', 'finish', 'source'], report.records.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.source_url,
    ])),
    '',
  ].join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const candidateRows = (input.rows ?? []).filter((row) => (
    row.readiness_status === 'not_write_ready_second_source_delta_required'
  ));
  const records = candidateRows.map((row) => ({
    source_key: 'collexy_bw_holofoil_overview',
    source_kind: 'collector_reference',
    source_url: row.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    variant_key: row.recommended_variant_key,
    evidence_type: 'finish_presence',
    evidence_label: row.evidence_label,
    retrieved_at: input.generated_at,
    raw_snapshot_ref: input.input_artifact,
    notes: `Governed by ${row.governing_contract}; source-delta review only.`,
  }));

  const fixture = {
    source_key: 'collexy_bw_holofoil_overview',
    source_kind: 'collector_reference',
    source_url: 'https://insights.collexy.com/database-insight-holofoil-overview-black-white-era/',
    generated_at: new Date().toISOString(),
    input_artifact: rel(INPUT_JSON),
    input_fingerprint_sha256: input.fingerprint_sha256,
    records,
  };
  fixture.fingerprint_sha256 = sha256(stableJson(fixture));

  const report = {
    package_id: 'COLLEXY-GOVERNED-STAMP-FINISH-FIXTURE-V1',
    generated_at: fixture.generated_at,
    input_artifact: rel(INPUT_JSON),
    input_fingerprint_sha256: input.fingerprint_sha256,
    fixture_path: rel(FIXTURE_JSON),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
    },
    summary: {
      candidate_rows: candidateRows.length,
      fixture_records: records.length,
      write_ready_now: 0,
    },
    records,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    input_fingerprint_sha256: report.input_fingerprint_sha256,
    summary: report.summary,
    records: report.records,
  }));

  await writeJson(FIXTURE_JSON, fixture);
  await writeJson(REPORT_JSON, report);
  await writeText(REPORT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    fixture_json: rel(FIXTURE_JSON),
    output_json: rel(REPORT_JSON),
    output_md: rel(REPORT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
