import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const COMPLETION_DIR = path.join('docs', 'audits', 'english_master_index_completion_v1');
const GENERATED_FILES = [
  'english_master_index_write_readiness_v1.json',
  'english_master_index_write_readiness_v1.md',
  'english_master_index_no_write_execution_plan_v1.json',
  'english_master_index_no_write_execution_plan_v1.md',
  'english_master_index_audit_closure_v1.json',
  'english_master_index_audit_closure_v1.md',
];

function valueAt(object, pathParts, fallback = null) {
  let current = object;
  for (const part of pathParts) {
    if (current == null || !(part in current)) return fallback;
    current = current[part];
  }
  return current ?? fallback;
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 30) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function readCompletionJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(COMPLETION_DIR, fileName), 'utf8'));
}

async function readOptionalJson(fileName, fallback) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

function safetyBlock() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    privileged_writes_used: false,
  };
}

function buildGlobalBuckets({ completion, completionSourceGap, adjudicatedExcluded, grookaiAudit, setUnmapped, provenance, recoveryLanes, exactMatch, sourceAcquisition, readiness, repairPriority, finishBlockerClosure }) {
  const statusCounts = grookaiAudit.summary?.by_status ?? {};
  const completionGapCount = completion.summary?.source_gap_queue_items ?? completionSourceGap.summary?.total_queue_items ?? 0;
  const completionFinishBlockers = completion.summary?.finish_blocker_boundary_facts ?? 0;
  const adjudicatedExcludedCount = completion.summary?.adjudicated_excluded_printing_facts ?? adjudicatedExcluded.summary?.excluded_printing_facts ?? 0;
  return [
    {
      bucket: 'completed_master_index',
      row_count: completion.summary?.master_admissible_printing_facts ?? 0,
      status: completionGapCount === 0 ? 'complete_master_index_reference' : 'completion_gap_remaining',
      mutation_ready: false,
      reason: 'The English Master Index is complete as reference truth, but reference completion is not DB write authority.',
      next_action: 'Use this as the target for row-level dry-run write packages only.',
      detail: {
        complete_master_index_sets: completion.summary?.complete_master_index_sets ?? null,
        source_gap_queue_items: completionGapCount,
        adjudicated_excluded_printing_facts: adjudicatedExcludedCount,
      },
    },
    {
      bucket: 'master_verified_monitor_only',
      row_count: statusCounts.master_verified_by_index ?? 0,
      status: 'proven_monitor_only',
      mutation_ready: false,
      reason: 'Already verified by the current index. Monitor only unless a future drift audit finds divergence.',
      next_action: 'Keep Ascended Heroes proof loop as the reference pattern.',
    },
    {
      bucket: 'api_agreed_by_index',
      row_count: statusCounts.api_agreed_by_index ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'API agreement is not master truth for finish/printing rows.',
      next_action: 'Acquire human-readable/checklist evidence before controlled normalization.',
    },
    {
      bucket: 'candidate_unconfirmed_by_index',
      row_count: statusCounts.candidate_unconfirmed_by_index ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'Single-source evidence is not canonical truth.',
      next_action: 'Acquire independent second-source evidence.',
    },
    {
      bucket: 'unsupported_by_current_index',
      row_count: statusCounts.unsupported_by_current_index ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'Unsupported by current index is not deletion authority.',
      next_action: 'Run set-level proof loops with master_verified evidence before any cleanup proposal.',
    },
    {
      bucket: 'missing_from_grookai',
      row_count: statusCounts.missing_from_grookai ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'Missing from Grookai is not insertion authority.',
      next_action: 'Only master_verified rows may enter a future controlled insertion plan.',
    },
    {
      bucket: 'name_mismatch_needs_review',
      row_count: statusCounts.name_mismatch_needs_review ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'Name mismatch is not identity rewrite authority.',
      next_action: 'Resolve exact source card identity and alias policy first.',
    },
    {
      bucket: 'set_unmapped_total',
      row_count: setUnmapped.summary?.total_set_unmapped ?? statusCounts.set_unmapped ?? 0,
      status: 'blocked',
      mutation_ready: false,
      reason: 'Unmapped set rows cannot be normalized safely without source identity.',
      next_action: 'Use provenance recovery lanes before any repair design.',
    },
    {
      bucket: 'missing_set_code_physical_candidates',
      row_count: recoveryLanes.summary?.by_lane?.physical_tcg_alias_recovery_candidate ?? 0,
      printing_rows: exactMatch.summary?.candidate_printing_rows ?? null,
      status: 'partially_ready_for_dry_run_design',
      mutation_ready: false,
      reason: 'A master-verified subset exists, but the overall physical recovery lane still contains identity and finish-blocked rows.',
      next_action: 'Design a dry-run package for the master-verified subset only; keep blocked remainder out.',
      detail: {
        all_finishes_master_verified_by_index: exactMatch.summary?.by_finish_match_status?.all_finishes_master_verified_by_index ?? 0,
        master_verified_printing_rows: exactMatch.summary?.printing_rows_by_finish_status?.all_finishes_master_verified_by_index ?? 0,
        blocked_until_card_identity_match: exactMatch.summary?.by_finish_match_status?.blocked_until_card_identity_match ?? 0,
        partial_finishes_supported_by_index: exactMatch.summary?.by_finish_match_status?.partial_finishes_supported_by_index ?? 0,
        no_finishes_supported_by_index: exactMatch.summary?.by_finish_match_status?.no_finishes_supported_by_index ?? 0,
      },
    },
    {
      bucket: 'missing_set_code_pocket_scope_candidates',
      row_count: recoveryLanes.summary?.by_lane?.pocket_scope_exclusion_candidate ?? 0,
      status: 'scope_decision_required',
      mutation_ready: false,
      reason: 'Pocket/digital aliases are outside English physical TCG scope.',
      next_action: 'Make explicit product-scope decision before any isolation/quarantine proposal.',
    },
    {
      bucket: 'missing_set_code_marketplace_lookup_required',
      row_count: recoveryLanes.summary?.by_lane?.marketplace_id_lookup_required ?? 0,
      status: 'manual_lookup_required',
      mutation_ready: false,
      reason: 'Marketplace IDs require source URL resolution and second-source confirmation.',
      next_action: 'Resolve exact source URLs manually.',
    },
    {
      bucket: 'missing_set_code_manual_review',
      row_count: recoveryLanes.summary?.by_lane?.manual_provenance_review ?? 0,
      status: 'manual_review_required',
      mutation_ready: false,
      reason: 'No usable source set alias is available.',
      next_action: 'Manual source acquisition required.',
    },
    {
      bucket: 'source_acquisition_queue',
      row_count: completionGapCount,
      historical_weighted_rows: valueAt(sourceAcquisition, ['summary', 'queue_summary', 'by_lane'], {}),
      status: completionGapCount === 0 ? 'closed_by_completion_report' : 'evidence_work_required',
      mutation_ready: false,
      reason: completionGapCount === 0
        ? 'The completion report has no remaining Master Index source-gap queue items. Historical source-acquisition queues remain planning context only.'
        : 'The source acquisition queue is still the main blocker to safe writes.',
      next_action: completionGapCount === 0
        ? 'Proceed to row-level dry-run package design for eligible subsets; do not run writes.'
        : 'Prioritize human checklist evidence for high-volume physical recovery sets.',
    },
    {
      bucket: 'finish_blocker_boundary',
      row_count: completionFinishBlockers,
      status: completionFinishBlockers === 0 ? 'closed_by_adjudication' : 'manual_adjudication_required',
      mutation_ready: false,
      reason: completionFinishBlockers === 0
        ? 'Former finish blockers were adjudicated out of working truth and are no longer completion blockers.'
        : 'Remaining finish-second-source rows have exact finish-label or card-number conflicts and are not promotion safe.',
      next_action: completionFinishBlockers === 0
        ? 'Keep adjudicated exclusions preserved as audit evidence; do not use them for writes.'
        : 'Resolve manually as finish-label/number adjudication before any future write package.',
      detail: {
        closure_status: finishBlockerClosure.summary?.closure_status ?? 'not_available',
        promotion_safe_now: finishBlockerClosure.summary?.promotion_safe_now ?? 0,
        by_blocker_type: finishBlockerClosure.summary?.by_blocker_type ?? {},
        adjudicated_excluded_printing_facts: adjudicatedExcludedCount,
      },
    },
    {
      bucket: 'adjudicated_excluded_printings',
      row_count: adjudicatedExcludedCount,
      status: 'excluded_from_working_truth',
      mutation_ready: false,
      reason: 'These facts are preserved as reviewed exclusions, not deletion, insertion, or cleanup authority.',
      next_action: 'Keep excluded unless new exact evidence reopens adjudication.',
      detail: adjudicatedExcluded.summary ?? {},
    },
    {
      bucket: 'truth_readiness_sets',
      row_count: readiness.sets?.length ?? 0,
      detail: valueAt(readiness, ['summary'], {}),
      status: 'planning_only',
      mutation_ready: false,
      reason: 'Truth readiness ranks risk; it does not authorize writes.',
      next_action: 'Use only to choose next proof-loop targets.',
    },
    {
      bucket: 'repair_priority_sets',
      row_count: valueAt(repairPriority, ['summary', 'total_ranked_sets'], 0),
      status: 'planning_only',
      mutation_ready: false,
      reason: 'Repair priority is a future planning aid only.',
      next_action: 'Use after evidence acquisition, not before.',
    },
    {
      bucket: 'provenance_recovery_leads',
      row_count: provenance.summary?.unique_card_prints ?? 0,
      printing_rows: provenance.summary?.missing_set_code_printing_rows ?? 0,
      status: 'lead_map_complete',
      mutation_ready: false,
      reason: 'Provenance recovery leads are not canonical truth.',
      next_action: 'Promote only through source-backed proof loops.',
    },
  ];
}

function summarizeDryRunCandidateSets(exactMatch) {
  const rows = (exactMatch.rows ?? [])
    .filter((row) => row.card_match_status === 'exact_card_identity_match' && row.finish_match_status === 'all_finishes_master_verified_by_index');
  const bySet = new Map();
  for (const row of rows) {
    const key = row.set_key ?? 'unknown';
    const existing = bySet.get(key) ?? {
      set_key: key,
      set_name: row.set_name ?? '',
      candidate_card_prints: 0,
      candidate_printing_rows: 0,
      sample_card_print_ids: [],
    };
    existing.candidate_card_prints += 1;
    existing.candidate_printing_rows += Number(row.printing_count ?? 0);
    if (existing.sample_card_print_ids.length < 5 && row.card_print_id) existing.sample_card_print_ids.push(row.card_print_id);
    bySet.set(key, existing);
  }
  return [...bySet.values()]
    .sort((left, right) => right.candidate_printing_rows - left.candidate_printing_rows || left.set_key.localeCompare(right.set_key));
}

function buildWritePackages({ completion, exactMatch, recoveryLanes, sourceAcquisition, grookaiAudit }) {
  const physicalByFinishStatus = exactMatch.summary?.by_finish_match_status ?? {};
  const physicalPrintingByFinishStatus = exactMatch.summary?.printing_rows_by_finish_status ?? {};
  const statusCounts = grookaiAudit.summary?.by_status ?? {};
  const dryRunCandidateSets = summarizeDryRunCandidateSets(exactMatch);
  const dryRunCandidateCards = physicalByFinishStatus.all_finishes_master_verified_by_index ?? 0;
  const dryRunCandidatePrintings = physicalPrintingByFinishStatus.all_finishes_master_verified_by_index ?? 0;
  return [
    {
      package_id: 'PKG-00',
      name: 'Ascended Heroes monitor-only proof baseline',
      current_state: 'complete',
      future_write_allowed_after_approval: false,
      candidate_rows: statusCounts.master_verified_by_index ?? 0,
      blockers: [],
      required_before_write: ['No write required unless future drift appears.'],
      rollback_requirement: 'Existing Ascended Heroes rollback/proof artifacts remain the model for future sets.',
    },
    {
      package_id: 'PKG-01',
      name: 'Physical missing-set recovery - master-verified subset',
      current_state: dryRunCandidateCards > 0 ? 'row_level_dry_run_package_required' : 'no_master_verified_subset',
      future_write_allowed_after_approval: false,
      evidence_ready_for_dry_run_design: dryRunCandidateCards > 0,
      candidate_card_prints: dryRunCandidateCards,
      candidate_printing_rows: dryRunCandidatePrintings,
      candidate_sets: dryRunCandidateSets,
      evidence_shape: {
        exact_card_identity_match: exactMatch.summary?.by_card_match_status?.exact_card_identity_match ?? 0,
        all_finishes_master_verified_by_index: dryRunCandidateCards,
      },
      blockers: [
        'No row-level write package has been generated.',
        'No before/after DB snapshot or rollback artifact exists for these rows.',
        'No post-apply verification query set has been approved.',
        'Operator approval is still required before any DB write.',
      ],
      required_before_write: [
        'Generate a set-specific dry-run write package for the eligible master-verified subset.',
        'List exact source card_print IDs and intended set/printing changes.',
        'Capture before-state snapshots and rollback SQL/script.',
        'Run identity, ownership, vault, and provenance impact checks.',
        'Founder/operator approval of exact row IDs and intended mutations.',
      ],
      rollback_requirement: 'Per-row before/after snapshot and reversible update plan required.',
    },
    {
      package_id: 'PKG-01B',
      name: 'Physical missing-set recovery - blocked remainder',
      current_state: 'blocked_until_identity_or_finish_safe',
      future_write_allowed_after_approval: false,
      candidate_card_prints: (exactMatch.summary?.candidate_card_prints ?? 0) - dryRunCandidateCards,
      candidate_printing_rows: (exactMatch.summary?.candidate_printing_rows ?? 0) - dryRunCandidatePrintings,
      evidence_shape: {
        number_missing_from_index: exactMatch.summary?.by_card_match_status?.number_missing_from_index ?? 0,
        blocked_until_card_identity_match: physicalByFinishStatus.blocked_until_card_identity_match ?? 0,
        partial_finishes_supported_by_index: physicalByFinishStatus.partial_finishes_supported_by_index ?? 0,
        no_finishes_supported_by_index: physicalByFinishStatus.no_finishes_supported_by_index ?? 0,
      },
      blockers: [
        'Some rows still lack exact card identity or exact supported finish coverage.',
        'Unsupported finishes must not be recovered.',
        'Partial finish support must be split into supported-only and unsupported lanes.',
      ],
      required_before_write: [
        'Resolve card-number gaps or exclude them from the package.',
        'Split supported finish rows from unsupported finish rows.',
        'Generate a separate dry-run package only for rows that become master_verified.',
      ],
      rollback_requirement: 'No write package may include blocked remainder rows.',
    },
    {
      package_id: 'PKG-02',
      name: 'Pocket/digital scope isolation',
      current_state: 'scope_decision_required',
      future_write_allowed_after_approval: false,
      candidate_card_prints: recoveryLanes.summary?.by_lane?.pocket_scope_exclusion_candidate ?? 0,
      blockers: [
        'Pocket/digital scope is outside English physical TCG but needs product decision.',
        'Scope exclusion is not automatic deletion authority.',
      ],
      required_before_write: [
        'Decide whether Grookai stores Pocket/digital rows in a separate domain.',
        'Design non-destructive isolation/quarantine strategy.',
        'Verify ownership/vault/provenance impacts before any hide or move.',
      ],
      rollback_requirement: 'Scope isolation must be reversible and cannot corrupt vault ownership.',
    },
    {
      package_id: 'PKG-03',
      name: 'Unsupported printings cleanup',
      current_state: 'blocked_by_index_maturity',
      future_write_allowed_after_approval: false,
      candidate_printing_rows: statusCounts.unsupported_by_current_index ?? 0,
      blockers: [
        'Unsupported by current index is not deletion authority.',
        'Many sets are API-only or source-limited.',
      ],
      required_before_write: [
        'Run set-level proof loops until relevant facts are master_verified.',
        'Produce proof-based unsupported row report with exact evidence URLs.',
        'Generate rollback-safe cleanup plan.',
      ],
      rollback_requirement: 'Every cleanup row needs before-state snapshot and reasoned evidence.',
    },
    {
      package_id: 'PKG-04',
      name: 'Missing-from-Grookai insertions',
      current_state: 'blocked_by_master_verification',
      future_write_allowed_after_approval: false,
      candidate_printing_rows: statusCounts.missing_from_grookai ?? 0,
      blockers: [
        'Missing from Grookai is not insertion authority.',
        'Only master_verified index rows may participate in future insertion.',
      ],
      required_before_write: [
        'Promote candidate rows to master_verified using source law.',
        'Confirm no duplicate identity or ownership side effects.',
        'Generate controlled insertion plan and rollback/deletion companion.',
      ],
      rollback_requirement: 'Insertion rollback must remove only inserted rows and preserve ownership ledgers.',
    },
    {
      package_id: 'PKG-05',
      name: 'Name and alias governance',
      current_state: 'manual_governance_required',
      future_write_allowed_after_approval: false,
      candidate_rows: statusCounts.name_mismatch_needs_review ?? 0,
      blockers: [
        'Name mismatch is not identity rewrite authority.',
        'Alias and subset policies must be source-backed.',
      ],
      required_before_write: [
        'Resolve aliases with exact source URLs and evidence labels.',
        'Separate display-name cleanup from identity mutation.',
        'Run identity-law conflict checks before any write.',
      ],
      rollback_requirement: 'Alias changes must be reversible and must not mutate canonical identity laws silently.',
    },
  ];
}

function buildEvidencePlan({ physicalPriority, exactMatch, sourceAcquisition }) {
  const dryRunCandidateSets = summarizeDryRunCandidateSets(exactMatch).slice(0, 12);
  const topSets = (physicalPriority.ranked_sets ?? []).slice(0, 12).map((set) => ({
    set_key: set.set_key,
    set_name: set.set_name,
    candidate_card_prints: set.candidate_card_print_count,
    printing_rows: set.printing_row_count,
    source_aliases: set.source_aliases,
    readiness_lane: set.readiness_lane,
    required_evidence: [
      'human-readable/checklist card identity evidence',
      'exact card-number finish matrix evidence',
      'second-source confirmation for each finish fact',
    ],
    stop_if: [
      'source only gives general finish rule',
      'card-level coverage is ambiguous',
      'finish is unsupported or conflicts with index',
    ],
  }));

  return {
    source_acquisition_queue_total: valueAt(sourceAcquisition, ['summary', 'queue_summary', 'total_queue_items'], 0),
    physical_exact_match_status: exactMatch.summary?.by_finish_match_status ?? {},
    dry_run_candidate_sets: dryRunCandidateSets,
    priority_sets: topSets,
    evidence_rules: [
      'API agreement is not master truth.',
      'For printing/finish truth, at least one human-readable, official, or checklist-style source is required.',
      'A recovered source alias does not assign Grookai set identity by itself.',
      'General finish rules do not prove exact card-level finish facts.',
    ],
  };
}

function buildArtifacts(inputs) {
  const globalBuckets = buildGlobalBuckets(inputs);
  const writePackages = buildWritePackages(inputs);
  const evidencePlan = buildEvidencePlan(inputs);
  const safety = safetyBlock();
  const writeReadyNow = 0;
  const planningReadyButWriteBlocked = globalBuckets
    .filter((bucket) => bucket.status !== 'blocked')
    .reduce((total, bucket) => total + Number(bucket.row_count && typeof bucket.row_count === 'number' ? bucket.row_count : 0), 0);
  const blockedRows = globalBuckets
    .filter((bucket) => bucket.status === 'blocked')
    .reduce((total, bucket) => total + Number(bucket.row_count && typeof bucket.row_count === 'number' ? bucket.row_count : 0), 0);

  const summary = {
    write_ready_now: writeReadyNow,
    db_writes_allowed_from_this_plan: false,
    master_index_completion: inputs.completion.summary ?? {},
    planning_ready_but_write_blocked: planningReadyButWriteBlocked,
    blocked_rows_counted: blockedRows,
    grookai_printing_rows: inputs.grookaiAudit.summary?.grookai_printing_rows ?? null,
    index_printing_rows: inputs.completion.summary?.master_admissible_printing_facts ?? inputs.grookaiAudit.summary?.index_printing_rows ?? null,
    global_status_counts: inputs.grookaiAudit.summary?.by_status ?? {},
    set_unmapped_categories: inputs.setUnmapped.summary?.by_category ?? {},
    physical_recovery_exact_match: inputs.exactMatch.summary ?? {},
    source_acquisition_queue: inputs.completionSourceGap.summary ?? valueAt(inputs.sourceAcquisition, ['summary', 'queue_summary'], {}),
    historical_source_acquisition_queue: valueAt(inputs.sourceAcquisition, ['summary', 'queue_summary'], {}),
    finish_blocker_closure: {
      ...(inputs.finishBlockerClosure.summary ?? {}),
      completion_finish_blocker_boundary_facts: inputs.completion.summary?.finish_blocker_boundary_facts ?? null,
      adjudicated_excluded_printing_facts: inputs.completion.summary?.adjudicated_excluded_printing_facts ?? null,
    },
    truth_readiness: inputs.readiness.summary ?? {},
    repair_priority: inputs.repairPriority.summary ?? {},
  };

  const writeReadiness = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_write_readiness_v1',
    ...safety,
    rule: 'This report determines whether Grookai is ready to write. It does not execute writes.',
    conclusion: 'No catalog writes are authorized yet. The Master Index is complete, and the next safe step is row-level dry-run write package design for eligible master-verified subsets.',
    summary,
    global_buckets: globalBuckets,
    write_packages: writePackages,
  };

  const noWriteExecutionPlan = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_no_write_execution_plan_v1',
    ...safety,
    rule: 'This is the complete no-write execution plan required before any future write proposal.',
    plan_status: 'complete_no_write_plan',
    phases: [
      {
        phase: 'Phase 0',
        name: 'Freeze writes and preserve audit baseline',
        status: 'complete_for_audit',
        allowed_actions: ['read-only reports', 'source acquisition', 'manual evidence fixtures'],
        forbidden_actions: ['DB writes', 'migrations', 'apply runners', 'cleanup', 'quarantine apply'],
      },
      {
        phase: 'Phase 1',
        name: 'Acquire missing human/checklist evidence for Master Index completion',
        status: valueAt(inputs.completionSourceGap, ['summary', 'total_queue_items'], 0) === 0 ? 'closed_for_master_index_completion' : 'next_required',
        allowed_actions: ['source research', 'manual evidence fixtures', 'report regeneration'],
        source_targets: valueAt(inputs.completionSourceGap, ['summary', 'total_queue_items'], 0) === 0 ? [] : evidencePlan.priority_sets,
      },
      {
        phase: 'Phase 2',
        name: 'Rerun master index and exact-match audits',
        status: 'complete_for_current_master_index',
        required_outputs: [
          'updated master index facts',
          'updated exact finish matrix',
          'row-level master_verified status',
          'conflict and manual review reports',
        ],
      },
      {
        phase: 'Phase 3',
        name: 'Generate set-specific dry-run write packages',
        status: 'next_required_no_write',
        required_outputs: [
          'exact row IDs',
          'before/after snapshots',
          'rollback artifact',
          'post-apply verification query plan',
          'operator approval checklist',
        ],
      },
      {
        phase: 'Phase 4',
        name: 'Write approval gate',
        status: 'not_started',
        required_approval: 'Founder/operator approval after reviewing exact dry-run package.',
      },
    ],
    evidence_plan: evidencePlan,
    write_packages: writePackages,
  };

  const auditClosure = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_audit_closure_v1',
    ...safety,
    audit_status: 'complete_to_dry_run_package_boundary',
    conclusion: {
      entire_audit_completed_to_current_evidence_boundary: true,
      master_index_complete: (inputs.completion.summary?.source_gap_queue_items ?? 1) === 0,
      ready_for_db_writes: false,
      reason: 'The completed Master Index can now drive dry-run package design, but writes still need exact row IDs, rollback artifacts, impact checks, and approval.',
      strongest_positive_finding: '106 physical missing-set recovery card candidates / 143 printing rows have exact card identity and all finishes master_verified by the index.',
      main_blocker: 'No row-level dry-run write package, rollback artifact, or post-apply verification query plan exists yet.',
      finish_blocker_boundary: 'Former finish blockers are adjudicated exclusions outside working truth, not open completion gaps.',
    },
    summary,
    immediate_next_non_write_work: [
      'Generate the first set-specific dry-run write package from the 106-card / 143-printing master-verified physical recovery subset.',
      'Capture exact row IDs, before-state snapshots, rollback plan, and post-apply verification queries.',
      'Keep blocked remainder rows out of the package.',
    ],
    stop_rules_before_any_future_write: [
      'Stop if a fact is API-only.',
      'Stop if finish truth is partial or unsupported.',
      'Stop if source evidence gives only a general rule.',
      'Stop if row IDs, rollback, and post-apply verification are not explicit.',
      'Stop if identity-law, ownership, vault, or provenance impact is unresolved.',
    ],
    global_buckets: globalBuckets,
    write_packages: writePackages,
  };

  return { writeReadiness, noWriteExecutionPlan, auditClosure };
}

function buildWriteReadinessMarkdown(artifact) {
  const bucketRows = artifact.global_buckets.map((bucket) => [
    bucket.bucket,
    bucket.row_count ?? '',
    bucket.printing_rows ?? '',
    bucket.status,
    bucket.mutation_ready,
    bucket.reason,
  ]);
  const packageRows = artifact.write_packages.map((pkg) => [
    pkg.package_id,
    pkg.name,
    pkg.current_state,
    pkg.future_write_allowed_after_approval,
    pkg.candidate_rows ?? pkg.candidate_card_prints ?? pkg.candidate_printing_rows ?? '',
    (pkg.blockers ?? []).join('; '),
  ]);

  return `# English Master Index Write Readiness V1

${artifact.conclusion}

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- apply_paths_executed: ${artifact.apply_paths_executed}

## Summary

- write_ready_now: ${artifact.summary.write_ready_now}
- db_writes_allowed_from_this_plan: ${artifact.summary.db_writes_allowed_from_this_plan}
- Grookai printing rows: ${artifact.summary.grookai_printing_rows}
- Index printing rows: ${artifact.summary.index_printing_rows}
- master_verified_by_index: ${artifact.summary.global_status_counts.master_verified_by_index ?? 0}
- completed Master Index printings: ${artifact.summary.master_index_completion.master_admissible_printing_facts ?? 0}
- source_gap_queue_items: ${artifact.summary.master_index_completion.source_gap_queue_items ?? 0}
- finish_blocker_boundary_rows: ${artifact.summary.finish_blocker_closure.completion_finish_blocker_boundary_facts ?? 0}
- adjudicated_excluded_printing_facts: ${artifact.summary.finish_blocker_closure.adjudicated_excluded_printing_facts ?? 0}
- physical exact card matches: ${artifact.summary.physical_recovery_exact_match.by_card_match_status?.exact_card_identity_match ?? 0}
- physical all-finish master-verified dry-run candidates: ${artifact.summary.physical_recovery_exact_match.by_finish_match_status?.all_finishes_master_verified_by_index ?? 0}
- physical finish blocked: ${(artifact.summary.physical_recovery_exact_match.by_finish_match_status?.partial_finishes_supported_by_index ?? 0) + (artifact.summary.physical_recovery_exact_match.by_finish_match_status?.no_finishes_supported_by_index ?? 0)}

## Global Buckets

${markdownTable(['bucket', 'rows', 'printing_rows', 'status', 'mutation_ready', 'reason'], bucketRows)}

## Future Write Packages

${markdownTable(['package', 'name', 'state', 'write_allowed_now', 'rows', 'blockers'], packageRows)}
`;
}

function buildNoWriteExecutionPlanMarkdown(artifact) {
  const phaseRows = artifact.phases.map((phase) => [
    phase.phase,
    phase.name,
    phase.status,
    (phase.allowed_actions ?? phase.required_outputs ?? []).join('; '),
  ]);
  const sourceRows = artifact.evidence_plan.priority_sets.map((set) => [
    set.set_key,
    set.set_name,
    set.candidate_card_prints,
    set.printing_rows,
    set.source_aliases.join(', '),
    set.required_evidence.join('; '),
  ]);
  const dryRunRows = artifact.evidence_plan.dry_run_candidate_sets.map((set) => [
    set.set_key,
    set.set_name,
    set.candidate_card_prints,
    set.candidate_printing_rows,
    (set.sample_card_print_ids ?? []).join(', '),
  ]);

  return `# English Master Index No-Write Execution Plan V1

This is the complete no-write execution plan required before any future write proposal.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- apply_paths_executed: ${artifact.apply_paths_executed}

## Phases

${markdownTable(['phase', 'name', 'status', 'outputs/actions'], phaseRows)}

## Priority Dry-Run Package Targets

${markdownTable(['set_key', 'set_name', 'card_prints', 'printing_rows', 'sample_card_print_ids'], dryRunRows)}

## Historical Source Targets

${markdownTable(['set_key', 'set_name', 'card_prints', 'printing_rows', 'source_aliases', 'required_evidence'], sourceRows)}

## Evidence Rules

${artifact.evidence_plan.evidence_rules.map((rule) => `- ${rule}`).join('\n')}
`;
}

function buildAuditClosureMarkdown(artifact) {
  const packageRows = artifact.write_packages.map((pkg) => [
    pkg.package_id,
    pkg.name,
    pkg.current_state,
    (pkg.required_before_write ?? []).join('; '),
  ]);

  return `# English Master Index Audit Closure V1

## Conclusion

- entire_audit_completed_to_current_evidence_boundary: ${artifact.conclusion.entire_audit_completed_to_current_evidence_boundary}
- master_index_complete: ${artifact.conclusion.master_index_complete}
- ready_for_db_writes: ${artifact.conclusion.ready_for_db_writes}
- reason: ${artifact.conclusion.reason}
- strongest_positive_finding: ${artifact.conclusion.strongest_positive_finding}
- main_blocker: ${artifact.conclusion.main_blocker}

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- apply_paths_executed: ${artifact.apply_paths_executed}

## Immediate Next Non-Write Work

${artifact.immediate_next_non_write_work.map((item) => `- ${item}`).join('\n')}

## Stop Rules Before Any Future Write

${artifact.stop_rules_before_any_future_write.map((item) => `- ${item}`).join('\n')}

## Future Write Packages

${markdownTable(['package', 'name', 'state', 'required_before_write'], packageRows)}
`;
}

async function main() {
  const inputs = {
    masterIndex: await readJson('english_master_index_v1.json'),
    completion: await readCompletionJson('english_master_index_completion_v1.json'),
    completionSourceGap: await readCompletionJson('english_master_index_source_gap_queue_v1.json'),
    adjudicatedExcluded: await readCompletionJson('english_master_index_adjudicated_excluded_printings_v1.json'),
    grookaiAudit: await readJson('english_master_index_grookai_audit_v1.json'),
    actionPlan: await readJson('english_master_index_action_plan_v1.json'),
    setUnmapped: await readJson('english_master_index_set_unmapped_triage_v1.json'),
    provenance: await readJson('english_master_index_provenance_recovery_v1.json'),
    recoveryLanes: await readJson('english_master_index_missing_set_code_recovery_lanes_v1.json'),
    physicalPriority: await readJson('english_master_index_physical_recovery_priority_v1.json'),
    exactMatch: await readJson('english_master_index_physical_recovery_exact_match_v1.json'),
    sourceAcquisition: await readJson('english_master_index_source_acquisition_v1.json'),
    readiness: await readJson('english_master_index_truth_readiness_v1.json'),
    repairPriority: await readJson('english_master_index_repair_priority_v1.json'),
    finishBlockerClosure: await readOptionalJson('english_master_index_finish_blocker_closure_v1.json', { mapped_blockers: [], summary: {} }),
  };
  const artifacts = buildArtifacts(inputs);

  await writeJson('english_master_index_write_readiness_v1.json', artifacts.writeReadiness);
  await writeMarkdown('english_master_index_write_readiness_v1.md', buildWriteReadinessMarkdown(artifacts.writeReadiness));
  await writeJson('english_master_index_no_write_execution_plan_v1.json', artifacts.noWriteExecutionPlan);
  await writeMarkdown('english_master_index_no_write_execution_plan_v1.md', buildNoWriteExecutionPlanMarkdown(artifacts.noWriteExecutionPlan));
  await writeJson('english_master_index_audit_closure_v1.json', artifacts.auditClosure);
  await writeMarkdown('english_master_index_audit_closure_v1.md', buildAuditClosureMarkdown(artifacts.auditClosure));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    conclusion: artifacts.auditClosure.conclusion,
    write_ready_now: artifacts.writeReadiness.summary.write_ready_now,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
