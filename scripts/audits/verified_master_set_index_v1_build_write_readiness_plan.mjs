import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const COMPLETION_DIR = path.join('docs', 'audits', 'english_master_index_completion_v1');
const DRY_RUN_PACKAGE_DIR = path.join(OUTPUT_DIR, 'dry_run_packages');
const REVIEW_GATE_FILE = 'english_master_index_physical_recovery_review_gate_v1.json';
const APPLY_DESIGN_FILE = 'english_master_index_physical_recovery_apply_design_v1.json';
const DB_IMPACT_FILE = 'english_master_index_db_impact_translation_v1.json';
const OPERATOR_APPROVAL_FILE = 'english_master_index_operator_approval_packet_v1.json';
const OPERATOR_APPROVAL_RECORD_TEMPLATE_FILE = 'english_master_index_operator_approval_record_template_v1.json';
const OPERATOR_APPROVAL_TEMPLATE_GUARD_FILE = 'english_master_index_operator_approval_template_guard_v1.json';
const PREWRITE_SNAPSHOT_SPEC_FILE = 'english_master_index_prewrite_snapshot_spec_v1.json';
const FUTURE_EXECUTION_ARTIFACT_SPEC_FILE = 'english_master_index_future_execution_artifact_spec_v1.json';
const PKG01_RECONCILE_DRY_RUN_PREVIEW_FILE = 'english_master_index_pkg01_reconcile_dry_run_preview_v1.json';
const PKG01_OPERATOR_APPROVAL_GATE_FILE = 'english_master_index_pkg01_operator_approval_gate_v1.json';
const PKG01_SPLIT_ONE_SET_PILOT_FILE = 'english_master_index_pkg01_split_one_set_pilot_v1.json';
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

async function readDryRunPackages() {
  try {
    const files = await fs.readdir(DRY_RUN_PACKAGE_DIR);
    const packages = [];
    for (const file of files.filter((name) => name.endsWith('.json')).sort()) {
      const artifact = JSON.parse(await fs.readFile(path.join(DRY_RUN_PACKAGE_DIR, file), 'utf8'));
      packages.push({
        file,
        version: artifact.version,
        target_set_key: artifact.target_set_key,
        target_set_name: artifact.target_set_name,
        dry_run_package_status: artifact.dry_run_package_status,
        candidate_card_prints: artifact.summary?.candidate_card_prints ?? 0,
        candidate_printing_rows: artifact.summary?.candidate_printing_rows ?? 0,
        db_snapshot_available: artifact.summary?.db_snapshot_available ?? false,
        db_card_prints_found: artifact.summary?.db_card_prints_found ?? null,
        db_card_printings_found: artifact.summary?.db_card_printings_found ?? null,
        vault_items_referencing_targets: artifact.summary?.vault_items_referencing_targets ?? null,
        write_ready_now: artifact.write_ready_now ?? 0,
      });
    }
    return packages;
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
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

function summarizeGeneratedDryRunPackages(dryRunPackages) {
  return {
    package_count: dryRunPackages.length,
    candidate_card_prints: dryRunPackages.reduce((total, row) => total + Number(row.candidate_card_prints ?? 0), 0),
    candidate_printing_rows: dryRunPackages.reduce((total, row) => total + Number(row.candidate_printing_rows ?? 0), 0),
    packages: dryRunPackages,
  };
}

function summarizeReviewGate(reviewGate) {
  if (!reviewGate) {
    return {
      exists: false,
      review_gate_status: 'not_generated',
      package_stop_findings: null,
      duplicate_card_print_ids: null,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: REVIEW_GATE_FILE,
    review_gate_status: reviewGate.review_gate_status,
    package_count: reviewGate.summary?.package_count ?? 0,
    candidate_card_prints: reviewGate.summary?.candidate_card_prints ?? 0,
    candidate_printing_rows: reviewGate.summary?.candidate_printing_rows ?? 0,
    package_stop_findings: reviewGate.summary?.package_stop_findings ?? null,
    duplicate_card_print_ids: reviewGate.summary?.duplicate_card_print_ids ?? null,
    vault_items_referencing_targets: reviewGate.summary?.vault_items_referencing_targets ?? null,
    write_ready_now: reviewGate.write_ready_now ?? 0,
  };
}

function summarizeApplyDesign(applyDesign) {
  if (!applyDesign) {
    return {
      exists: false,
      apply_design_status: 'not_generated',
      approval_status: 'not_started',
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: APPLY_DESIGN_FILE,
    apply_design_status: applyDesign.apply_design_status,
    approval_status: applyDesign.approval_status,
    package_count: applyDesign.summary?.package_count ?? 0,
    candidate_card_prints: applyDesign.summary?.candidate_card_prints ?? 0,
    candidate_printing_rows: applyDesign.summary?.candidate_printing_rows ?? 0,
    before_child_printing_rows: applyDesign.summary?.before_child_printing_rows ?? 0,
    changed_fields: applyDesign.summary?.changed_fields ?? {},
    stop_findings: applyDesign.summary?.stop_findings ?? null,
    vault_items_referencing_targets: applyDesign.summary?.vault_items_referencing_targets ?? null,
    write_ready_now: applyDesign.write_ready_now ?? 0,
  };
}

function summarizeDbImpact(dbImpact) {
  if (!dbImpact) {
    return {
      exists: false,
      current_db_changed: null,
      future_card_print_updates_if_approved: 0,
      future_child_printings_verified: 0,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: DB_IMPACT_FILE,
    current_db_changed: dbImpact.current_db_effect?.database_changed_by_this_work ?? null,
    future_card_print_updates_if_approved: dbImpact.future_db_effect_if_separately_approved_later?.card_print_rows_that_would_be_updated ?? 0,
    future_child_printings_verified: dbImpact.future_db_effect_if_separately_approved_later?.card_printing_rows_verified_but_not_directly_changed_by_current_design ?? 0,
    affected_set_count: dbImpact.future_db_effect_if_separately_approved_later?.affected_set_count ?? 0,
    authorization_status: dbImpact.future_db_effect_if_separately_approved_later?.authorization_status ?? 'unknown',
    stop_findings: dbImpact.stop_findings?.length ?? 0,
    pass: dbImpact.pass === true,
    write_ready_now: dbImpact.future_db_effect_if_separately_approved_later?.write_ready_now ?? 0,
  };
}

function summarizeOperatorApproval(operatorApproval) {
  if (!operatorApproval) {
    return {
      exists: false,
      approval_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: OPERATOR_APPROVAL_FILE,
    approval_status: operatorApproval.approval_status,
    approval_recorded: operatorApproval.approval_recorded === true,
    card_print_rows_requiring_approval: operatorApproval.package_scope?.card_print_rows_requiring_approval ?? 0,
    child_printing_rows_verified: operatorApproval.package_scope?.child_printing_rows_verified ?? 0,
    affected_set_count: operatorApproval.package_scope?.affected_set_count ?? 0,
    required_signoff_items: operatorApproval.required_signoff_checklist?.length ?? 0,
    checked_signoff_items: (operatorApproval.required_signoff_checklist ?? []).filter((item) => item.checked === true).length,
    stop_findings: operatorApproval.stop_findings?.length ?? 0,
    pass: operatorApproval.pass === true,
    write_ready_now: operatorApproval.write_ready_now ?? 0,
  };
}

function summarizeOperatorApprovalRecordTemplate(approvalRecordTemplate) {
  if (!approvalRecordTemplate) {
    return {
      exists: false,
      approval_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: OPERATOR_APPROVAL_RECORD_TEMPLATE_FILE,
    approval_status: approvalRecordTemplate.approval_status,
    approval_recorded: approvalRecordTemplate.approval_recorded === true,
    card_print_rows_requiring_approval: approvalRecordTemplate.package_scope?.card_print_rows_requiring_approval ?? 0,
    child_printing_rows_verified: approvalRecordTemplate.package_scope?.child_printing_rows_verified ?? 0,
    affected_set_count: approvalRecordTemplate.package_scope?.affected_set_count ?? 0,
    package_fingerprint_sha256: approvalRecordTemplate.package_scope?.package_fingerprint_sha256 ?? null,
    row_fingerprint_count: approvalRecordTemplate.package_scope?.row_fingerprint_count ?? 0,
    unique_row_fingerprint_count: approvalRecordTemplate.package_scope?.unique_row_fingerprint_count ?? 0,
    blank_approval_entries: (approvalRecordTemplate.approval_entries ?? []).filter((entry) => entry.approved === false && entry.rejected === false).length,
    stop_findings: approvalRecordTemplate.stop_findings?.length ?? 0,
    pass: approvalRecordTemplate.pass === true,
    write_ready_now: approvalRecordTemplate.write_ready_now ?? 0,
  };
}

function summarizeOperatorApprovalTemplateGuard(approvalTemplateGuard) {
  if (!approvalTemplateGuard) {
    return {
      exists: false,
      guard_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: OPERATOR_APPROVAL_TEMPLATE_GUARD_FILE,
    guard_status: approvalTemplateGuard.guard_status,
    approval_recorded: approvalTemplateGuard.approval_recorded === true,
    approval_packet_rows: approvalTemplateGuard.summary?.approval_packet_rows ?? 0,
    approval_template_rows: approvalTemplateGuard.summary?.approval_template_rows ?? 0,
    blank_entries: approvalTemplateGuard.summary?.blank_entries ?? 0,
    row_guard_findings: approvalTemplateGuard.summary?.row_guard_findings ?? 0,
    package_fingerprint_sha256: approvalTemplateGuard.summary?.actual_package_fingerprint_sha256 ?? null,
    stop_findings: approvalTemplateGuard.stop_findings?.length ?? 0,
    pass: approvalTemplateGuard.pass === true,
    write_ready_now: approvalTemplateGuard.write_ready_now ?? 0,
  };
}

function summarizePrewriteSnapshotSpec(prewriteSnapshotSpec) {
  if (!prewriteSnapshotSpec) {
    return {
      exists: false,
      spec_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: PREWRITE_SNAPSHOT_SPEC_FILE,
    spec_status: prewriteSnapshotSpec.spec_status,
    approval_recorded: prewriteSnapshotSpec.approval_recorded === true,
    package_fingerprint_sha256: prewriteSnapshotSpec.package_scope?.package_fingerprint_sha256 ?? null,
    card_print_rows: prewriteSnapshotSpec.package_scope?.card_print_rows ?? 0,
    child_printing_rows_verified: prewriteSnapshotSpec.package_scope?.child_printing_rows_verified ?? 0,
    affected_sets: prewriteSnapshotSpec.package_scope?.affected_sets ?? 0,
    required_snapshot_sections: prewriteSnapshotSpec.required_snapshot_rows?.length ?? 0,
    snapshot_target_rows: prewriteSnapshotSpec.snapshot_targets?.length ?? 0,
    db_reads_performed: prewriteSnapshotSpec.db_reads_performed === true,
    stop_findings: prewriteSnapshotSpec.stop_findings?.length ?? 0,
    pass: prewriteSnapshotSpec.pass === true,
    write_ready_now: prewriteSnapshotSpec.write_ready_now ?? 0,
  };
}

function summarizeFutureExecutionArtifactSpec(futureExecutionArtifactSpec) {
  if (!futureExecutionArtifactSpec) {
    return {
      exists: false,
      spec_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: FUTURE_EXECUTION_ARTIFACT_SPEC_FILE,
    spec_status: futureExecutionArtifactSpec.spec_status,
    approval_recorded: futureExecutionArtifactSpec.approval_recorded === true,
    package_fingerprint_sha256: futureExecutionArtifactSpec.package_scope?.package_fingerprint_sha256 ?? null,
    card_print_rows: futureExecutionArtifactSpec.package_scope?.card_print_rows ?? 0,
    child_printing_rows_verified: futureExecutionArtifactSpec.package_scope?.child_printing_rows_verified ?? 0,
    affected_sets: futureExecutionArtifactSpec.package_scope?.affected_sets ?? 0,
    required_artifact_sections: futureExecutionArtifactSpec.required_artifact_sections?.length ?? 0,
    future_execution_targets: futureExecutionArtifactSpec.future_execution_targets?.length ?? 0,
    db_reads_performed: futureExecutionArtifactSpec.db_reads_performed === true,
    stop_findings: futureExecutionArtifactSpec.stop_findings?.length ?? 0,
    pass: futureExecutionArtifactSpec.pass === true,
    write_ready_now: futureExecutionArtifactSpec.write_ready_now ?? 0,
  };
}

function summarizePkg01ReconcileDryRunPreview(pkg01ReconcileDryRunPreview) {
  if (!pkg01ReconcileDryRunPreview) {
    return {
      exists: false,
      preview_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: PKG01_RECONCILE_DRY_RUN_PREVIEW_FILE,
    preview_status: pkg01ReconcileDryRunPreview.preview_status,
    approval_recorded: pkg01ReconcileDryRunPreview.approval_recorded === true,
    package_fingerprint_sha256: pkg01ReconcileDryRunPreview.package_scope?.package_fingerprint_sha256 ?? null,
    card_print_rows: pkg01ReconcileDryRunPreview.package_scope?.card_print_rows ?? 0,
    child_printing_rows_verified: pkg01ReconcileDryRunPreview.package_scope?.child_printing_rows_verified ?? 0,
    affected_sets: pkg01ReconcileDryRunPreview.package_scope?.affected_sets ?? 0,
    mutation_matrix_rows: pkg01ReconcileDryRunPreview.mutation_matrix?.length ?? 0,
    rollback_matrix_rows: pkg01ReconcileDryRunPreview.rollback_matrix?.length ?? 0,
    db_reads_performed: pkg01ReconcileDryRunPreview.db_reads_performed === true,
    db_writes_performed: pkg01ReconcileDryRunPreview.db_writes_performed === true,
    apply_allowed: pkg01ReconcileDryRunPreview.apply_allowed === true,
    stop_findings: pkg01ReconcileDryRunPreview.stop_findings?.length ?? 0,
    pass_for_preview: pkg01ReconcileDryRunPreview.pass_for_preview === true,
    write_ready_now: pkg01ReconcileDryRunPreview.write_ready_now ?? 0,
  };
}

function summarizePkg01OperatorApprovalGate(pkg01OperatorApprovalGate) {
  if (!pkg01OperatorApprovalGate) {
    return {
      exists: false,
      approval_gate_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: PKG01_OPERATOR_APPROVAL_GATE_FILE,
    approval_gate_status: pkg01OperatorApprovalGate.approval_gate_status,
    approval_recorded: pkg01OperatorApprovalGate.approval_recorded === true,
    package_fingerprint_sha256: pkg01OperatorApprovalGate.package_scope?.package_fingerprint_sha256 ?? null,
    card_print_rows: pkg01OperatorApprovalGate.package_scope?.card_print_rows ?? 0,
    child_printing_rows_verified: pkg01OperatorApprovalGate.package_scope?.child_printing_rows_verified ?? 0,
    mutation_matrix_rows: pkg01OperatorApprovalGate.package_scope?.mutation_matrix_rows ?? 0,
    rollback_matrix_rows: pkg01OperatorApprovalGate.package_scope?.rollback_matrix_rows ?? 0,
    apply_allowed: pkg01OperatorApprovalGate.apply_allowed === true,
    stop_findings: pkg01OperatorApprovalGate.stop_findings?.length ?? 0,
    pass: pkg01OperatorApprovalGate.pass === true,
    write_ready_now: pkg01OperatorApprovalGate.write_ready_now ?? 0,
  };
}

function summarizePkg01SplitOneSetPilot(pkg01SplitOneSetPilot) {
  if (!pkg01SplitOneSetPilot) {
    return {
      exists: false,
      split_status: 'not_generated',
      approval_recorded: false,
      write_ready_now: 0,
    };
  }
  return {
    exists: true,
    file: PKG01_SPLIT_ONE_SET_PILOT_FILE,
    split_status: pkg01SplitOneSetPilot.split_status,
    approval_recorded: pkg01SplitOneSetPilot.approval_recorded === true,
    source_package_fingerprint_sha256: pkg01SplitOneSetPilot.source_package?.package_fingerprint_sha256 ?? null,
    pilot_package_id: pkg01SplitOneSetPilot.pilot_package?.package_id ?? null,
    pilot_package_fingerprint_sha256: pkg01SplitOneSetPilot.pilot_package?.package_fingerprint_sha256 ?? null,
    pilot_set_key: pkg01SplitOneSetPilot.pilot_package?.set_key ?? null,
    pilot_set_name: pkg01SplitOneSetPilot.pilot_package?.set_name ?? null,
    pilot_card_print_rows: pkg01SplitOneSetPilot.pilot_package?.card_print_rows ?? 0,
    pilot_child_printing_rows_verified: pkg01SplitOneSetPilot.pilot_package?.child_printing_rows_verified ?? 0,
    pilot_vault_items_referencing_targets: pkg01SplitOneSetPilot.pilot_package?.vault_items_referencing_targets ?? 0,
    remainder_package_id: pkg01SplitOneSetPilot.remainder_package?.package_id ?? null,
    remainder_card_print_rows: pkg01SplitOneSetPilot.remainder_package?.card_print_rows ?? 0,
    remainder_child_printing_rows_verified: pkg01SplitOneSetPilot.remainder_package?.child_printing_rows_verified ?? 0,
    apply_allowed: pkg01SplitOneSetPilot.apply_allowed === true,
    stop_findings: pkg01SplitOneSetPilot.stop_findings?.length ?? 0,
    pass: pkg01SplitOneSetPilot.pass === true,
    write_ready_now: pkg01SplitOneSetPilot.write_ready_now ?? 0,
  };
}

function physicalRecoveryDesignState({ dryRunPackages, physicalRecoveryReviewGate, physicalRecoveryApplyDesign, physicalRecoveryDbImpact, physicalRecoveryOperatorApproval, physicalRecoveryApprovalRecordTemplate, physicalRecoveryApprovalTemplateGuard, physicalRecoveryPrewriteSnapshotSpec, physicalRecoveryFutureExecutionArtifactSpec, physicalRecoveryPkg01ReconcileDryRunPreview, physicalRecoveryPkg01OperatorApprovalGate, physicalRecoveryPkg01SplitOneSetPilot }) {
  const generatedDryRuns = summarizeGeneratedDryRunPackages(dryRunPackages ?? []);
  const reviewGate = summarizeReviewGate(physicalRecoveryReviewGate);
  const applyDesign = summarizeApplyDesign(physicalRecoveryApplyDesign);
  const dbImpact = summarizeDbImpact(physicalRecoveryDbImpact);
  const operatorApproval = summarizeOperatorApproval(physicalRecoveryOperatorApproval);
  const approvalRecordTemplate = summarizeOperatorApprovalRecordTemplate(physicalRecoveryApprovalRecordTemplate);
  const approvalTemplateGuard = summarizeOperatorApprovalTemplateGuard(physicalRecoveryApprovalTemplateGuard);
  const prewriteSnapshotSpec = summarizePrewriteSnapshotSpec(physicalRecoveryPrewriteSnapshotSpec);
  const futureExecutionArtifactSpec = summarizeFutureExecutionArtifactSpec(physicalRecoveryFutureExecutionArtifactSpec);
  const pkg01ReconcileDryRunPreview = summarizePkg01ReconcileDryRunPreview(physicalRecoveryPkg01ReconcileDryRunPreview);
  const pkg01OperatorApprovalGate = summarizePkg01OperatorApprovalGate(physicalRecoveryPkg01OperatorApprovalGate);
  const pkg01SplitOneSetPilot = summarizePkg01SplitOneSetPilot(physicalRecoveryPkg01SplitOneSetPilot);
  const dryRunPackageExists = generatedDryRuns.package_count > 0;
  const reviewGateComplete = reviewGate.review_gate_status === 'dry_run_packages_complete_review_required_no_write'
    && Number(reviewGate.package_stop_findings ?? 1) === 0
    && Number(reviewGate.duplicate_card_print_ids ?? 1) === 0;
  const applyDesignComplete = applyDesign.apply_design_status === 'apply_design_complete_approval_required_no_write'
    && Number(applyDesign.stop_findings ?? 1) === 0;
  const dbImpactComplete = dbImpact.exists === true
    && dbImpact.current_db_changed === false
    && Number(dbImpact.stop_findings ?? 1) === 0;
  const operatorApprovalPacketComplete = operatorApproval.exists === true
    && operatorApproval.approval_recorded === false
    && Number(operatorApproval.stop_findings ?? 1) === 0;
  const approvalRecordTemplateComplete = approvalRecordTemplate.exists === true
    && approvalRecordTemplate.approval_recorded === false
    && Number(approvalRecordTemplate.stop_findings ?? 1) === 0
    && Number(approvalRecordTemplate.row_fingerprint_count ?? 0) === Number(approvalRecordTemplate.unique_row_fingerprint_count ?? -1);
  const approvalTemplateGuardPassed = approvalTemplateGuard.exists === true
    && approvalTemplateGuard.guard_status === 'pass_blank_template_verified_no_write'
    && approvalTemplateGuard.approval_recorded === false
    && Number(approvalTemplateGuard.stop_findings ?? 1) === 0
    && Number(approvalTemplateGuard.row_guard_findings ?? 1) === 0;
  const prewriteSnapshotSpecComplete = prewriteSnapshotSpec.exists === true
    && prewriteSnapshotSpec.spec_status === 'prewrite_snapshot_spec_complete_approval_required_no_write'
    && prewriteSnapshotSpec.approval_recorded === false
    && prewriteSnapshotSpec.db_reads_performed === false
    && Number(prewriteSnapshotSpec.stop_findings ?? 1) === 0;
  const futureExecutionArtifactSpecComplete = futureExecutionArtifactSpec.exists === true
    && futureExecutionArtifactSpec.spec_status === 'future_execution_artifact_spec_complete_approval_required_no_write'
    && futureExecutionArtifactSpec.approval_recorded === false
    && futureExecutionArtifactSpec.db_reads_performed === false
    && Number(futureExecutionArtifactSpec.stop_findings ?? 1) === 0;
  const pkg01ReconcileDryRunPreviewComplete = pkg01ReconcileDryRunPreview.exists === true
    && pkg01ReconcileDryRunPreview.preview_status === 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
    && pkg01ReconcileDryRunPreview.approval_recorded === false
    && pkg01ReconcileDryRunPreview.db_reads_performed === true
    && pkg01ReconcileDryRunPreview.db_writes_performed === false
    && pkg01ReconcileDryRunPreview.apply_allowed === false
    && Number(pkg01ReconcileDryRunPreview.stop_findings ?? 1) === 0;
  const pkg01OperatorApprovalGateReady = pkg01OperatorApprovalGate.exists === true
    && pkg01OperatorApprovalGate.approval_gate_status === 'ready_for_operator_decision_apply_blocked_no_write'
    && pkg01OperatorApprovalGate.approval_recorded === false
    && pkg01OperatorApprovalGate.apply_allowed === false
    && Number(pkg01OperatorApprovalGate.stop_findings ?? 1) === 0;
  const pkg01SplitOneSetPilotReady = pkg01SplitOneSetPilot.exists === true
    && pkg01SplitOneSetPilot.split_status === 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
    && pkg01SplitOneSetPilot.approval_recorded === false
    && pkg01SplitOneSetPilot.apply_allowed === false
    && Number(pkg01SplitOneSetPilot.stop_findings ?? 1) === 0;
  let state = 'row_level_dry_run_package_required';
  if (pkg01SplitOneSetPilotReady) state = 'pkg01_split_one_set_pilot_ready_apply_blocked_no_write';
  else if (pkg01OperatorApprovalGateReady) state = 'pkg01_operator_approval_gate_ready_apply_blocked_no_write';
  else if (pkg01ReconcileDryRunPreviewComplete) state = 'pkg01_reconcile_dry_run_preview_complete_apply_blocked_no_write';
  else if (futureExecutionArtifactSpecComplete) state = 'future_execution_artifact_spec_complete_approval_required_no_write';
  else if (prewriteSnapshotSpecComplete) state = 'prewrite_snapshot_spec_complete_approval_required_no_write';
  else if (approvalTemplateGuardPassed) state = 'approval_template_guard_passed_approval_not_recorded_no_write';
  else if (approvalRecordTemplateComplete) state = 'approval_record_template_complete_approval_not_recorded_no_write';
  else if (operatorApprovalPacketComplete) state = 'operator_approval_packet_complete_approval_not_recorded_no_write';
  else if (dbImpactComplete) state = 'db_impact_translation_complete_approval_packet_required_no_write';
  else if (applyDesignComplete) state = 'apply_design_complete_approval_required_no_write';
  else if (reviewGateComplete) state = 'dry_run_review_gate_complete_apply_design_required';
  else if (dryRunPackageExists) state = 'dry_run_packages_generated_review_required';
  return {
    state,
    generatedDryRuns,
    reviewGate,
    applyDesign,
    dbImpact,
    operatorApproval,
    approvalRecordTemplate,
    approvalTemplateGuard,
    prewriteSnapshotSpec,
    futureExecutionArtifactSpec,
    pkg01ReconcileDryRunPreview,
    pkg01OperatorApprovalGate,
    pkg01SplitOneSetPilot,
    dryRunPackageExists,
    reviewGateComplete,
    applyDesignComplete,
    dbImpactComplete,
    operatorApprovalPacketComplete,
    approvalRecordTemplateComplete,
    approvalTemplateGuardPassed,
    prewriteSnapshotSpecComplete,
    futureExecutionArtifactSpecComplete,
    pkg01ReconcileDryRunPreviewComplete,
    pkg01OperatorApprovalGateReady,
    pkg01SplitOneSetPilotReady,
  };
}

function buildWritePackages({ completion, exactMatch, recoveryLanes, sourceAcquisition, grookaiAudit, dryRunPackages, physicalRecoveryReviewGate, physicalRecoveryApplyDesign, physicalRecoveryDbImpact, physicalRecoveryOperatorApproval, physicalRecoveryApprovalRecordTemplate, physicalRecoveryApprovalTemplateGuard, physicalRecoveryPrewriteSnapshotSpec, physicalRecoveryFutureExecutionArtifactSpec, physicalRecoveryPkg01ReconcileDryRunPreview, physicalRecoveryPkg01OperatorApprovalGate, physicalRecoveryPkg01SplitOneSetPilot }) {
  const physicalByFinishStatus = exactMatch.summary?.by_finish_match_status ?? {};
  const physicalPrintingByFinishStatus = exactMatch.summary?.printing_rows_by_finish_status ?? {};
  const statusCounts = grookaiAudit.summary?.by_status ?? {};
  const dryRunCandidateSets = summarizeDryRunCandidateSets(exactMatch);
  const dryRunCandidateCards = physicalByFinishStatus.all_finishes_master_verified_by_index ?? 0;
  const dryRunCandidatePrintings = physicalPrintingByFinishStatus.all_finishes_master_verified_by_index ?? 0;
  const designState = physicalRecoveryDesignState({ dryRunPackages, physicalRecoveryReviewGate, physicalRecoveryApplyDesign, physicalRecoveryDbImpact, physicalRecoveryOperatorApproval, physicalRecoveryApprovalRecordTemplate, physicalRecoveryApprovalTemplateGuard, physicalRecoveryPrewriteSnapshotSpec, physicalRecoveryFutureExecutionArtifactSpec, physicalRecoveryPkg01ReconcileDryRunPreview, physicalRecoveryPkg01OperatorApprovalGate, physicalRecoveryPkg01SplitOneSetPilot });
  const generatedDryRuns = designState.generatedDryRuns;
  const dryRunPackageExists = designState.dryRunPackageExists;
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
      current_state: dryRunCandidateCards > 0 ? designState.state : 'no_master_verified_subset',
      future_write_allowed_after_approval: false,
      evidence_ready_for_dry_run_design: dryRunCandidateCards > 0,
      generated_dry_run_packages: generatedDryRuns,
      physical_recovery_review_gate: designState.reviewGate,
      physical_recovery_apply_design: designState.applyDesign,
      physical_recovery_db_impact_translation: designState.dbImpact,
      physical_recovery_operator_approval_packet: designState.operatorApproval,
      physical_recovery_operator_approval_record_template: designState.approvalRecordTemplate,
      physical_recovery_operator_approval_template_guard: designState.approvalTemplateGuard,
      physical_recovery_prewrite_snapshot_spec: designState.prewriteSnapshotSpec,
      physical_recovery_future_execution_artifact_spec: designState.futureExecutionArtifactSpec,
      physical_recovery_pkg01_reconcile_dry_run_preview: designState.pkg01ReconcileDryRunPreview,
      physical_recovery_pkg01_operator_approval_gate: designState.pkg01OperatorApprovalGate,
      physical_recovery_pkg01_split_one_set_pilot: designState.pkg01SplitOneSetPilot,
      candidate_card_prints: dryRunCandidateCards,
      candidate_printing_rows: dryRunCandidatePrintings,
      candidate_sets: dryRunCandidateSets,
      evidence_shape: {
        exact_card_identity_match: exactMatch.summary?.by_card_match_status?.exact_card_identity_match ?? 0,
        all_finishes_master_verified_by_index: dryRunCandidateCards,
      },
      blockers: designState.operatorApprovalPacketComplete
        ? [
          'Operator approval packet is a review artifact only and is not approval.',
          'Approval checkboxes remain false and approval_recorded is false.',
          'Approval record template is blank and records no approval.',
          'Approval template guard passed, but it is still not approval.',
          'Prewrite snapshot spec exists, but no fresh snapshot has been captured.',
          'No fresh pre-write production snapshot has been captured.',
          'No transactional execution artifact has been generated or approved.',
          'write_ready_now remains 0.',
        ]
        : designState.dbImpactComplete
        ? [
          'DB impact translation is complete but operator approval packet is not complete.',
          'No operator approval has been recorded.',
          'No fresh pre-write production snapshot has been captured.',
          'No transactional execution artifact has been generated or approved.',
          'write_ready_now remains 0.',
        ]
        : designState.applyDesignComplete
        ? [
          'Apply design is a review artifact only and is not executable.',
          'No operator approval packet has been completed.',
          'No operator approval has been recorded.',
          'No fresh pre-write production snapshot has been captured.',
          'No transactional execution artifact has been generated or approved.',
          'write_ready_now remains 0.',
        ]
        : dryRunPackageExists
        ? [
          'Generated dry-run packages are review artifacts only.',
          designState.reviewGateComplete ? 'Review gate is complete, but apply design is not complete.' : 'Dry-run review gate has not been completed.',
          'Rollback and post-apply verification must be reviewed against exact rows before any write.',
          'Operator approval is still required before any DB write.',
        ]
        : [
          'No row-level write package has been generated.',
          'No before/after DB snapshot or rollback artifact exists for these rows.',
          'No post-apply verification query set has been approved.',
          'Operator approval is still required before any DB write.',
        ],
      required_before_write: [
        designState.operatorApprovalPacketComplete
          ? 'Record explicit founder/operator approval only after reviewing every row in the approval packet.'
          : designState.dbImpactComplete
            ? 'Generate and review an operator approval packet from the DB impact translation.'
            : designState.applyDesignComplete
          ? 'Human-review the consolidated apply design matrix.'
          : dryRunPackageExists
            ? 'Review generated set-specific dry-run package rows and DB snapshots.'
            : 'Generate a set-specific dry-run write package for the eligible master-verified subset.',
        'Record founder/operator approval of exact row IDs and intended mutations.',
        'Capture a fresh production before-state snapshot immediately before any future execution.',
        'Regenerate rollback values from that fresh snapshot.',
        'Generate a separate transactional execution artifact; do not use this report as execution.',
        'Run identity, ownership, vault, provenance, and post-apply checks inside the future transaction before commit.',
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
    generated_dry_run_packages: summarizeGeneratedDryRunPackages(inputs.dryRunPackages ?? []),
    physical_recovery_review_gate: summarizeReviewGate(inputs.physicalRecoveryReviewGate),
    physical_recovery_apply_design: summarizeApplyDesign(inputs.physicalRecoveryApplyDesign),
    physical_recovery_db_impact_translation: summarizeDbImpact(inputs.physicalRecoveryDbImpact),
    physical_recovery_operator_approval_packet: summarizeOperatorApproval(inputs.physicalRecoveryOperatorApproval),
    physical_recovery_operator_approval_record_template: summarizeOperatorApprovalRecordTemplate(inputs.physicalRecoveryApprovalRecordTemplate),
    physical_recovery_operator_approval_template_guard: summarizeOperatorApprovalTemplateGuard(inputs.physicalRecoveryApprovalTemplateGuard),
    physical_recovery_prewrite_snapshot_spec: summarizePrewriteSnapshotSpec(inputs.physicalRecoveryPrewriteSnapshotSpec),
    physical_recovery_future_execution_artifact_spec: summarizeFutureExecutionArtifactSpec(inputs.physicalRecoveryFutureExecutionArtifactSpec),
    physical_recovery_pkg01_reconcile_dry_run_preview: summarizePkg01ReconcileDryRunPreview(inputs.physicalRecoveryPkg01ReconcileDryRunPreview),
    physical_recovery_pkg01_operator_approval_gate: summarizePkg01OperatorApprovalGate(inputs.physicalRecoveryPkg01OperatorApprovalGate),
    physical_recovery_pkg01_split_one_set_pilot: summarizePkg01SplitOneSetPilot(inputs.physicalRecoveryPkg01SplitOneSetPilot),
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
  const generatedPackages = summary.generated_dry_run_packages ?? {};
  const reviewGateSummary = summary.physical_recovery_review_gate ?? {};
  const applyDesignSummary = summary.physical_recovery_apply_design ?? {};
  const packageStopFindings = Number(reviewGateSummary.package_stop_findings ?? applyDesignSummary.stop_findings ?? 0);
  const packageCount = Number(generatedPackages.package_count ?? 0);
  const packageCardPrints = Number(generatedPackages.candidate_card_prints ?? 0);
  const packagePrintings = Number(generatedPackages.candidate_printing_rows ?? 0);
  const vaultRefCount = Number(reviewGateSummary.vault_items_referencing_targets ?? applyDesignSummary.vault_items_referencing_targets ?? 0);
  const currentReadinessConclusion = packageStopFindings > 0
    ? `No catalog writes are authorized yet. The Master Index is complete, FUT2020 has completed its proof/apply/reconciliation loop, and ${packageCount} refreshed dry-run packages now cover ${packageCardPrints} candidate card_print rows / ${packagePrintings} verified child printings. The next apply boundary is blocked by ${packageStopFindings} review finding(s), including ${vaultRefCount} vault item reference(s); write_ready_now remains 0.`
    : `No catalog writes are authorized yet. The Master Index is complete, FUT2020 has completed its proof/apply/reconciliation loop, and ${packageCount} refreshed dry-run packages now cover ${packageCardPrints} candidate card_print rows / ${packagePrintings} verified child printings. The next boundary is operator review plus fresh snapshot and guarded transaction artifact preparation; write_ready_now remains 0.`;
  const currentAuditReason = packageStopFindings > 0
    ? `The completed Master Index has refreshed DB-vs-index planning after FUT2020. The current physical-recovery package set is blocked from apply design readiness because ${packageStopFindings} package review finding(s) remain, including ${vaultRefCount} vault item reference(s).`
    : 'The completed Master Index has refreshed DB-vs-index planning after FUT2020. The current physical-recovery package set has no package stop findings, but writes still require explicit operator approval, a final fresh snapshot, a guarded execution artifact, rollback proof, and transactional verification.';
  const currentStrongestFinding = `FUT2020 is reconciled as verified_by_index after apply, and the refreshed recovery queue excludes FUT2020 while preserving ${packageCount} dry-run package(s) for future review.`;
  const currentMainBlocker = packageStopFindings > 0
    ? `Resolve or split out package stop findings before apply design can proceed: ${packageStopFindings} finding(s), ${vaultRefCount} vault item reference(s).`
    : 'Operator approval is not recorded and no fresh snapshot or guarded execution artifact exists for the refreshed package set.';
  const currentImmediateNextWork = packageStopFindings > 0
    ? 'Split the refreshed dry-run package set into a no-vault-reference safe subset and a vault-reference blocked subset; only the safe subset may move toward final snapshot and guarded dry-run artifact preparation.'
    : 'Human-review the refreshed dry-run package snapshots, then prepare a fresh snapshot and guarded dry-run artifact only after explicit operator approval.';

  const writeReadiness = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_write_readiness_v1',
    ...safety,
    rule: 'This report determines whether Grookai is ready to write. It does not execute writes.',
    conclusion: currentReadinessConclusion,
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
        status: inputs.physicalRecoveryReviewGate?.review_gate_status === 'dry_run_packages_complete_review_required_no_write'
          ? 'complete_no_write'
          : 'next_required_no_write',
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
        name: 'Build consolidated apply design',
        status: inputs.physicalRecoveryApplyDesign?.apply_design_status === 'apply_design_complete_approval_required_no_write'
          ? 'complete_no_write_approval_required'
          : 'not_started',
        required_outputs: [
          'consolidated mutation matrix',
          'rollback design',
          'post-apply verification plan',
          'explicit non-executable status',
        ],
      },
      {
        phase: 'Phase 5',
        name: 'Write approval gate',
        status: inputs.physicalRecoveryApprovalTemplateGuard?.guard_status === 'pass_blank_template_verified_no_write'
          ? 'approval_template_guard_passed_approval_not_recorded_no_write'
          : inputs.physicalRecoveryApprovalRecordTemplate?.approval_recorded === false
          ? 'approval_record_template_complete_approval_not_recorded_no_write'
          : inputs.physicalRecoveryOperatorApproval?.approval_recorded === false
            ? 'approval_packet_complete_approval_not_recorded_no_write'
          : 'not_started',
        required_approval: 'Founder/operator approval after reviewing exact approval packet rows and preserving the approval template package fingerprint.',
      },
      {
        phase: 'Phase 6',
        name: 'Fresh snapshot and guarded execution artifact',
        status: inputs.physicalRecoveryPkg01SplitOneSetPilot?.split_status === 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
          ? 'pkg01_split_one_set_pilot_ready_apply_blocked_no_write'
          : inputs.physicalRecoveryPkg01OperatorApprovalGate?.approval_gate_status === 'ready_for_operator_decision_apply_blocked_no_write'
          ? 'pkg01_operator_approval_gate_ready_apply_blocked_no_write'
          : inputs.physicalRecoveryPkg01ReconcileDryRunPreview?.preview_status === 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
          ? 'pkg01_reconcile_dry_run_preview_complete_apply_blocked_no_write'
          : inputs.physicalRecoveryFutureExecutionArtifactSpec?.spec_status === 'future_execution_artifact_spec_complete_approval_required_no_write'
          ? 'future_execution_artifact_spec_complete_execution_not_created_no_write'
          : inputs.physicalRecoveryPrewriteSnapshotSpec?.spec_status === 'prewrite_snapshot_spec_complete_approval_required_no_write'
          ? 'prewrite_snapshot_spec_complete_snapshot_not_captured_no_write'
          : 'not_started',
        required_approval: 'Only after explicit approval for PKG-01A: capture a final fresh snapshot for the one-set pilot, then create a dry-run-default transaction artifact for PKG-01A only.',
      },
    ],
    evidence_plan: evidencePlan,
    write_packages: writePackages,
  };

  const auditClosure = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_audit_closure_v1',
    ...safety,
    audit_status: inputs.physicalRecoveryPkg01SplitOneSetPilot?.split_status === 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
      ? 'complete_to_pkg01_split_one_set_pilot_boundary_no_write'
      : inputs.physicalRecoveryPkg01OperatorApprovalGate?.approval_gate_status === 'ready_for_operator_decision_apply_blocked_no_write'
      ? 'complete_to_pkg01_operator_approval_gate_boundary_no_write'
      : inputs.physicalRecoveryPkg01ReconcileDryRunPreview?.preview_status === 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
      ? 'complete_to_pkg01_reconcile_dry_run_preview_boundary_no_write'
      : inputs.physicalRecoveryFutureExecutionArtifactSpec?.spec_status === 'future_execution_artifact_spec_complete_approval_required_no_write'
      ? 'complete_to_future_execution_artifact_spec_boundary_no_write'
      : inputs.physicalRecoveryPrewriteSnapshotSpec?.spec_status === 'prewrite_snapshot_spec_complete_approval_required_no_write'
      ? 'complete_to_prewrite_snapshot_spec_boundary_no_write'
      : inputs.physicalRecoveryApprovalTemplateGuard?.guard_status === 'pass_blank_template_verified_no_write'
        ? 'complete_to_validated_approval_template_boundary_no_write'
      : inputs.physicalRecoveryApprovalRecordTemplate?.approval_recorded === false
        ? 'complete_to_fingerprinted_approval_template_boundary_no_write'
      : inputs.physicalRecoveryOperatorApproval?.approval_recorded === false
        ? 'complete_to_operator_approval_packet_boundary_no_write'
      : inputs.physicalRecoveryApplyDesign?.apply_design_status === 'apply_design_complete_approval_required_no_write'
        ? 'complete_to_apply_design_boundary_no_write'
      : 'complete_to_dry_run_package_boundary',
    conclusion: {
      entire_audit_completed_to_current_evidence_boundary: true,
      master_index_complete: (inputs.completion.summary?.source_gap_queue_items ?? 1) === 0,
      ready_for_db_writes: false,
      reason: currentAuditReason,
      strongest_positive_finding: currentStrongestFinding,
      main_blocker: packageStopFindings > 0
        ? currentMainBlocker
        : inputs.physicalRecoveryPkg01SplitOneSetPilot?.split_status === 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
        ? 'PKG-01A is ready for explicit operator decision, but approval is not recorded and no executable guarded transaction artifact exists for the one-set pilot.'
        : inputs.physicalRecoveryPkg01OperatorApprovalGate?.approval_gate_status === 'ready_for_operator_decision_apply_blocked_no_write'
        ? 'PKG-01 is ready for explicit operator decision, but approval is not recorded and no executable guarded transaction artifact exists.'
        : inputs.physicalRecoveryPkg01ReconcileDryRunPreview?.preview_status === 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
        ? 'PKG-01 reconcile dry-run preview exists and passed preview guards, but approval is not recorded and no executable guarded transaction artifact exists.'
        : inputs.physicalRecoveryFutureExecutionArtifactSpec?.spec_status === 'future_execution_artifact_spec_complete_approval_required_no_write'
        ? 'Future execution artifact specification exists, but approval is not recorded, no fresh snapshot has been captured, and no actual guarded execution artifact exists.'
        : inputs.physicalRecoveryPrewriteSnapshotSpec?.spec_status === 'prewrite_snapshot_spec_complete_approval_required_no_write'
        ? 'Pre-write snapshot specification exists, but approval is not recorded, no fresh snapshot has been captured, and no separate guarded execution artifact exists.'
        : inputs.physicalRecoveryApprovalTemplateGuard?.guard_status === 'pass_blank_template_verified_no_write'
          ? 'Approval template guard passes, but approval is not recorded and no fresh snapshot or separate guarded execution artifact exists.'
        : inputs.physicalRecoveryApprovalRecordTemplate?.approval_recorded === false
          ? 'Blank fingerprinted approval record template exists, but approval is not recorded and no fresh snapshot or separate guarded execution artifact exists.'
        : inputs.physicalRecoveryOperatorApproval?.approval_recorded === false
          ? 'Operator approval packet exists, but approval is not recorded and no fresh snapshot or separate guarded execution artifact exists.'
        : inputs.physicalRecoveryApplyDesign?.apply_design_status === 'apply_design_complete_approval_required_no_write'
          ? 'Apply design exists, but no operator approval or separate guarded execution artifact exists.'
        : (inputs.dryRunPackages?.length ?? 0) > 0
          ? 'Generated dry-run packages still need review, approval, and conversion into a separate apply design.'
          : 'No row-level dry-run write package, rollback artifact, or post-apply verification query plan exists yet.',
      finish_blocker_boundary: 'Former finish blockers are adjudicated exclusions outside working truth, not open completion gaps.',
    },
    summary,
    immediate_next_non_write_work: [
      packageStopFindings > 0
        ? currentImmediateNextWork
        : inputs.physicalRecoveryPkg01SplitOneSetPilot?.split_status === 'pkg01_split_into_one_set_pilot_apply_blocked_no_write'
        ? 'Operator decision is now scoped to PKG-01A only: approve the fut2020 one-set pilot for final snapshot/execution-artifact preparation, reject it, or request changes. PKG-01B remains blocked.'
        : inputs.physicalRecoveryPkg01OperatorApprovalGate?.approval_gate_status === 'ready_for_operator_decision_apply_blocked_no_write'
        ? 'Operator decision is the next boundary: approve PKG-01 for final snapshot/execution-artifact preparation, reject PKG-01, or request changes. No write is authorized until approval is explicitly recorded.'
        : inputs.physicalRecoveryPkg01ReconcileDryRunPreview?.preview_status === 'dry_run_reconcile_preview_complete_apply_blocked_no_approval'
        ? 'Human-review the consolidated PKG-01 reconcile dry-run preview, mutation matrix, rollback matrix, approval template, and package fingerprint; leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryFutureExecutionArtifactSpec?.spec_status === 'future_execution_artifact_spec_complete_approval_required_no_write'
        ? 'Human-review the guarded blank approval record template, pre-write snapshot specification, and future execution artifact specification; leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryPrewriteSnapshotSpec?.spec_status === 'prewrite_snapshot_spec_complete_approval_required_no_write'
        ? 'Human-review the guarded blank approval record template and pre-write snapshot specification; leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryApprovalTemplateGuard?.guard_status === 'pass_blank_template_verified_no_write'
          ? 'Human-review the guarded blank approval record template, preserve the package fingerprint, and leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryApprovalRecordTemplate?.approval_recorded === false
          ? 'Human-review the blank fingerprinted approval record template, preserve the package fingerprint, and leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryOperatorApproval?.approval_recorded === false
          ? 'Human-review the operator approval packet row matrix and leave write_ready_now at 0 until approval is explicitly recorded.'
        : inputs.physicalRecoveryApplyDesign?.apply_design_status === 'apply_design_complete_approval_required_no_write'
          ? 'Human-review the consolidated apply design matrix and exact row IDs.'
        : (inputs.dryRunPackages?.length ?? 0) > 0
          ? 'Review generated dry-run package snapshots, rollback requirements, and post-apply verification queries.'
          : 'Generate the first set-specific dry-run write package from the 106-card / 143-printing master-verified physical recovery subset.',
      'Capture a final fresh before-state snapshot for the pilot rows immediately before any future execution artifact is created.',
      'Create the actual guarded execution artifact only for explicitly approved pilot rows after approval and a fresh snapshot.',
      'Keep blocked remainder rows out of any future execution package.',
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
- generated dry-run packages: ${artifact.summary.generated_dry_run_packages.package_count ?? 0}
- generated dry-run package card prints: ${artifact.summary.generated_dry_run_packages.candidate_card_prints ?? 0}
- generated dry-run package printing rows: ${artifact.summary.generated_dry_run_packages.candidate_printing_rows ?? 0}
- physical recovery review gate: ${artifact.summary.physical_recovery_review_gate.review_gate_status}
- physical recovery apply design: ${artifact.summary.physical_recovery_apply_design.apply_design_status}
- physical recovery apply design approval: ${artifact.summary.physical_recovery_apply_design.approval_status}
- physical recovery DB impact translation: ${artifact.summary.physical_recovery_db_impact_translation.exists ? 'complete_no_write' : 'not_generated'}
- physical recovery current DB changed: ${artifact.summary.physical_recovery_db_impact_translation.current_db_changed}
- physical recovery operator approval packet: ${artifact.summary.physical_recovery_operator_approval_packet.approval_status}
- physical recovery approval recorded: ${artifact.summary.physical_recovery_operator_approval_packet.approval_recorded}
- physical recovery approval record template: ${artifact.summary.physical_recovery_operator_approval_record_template.approval_status}
- physical recovery approval template fingerprint: ${artifact.summary.physical_recovery_operator_approval_record_template.package_fingerprint_sha256 ?? 'not_generated'}
- physical recovery approval template write_ready_now: ${artifact.summary.physical_recovery_operator_approval_record_template.write_ready_now}
- physical recovery approval template guard: ${artifact.summary.physical_recovery_operator_approval_template_guard.guard_status}
- physical recovery approval template guard findings: ${artifact.summary.physical_recovery_operator_approval_template_guard.row_guard_findings ?? 0}
- physical recovery approval template guard write_ready_now: ${artifact.summary.physical_recovery_operator_approval_template_guard.write_ready_now}
- physical recovery prewrite snapshot spec: ${artifact.summary.physical_recovery_prewrite_snapshot_spec.spec_status}
- physical recovery prewrite snapshot spec target rows: ${artifact.summary.physical_recovery_prewrite_snapshot_spec.snapshot_target_rows ?? 0}
- physical recovery prewrite snapshot spec db_reads_performed: ${artifact.summary.physical_recovery_prewrite_snapshot_spec.db_reads_performed}
- physical recovery prewrite snapshot spec write_ready_now: ${artifact.summary.physical_recovery_prewrite_snapshot_spec.write_ready_now}
- physical recovery future execution artifact spec: ${artifact.summary.physical_recovery_future_execution_artifact_spec.spec_status}
- physical recovery future execution artifact spec sections: ${artifact.summary.physical_recovery_future_execution_artifact_spec.required_artifact_sections ?? 0}
- physical recovery future execution artifact spec target rows: ${artifact.summary.physical_recovery_future_execution_artifact_spec.future_execution_targets ?? 0}
- physical recovery future execution artifact spec db_reads_performed: ${artifact.summary.physical_recovery_future_execution_artifact_spec.db_reads_performed}
- physical recovery future execution artifact spec write_ready_now: ${artifact.summary.physical_recovery_future_execution_artifact_spec.write_ready_now}
- physical recovery PKG-01 reconcile dry-run preview: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.preview_status}
- physical recovery PKG-01 reconcile dry-run mutation rows: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.mutation_matrix_rows ?? 0}
- physical recovery PKG-01 reconcile dry-run rollback rows: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.rollback_matrix_rows ?? 0}
- physical recovery PKG-01 reconcile dry-run db_reads_performed: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.db_reads_performed}
- physical recovery PKG-01 reconcile dry-run db_writes_performed: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.db_writes_performed}
- physical recovery PKG-01 reconcile dry-run write_ready_now: ${artifact.summary.physical_recovery_pkg01_reconcile_dry_run_preview.write_ready_now}
- physical recovery PKG-01 operator approval gate: ${artifact.summary.physical_recovery_pkg01_operator_approval_gate.approval_gate_status}
- physical recovery PKG-01 operator approval gate mutation rows: ${artifact.summary.physical_recovery_pkg01_operator_approval_gate.mutation_matrix_rows ?? 0}
- physical recovery PKG-01 operator approval gate rollback rows: ${artifact.summary.physical_recovery_pkg01_operator_approval_gate.rollback_matrix_rows ?? 0}
- physical recovery PKG-01 operator approval gate write_ready_now: ${artifact.summary.physical_recovery_pkg01_operator_approval_gate.write_ready_now}
- physical recovery PKG-01 split status: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.split_status}
- physical recovery pilot package: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.pilot_package_id ?? 'not_generated'}
- physical recovery pilot set: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.pilot_set_key ?? 'not_generated'}
- physical recovery pilot card rows: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.pilot_card_print_rows ?? 0}
- physical recovery pilot child printings: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.pilot_child_printing_rows_verified ?? 0}
- physical recovery remainder card rows: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.remainder_card_print_rows ?? 0}
- physical recovery split write_ready_now: ${artifact.summary.physical_recovery_pkg01_split_one_set_pilot.write_ready_now}

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
    (phase.allowed_actions ?? phase.required_outputs ?? (phase.required_approval ? [phase.required_approval] : [])).join('; '),
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

- audit_status: ${artifact.audit_status}
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
    dryRunPackages: await readDryRunPackages(),
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
    physicalRecoveryReviewGate: await readOptionalJson(REVIEW_GATE_FILE, null),
    physicalRecoveryApplyDesign: await readOptionalJson(APPLY_DESIGN_FILE, null),
    physicalRecoveryDbImpact: await readOptionalJson(DB_IMPACT_FILE, null),
    physicalRecoveryOperatorApproval: await readOptionalJson(OPERATOR_APPROVAL_FILE, null),
    physicalRecoveryApprovalRecordTemplate: await readOptionalJson(OPERATOR_APPROVAL_RECORD_TEMPLATE_FILE, null),
    physicalRecoveryApprovalTemplateGuard: await readOptionalJson(OPERATOR_APPROVAL_TEMPLATE_GUARD_FILE, null),
    physicalRecoveryPrewriteSnapshotSpec: await readOptionalJson(PREWRITE_SNAPSHOT_SPEC_FILE, null),
    physicalRecoveryFutureExecutionArtifactSpec: await readOptionalJson(FUTURE_EXECUTION_ARTIFACT_SPEC_FILE, null),
    physicalRecoveryPkg01ReconcileDryRunPreview: await readOptionalJson(PKG01_RECONCILE_DRY_RUN_PREVIEW_FILE, null),
    physicalRecoveryPkg01OperatorApprovalGate: await readOptionalJson(PKG01_OPERATOR_APPROVAL_GATE_FILE, null),
    physicalRecoveryPkg01SplitOneSetPilot: await readOptionalJson(PKG01_SPLIT_ONE_SET_PILOT_FILE, null),
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
