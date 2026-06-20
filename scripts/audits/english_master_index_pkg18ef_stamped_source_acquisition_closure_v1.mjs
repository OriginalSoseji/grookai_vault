import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const PKG18X_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json');
const PKG17B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json');
const PKG17I_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1.json');
const PKG17I2_JSON = path.join(SOURCE_DIR, 'pkg17i2_stamp_label_source_acquisition_v1', 'pkg17i2_stamp_label_source_acquisition_v1.json');
const PKG17I3_JSON = path.join(SOURCE_DIR, 'pkg17i3_pricecharting_stamp_label_acquisition_v1', 'pkg17i3_pricecharting_stamp_label_acquisition_v1.json');
const PKG17L_JSON = path.join(SOURCE_DIR, 'pkg17l_pricecharting_league_active_finish_acquisition_v1', 'pkg17l_pricecharting_league_active_finish_acquisition_v1.json');
const PKG18N_JSON = path.join(SOURCE_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1', 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1.json');
const DELTA_SUMMARY_JSON = path.join(SOURCE_DIR, 'source_delta_audit_v1', 'english_master_index_source_delta_summary_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.md');

const PACKAGE_ID = 'PKG-18EF-STAMPED-SOURCE-ACQUISITION-CLOSURE';
const TARGET_BUCKETS = new Set([
  'bucket_05_variant_family_source_acquisition_bulk',
  'bucket_06_second_source_acquisition_bulk',
]);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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

function closureStatus(row) {
  if (row.execution_bucket === 'bucket_06_second_source_acquisition_bulk') return 'blocked_second_independent_source_needed';
  if (row.governance_rule_id === 'league_crosshatch_finish_alias_rule') return 'blocked_no_exact_active_finish_source_after_bulk_attempt';
  if (row.governance_rule_id === 'event_staff_stamp_hierarchy_rule') return 'blocked_event_staff_source_needed';
  if (row.governance_rule_id === 'halloween_stamp_display_identity_rule') return 'blocked_halloween_source_needed';
  if (row.governance_rule_id === 'professor_program_stamp_identity_rule') return 'blocked_professor_program_source_needed';
  if (row.governance_rule_id === 'prerelease_stamp_identity_rule') return 'blocked_prerelease_source_needed';
  return 'blocked_variant_family_exact_source_needed';
}

function nextEvidence(row) {
  if (row.execution_bucket === 'bucket_06_second_source_acquisition_bulk') {
    return 'One additional independent source for the exact existing single-source fact.';
  }
  if (row.governance_rule_id === 'league_crosshatch_finish_alias_rule') {
    return 'Exact League/Crosshatch source proving set + card number + card name + active finish.';
  }
  return 'Exact source proving set + card number + card name + stamp label + active child finish.';
}

function buildRows(rows) {
  return rows
    .filter((row) => TARGET_BUCKETS.has(row.execution_bucket))
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      queue_status: row.queue_status,
      execution_bucket: row.execution_bucket,
      governance_rule_id: row.governance_rule_id,
      variant_family: row.variant_family,
      closure_status: closureStatus(row),
      write_ready_now: 0,
      required_next_evidence: nextEvidence(row),
    }));
}

function renderMarkdown(report) {
  return `# PKG-18E/F Stamped Source Acquisition Closure V1

Audit-only closure for the remaining stamped source-acquisition buckets after broad source retries.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['write_ready_rows', report.summary.write_ready_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['useful_candidate_matches', report.summary.useful_candidate_matches],
    ['useful_unabsorbed_source_lanes', report.summary.useful_unabsorbed_source_lanes],
    ['candidate_records_loaded', report.summary.candidate_records_loaded],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Closure Status Counts

${markdownTable(['closure_status', 'rows'], Object.entries(report.summary.by_closure_status))}

## Variant Family Counts

${markdownTable(['variant_family', 'rows'], Object.entries(report.summary.by_variant_family))}

## Source Attempt Summary

${markdownTable(['source attempt', 'result'], [
    ['PKG-17B useful current gap matches', report.source_attempt_summary.pkg17b_useful_current_gap_matches],
    ['PKG-17B useful unabsorbed source lanes', report.source_attempt_summary.pkg17b_useful_unabsorbed_source_lanes],
    ['PKG-17I2 external candidate labels', report.source_attempt_summary.pkg17i2_unique_rows_with_external_candidates],
    ['PKG-17I3 PriceCharting candidate labels', report.source_attempt_summary.pkg17i3_candidate_rows],
    ['PKG-17L League active finish candidates', report.source_attempt_summary.pkg17l_candidate_rows],
    ['PKG-18N current PriceCharting active finish candidates', report.source_attempt_summary.pkg18n_candidate_rows],
  ])}

No row in PKG-18E/F is write-ready from the current source set. Future progress requires a new independent exact source or manual adjudication artifact.
`;
}

async function main() {
  const [pkg18x, pkg17b, pkg17i, pkg17i2, pkg17i3, pkg17l, pkg18n, deltaSummary] = await Promise.all([
    readJson(PKG18X_JSON),
    readJson(PKG17B_JSON),
    readJson(PKG17I_JSON),
    readJsonIfExists(PKG17I2_JSON),
    readJsonIfExists(PKG17I3_JSON),
    readJsonIfExists(PKG17L_JSON),
    readJsonIfExists(PKG18N_JSON),
    readJsonIfExists(DELTA_SUMMARY_JSON),
  ]);
  const rows = buildRows(pkg18x.rows ?? []);
  const payload = {
    pkg18x_fingerprint: pkg18x.fingerprint_sha256,
    pkg17b_fingerprint: pkg17b.fingerprint_sha256,
    pkg17i_fingerprint: pkg17i.fingerprint_sha256,
    pkg17i2_fingerprint: pkg17i2?.fingerprint_sha256 ?? null,
    pkg17i3_fingerprint: pkg17i3?.fingerprint_sha256 ?? null,
    pkg17l_fingerprint: pkg17l?.fingerprint_sha256 ?? null,
    pkg18n_fingerprint: pkg18n?.fingerprint_sha256 ?? null,
    delta_summary_generated_at: deltaSummary?.generated_at ?? null,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      execution_queue: rel(PKG18X_JSON),
      source_attempt_rollup: rel(PKG17B_JSON),
      blocker_triage: rel(PKG17I_JSON),
      stamp_label_source_acquisition: pkg17i2 ? rel(PKG17I2_JSON) : null,
      pricecharting_stamp_label_acquisition: pkg17i3 ? rel(PKG17I3_JSON) : null,
      pricecharting_league_active_finish_acquisition: pkg17l ? rel(PKG17L_JSON) : null,
      pricecharting_current_stamped_active_finish_acquisition: pkg18n ? rel(PKG18N_JSON) : null,
      source_delta_summary: deltaSummary ? rel(DELTA_SUMMARY_JSON) : null,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    source_attempt_summary: {
      pkg17b_useful_current_gap_matches: pkg17b.summary?.useful_current_gap_matches ?? 0,
      pkg17b_useful_unabsorbed_source_lanes: pkg17b.summary?.source_delta_summary?.useful_unabsorbed_source_lanes ?? 0,
      pkg17i2_unique_rows_with_external_candidates: pkg17i2?.summary?.unique_rows_with_external_candidates ?? 0,
      pkg17i3_candidate_rows: pkg17i3?.summary?.candidate_rows ?? 0,
      pkg17l_candidate_rows: pkg17l?.summary?.candidate_rows ?? 0,
      pkg18n_candidate_rows: pkg18n?.summary?.candidate_rows ?? 0,
      delta_summary: deltaSummary?.summary ?? null,
    },
    summary: {
      target_rows: rows.length,
      write_ready_rows: 0,
      blocked_rows: rows.length,
      useful_candidate_matches: deltaSummary?.summary?.useful_candidate_matches ?? 0,
      useful_unabsorbed_source_lanes: deltaSummary?.summary?.useful_unabsorbed_source_lanes ?? 0,
      candidate_records_loaded: deltaSummary?.summary?.candidate_records_loaded ?? 0,
      by_execution_bucket: countBy(rows, (row) => row.execution_bucket),
      by_closure_status: countBy(rows, (row) => row.closure_status),
      by_variant_family: countBy(rows, (row) => row.variant_family),
      by_variant_key: countBy(rows, (row) => row.variant_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
