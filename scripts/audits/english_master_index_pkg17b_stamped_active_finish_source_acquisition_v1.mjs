import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const DELTA_DIR = path.join(SOURCE_DIR, 'source_delta_audit_v1');

const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.md');

const SOURCE_REPORTS = [
  {
    source_key: 'pricecharting_stamped_active_finish',
    report_json: path.join(SOURCE_DIR, 'pricecharting_stamped_active_finish_acquisition_v1', 'pricecharting_stamped_active_finish_acquisition_v1.json'),
    delta_json: null,
  },
  {
    source_key: 'cardtrader_stamped_finish',
    report_json: path.join(SOURCE_DIR, 'cardtrader_stamped_finish_acquisition_v1', 'cardtrader_stamped_finish_acquisition_v1.json'),
    delta_json: path.join(DELTA_DIR, 'cardtrader_stamped_finish_source_delta_audit_v1.json'),
  },
  {
    source_key: 'pokecardvalues_stamped_finish',
    report_json: path.join(SOURCE_DIR, 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json'),
    delta_json: path.join(DELTA_DIR, 'pokecardvalues_stamped_finish_source_delta_audit_v1.json'),
  },
  {
    source_key: 'tcgcsv_stamped_subtype',
    report_json: path.join(SOURCE_DIR, 'tcgcsv_stamped_subtype_acquisition_v1', 'tcgcsv_stamped_subtype_acquisition_v1.json'),
    delta_json: path.join(DELTA_DIR, 'tcgcsv_stamped_subtype_source_delta_audit_v1.json'),
  },
];

const SOURCE_DELTA_ACCEPTANCE_JSON = path.join(SOURCE_DIR, 'source_delta_acceptance_v1', 'source_delta_acceptance_v1.json');
const SOURCE_DELTA_SUMMARY_JSON = path.join(DELTA_DIR, 'english_master_index_source_delta_summary_v1.json');
const PACKAGE_ID = 'PKG-17B-STAMPED-ACTIVE-FINISH-SOURCE-ACQUISITION';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback = null) {
  if (!filePath) return fallback;
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
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

function summarizeSource(source, report, delta) {
  const results = report?.results ?? [];
  const acceptedRows = results.filter((row) => /accepted/.test(String(row.status ?? '')));
  const blockedRows = results.filter((row) => /blocked/.test(String(row.status ?? '')));
  const usefulMatches = delta?.useful_matches ?? [];
  return {
    source_key: source.source_key,
    acquisition_report: path.relative(ROOT, source.report_json).replaceAll('\\', '/'),
    delta_report: source.delta_json ? path.relative(ROOT, source.delta_json).replaceAll('\\', '/') : null,
    target_rows: report?.summary?.target_rows ?? 0,
    raw_records_generated: report?.summary?.records_generated ?? 0,
    accepted_exact_source_rows: acceptedRows.length,
    blocked_or_ambiguous_rows: blockedRows.length,
    useful_current_gap_matches: delta?.summary?.useful_candidate_matches ?? 0,
    already_in_current_index: delta?.summary?.already_in_current_index ?? 0,
    unmatched_candidate_records: delta?.summary?.unmatched_candidate_records ?? 0,
    by_status: report?.summary?.by_status ?? {},
    by_finish: report?.summary?.by_finish ?? {},
    useful_matches: usefulMatches.map((match) => ({
      delta_status: match.delta_status,
      gap_type: match.gap_type,
      set_key: match.set_key,
      set_name: match.set_name,
      card_number: match.card_number,
      card_name: match.card_name,
      finish_key: match.finish_key,
      candidate_source_kind: match.candidate_source_kind,
      candidate_url: match.candidate_url,
      evidence_label: match.evidence_label,
    })),
  };
}

function renderMarkdown(report) {
  const sourceRows = report.sources.map((source) => [
    source.source_key,
    source.target_rows,
    source.raw_records_generated,
    source.accepted_exact_source_rows,
    source.useful_current_gap_matches,
    source.already_in_current_index,
    source.blocked_or_ambiguous_rows,
  ]);
  const usefulRows = report.useful_matches.map((match) => [
    match.source_key,
    match.set_key,
    match.card_number,
    match.card_name,
    match.finish_key,
    match.delta_status,
    match.candidate_url,
  ]);
  const statusRows = Object.entries(report.summary.remaining_queue_by_status).map(([status, count]) => [status, count]);

  return `# PKG-17B Stamped Active Finish Source Acquisition V1

Audit-only source acquisition pass for stamped rows that still need exact active child finish evidence.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- active_finish_required_queue_rows: ${report.summary.active_finish_required_queue_rows}
- source_lanes_attempted: ${report.summary.source_lanes_attempted}
- raw_source_records_generated: ${report.summary.raw_source_records_generated}
- accepted_exact_source_rows: ${report.summary.accepted_exact_source_rows}
- useful_current_gap_matches: ${report.summary.useful_current_gap_matches}
- accepted_delta_records: ${report.summary.accepted_delta_records}
- remaining_requires_new_source_or_review: ${report.summary.remaining_requires_new_source_or_review}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Source Lanes

${markdownTable(['source', 'targets', 'raw records', 'accepted exact', 'useful gaps', 'already indexed', 'blocked/ambiguous'], sourceRows)}

## Useful Current Gap Matches

${usefulRows.length ? markdownTable(['source', 'set', 'number', 'card', 'finish', 'status', 'url'], usefulRows) : 'No useful current gap matches found.'}

## Remaining Queue Status

${markdownTable(['status', 'rows'], statusRows)}

## Next Action

${report.next_action}

## Guardrails

- No child \`finish_key=stamped\` was created.
- No database writes were performed.
- No migration files were created.
- Exact source rows are not apply authority by themselves; any write still requires a separate readiness package, rollback dry-run, fingerprint, and explicit approval.
`;
}

async function main() {
  const [pkg17a, deltaAcceptance, deltaSummary] = await Promise.all([
    readJson(PKG17A_JSON),
    readJsonIfExists(SOURCE_DELTA_ACCEPTANCE_JSON, { summary: {} }),
    readJsonIfExists(SOURCE_DELTA_SUMMARY_JSON, { summary: {} }),
  ]);
  const sources = [];
  for (const source of SOURCE_REPORTS) {
    const [report, delta] = await Promise.all([
      readJsonIfExists(source.report_json, null),
      readJsonIfExists(source.delta_json, null),
    ]);
    sources.push(summarizeSource(source, report, delta));
  }
  const usefulMatches = sources.flatMap((source) => source.useful_matches.map((match) => ({
    source_key: source.source_key,
    ...match,
  })));
  const activeFinishRows = (pkg17a.rows ?? []).filter((row) => row.queue_status === 'active_finish_required');
  const remainingRows = activeFinishRows.filter((row) => {
    const matched = usefulMatches.some((match) => (
      String(match.set_key) === String(row.set_key)
      && String(match.card_number) === String(row.card_number)
      && String(match.card_name).toLowerCase() === String(row.card_name).toLowerCase()
    ));
    return !matched;
  });
  const payload = {
    pkg17a_fingerprint: pkg17a.fingerprint_sha256,
    source_summaries: sources.map((source) => ({
      source_key: source.source_key,
      raw_records_generated: source.raw_records_generated,
      useful_current_gap_matches: source.useful_current_gap_matches,
    })),
    usefulMatches,
    delta_acceptance_summary: deltaAcceptance.summary ?? {},
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: path.relative(ROOT, PKG17A_JSON).replaceAll('\\', '/'),
      source_delta_acceptance: path.relative(ROOT, SOURCE_DELTA_ACCEPTANCE_JSON).replaceAll('\\', '/'),
      source_delta_summary: path.relative(ROOT, SOURCE_DELTA_SUMMARY_JSON).replaceAll('\\', '/'),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      active_finish_required_queue_rows: activeFinishRows.length,
      source_lanes_attempted: sources.length,
      raw_source_records_generated: sources.reduce((sum, source) => sum + Number(source.raw_records_generated ?? 0), 0),
      accepted_exact_source_rows: sources.reduce((sum, source) => sum + Number(source.accepted_exact_source_rows ?? 0), 0),
      useful_current_gap_matches: usefulMatches.length,
      accepted_delta_records: deltaAcceptance.summary?.accepted_records ?? 0,
      accepted_delta_statuses: deltaAcceptance.summary?.accepted_statuses ?? [],
      source_delta_summary: deltaSummary.summary ?? {},
      remaining_requires_new_source_or_review: remainingRows.length,
      remaining_queue_by_status: pkg17a.summary?.by_queue_status ?? {},
      remaining_active_finish_by_set: countBy(remainingRows, (row) => row.set_key),
      remaining_active_finish_by_variant_key: countBy(remainingRows, (row) => row.variant_key),
    },
    sources,
    useful_matches: usefulMatches,
    remaining_active_finish_rows: remainingRows,
    next_action: usefulMatches.length
      ? 'Run a guarded staging rebuild only for accepted delta fixtures if we choose to absorb these source rows; do not write to DB from this acquisition report.'
      : 'No useful unabsorbed source rows remain from these lanes; proceed to new source acquisition families or manual review.',
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    next_action: report.next_action,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
