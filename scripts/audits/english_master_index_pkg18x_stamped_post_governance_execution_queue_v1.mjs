import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG18_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18_stamped_completion_governance_plan_v1.json');
const PKG18C_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18c_stamped_base_parent_resolution_closure_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.md');

const PACKAGE_ID = 'PKG-18X-STAMPED-POST-GOVERNANCE-EXECUTION-QUEUE';

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

function topEntries(counts, limit = 12) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function rowKey(row) {
  return [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key ?? row.stamped_variant_key,
    row.finish_key ?? row.target_base_finish_key,
  ].map((value) => String(value ?? '').trim().toLowerCase()).join('|');
}

function baseParentClosureByKey(pkg18c) {
  const byKey = new Map();
  for (const row of pkg18c.rows ?? []) {
    byKey.set(rowKey(row), row);
  }
  return byKey;
}

function executionBucket(row) {
  if (row.base_parent_closure_status === 'closed_as_stale_return_to_stamped_flow') {
    return 'bucket_03a_base_parent_closed_stale_no_write';
  }
  if (row.base_parent_closure_status) {
    return 'bucket_03b_base_parent_blocked_no_write';
  }
  switch (row.governance_rule_id) {
    case 'generic_stamped_suppression_rule':
      return 'bucket_01_no_write_generic_stamped_suppression';
    case 'battle_academy_display_metadata_rule':
      return 'bucket_02_no_printing_write_battle_academy_display_metadata';
    case 'base_parent_required_before_stamped_identity_rule':
    case 'canonical_base_parent_selection_rule':
      return 'bucket_03_base_parent_resolution_bulk';
    case 'prize_pack_finish_label_mapping_rule':
      return 'bucket_04_prize_pack_finish_mapping_bulk';
    case 'league_crosshatch_finish_alias_rule':
    case 'event_staff_stamp_hierarchy_rule':
    case 'halloween_stamp_display_identity_rule':
    case 'professor_program_stamp_identity_rule':
    case 'prerelease_stamp_identity_rule':
    case 'wotc_legacy_stamp_identity_rule':
    case 'small_custom_stamp_source_rule':
      return 'bucket_05_variant_family_source_acquisition_bulk';
    case 'second_source_rule_preserved':
      return 'bucket_06_second_source_acquisition_bulk';
    case 'manual_conflict_adjudication_rule':
      return 'bucket_07_conflict_adjudication_manual';
    default:
      return 'bucket_99_manual_review';
  }
}

function bucketAction(bucketId) {
  switch (bucketId) {
    case 'bucket_01_no_write_generic_stamped_suppression':
      return 'Adopt rule and exclude from write packages until exact stamp label evidence exists. No DB write.';
    case 'bucket_02_no_printing_write_battle_academy_display_metadata':
      return 'Adopt display metadata strategy. Do not create card_printing rows for deck marks.';
    case 'bucket_03_base_parent_resolution_bulk':
      return 'Run one DB read-only base-parent resolver, then create large guarded packages for insert/selection rows only.';
    case 'bucket_03a_base_parent_closed_stale_no_write':
      return 'Closed by current base-parent resolver. Do not build a base-parent package for these stale rows.';
    case 'bucket_03b_base_parent_blocked_no_write':
      return 'Keep blocked until active base finish evidence or parent identity collision is resolved.';
    case 'bucket_04_prize_pack_finish_mapping_bulk':
      return 'Adjudicate Prize Pack finish label mapping once, then run bulk readiness for exact mapped rows.';
    case 'bucket_05_variant_family_source_acquisition_bulk':
      return 'Run broad source acquisition by family, then create one or more large guarded dry-run buckets for exact two-source rows.';
    case 'bucket_06_second_source_acquisition_bulk':
      return 'Target known single-source rows for one more independent exact source.';
    case 'bucket_07_conflict_adjudication_manual':
      return 'Manually adjudicate conflicts; keep fail-closed until resolved.';
    default:
      return 'Manual review.';
  }
}

function writeClass(bucketId) {
  if (bucketId.includes('no_write') || bucketId.includes('no_printing_write')) return 'no_db_write_expected';
  if (bucketId.includes('conflict')) return 'blocked_no_write';
  return 'future_guarded_write_possible_after_readiness';
}

function buildBuckets(rows) {
  return Object.entries(Object.groupBy(rows, executionBucket))
    .map(([bucketId, bucketRows]) => ({
      bucket_id: bucketId,
      row_count: bucketRows.length,
      write_class: writeClass(bucketId),
      recommended_action: bucketAction(bucketId),
      immediate_apply_authorized: false,
      by_rule: countBy(bucketRows, (row) => row.governance_rule_id),
      by_status: countBy(bucketRows, (row) => row.queue_status),
      by_variant_family: countBy(bucketRows, (row) => row.variant_family),
      top_variant_keys: topEntries(countBy(bucketRows, (row) => row.variant_key), 10),
      top_sets: topEntries(countBy(bucketRows, (row) => row.set_key), 10),
      sample_rows: bucketRows.slice(0, 20),
    }))
    .sort((left, right) => left.bucket_id.localeCompare(right.bucket_id));
}

function renderMarkdown(report) {
  return `# PKG-18X Stamped Post-Governance Execution Queue V1

Audit-only execution queue that converts the mixed 579-row stamped queue into large safe buckets.

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
    ['remaining_rows', report.summary.remaining_rows],
    ['execution_buckets', report.summary.execution_buckets],
    ['no_db_write_expected_rows', report.summary.no_db_write_expected_rows],
    ['future_guarded_write_possible_rows', report.summary.future_guarded_write_possible_rows],
    ['blocked_no_write_rows', report.summary.blocked_no_write_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Execution Buckets

${markdownTable(
    ['bucket', 'rows', 'write class', 'immediate apply', 'recommended action'],
    report.execution_buckets.map((bucket) => [
      bucket.bucket_id,
      bucket.row_count,
      bucket.write_class,
      bucket.immediate_apply_authorized,
      bucket.recommended_action,
    ]),
  )}

## Minimal Completion Sequence

1. Close buckets 01 and 02 as governance/report-only exclusions.
2. Run bucket 03 base-parent resolver once.
3. Run bucket 04 Prize Pack mapping once.
4. Run bucket 05 and 06 source acquisition together, then build large guarded dry-run packages from exact rows.
5. Keep bucket 07 blocked until manual adjudication.

No real DB apply is authorized by this queue.
`;
}

async function main() {
  const [pkg18, pkg18c] = await Promise.all([readJson(PKG18_JSON), readJson(PKG18C_JSON)]);
  const baseParentClosures = baseParentClosureByKey(pkg18c);
  const rows = (pkg18.rows ?? []).map((row) => {
    const closure = baseParentClosures.get(rowKey(row));
    return {
      ...row,
      base_parent_closure_status: closure?.closure_status,
      base_parent_readiness_status: closure?.readiness_status,
      base_parent_closure_action: closure?.recommended_next_action,
      execution_bucket: executionBucket({
        ...row,
        base_parent_closure_status: closure?.closure_status,
      }),
    };
  });
  const executionBuckets = buildBuckets(rows);
  const noDbWriteRows = executionBuckets
    .filter((bucket) => bucket.write_class === 'no_db_write_expected')
    .reduce((sum, bucket) => sum + bucket.row_count, 0);
  const blockedRows = executionBuckets
    .filter((bucket) => bucket.write_class === 'blocked_no_write')
    .reduce((sum, bucket) => sum + bucket.row_count, 0);
  const payload = {
    pkg18_fingerprint: pkg18.fingerprint_sha256,
    pkg18c_fingerprint: pkg18c.fingerprint_sha256,
    executionBuckets,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: rel(PKG18_JSON),
    closure_artifacts: {
      base_parent_resolution: rel(PKG18C_JSON),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      remaining_rows: rows.length,
      execution_buckets: executionBuckets.length,
      no_db_write_expected_rows: noDbWriteRows,
      future_guarded_write_possible_rows: rows.length - noDbWriteRows - blockedRows,
      blocked_no_write_rows: blockedRows,
      by_execution_bucket: countBy(rows, (row) => row.execution_bucket),
      by_write_class: countBy(executionBuckets, (bucket) => bucket.write_class),
    },
    execution_buckets: executionBuckets,
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
