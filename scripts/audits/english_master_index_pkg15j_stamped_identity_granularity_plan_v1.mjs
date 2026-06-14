import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const ROUTING_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const EXHAUSTION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15g_remaining_stamped_source_exhaustion_v1.json');
const SAME_FINISH_AMBIGUOUS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const EXPANSION_CANDIDATES_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.json');
const STAMPED_POST_APPLY_JSON_FILES = [
  path.join(AUDIT_DIR, 'english_master_index_pkg15o_post_apply_reconciliation_v1.json'),
  path.join(AUDIT_DIR, 'english_master_index_pkg15p_post_apply_reconciliation_v1.json'),
  path.join(AUDIT_DIR, 'english_master_index_pkg16f_post_apply_reconciliation_v1.json'),
];
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15j_stamped_identity_granularity_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15j_stamped_identity_granularity_plan_v1.md');

const PACKAGE_ID = 'PKG-15J-STAMPED-IDENTITY-GRANULARITY-PLAN';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function appliedKey(row) {
  return [
    String(row.set_key ?? '').trim().toLowerCase(),
    String(row.card_number ?? row.source_card_number ?? '').trim().toLowerCase(),
    String(row.card_name ?? '').trim().toLowerCase(),
    String(row.target_variant_key ?? row.expanded_variant_key ?? '').trim().toLowerCase(),
    String(row.target_finish_key ?? row.finish_key ?? '').trim().toLowerCase(),
  ].join('|');
}

function classify(row) {
  if (row.readiness_status === 'ready_for_guarded_parent_identity_insert_with_dependency_awareness') {
    return 'active_finish_required_with_dependency_awareness';
  }
  if (row.readiness_status === 'ready_for_guarded_parent_identity_insert') {
    if (row.base_parent_child_finishes?.length === 1) return 'single_base_finish_write_candidate';
    return 'active_finish_required';
  }
  if (row.readiness_status === 'already_has_stamped_variant_collision') return 'existing_stamped_parent_collision_review';
  if (row.readiness_status === 'blocked_base_parent_missing') return 'base_parent_missing';
  if (row.readiness_status === 'blocked_base_parent_ambiguous') return 'base_parent_ambiguous';
  if (row.stamp_confidence === 'generic_stamped_only') return 'stamp_identity_label_needed';
  if (row.stamp_confidence === 'missing_stamp_phrase') return 'stamp_phrase_missing';
  return 'manual_review';
}

function renderMarkdown(report) {
  const bucketRows = report.buckets.map((bucket) => [
    bucket.bucket,
    bucket.rows,
    bucket.write_ready_now,
    bucket.next_action,
  ]);
  const sourceRows = Object.entries(report.source_exhaustion.by_source_family ?? {}).map(([family, count]) => [family, count]);
  const expansionRows = Object.entries(report.expansion_candidates.by_expansion_status ?? {}).map(([status, count]) => [status, count]);
  const ambiguousRows = report.same_finish_ambiguous.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.target_finish_key,
    row.recommendation,
  ]);

  return `# PKG-15J Stamped Identity Granularity Plan V1

Audit-only control plan for the remaining stamped Master Index reconciliation lane. This report intentionally separates parent identity, active child finish, and source exhaustion.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- stamped_blocker_rows: ${report.summary.stamped_blocker_rows}
- active_finish_routing_required_rows: ${report.summary.active_finish_routing_required_rows}
- single_base_finish_write_candidates: ${report.summary.single_base_finish_write_candidates}
- same_finish_ambiguous_rows: ${report.summary.same_finish_ambiguous_rows}
- exact_routable_rows: ${report.summary.exact_routable_rows}
- finish_multi_source_review_ready_rows: ${report.summary.finish_multi_source_review_ready_rows}
- finish_multi_source_applied_rows: ${report.summary.finish_multi_source_applied_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Buckets

${markdownTable(['bucket', 'rows', 'write_ready_now', 'next_action'], bucketRows)}

## Remaining Source Families

${markdownTable(['source_family', 'rows'], sourceRows)}

## Identity Expansion Candidates

${markdownTable(['expansion_status', 'rows'], expansionRows)}

## Same-Finish Ambiguous Rows

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'recommendation'], ambiguousRows)}

## Governance Rule

Stamped is a parent identity modifier, not an active child finish. No row can write until both are true:

1. The stamped parent identity is explicit enough for a stable \`variant_key\`.
2. The active child finish is proven as \`normal\`, \`holo\`, \`reverse\`, \`cosmos\`, or another active finish key.

Rows with multiple source variant labels that share the same finish remain blocked until Grookai decides whether those labels collapse into one parent identity or split into separate parent identities.
`;
}

async function main() {
  const [readiness, routing, exhaustion, sameFinishAmbiguous, expansionCandidates, stampedPostApplyReports] = await Promise.all([
    readJson(READINESS_JSON),
    readJson(ROUTING_JSON),
    readJson(EXHAUSTION_JSON),
    readJson(SAME_FINISH_AMBIGUOUS_JSON),
    readJson(EXPANSION_CANDIDATES_JSON),
    Promise.all(STAMPED_POST_APPLY_JSON_FILES.map((filePath) => readJsonIfExists(filePath, { rows: [] }))),
  ]);
  const rows = readiness.rows ?? [];
  const classifiedRows = rows.map((row) => ({ ...row, governance_bucket: classify(row) }));
  const bucketCounts = countBy(classifiedRows, (row) => row.governance_bucket);
  const bucketActions = {
    active_finish_required: 'Acquire exact active finish evidence or build a source-specific adjudication rule.',
    active_finish_required_with_dependency_awareness: 'Resolve active finish first; any later write must include dependency-aware guard checks.',
    single_base_finish_write_candidate: 'Eligible for a guarded insert-only dry-run only if package target filter remains nonzero.',
    existing_stamped_parent_collision_review: 'Compare existing stamped parent against Master Index evidence before inserting or merging anything.',
    base_parent_missing: 'Resolve missing base parent first; do not create stamped child of a missing base identity.',
    base_parent_ambiguous: 'Resolve same-number parent ambiguity first.',
    stamp_identity_label_needed: 'Acquire exact stamp identity label; generic stamped evidence is not enough.',
    stamp_phrase_missing: 'Do not use until source text contains a stamp phrase.',
    manual_review: 'Manual source review required.',
  };
  const buckets = Object.entries(bucketCounts).map(([bucket, count]) => ({
    bucket,
    rows: count,
    write_ready_now: 0,
    next_action: bucketActions[bucket] ?? 'Manual review required.',
  }));
  const appliedRows = stampedPostApplyReports.flatMap((report) => report.rows ?? [])
    .filter((row) => row.reconciliation_status === 'verified_after_apply');
  const appliedKeys = new Set(appliedRows.map(appliedKey));
  const finishMultiSourceReviewReadyRows = (expansionCandidates.rows ?? [])
    .filter((row) => String(row.expansion_status ?? '').endsWith('finish_multi_source_review_ready'))
    .filter((row) => !appliedKeys.has(appliedKey(row)))
    .length;
  const payload = {
    readiness_fingerprint: readiness.fingerprint_sha256,
    routing_fingerprint: routing.fingerprint_sha256,
    exhaustion_fingerprint: exhaustion.fingerprint_sha256,
    same_finish_ambiguous_fingerprint: sameFinishAmbiguous.fingerprint_sha256,
    expansion_candidates_fingerprint: expansionCandidates.fingerprint_sha256,
    stamped_post_apply_fingerprints: stampedPostApplyReports.map((report) => report.reconciliation_fingerprint_sha256 ?? null),
    bucketCounts,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15j_stamped_identity_granularity_plan_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_identity_readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
      stamped_finish_routing_readiness: path.relative(ROOT, ROUTING_JSON).replaceAll('\\', '/'),
      remaining_stamped_source_exhaustion: path.relative(ROOT, EXHAUSTION_JSON).replaceAll('\\', '/'),
      same_finish_ambiguous_adjudication: path.relative(ROOT, SAME_FINISH_AMBIGUOUS_JSON).replaceAll('\\', '/'),
      stamped_identity_expansion_candidates: path.relative(ROOT, EXPANSION_CANDIDATES_JSON).replaceAll('\\', '/'),
      stamped_post_apply_reconciliations: STAMPED_POST_APPLY_JSON_FILES.map((filePath) => path.relative(ROOT, filePath).replaceAll('\\', '/')),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      stamped_blocker_rows: readiness.summary?.stamped_blocker_rows ?? rows.length,
      active_finish_routing_required_rows: readiness.summary?.active_finish_routing_required_rows ?? 0,
      single_base_finish_write_candidates: readiness.summary?.pkg11a_single_base_finish_write_ready_rows ?? 0,
      same_finish_ambiguous_rows: sameFinishAmbiguous.summary?.reviewed_rows ?? 0,
      expansion_candidate_rows: expansionCandidates.summary?.expansion_candidate_rows ?? 0,
      missing_more_specific_identity_rows: expansionCandidates.summary?.missing_more_specific_identity_rows ?? 0,
      finish_multi_source_review_ready_rows: finishMultiSourceReviewReadyRows,
      finish_multi_source_applied_rows: appliedRows.length,
      exact_routable_rows: routing.summary?.exact_label_routed_rows ?? 0,
      by_governance_bucket: bucketCounts,
      by_readiness_status: readiness.summary?.by_readiness_status ?? {},
    },
    buckets,
    source_exhaustion: {
      attempted_source_lanes: exhaustion.attempted_source_lanes ?? [],
      by_source_family: exhaustion.summary?.by_source_family ?? {},
    },
    same_finish_ambiguous: {
      governance_blocker: sameFinishAmbiguous.governance_blocker,
      rows: sameFinishAmbiguous.rows ?? [],
    },
    expansion_candidates: {
      governance: expansionCandidates.governance,
      by_expansion_status: expansionCandidates.summary?.by_expansion_status ?? {},
      by_expanded_variant_key: expansionCandidates.summary?.by_expanded_variant_key ?? {},
      applied_rows: appliedRows,
      rows: expansionCandidates.rows ?? [],
    },
    rows: classifiedRows.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      stamp_label: row.stamp_label,
      stamp_confidence: row.stamp_confidence,
      base_parent_child_finishes: row.base_parent_child_finishes,
      readiness_status: row.readiness_status,
      governance_bucket: row.governance_bucket,
      blockers: row.blockers,
    })),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    stamped_blocker_rows: report.summary.stamped_blocker_rows,
    write_ready_now: report.write_ready_now,
    finish_multi_source_review_ready_rows: report.summary.finish_multi_source_review_ready_rows,
    finish_multi_source_applied_rows: report.summary.finish_multi_source_applied_rows,
    by_governance_bucket: report.summary.by_governance_bucket,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
