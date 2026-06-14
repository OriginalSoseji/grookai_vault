import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const INPUT_JSON = path.join(MASTER_DIR, 'english_master_index_sv03_stamped_taxonomy_review_v1.json');

const OUT_BASENAME = 'english_master_index_sv03_stamped_active_finish_closure_queue_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

function classify(row) {
  const activeObservations = row.alternate_active_finish_observations ?? [];
  if (activeObservations.length > 0) {
    const activeFinishes = [...new Set(activeObservations.map((item) => item.finish_key).filter(Boolean))].sort();
    return {
      ...row,
      closure_lane: 'active_finish_observed_identity_still_required',
      proposed_active_finish_keys: activeFinishes,
      next_action: 'Find exact independent stamped identity evidence for this card, then prepare guarded dry-run only if active finish and stamped identity both remain non-conflicting.',
      write_ready_now: 0,
    };
  }
  return {
    ...row,
    closure_lane: 'active_finish_source_acquisition_required',
    proposed_active_finish_keys: [],
    next_action: 'Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules.',
    write_ready_now: 0,
  };
}

function buildLanes(rows) {
  const byLane = countBy(rows, (row) => row.closure_lane);
  return [
    {
      lane_id: 'SV03-STAMPED-ACTIVE-FINISH-OBSERVED-IDENTITY-REVIEW',
      target_rows: byLane.active_finish_observed_identity_still_required ?? 0,
      lane_type: 'manual_identity_source_review',
      write_ready_now: 0,
      safety: 'audit_only',
      rule: 'Active finish observation is not enough. The stamped identity still needs exact independent evidence before any DB package.',
    },
    {
      lane_id: 'SV03-STAMPED-ACTIVE-FINISH-SOURCE-ACQUISITION',
      target_rows: byLane.active_finish_source_acquisition_required ?? 0,
      lane_type: 'source_acquisition',
      write_ready_now: 0,
      safety: 'audit_only',
      rule: 'Search only exact sources proving set, number, card name, stamp identity, and active finish. Ambiguous title evidence remains blocked.',
    },
  ].filter((lane) => lane.target_rows > 0);
}

function buildMarkdown(report) {
  const laneRows = report.lanes.map((lane) => [
    lane.lane_id,
    lane.target_rows,
    lane.lane_type,
    lane.safety,
    lane.rule,
  ]);
  const rowTable = report.rows.map((row) => [
    row.card_number,
    row.card_name,
    row.closure_lane,
    row.proposed_active_finish_keys.join(', '),
    row.current_sources.join(', '),
    row.next_action,
  ]);

  return `# English Master Index SV03 Stamped Active Finish Closure Queue V1

Generated: ${report.generated_at}

Audit-only queue. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

${markdownTable(['check', 'value'], Object.entries(report.safety_confirmation))}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['promotion_safe_now', report.summary.promotion_safe_now],
    ['rows_with_active_finish_observation', report.summary.rows_with_active_finish_observation],
    ['rows_requiring_active_finish_acquisition', report.summary.rows_requiring_active_finish_acquisition],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Closure Lanes

${markdownTable(['lane', 'rows', 'type', 'safety', 'rule'], laneRows)}

## Rows

${markdownTable(['number', 'card', 'closure_lane', 'proposed_active_finish', 'current_sources', 'next_action'], rowTable)}

## Non-Negotiable Rule

No row in this queue may become child \`finish_key=stamped\`. The only safe shape is stamped parent identity plus an active child finish proven by exact evidence.
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.rows ?? []).map(classify);
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    closure_lane: row.closure_lane,
    proposed_active_finish_keys: row.proposed_active_finish_keys,
  }));
  const report = {
    version: OUT_BASENAME,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
    write_ready_now: 0,
    promotion_safe_now: 0,
    source_artifact: INPUT_JSON.replaceAll('\\', '/'),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      write_ready_now: 0,
      promotion_safe_now: 0,
      rows_with_active_finish_observation: rows.filter((row) => row.closure_lane === 'active_finish_observed_identity_still_required').length,
      rows_requiring_active_finish_acquisition: rows.filter((row) => row.closure_lane === 'active_finish_source_acquisition_required').length,
      by_closure_lane: countBy(rows, (row) => row.closure_lane),
      by_proposed_active_finish: countBy(rows.flatMap((row) => row.proposed_active_finish_keys), (finish) => finish),
    },
    lanes: buildLanes(rows),
    rows,
    safety_confirmation: {
      audit_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };

  const markdown = buildMarkdown(report);
  await fs.mkdir(MASTER_DIR, { recursive: true });
  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, markdown);
  await fs.writeFile(MIRROR_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MIRROR_MD, markdown);
  console.log(JSON.stringify({
    output_json: OUT_JSON,
    mirror_json: MIRROR_JSON,
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
