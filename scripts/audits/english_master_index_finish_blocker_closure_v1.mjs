import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const SOURCE_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const QUEUE_JSON = 'english_master_index_remaining_finish_second_source_queue_v1.json';
const BLOCKERS_JSON = 'english_master_index_remaining_finish_blockers_v1.json';
const OUT_JSON = 'english_master_index_finish_blocker_closure_v1.json';
const OUT_MD = 'english_master_index_finish_blocker_closure_v1.md';

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    mutation_authority: false,
  };
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(SOURCE_DIR, fileName), 'utf8'));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(SOURCE_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(SOURCE_DIR, fileName), data);
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function factKey(row) {
  return [
    row.set_key,
    row.card_number,
    String(row.card_name ?? '').trim().toLowerCase(),
    row.finish_key ?? row.gap_finish_key,
  ].join('|');
}

function queueRows(queue) {
  if (Array.isArray(queue.rows)) return queue.rows;
  if (Array.isArray(queue.items)) return queue.items;
  if (Array.isArray(queue.queue)) return queue.queue;
  return [];
}

function classify({ queue, blockers, generatedAt }) {
  const rows = queueRows(queue);
  const blockersByKey = new Map((blockers.blockers ?? []).map((row) => [factKey(row), row]));
  const mapped = [];
  const unmapped = [];
  const staleBlockers = [];
  const queueKeys = new Set(rows.map(factKey));

  for (const row of rows) {
    const blocker = blockersByKey.get(factKey(row));
    if (!blocker) {
      unmapped.push(row);
      continue;
    }
    mapped.push({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      current_sources: row.current_sources ?? [],
      blocker_type: blocker.blocker_type,
      reason_not_promoted: blocker.reason_not_promoted,
      next_action: blocker.next_action,
      evidence_urls: blocker.evidence_urls ?? [],
      evidence_labels: blocker.evidence_labels ?? [],
    });
  }

  for (const blocker of blockers.blockers ?? []) {
    if (!queueKeys.has(factKey(blocker))) staleBlockers.push(blocker);
  }

  const byFinish = {};
  const byBlockerType = {};
  const bySet = {};
  for (const row of mapped) {
    addCount(byFinish, row.finish_key);
    addCount(byBlockerType, row.blocker_type);
    addCount(bySet, `${row.set_key}|${row.set_name}`);
  }

  const promotionSafeNow = 0;
  const closureStatus = unmapped.length === 0 && staleBlockers.length === 0
    ? 'closed_to_blocker_boundary'
    : 'blocker_report_drift_detected';

  return {
    generated_at: generatedAt,
    version: 'ENGLISH_MASTER_INDEX_FINISH_BLOCKER_CLOSURE_V1',
    ...safety(),
    summary: {
      closure_status: closureStatus,
      remaining_finish_second_source_needed: rows.length,
      blocker_mapped_rows: mapped.length,
      unmapped_queue_rows: unmapped.length,
      stale_blocker_rows: staleBlockers.length,
      promotion_safe_now: promotionSafeNow,
      by_finish: byFinish,
      by_blocker_type: byBlockerType,
      by_set: bySet,
      write_ready_now: 0,
    },
    rule: 'Remaining finish-second-source rows are not promotion safe. They require exact finish or number resolution before they can leave manual review.',
    mapped_blockers: mapped,
    unmapped_queue_rows: unmapped,
    stale_blocker_rows: staleBlockers,
    safety_confirmation: {
      ...safety(),
      write_ready_now: 0,
    },
  };
}

function buildMarkdown(report) {
  const mappedRows = report.mapped_blockers.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.blocker_type,
    row.reason_not_promoted,
  ]);
  const unmappedRows = report.unmapped_queue_rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
  ]);
  const staleRows = report.stale_blocker_rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.gap_finish_key,
  ]);

  return `# English Master Index Finish Blocker Closure V1

Generated: ${report.generated_at}

Audit-only report. This does not authorize database writes, cleanup, quarantine, insertion, deletion, or canonical mutation.

## Safety

${markdownTable(['check', 'value'], Object.entries(report.safety_confirmation))}

## Summary

${markdownTable(['metric', 'value'], [
    ['closure_status', report.summary.closure_status],
    ['remaining_finish_second_source_needed', report.summary.remaining_finish_second_source_needed],
    ['blocker_mapped_rows', report.summary.blocker_mapped_rows],
    ['unmapped_queue_rows', report.summary.unmapped_queue_rows],
    ['stale_blocker_rows', report.summary.stale_blocker_rows],
    ['promotion_safe_now', report.summary.promotion_safe_now],
    ['write_ready_now', report.summary.write_ready_now],
  ])}

## By Finish

${markdownTable(['finish', 'rows'], Object.entries(report.summary.by_finish))}

## By Blocker Type

${markdownTable(['blocker_type', 'rows'], Object.entries(report.summary.by_blocker_type))}

## Mapped Blockers

${mappedRows.length ? markdownTable(['set', 'number', 'card', 'finish', 'blocker', 'reason'], mappedRows) : '_No mapped blockers._'}

## Unmapped Queue Rows

${unmappedRows.length ? markdownTable(['set', 'number', 'card', 'finish'], unmappedRows) : '_None._'}

## Stale Blocker Rows

${staleRows.length ? markdownTable(['set', 'number', 'card', 'finish'], staleRows) : '_None._'}

## Rule

${report.rule}
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const queue = await readJson(QUEUE_JSON);
  const blockers = await readJson(BLOCKERS_JSON);
  const report = classify({ queue, blockers, generatedAt });
  await writeJson(OUT_JSON, report);
  await writeMarkdown(OUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.join(SOURCE_DIR, OUT_JSON),
    output_md: path.join(SOURCE_DIR, OUT_MD),
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
  if (report.summary.closure_status !== 'closed_to_blocker_boundary') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
