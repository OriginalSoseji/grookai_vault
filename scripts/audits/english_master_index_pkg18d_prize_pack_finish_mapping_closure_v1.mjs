import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const PKG17H_JSON = path.join(SOURCE_DIR, 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1', 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1.json');
const CROSS_SOURCE_JSON = path.join(SOURCE_DIR, 'prize_pack_current_gap_cross_source_v1', 'prize_pack_current_gap_cross_source_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.md');

const PACKAGE_ID = 'PKG-18D-PRIZE-PACK-FINISH-MAPPING-CLOSURE';

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
  if (row.acquisition_status === 'ready_two_source_exact_active_finish') return 'ready_for_guarded_dry_run';
  if (row.acquisition_status === 'review_only_single_source_family') return 'blocked_second_independent_source_needed';
  if (row.acquisition_status === 'blocked_conflicting_finish_evidence') return 'blocked_conflicting_finish_evidence';
  if (row.acquisition_status === 'blocked_no_exact_prize_pack_source_match') return 'blocked_no_exact_source_match';
  return 'blocked_manual_review';
}

function renderMarkdown(report) {
  return `# PKG-18D Prize Pack Finish Mapping Closure V1

Audit-only closure for Prize Pack stamped active-finish mapping.

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
    ['ready_for_guarded_dry_run', report.summary.ready_for_guarded_dry_run],
    ['blocked_rows', report.summary.blocked_rows],
    ['single_source_rows', report.summary.single_source_rows],
    ['conflicting_rows', report.summary.conflicting_rows],
    ['no_exact_match_rows', report.summary.no_exact_match_rows],
    ['cross_source_records_generated', report.summary.cross_source_records_generated],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Closure Status Counts

${markdownTable(['closure_status', 'rows'], Object.entries(report.summary.by_closure_status))}

## Source Attempt Inputs

${markdownTable(['artifact', 'fingerprint/status'], [
    [report.source_artifacts.pkg17h_current_queue_acquisition, report.source_fingerprints.pkg17h_current_queue_acquisition],
    [report.source_artifacts.cross_source_current_gap, report.source_fingerprints.cross_source_current_gap],
  ])}

No Prize Pack row is write-ready from the current source set. Continue only if a new independent exact source is added.
`;
}

async function main() {
  const [pkg17h, crossSource] = await Promise.all([
    readJson(PKG17H_JSON),
    readJson(CROSS_SOURCE_JSON),
  ]);
  const rows = (pkg17h.rows ?? []).map((row) => {
    const status = closureStatus(row);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      accepted_finish_key: row.accepted_finish_key,
      acquisition_status: row.acquisition_status,
      closure_status: status,
      evidence_count: row.evidence_count ?? 0,
      source_families: row.source_families ?? [],
      finish_counts: row.finish_counts ?? {},
      required_next_evidence: status === 'ready_for_guarded_dry_run'
        ? null
        : 'Another independent exact source proving set + card number + card name + Prize Pack stamp + active finish.',
    };
  });
  const payload = {
    pkg17h_fingerprint: pkg17h.fingerprint_sha256,
    cross_source_fingerprint: crossSource.fingerprint_sha256,
    rows,
  };
  const readyRows = rows.filter((row) => row.closure_status === 'ready_for_guarded_dry_run');
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1',
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
      pkg17h_current_queue_acquisition: rel(PKG17H_JSON),
      cross_source_current_gap: rel(CROSS_SOURCE_JSON),
    },
    source_fingerprints: {
      pkg17h_current_queue_acquisition: pkg17h.fingerprint_sha256,
      cross_source_current_gap: crossSource.fingerprint_sha256,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      ready_for_guarded_dry_run: readyRows.length,
      blocked_rows: rows.length - readyRows.length,
      single_source_rows: rows.filter((row) => row.closure_status === 'blocked_second_independent_source_needed').length,
      conflicting_rows: rows.filter((row) => row.closure_status === 'blocked_conflicting_finish_evidence').length,
      no_exact_match_rows: rows.filter((row) => row.closure_status === 'blocked_no_exact_source_match').length,
      cross_source_records_generated: crossSource.summary?.records_generated ?? 0,
      by_closure_status: countBy(rows, (row) => row.closure_status),
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
