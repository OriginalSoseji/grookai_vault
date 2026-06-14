import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG15J_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15j_stamped_identity_granularity_plan_v1.json');
const PKG16B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1.json');
const PKG17I1_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i1_stamped_collision_closure_readiness_v1.json');
const PKG17J_POST_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17j_pricecharting_stamped_parent_identity_post_apply_reconciliation_v1.json');
const PKG17N_POST_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17n_skarmory_league_reverse_post_apply_reconciliation_v1.json');
const PKG17R_POST_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17r_league_reverse_bulk_post_apply_reconciliation_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.md');

const PACKAGE_ID = 'PKG-17A-STAMPED-REMAINING-ACTION-QUEUE';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

function collisionClosureKey(row) {
  return [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key ?? row.variant_key ?? row.target_variant_key,
  ].map((value) => String(value ?? '').toLowerCase()).join('|');
}

function closedCollisionKeys(pkg17i1) {
  const keys = new Set();
  for (const row of pkg17i1?.rows ?? []) {
    if (row.closure_status === 'closed_existing_stamped_parent_has_identity_and_active_child_finish') {
      keys.add(collisionClosureKey(row));
    }
  }
  return keys;
}

function verifiedPostApplyKeys(postApplyReports) {
  const keys = new Set();
  for (const report of postApplyReports) {
    for (const row of report?.rows ?? []) {
      if (row.reconciliation_status === 'verified_applied') {
        keys.add(collisionClosureKey(row));
        keys.add(collisionClosureKey({ ...row, proposed_variant_key: null, variant_key: null, target_variant_key: null }));
      }
    }
  }
  return keys;
}

function queueRowsFromPkg15J(pkg15j, pkg17i1, postApplyReports = []) {
  const closedKeys = closedCollisionKeys(pkg17i1);
  const appliedKeys = verifiedPostApplyKeys(postApplyReports);
  return (pkg15j.rows ?? [])
    .filter((row) => !(
      row.governance_bucket === 'existing_stamped_parent_collision_review'
      && closedKeys.has(collisionClosureKey(row))
    ))
    .filter((row) => !appliedKeys.has(collisionClosureKey(row)))
    .map((row) => ({
    source_report: 'PKG-15J',
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    finish_key: Array.isArray(row.base_parent_child_finishes) && row.base_parent_child_finishes.length === 1
      ? row.base_parent_child_finishes[0]
      : null,
    queue_status: row.governance_bucket,
    blockers: row.blockers ?? [],
    recommended_next_action: actionForPkg15J(row.governance_bucket),
    write_ready_now: 0,
  }));
}

function queueRowsFromPkg16B(pkg16b) {
  return (pkg16b.rows ?? []).filter((row) => row.status !== 'already_applied_verified').map((row) => ({
    source_report: 'PKG-16B',
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_key: row.finish_key,
    queue_status: row.status,
    blockers: blockersForPkg16B(row.status),
    source_count: row.source_count,
    source_urls: (row.source_rows ?? []).map((sourceRow) => sourceRow.source_url).filter(Boolean),
    conflict_urls: (row.conflict_rows ?? []).map((sourceRow) => sourceRow.source_url).filter(Boolean),
    recommended_next_action: actionForPkg16B(row.status),
    write_ready_now: 0,
  }));
}

function actionForPkg15J(status) {
  switch (status) {
    case 'active_finish_required':
      return 'Acquire exact active child finish evidence before parent identity insertion.';
    case 'active_finish_required_with_dependency_awareness':
      return 'Acquire exact active finish evidence, then use dependency-aware guarded dry-run only.';
    case 'stamp_identity_label_needed':
      return 'Acquire exact stamp label; generic stamped evidence remains blocked.';
    case 'base_parent_missing':
      return 'Resolve or insert the unstamped base parent first in a separate guarded package.';
    case 'base_parent_ambiguous':
      return 'Resolve parent identity ambiguity before any stamped package.';
    default:
      return 'Manual governance review required.';
  }
}

function actionForPkg16B(status) {
  switch (status) {
    case 'blocked_second_independent_source_needed':
      return 'Find a second independent exact source for the same set, card number, card name, variant label, and finish.';
    case 'blocked_conflicting_finish_observation':
      return 'Adjudicate conflicting source labels; do not write until conflict is resolved.';
    case 'blocked_battle_academy_display_metadata_strategy':
      return 'Define display metadata strategy; do not create canonical stamped child finish rows.';
    default:
      return 'Manual governance review required.';
  }
}

function blockersForPkg16B(status) {
  switch (status) {
    case 'blocked_second_independent_source_needed':
      return ['second_independent_source_needed'];
    case 'blocked_conflicting_finish_observation':
      return ['conflicting_finish_observation'];
    case 'blocked_battle_academy_display_metadata_strategy':
      return ['display_metadata_strategy_required'];
    default:
      return ['manual_review'];
  }
}

function buildLanes(pkg15j, pkg16b, queueRows) {
  const byStatus = countBy(queueRows, (row) => row.queue_status);
  return [
    {
      lane_id: 'PKG-17B-STAMPED-ACTIVE-FINISH-SOURCE-ACQUISITION',
      lane_type: 'source_acquisition',
      priority: 1,
      target_rows: byStatus.active_finish_required ?? 0,
      write_ready_now: 0,
      safety: 'audit_only',
      recommended_action: 'Bulk collect exact active child finish evidence for rows that already have a stamped identity candidate but cannot safely choose normal/holo/reverse/cosmos yet.',
    },
    {
      lane_id: 'PKG-17C-STAMPED-SECOND-SOURCE-SAME-FINISH-SPLITS',
      lane_type: 'source_acquisition',
      priority: 2,
      target_rows: pkg16b.summary?.second_source_needed ?? 0,
      write_ready_now: 0,
      safety: 'audit_only_until_second_source_found',
      recommended_action: 'Target the remaining same-finish split rows that already have one exact source and need one independent confirming source.',
    },
    {
      lane_id: 'PKG-17D-STAMPED-BASE-PARENT-RESOLUTION',
      lane_type: 'readiness_planning',
      priority: 3,
      target_rows: (byStatus.base_parent_missing ?? 0) + (byStatus.base_parent_ambiguous ?? 0),
      write_ready_now: 0,
      safety: 'separate_guarded_parent_package_required',
      recommended_action: 'Resolve missing or ambiguous base parents before any stamped child identity work.',
    },
    {
      lane_id: 'PKG-17E-STAMPED-IDENTITY-LABEL-ACQUISITION',
      lane_type: 'source_acquisition',
      priority: 4,
      target_rows: byStatus.stamp_identity_label_needed ?? 0,
      write_ready_now: 0,
      safety: 'audit_only',
      recommended_action: 'Replace generic stamped evidence with exact stamp labels and deterministic variant keys.',
    },
    {
      lane_id: 'PKG-17F-STAMPED-CONFLICT-ADJUDICATION',
      lane_type: 'manual_review',
      priority: 5,
      target_rows: pkg16b.summary?.conflict_blocked ?? 0,
      write_ready_now: 0,
      safety: 'blocked_until_conflict_resolved',
      recommended_action: 'Review contradictory source observations and keep them out of apply packages until adjudicated.',
    },
    {
      lane_id: 'PKG-17G-BATTLE-ACADEMY-DISPLAY-METADATA-STRATEGY',
      lane_type: 'governance',
      priority: 6,
      target_rows: pkg16b.summary?.metadata_strategy_blocked ?? 0,
      write_ready_now: 0,
      safety: 'not_canonical_finish_work',
      recommended_action: 'Keep Battle Academy deck marks out of canonical stamped finish rows; define display metadata separately.',
    },
  ].filter((lane) => lane.target_rows > 0);
}

function renderMarkdown(report) {
  const laneRows = report.next_lanes.map((lane) => [
    lane.priority,
    lane.lane_id,
    lane.target_rows,
    lane.lane_type,
    lane.safety,
    lane.recommended_action,
  ]);
  const statusRows = Object.entries(report.summary.by_queue_status).map(([status, count]) => [status, count]);
  const setRows = report.summary.top_sets.map((row) => [row.key, row.count]);
  const variantRows = report.summary.top_variant_keys.map((row) => [row.key, row.count]);

  return `# PKG-17A Stamped Remaining Action Queue V1

Audit-only queue for the remaining stamped reconciliation work after PKG-15O, PKG-15P, and PKG-16F post-apply reconciliation.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- queue_rows: ${report.summary.queue_rows}
- source_acquisition_rows: ${report.summary.source_acquisition_rows}
- parent_resolution_rows: ${report.summary.parent_resolution_rows}
- conflict_rows: ${report.summary.conflict_rows}
- governance_rows: ${report.summary.governance_rows}
- already_applied_verified_stamped_rows: ${report.summary.already_applied_verified_stamped_rows}
- closed_existing_stamped_collision_rows_excluded: ${report.summary.closed_existing_stamped_collision_rows_excluded}
- verified_post_apply_rows_excluded: ${report.summary.verified_post_apply_rows_excluded}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Status Counts

${markdownTable(['queue_status', 'rows'], statusRows)}

## Next Lanes

${markdownTable(['priority', 'lane_id', 'target rows', 'type', 'safety', 'recommended action'], laneRows)}

## Top Sets

${markdownTable(['set', 'rows'], setRows)}

## Top Variant Keys

${markdownTable(['variant_key', 'rows'], variantRows)}

## Non-Negotiable Rules

- Do not create child finish_key=stamped.
- Do not collapse exact stamp labels into generic stamped identity.
- Do not write rows from this queue without a separate readiness package, rollback-only dry-run, fingerprint, and explicit approval.
- Conflicting and single-source rows remain blocked.
`;
}

async function main() {
  const [pkg15j, pkg16b, pkg17i1, pkg17jPostApply, pkg17nPostApply, pkg17rPostApply] = await Promise.all([
    readJson(PKG15J_JSON),
    readJson(PKG16B_JSON),
    readJsonIfExists(PKG17I1_JSON),
    readJsonIfExists(PKG17J_POST_APPLY_JSON),
    readJsonIfExists(PKG17N_POST_APPLY_JSON),
    readJsonIfExists(PKG17R_POST_APPLY_JSON),
  ]);
  const closedStampedCollisionRows = closedCollisionKeys(pkg17i1).size;
  const postApplyReports = [pkg17jPostApply, pkg17nPostApply, pkg17rPostApply];
  const verifiedPostApplyRowsExcluded = verifiedPostApplyKeys(postApplyReports).size;
  const pkg15jRows = queueRowsFromPkg15J(pkg15j, pkg17i1, postApplyReports);
  const pkg16bRows = queueRowsFromPkg16B(pkg16b);
  const queueRows = [...pkg15jRows, ...pkg16bRows];
  const byQueueStatus = countBy(queueRows, (row) => row.queue_status);
  const nextLanes = buildLanes(pkg15j, pkg16b, queueRows);
  const payload = {
    pkg15j_fingerprint: pkg15j.fingerprint_sha256,
    pkg16b_fingerprint: pkg16b.fingerprint_sha256,
    pkg17i1_fingerprint: pkg17i1?.fingerprint_sha256 ?? null,
    pkg17j_post_apply_fingerprint: pkg17jPostApply?.fingerprint_sha256 ?? null,
    pkg17n_post_apply_fingerprint: pkg17nPostApply?.fingerprint_sha256 ?? null,
    pkg17r_post_apply_fingerprint: pkg17rPostApply?.fingerprint_sha256 ?? null,
    closedStampedCollisionRows,
    verifiedPostApplyRowsExcluded,
    byQueueStatus,
    nextLanes,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17a_stamped_remaining_action_queue_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_identity_granularity_plan: path.relative(ROOT, PKG15J_JSON).replaceAll('\\', '/'),
      same_finish_stamped_split_readiness: path.relative(ROOT, PKG16B_JSON).replaceAll('\\', '/'),
      stamped_collision_closure_readiness: pkg17i1 ? path.relative(ROOT, PKG17I1_JSON).replaceAll('\\', '/') : null,
      pkg17j_post_apply_reconciliation: pkg17jPostApply ? path.relative(ROOT, PKG17J_POST_APPLY_JSON).replaceAll('\\', '/') : null,
      pkg17n_post_apply_reconciliation: pkg17nPostApply ? path.relative(ROOT, PKG17N_POST_APPLY_JSON).replaceAll('\\', '/') : null,
      pkg17r_post_apply_reconciliation: pkg17rPostApply ? path.relative(ROOT, PKG17R_POST_APPLY_JSON).replaceAll('\\', '/') : null,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      queue_rows: queueRows.length,
      source_acquisition_rows: (byQueueStatus.active_finish_required ?? 0)
        + (byQueueStatus.stamp_identity_label_needed ?? 0)
        + (byQueueStatus.blocked_second_independent_source_needed ?? 0),
      parent_resolution_rows: (byQueueStatus.base_parent_missing ?? 0) + (byQueueStatus.base_parent_ambiguous ?? 0),
      conflict_rows: byQueueStatus.blocked_conflicting_finish_observation ?? 0,
      governance_rows: byQueueStatus.blocked_battle_academy_display_metadata_strategy ?? 0,
      already_applied_verified_stamped_rows: pkg15j.summary?.finish_multi_source_applied_rows ?? 0,
      closed_existing_stamped_collision_rows_excluded: closedStampedCollisionRows,
      verified_post_apply_rows_excluded: verifiedPostApplyRowsExcluded,
      by_queue_status: byQueueStatus,
      top_sets: topEntries(countBy(queueRows, (row) => row.set_key)),
      top_variant_keys: topEntries(countBy(queueRows, (row) => row.variant_key)),
    },
    next_lanes: nextLanes,
    rows: queueRows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    next_lane: report.next_lanes[0] ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
