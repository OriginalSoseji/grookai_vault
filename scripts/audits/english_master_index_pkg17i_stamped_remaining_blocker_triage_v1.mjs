import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_EXHAUSTION_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');

const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const PKG17B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json');
const PKG17D_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1.json');
const PKG17H_JSON = path.join(
  SOURCE_EXHAUSTION_DIR,
  'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1',
  'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1.json',
);

const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1.md');
const PACKAGE_ID = 'PKG-17I-STAMPED-REMAINING-BLOCKER-TRIAGE';

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

function topEntries(counts, limit = 15) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function rowsForStatus(pkg17a, status) {
  return (pkg17a.rows ?? []).filter((row) => row.queue_status === status);
}

function buildDecisionBuckets(pkg17a, pkg17b, pkg17d, pkg17h) {
  const queueRows = pkg17a.rows ?? [];
  const activeFinishRows = rowsForStatus(pkg17a, 'active_finish_required');
  const dependencyAwareRows = rowsForStatus(pkg17a, 'active_finish_required_with_dependency_awareness');
  const stampLabelRows = rowsForStatus(pkg17a, 'stamp_identity_label_needed');
  const secondSourceRows = rowsForStatus(pkg17a, 'blocked_second_independent_source_needed');
  const conflictRows = rowsForStatus(pkg17a, 'blocked_conflicting_finish_observation');
  const battleAcademyRows = rowsForStatus(pkg17a, 'blocked_battle_academy_display_metadata_strategy');
  const collisionRows = rowsForStatus(pkg17a, 'existing_stamped_parent_collision_review');
  const parentRows = [
    ...rowsForStatus(pkg17a, 'base_parent_missing'),
    ...rowsForStatus(pkg17a, 'base_parent_ambiguous'),
  ];

  return [
    {
      bucket_id: 'active_finish_required',
      rows: activeFinishRows.length,
      current_result: 'blocked_after_source_attempt',
      write_ready_now: 0,
      evidence_status: `${pkg17b.summary?.source_lanes_attempted ?? 0} source lanes attempted; ${pkg17b.summary?.useful_current_gap_matches ?? 0} useful current-gap matches.`,
      top_sets: topEntries(countBy(activeFinishRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(activeFinishRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Continue with new source families or variant-specific adjudication. Do not write active-finish rows from the exhausted source lanes.',
    },
    {
      bucket_id: 'active_finish_required_with_dependency_awareness',
      rows: dependencyAwareRows.length,
      current_result: 'blocked_until_dependency_aware_finish_evidence',
      write_ready_now: 0,
      evidence_status: 'Requires exact active finish evidence and a dependency-aware package.',
      top_sets: topEntries(countBy(dependencyAwareRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(dependencyAwareRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Keep separate from bulk stamped packages; prepare only after exact evidence and dependency map exist.',
    },
    {
      bucket_id: 'prize_pack_active_finish_current_queue',
      rows: pkg17h.summary?.target_rows ?? 0,
      current_result: 'blocked_after_prize_pack_attempt',
      write_ready_now: 0,
      evidence_status: `${pkg17h.summary?.ready_two_source_exact_active_finish ?? 0} two-source exact rows; ${pkg17h.summary?.blocked_conflicting_finish_evidence ?? 0} conflicting rows; ${pkg17h.summary?.review_only_single_source_family ?? 0} single-source-family rows.`,
      top_sets: topEntries(countBy(pkg17h.rows ?? [], (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(pkg17h.rows ?? [], (row) => row.acquisition_status), 10),
      recommended_next_action: 'Do not infer from Prize Pack product family. Build a product-series rule only if it can distinguish Standard Set from Standard Set Foil at card level.',
    },
    {
      bucket_id: 'stamp_identity_label_needed',
      rows: stampLabelRows.length,
      current_result: 'source_label_needed',
      write_ready_now: 0,
      evidence_status: 'Current evidence says stamped but does not prove exact stamp label or deterministic variant key.',
      top_sets: topEntries(countBy(stampLabelRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(stampLabelRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Attack with exact checklist/product pages that name the stamp label; generic stamped claims remain blocked.',
    },
    {
      bucket_id: 'base_parent_resolution',
      rows: parentRows.length,
      current_result: 'no_insert_candidates_after_live_db_read',
      write_ready_now: 0,
      evidence_status: `${pkg17d.summary?.insert_dry_run_candidates ?? 0} parent insert candidates; ${pkg17d.summary?.stale_or_return_to_stamped_readiness ?? 0} stale/return rows; ${pkg17d.summary?.blocked_rows ?? 0} blocked rows.`,
      top_sets: topEntries(countBy(pkg17d.rows ?? [], (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(pkg17d.rows ?? [], (row) => row.readiness_status), 10),
      recommended_next_action: 'Regenerate queue after recent writes and route stale rows back through stamped readiness before preparing any parent package.',
    },
    {
      bucket_id: 'existing_stamped_parent_collision_review',
      rows: collisionRows.length,
      current_result: 'manual_collision_review_required',
      write_ready_now: 0,
      evidence_status: 'Existing stamped parent collision must be checked for already-closed identity or child finish gaps.',
      top_sets: topEntries(countBy(collisionRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(collisionRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Build a read-only collision closure report before any dependency transfer, delete, or child insert package.',
    },
    {
      bucket_id: 'blocked_second_independent_source_needed',
      rows: secondSourceRows.length,
      current_result: 'single_source_only',
      write_ready_now: 0,
      evidence_status: 'One exact source exists, but source law requires independent confirmation before promotion.',
      top_sets: topEntries(countBy(secondSourceRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(secondSourceRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Target rows individually with independent checklist/product evidence. Do not bulk promote from one source family.',
    },
    {
      bucket_id: 'blocked_conflicting_finish_observation',
      rows: conflictRows.length,
      current_result: 'conflict_blocked',
      write_ready_now: 0,
      evidence_status: 'Source observations contradict the active finish.',
      top_sets: topEntries(countBy(conflictRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(conflictRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Adjudicate conflicts manually; fail closed until resolved.',
    },
    {
      bucket_id: 'blocked_battle_academy_display_metadata_strategy',
      rows: battleAcademyRows.length,
      current_result: 'governance_blocked',
      write_ready_now: 0,
      evidence_status: 'Battle Academy markings are likely display/deck metadata, not canonical finish truth.',
      top_sets: topEntries(countBy(battleAcademyRows, (row) => row.set_key), 10),
      top_variant_keys: topEntries(countBy(battleAcademyRows, (row) => row.variant_key), 10),
      recommended_next_action: 'Define display metadata strategy outside card_printings finish truth.',
    },
  ].filter((bucket) => bucket.rows > 0);
}

function buildNextWorkPlan(decisionBuckets) {
  return [
    {
      priority: 1,
      package_id: 'PKG-17I1-STAMPED-COLLISION-CLOSURE-READINESS',
      action_type: 'read_only_readiness',
      target_bucket: 'existing_stamped_parent_collision_review',
      reason: 'Smallest unresolved structural bucket; can often close rows by proving existing stamped parents already have the right identity/child finish.',
      write_authorized: false,
    },
    {
      priority: 2,
      package_id: 'PKG-17I2-STAMP-LABEL-SOURCE-ACQUISITION',
      action_type: 'audit_only_source_acquisition',
      target_bucket: 'stamp_identity_label_needed',
      reason: 'Largest non-finish-source bucket; exact stamp labels unlock deterministic parent identity.',
      write_authorized: false,
    },
    {
      priority: 3,
      package_id: 'PKG-17I3-ACTIVE-FINISH-VARIANT-SOURCE-PLAN',
      action_type: 'audit_only_source_acquisition',
      target_bucket: 'active_finish_required',
      reason: 'Current broad source lanes are exhausted; remaining work needs variant-family-specific evidence.',
      write_authorized: false,
    },
    {
      priority: 4,
      package_id: 'PKG-17I4-PRIZE-PACK-PRODUCT-RULE-ADJUDICATION',
      action_type: 'manual_governance',
      target_bucket: 'prize_pack_active_finish_current_queue',
      reason: 'Prize Pack evidence currently shows single-source-family and conflicting Standard Set versus Standard Set Foil observations.',
      write_authorized: false,
    },
  ].filter((step) => decisionBuckets.some((bucket) => bucket.bucket_id === step.target_bucket));
}

function renderMarkdown(report) {
  const bucketRows = report.decision_buckets.map((bucket) => [
    bucket.bucket_id,
    bucket.rows,
    bucket.current_result,
    bucket.write_ready_now,
    bucket.evidence_status,
    bucket.recommended_next_action,
  ]);
  const nextRows = report.next_work_plan.map((step) => [
    step.priority,
    step.package_id,
    step.action_type,
    step.target_bucket,
    step.reason,
  ]);
  const statusRows = Object.entries(report.summary.current_queue_by_status).map(([status, count]) => [status, count]);

  return `# PKG-17I Stamped Remaining Blocker Triage V1

This is an audit-only consolidation of the remaining stamped blocker work after the PKG-17E write lane closed.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}
- global_apply_performed: ${report.global_apply_performed}

## Summary

- queue_rows: ${report.summary.queue_rows}
- decision_buckets: ${report.summary.decision_bucket_count}
- decision_bucket_memberships: ${report.summary.decision_bucket_memberships}
- immediate_write_ready_rows: ${report.summary.immediate_write_ready_rows}
- stamped_finish_key_rows_allowed: ${report.summary.stamped_finish_key_rows_allowed}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Current Queue Status

${markdownTable(['queue_status', 'rows'], statusRows)}

## Decision Buckets

${markdownTable(['bucket', 'rows', 'result', 'write ready', 'evidence status', 'recommended next action'], bucketRows)}

## Next Work Plan

${markdownTable(['priority', 'package', 'type', 'target bucket', 'reason'], nextRows)}

## Guardrails

- No rows in this report are approved for apply.
- Do not create child rows with \`finish_key=stamped\`.
- Do not infer active finishes from product families.
- Do not promote single-source or conflicting stamped evidence.
- Any future write package still needs its own readiness artifact, guarded dry-run proof, fingerprint, and explicit approval.
`;
}

async function main() {
  const [pkg17a, pkg17b, pkg17d, pkg17h] = await Promise.all([
    readJson(PKG17A_JSON),
    readJson(PKG17B_JSON),
    readJson(PKG17D_JSON),
    readJson(PKG17H_JSON),
  ]);

  const decisionBuckets = buildDecisionBuckets(pkg17a, pkg17b, pkg17d, pkg17h);
  const nextWorkPlan = buildNextWorkPlan(decisionBuckets);
  const payload = {
    pkg17a_fingerprint: pkg17a.fingerprint_sha256,
    pkg17b_fingerprint: pkg17b.fingerprint_sha256,
    pkg17d_fingerprint: pkg17d.fingerprint_sha256,
    pkg17h_fingerprint: pkg17h.fingerprint_sha256,
    decisionBuckets,
    nextWorkPlan,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1',
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
      stamped_remaining_action_queue: rel(PKG17A_JSON),
      active_finish_source_acquisition: rel(PKG17B_JSON),
      base_parent_resolution_readiness: rel(PKG17D_JSON),
      prize_pack_current_queue_acquisition: rel(PKG17H_JSON),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      queue_rows: pkg17a.summary?.queue_rows ?? (pkg17a.rows ?? []).length,
      current_queue_by_status: pkg17a.summary?.by_queue_status ?? countBy(pkg17a.rows ?? [], (row) => row.queue_status),
      decision_bucket_count: decisionBuckets.length,
      decision_bucket_memberships: decisionBuckets.reduce((sum, bucket) => sum + bucket.rows, 0),
      decision_bucket_memberships_note: 'Decision buckets include sub-analyses such as Prize Pack current queue, so memberships can exceed unique queue rows.',
      immediate_write_ready_rows: 0,
      stamped_finish_key_rows_allowed: 0,
      current_source_attempts: {
        pkg17b_useful_current_gap_matches: pkg17b.summary?.useful_current_gap_matches ?? 0,
        pkg17b_useful_unabsorbed_source_lanes: pkg17b.summary?.source_delta_summary?.useful_unabsorbed_source_lanes ?? 0,
        pkg17h_ready_two_source_exact_active_finish: pkg17h.summary?.ready_two_source_exact_active_finish ?? 0,
        pkg17d_insert_dry_run_candidates: pkg17d.summary?.insert_dry_run_candidates ?? 0,
      },
    },
    decision_buckets: decisionBuckets,
    next_work_plan: nextWorkPlan,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    next_work_plan: report.next_work_plan,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
