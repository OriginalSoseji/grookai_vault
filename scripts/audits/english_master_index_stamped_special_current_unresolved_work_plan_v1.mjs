import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const QUEUE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const NO_WRITE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_no_write_governance_closure_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_unresolved_work_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_unresolved_work_plan_v1.md');

const BUCKET_GUIDANCE = {
  league_finish_exact_source: {
    lane: 'league_exact_finish_source',
    group: 'source_acquisition',
    priority: 1,
    next_action: 'Find exact set + number + name + League Stamp + active finish evidence. Do not infer reverse from crosshatch wording.',
  },
  prize_pack_second_source: {
    lane: 'prize_pack_finish_mapping',
    group: 'source_acquisition',
    priority: 2,
    next_action: 'Resolve Normal/Foil ambiguity with exact independent product/checklist evidence. Official PDFs alone are not enough when both finishes appear.',
  },
  small_custom_stamp_exact_source: {
    lane: 'small_custom_stamp_exact_finish',
    group: 'source_acquisition',
    priority: 3,
    next_action: 'Target event/product pages or stable listings that prove exact custom stamp and active finish.',
  },
  event_staff_exact_source: {
    lane: 'event_staff_exact_finish',
    group: 'source_acquisition',
    priority: 4,
    next_action: 'Acquire event/staff-specific evidence that names the stamp label and active finish for the exact card.',
  },
  prerelease_exact_finish_source: {
    lane: 'prerelease_exact_finish',
    group: 'source_acquisition',
    priority: 5,
    next_action: 'Find exact prerelease or staff-prerelease finish proof; do not rely on set-era assumptions.',
  },
  professor_program_exact_finish_source: {
    lane: 'professor_program_exact_finish',
    group: 'source_acquisition',
    priority: 6,
    next_action: 'Find exact Professor Program stamp and finish evidence; resolve deck/product stamp taxonomy separately.',
  },
  second_source_needed: {
    lane: 'second_source_needed',
    group: 'source_acquisition',
    priority: 7,
    next_action: 'Add one independent corroborating source for exact set + number + name + variant/stamp + finish.',
  },
  base_parent_blocked_no_write: {
    lane: 'base_parent_dependency',
    group: 'dependency_governance',
    priority: 8,
    next_action: 'Resolve base parent/base finish dependency before modeling the variant parent.',
  },
  halloween_base_parent_or_finish_resolution: {
    lane: 'halloween_base_or_finish_resolution',
    group: 'dependency_governance',
    priority: 9,
    next_action: 'Separate Trick or Trade display/product metadata from true stamped physical identity and exact active finish.',
  },
};

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

function rowKey(row) {
  return [
    row.set_key ?? '',
    row.card_number ?? '',
    row.card_name ?? '',
    row.variant_key ?? '',
    row.stamp_label ?? '',
  ].join('|');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function buildLanePlan(rows) {
  const byBucket = new Map();
  for (const row of rows) {
    if (!byBucket.has(row.action_bucket)) byBucket.set(row.action_bucket, []);
    byBucket.get(row.action_bucket).push(row);
  }

  return [...byBucket.entries()]
    .map(([bucket, bucketRows]) => {
      const guidance = BUCKET_GUIDANCE[bucket] ?? {
        lane: bucket,
        group: 'manual_review',
        priority: 99,
        next_action: 'Manual review required.',
      };
      return {
        action_bucket: bucket,
        lane: guidance.lane,
        execution_group: guidance.group,
        priority: guidance.priority,
        row_count: bucketRows.length,
        top_sets: Object.entries(countBy(bucketRows, (row) => row.set_key)).slice(0, 10).map(([set_key, count]) => ({ set_key, count })),
        top_variant_keys: Object.entries(countBy(bucketRows, (row) => row.variant_key)).slice(0, 10).map(([variant_key, count]) => ({ variant_key, count })),
        next_action: guidance.next_action,
        write_ready_now: false,
      };
    })
    .sort((left, right) => left.priority - right.priority || right.row_count - left.row_count);
}

function renderMarkdown(report) {
  return `# Stamped/Special Current Unresolved Work Plan V1

Generated: ${report.generated_at}

This report starts from the corrected live residual queue, removes current no-write governance rows, and describes the remaining unresolved stamped/special work.

It is audit-only. It performs no DB writes, migrations, apply, cleanup, quarantine, inserts, updates, or deletes.

## Summary

${markdownTable(['metric', 'value'], [
    ['queue_rows', report.summary.queue_rows],
    ['no_write_closed_rows', report.summary.no_write_closed_rows],
    ['unresolved_rows', report.summary.unresolved_rows],
    ['source_acquisition_rows', report.summary.by_execution_group.source_acquisition ?? 0],
    ['dependency_governance_rows', report.summary.by_execution_group.dependency_governance ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint', `\`${report.fingerprint_sha256}\``],
  ])}

## Lane Plan

${markdownTable(
    ['priority', 'lane', 'rows', 'group', 'write ready?', 'next action'],
    report.lane_plan.map((row) => [
      row.priority,
      row.lane,
      row.row_count,
      row.execution_group,
      row.write_ready_now,
      row.next_action,
    ]),
  )}

## Bucket Counts

${markdownTable(
    ['bucket', 'rows'],
    Object.entries(report.summary.by_action_bucket).map(([bucket, rows]) => [bucket, rows]),
  )}

## Top Sets

${markdownTable(
    ['set', 'rows'],
    Object.entries(report.summary.top_sets).map(([set, rows]) => [set, rows]),
  )}

## Boundary

- No current unresolved row is write-ready.
- No source-exhausted row should be promoted by inference.
- No generic stamped label should become canonical truth without exact named stamp evidence.
- No display/deck/product metadata row should become a child printing without a distinct physical identity source.
`;
}

async function main() {
  const queue = await readJson(QUEUE_JSON);
  const noWrite = await readJson(NO_WRITE_JSON);
  const rows = queue.rows ?? [];
  const closedKeys = new Set((noWrite.closed_rows ?? []).map(rowKey));
  const unresolvedRows = rows.filter((row) => !closedKeys.has(rowKey(row)));
  const lanePlan = buildLanePlan(unresolvedRows);
  const rowGroupByBucket = new Map(lanePlan.map((row) => [row.action_bucket, row.execution_group]));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_current_unresolved_work_plan_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    inputs: {
      next_action_queue: rel(QUEUE_JSON),
      next_action_fingerprint_sha256: queue.fingerprint_sha256,
      no_write_closure: rel(NO_WRITE_JSON),
      no_write_closure_fingerprint_sha256: noWrite.fingerprint_sha256,
    },
    summary: {
      queue_rows: rows.length,
      no_write_closed_rows: noWrite.summary?.closed_rows ?? 0,
      unresolved_rows: unresolvedRows.length,
      write_ready_now: 0,
      by_execution_group: countBy(unresolvedRows, (row) => rowGroupByBucket.get(row.action_bucket)),
      by_execution_group_lanes: countBy(lanePlan, (row) => row.execution_group),
      by_action_bucket: countBy(unresolvedRows, (row) => row.action_bucket),
      by_variant_family: countBy(unresolvedRows, (row) => row.variant_family),
      top_sets: Object.fromEntries(Object.entries(countBy(unresolvedRows, (row) => row.set_key)).slice(0, 20)),
    },
    lane_plan: lanePlan,
    unresolved_rows: unresolvedRows.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      action_bucket: row.action_bucket,
      variant_family: row.variant_family,
      recommended_action: row.recommended_action,
    })),
  };
  report.fingerprint_sha256 = sha256(stableJson({
    inputs: report.inputs,
    summary: report.summary,
    lane_plan: report.lane_plan,
    unresolved_rows: report.unresolved_rows,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
