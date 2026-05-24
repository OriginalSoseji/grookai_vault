import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_action_plan_v1.json',
  'english_master_index_action_plan_v1.md',
  'english_master_index_truth_readiness_v1.json',
  'english_master_index_truth_readiness_v1.md',
  'english_master_index_repair_priority_v1.json',
  'english_master_index_repair_priority_v1.md',
];

const SOURCE_ACQUISITION_CATEGORIES = {
  reverse_holo: [
    'reverse_holo_overgeneration_candidate',
    'reverse_holo_single_source',
    'api_agreed_reverse_holo_needs_human_source',
  ],
  holo: [
    'holo_overgeneration_candidate',
    'holo_single_source',
    'api_agreed_holo_needs_human_source',
  ],
  parallel: [
    'modern_parallel_exact_finish_needs_source',
    'modern_parallel_set_review',
  ],
  promo: [
    'promo_family_source_coverage_gap',
    'promo_family_source_only_candidate',
    'promo_family_single_source',
    'api_agreed_promo_family_needs_human_source',
  ],
  subset: [
    'subset_or_numbering_alias_review',
    'subset_alias_or_numbering_gap',
    'subset_alias_single_source',
    'api_agreed_subset_alias_needs_human_source',
  ],
  legacy: [
    'first_edition_policy_gap',
    'legacy_or_old_era_single_source',
    'api_agreed_legacy_or_old_era_needs_human_source',
  ],
};

const LIKELY_GENERATION_BUG_CATEGORIES = [
  'holo_overgeneration_candidate',
  'reverse_holo_overgeneration_candidate',
  'modern_parallel_exact_finish_needs_source',
  'modern_parallel_set_review',
  'normal_variant_not_in_index_review',
  'known_card_unsupported_finish_review',
  'invalid_or_unknown_card_number_review',
];

const BLOCKING_CATEGORIES = [
  'set_unmapped',
  'name_mismatch_needs_review',
  'unsupported_by_current_index',
  'missing_from_grookai',
  'candidate_unconfirmed_by_index',
  'api_agreed_by_index',
];

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value.toFixed(2))));
}

function addCount(target, key, count) {
  target[key] = (target[key] ?? 0) + Number(count ?? 0);
}

function sumValues(object) {
  return Object.values(object ?? {}).reduce((total, value) => total + Number(value ?? 0), 0);
}

function topEntries(object, limit = 25) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function setBucket(setMap, key, setName = null) {
  const normalizedKey = String(key ?? 'unknown').trim() || 'unknown';
  if (!setMap.has(normalizedKey)) {
    setMap.set(normalizedKey, {
      set_key: normalizedKey,
      set_name: setName ?? (normalizedKey === 'me02.5' ? 'Ascended Heroes' : null),
      status_counts: {},
      triage_category_counts: {},
      source_acquisition_counts: {
        reverse_holo: 0,
        holo: 0,
        parallel: 0,
        promo: 0,
        subset: 0,
        legacy: 0,
      },
      likely_generation_bug_count: 0,
      source_status: {},
      source_evidence_rows: {},
      readiness: null,
    });
  }
  const bucket = setMap.get(normalizedKey);
  if (!bucket.set_name && (setName || normalizedKey === 'me02.5')) {
    bucket.set_name = setName ?? 'Ascended Heroes';
  }
  return bucket;
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

function collectStatusCounts(setMap, grookaiAudit) {
  for (const [key, count] of Object.entries(grookaiAudit.summary?.by_set_status ?? {})) {
    const separatorIndex = key.lastIndexOf('|');
    if (separatorIndex < 0) continue;
    const setKey = key.slice(0, separatorIndex);
    const status = key.slice(separatorIndex + 1);
    const bucket = setBucket(setMap, setKey);
    addCount(bucket.status_counts, status, count);
  }
}

function collectSetMetadata(setMap, setAudit) {
  for (const set of setAudit.sets ?? []) {
    const bucket = setBucket(setMap, set.key, set.set_name);
    bucket.source_status = set.source_status ?? {};
    for (const source of set.source_availability ?? []) {
      bucket.source_evidence_rows[source.source_key] = source.evidence_rows ?? 0;
    }
  }
}

function addCategoryToSourceLanes(bucket, category, count) {
  for (const [lane, categories] of Object.entries(SOURCE_ACQUISITION_CATEGORIES)) {
    if (categories.includes(category)) {
      bucket.source_acquisition_counts[lane] += Number(count ?? 0);
    }
  }
  if (LIKELY_GENERATION_BUG_CATEGORIES.includes(category)) {
    bucket.likely_generation_bug_count += Number(count ?? 0);
  }
}

function collectTriageCategories(setMap, payload, setFieldName) {
  for (const [category, entry] of Object.entries(payload.categories ?? {})) {
    const bySet = entry[setFieldName] ?? {};
    for (const [setKey, count] of Object.entries(bySet)) {
      const bucket = setBucket(setMap, setKey);
      addCount(bucket.triage_category_counts, category, count);
      addCategoryToSourceLanes(bucket, category, count);
    }
  }
}

function readinessForSet(bucket) {
  const statuses = bucket.status_counts;
  const master = statuses.master_verified_by_index ?? 0;
  const api = statuses.api_agreed_by_index ?? 0;
  const candidate = statuses.candidate_unconfirmed_by_index ?? 0;
  const unsupported = statuses.unsupported_by_current_index ?? 0;
  const missing = statuses.missing_from_grookai ?? 0;
  const nameMismatch = statuses.name_mismatch_needs_review ?? 0;
  const unmapped = statuses.set_unmapped ?? 0;
  const total = Math.max(sumValues(statuses), 1);
  const sourceTotal = Math.max(master + api + candidate + missing, 1);
  const knownComparisonTotal = Math.max(master + api + candidate + unsupported + missing + nameMismatch + unmapped, 1);

  const masterVerifiedRatio = ratio(master, knownComparisonTotal);
  const candidateRatio = ratio(candidate, knownComparisonTotal);
  const unsupportedRatio = ratio(unsupported, knownComparisonTotal);
  const missingRatio = ratio(missing, knownComparisonTotal);
  const aliasIssueRatio = ratio(unmapped + nameMismatch + (bucket.source_acquisition_counts.subset ?? 0), knownComparisonTotal);

  const sourceCoverageScore = clamp(((master * 1) + (api * 0.7) + (candidate * 0.35)) / sourceTotal * 100);
  const humanEvidenceScore = clamp(masterVerifiedRatio * 100);
  const finishProfileScore = clamp(100 - (unsupportedRatio * 100) - (bucket.likely_generation_bug_count / total * 55));
  const aliasStabilityScore = clamp(100 - (aliasIssueRatio * 100));
  const conflictScore = clamp(100 - (ratio(nameMismatch + unmapped, knownComparisonTotal) * 100));
  const readinessScore = clamp(
    (sourceCoverageScore * 0.25)
    + (finishProfileScore * 0.22)
    + (humanEvidenceScore * 0.2)
    + (aliasStabilityScore * 0.2)
    + (conflictScore * 0.13),
  );

  let classification = 'blocked';
  if (masterVerifiedRatio >= 0.95 && unsupported === 0 && missing === 0 && nameMismatch === 0 && unmapped === 0) {
    classification = 'proof_ready';
  } else if (unmapped > 0 || nameMismatch > 0 || aliasIssueRatio > 0.25 || unsupportedRatio > 0.2) {
    classification = 'blocked';
  } else if (humanEvidenceScore > 0 || (sourceCoverageScore >= 75 && unsupportedRatio <= 0.05 && missingRatio <= 0.05)) {
    classification = 'high_confidence';
  } else if (sourceCoverageScore >= 50 && unsupportedRatio <= 0.15) {
    classification = 'moderate_confidence';
  } else {
    classification = 'source_limited';
  }

  return {
    classification,
    readiness_score: readinessScore,
    source_coverage_score: sourceCoverageScore,
    finish_profile_score: finishProfileScore,
    human_evidence_score: humanEvidenceScore,
    alias_stability_score: aliasStabilityScore,
    conflict_score: conflictScore,
    candidate_ratio: candidateRatio,
    master_verified_ratio: masterVerifiedRatio,
    unsupported_ratio: unsupportedRatio,
    missing_ratio: missingRatio,
    counts: {
      total_rows_considered: knownComparisonTotal,
      master_verified_by_index: master,
      api_agreed_by_index: api,
      candidate_unconfirmed_by_index: candidate,
      unsupported_by_current_index: unsupported,
      missing_from_grookai: missing,
      name_mismatch_needs_review: nameMismatch,
      set_unmapped: unmapped,
      likely_generation_bug_count: bucket.likely_generation_bug_count,
    },
  };
}

function repairPriorityForSet(bucket) {
  const readiness = bucket.readiness;
  const counts = readiness.counts;
  const total = Math.max(counts.total_rows_considered, 1);
  const unsupported = counts.unsupported_by_current_index;
  const candidate = counts.candidate_unconfirmed_by_index;
  const missing = counts.missing_from_grookai;
  const aliasBlocked = counts.name_mismatch_needs_review + counts.set_unmapped + bucket.source_acquisition_counts.subset;
  const severeOvergeneration = bucket.likely_generation_bug_count;

  const sourceMaturity = readiness.source_coverage_score;
  const finishComplexityPenalty = clamp((severeOvergeneration / total) * 100);
  const aliasPenalty = clamp((aliasBlocked / total) * 100);
  const repairSafety = clamp((readiness.alias_stability_score * 0.45) + (readiness.finish_profile_score * 0.4) + (readiness.conflict_score * 0.15));
  const collectorVisibilityBoost = /^(sv|swsh|sm|xy|base|ecard|neo|gym|ex)/.test(bucket.set_key) ? 7 : 0;
  const overgenerationPriorityBoost = clamp((unsupported / total) * 25, 0, 12);
  const priorityScore = clamp(
    (sourceMaturity * 0.32)
    + (repairSafety * 0.34)
    + (readiness.human_evidence_score * 0.14)
    + collectorVisibilityBoost
    + overgenerationPriorityBoost
    - (finishComplexityPenalty * 0.2)
    - (aliasPenalty * 0.25)
    - (ratio(candidate + missing, total) * 12),
  );

  let recommendation = 'blocked';
  if (readiness.classification === 'proof_ready') {
    recommendation = 'already_proven_monitor_only';
  } else if (readiness.classification === 'high_confidence' && unsupported <= 10 && aliasBlocked === 0) {
    recommendation = 'controlled_proof_loop_candidate';
  } else if (unsupported > 0 && severeOvergeneration > 0 && aliasBlocked === 0) {
    recommendation = 'source_acquisition_then_overgeneration_review';
  } else if (candidate > 0 || missing > 0) {
    recommendation = 'source_acquisition_first';
  } else if (aliasBlocked > 0) {
    recommendation = 'alias_governance_first';
  }

  return {
    set_key: bucket.set_key,
    set_name: bucket.set_name,
    priority_score: priorityScore,
    recommendation,
    readiness_classification: readiness.classification,
    readiness_score: readiness.readiness_score,
    source_maturity_score: sourceMaturity,
    repair_safety_score: repairSafety,
    unsupported_count: unsupported,
    candidate_count: candidate,
    missing_count: missing,
    alias_blocked_count: aliasBlocked,
    likely_generation_bug_count: severeOvergeneration,
    expected_repair_safety: repairSafety >= 75 ? 'higher' : repairSafety >= 50 ? 'moderate' : 'low',
  };
}

function buildAlreadyProven(readinessRows) {
  return readinessRows
    .filter((row) => row.classification === 'proof_ready')
    .map((row) => ({
      set: row.set_key,
      set_name: row.set_name,
      verified_printings: row.counts.master_verified_by_index,
      verified_percent: pct(row.counts.master_verified_by_index, row.counts.total_rows_considered),
      supported_finish_profiles: ['normal', 'holo', 'reverse', 'pokeball', 'cosmos', 'rocket_reverse'],
      apply_status: row.set_key === 'me02.5' ? 'controlled_apply_completed_and_post_apply_verified' : 'proof_ready_no_apply_record_in_global_artifacts',
      rollback_artifact_exists: row.set_key === 'me02.5' ? 'not_verified_by_this_action_plan' : 'unknown',
    }));
}

function summarizeReadiness(readinessRows) {
  const summary = {};
  for (const row of readinessRows) addCount(summary, row.classification, 1);
  return summary;
}

function blockedReasons(row) {
  const reasons = [];
  if (row.counts.set_unmapped) reasons.push('set_unmapped');
  if (row.counts.name_mismatch_needs_review) reasons.push('name_mismatch_needs_review');
  if (row.counts.unsupported_by_current_index) reasons.push('unsupported_by_current_index');
  if (row.counts.candidate_unconfirmed_by_index) reasons.push('candidate_unconfirmed');
  if (row.counts.api_agreed_by_index) reasons.push('api_agreed_not_master_truth');
  if (row.counts.missing_from_grookai) reasons.push('missing_from_grookai_not_insertion_authority');
  if (!row.counts.master_verified_by_index) reasons.push('no_master_verified_coverage');
  return reasons;
}

function buildActionPlan({ generatedAt, masterIndex, grookaiAudit, triages, readinessRows, repairRows }) {
  const alreadyProven = buildAlreadyProven(readinessRows);
  const blockedRows = readinessRows
    .filter((row) => row.classification === 'blocked')
    .sort((left, right) => right.counts.total_rows_considered - left.counts.total_rows_considered)
    .slice(0, 75)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      readiness_score: row.readiness_score,
      reasons: blockedReasons(row),
      counts: row.counts,
    }));
  const controlledCandidates = repairRows
    .filter((row) => row.recommendation !== 'already_proven_monitor_only')
    .slice(0, 75);

  return {
    version: 'ENGLISH_MASTER_INDEX_ACTION_PLAN_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_reports: [
      'english_master_index_v1.json',
      'english_master_index_grookai_audit_v1.json',
      'english_master_index_set_unmapped_triage_v1.json',
      'english_master_index_name_mismatch_triage_v1.json',
      'english_master_index_unsupported_triage_v1.json',
      'english_master_index_missing_from_grookai_triage_v1.json',
      'english_master_index_candidate_unconfirmed_triage_v1.json',
      'english_master_index_api_agreed_triage_v1.json',
    ],
    principles: {
      unsupported_by_current_index_is_not_deletion_authority: true,
      missing_from_grookai_is_not_insertion_authority: true,
      candidate_unconfirmed_is_not_truth: true,
      api_agreed_is_not_master_truth: true,
      only_master_verified_may_eventually_participate_in_controlled_normalization: true,
    },
    safety_checks: {
      report_only_generator: 'scripts/audits/verified_master_set_index_v1_build_action_plan.mjs',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_runners_imported: false,
      maintenance_mutation_code_touched: false,
    },
    summary: {
      master_index_sets: masterIndex.summary?.sets ?? null,
      master_index_evidence_rows: masterIndex.summary?.evidence_rows ?? null,
      grookai_printing_rows: grookaiAudit.summary?.grookai_printing_rows ?? null,
      index_printing_rows: grookaiAudit.summary?.index_printing_rows ?? null,
      readiness_by_classification: summarizeReadiness(readinessRows),
      global_status_counts: grookaiAudit.summary?.by_status ?? {},
    },
    sections: {
      already_proven: alreadyProven,
      do_not_touch: {
        explanation: 'These are not mutation-safe.',
        statuses: BLOCKING_CATEGORIES,
        counts: grookaiAudit.summary?.by_status ?? {},
      },
      needs_source_acquisition: Object.fromEntries(
        Object.entries(SOURCE_ACQUISITION_CATEGORIES).map(([lane, categories]) => [
          lane,
          {
            categories,
            total_rows: categories.reduce((total, category) => total + sumTriagesByCategory(triages, category), 0),
          },
        ]),
      ),
      needs_alias_resolution: {
        categories: [
          'set_unmapped',
          'name_mismatch_needs_review',
          'subset_or_numbering_alias_review',
          'subset_alias_or_numbering_gap',
          'subset_alias_single_source',
          'api_agreed_subset_alias_needs_human_source',
        ],
        top_sets: readinessRows
          .map((row) => ({
            set_key: row.set_key,
            set_name: row.set_name,
            alias_risk_count: row.counts.set_unmapped + row.counts.name_mismatch_needs_review,
            subset_source_need_count: row.source_acquisition_counts?.subset ?? 0,
          }))
          .filter((row) => row.alias_risk_count || row.subset_source_need_count)
          .sort((left, right) => (right.alias_risk_count + right.subset_source_need_count) - (left.alias_risk_count + left.subset_source_need_count))
          .slice(0, 50),
      },
      likely_generation_bug_candidates: {
        explanation: 'High suspicion only. These are not deletion candidates.',
        categories: LIKELY_GENERATION_BUG_CATEGORIES,
        total_rows: readinessRows.reduce((total, row) => total + row.counts.likely_generation_bug_count, 0),
        top_sets: readinessRows
          .filter((row) => row.counts.likely_generation_bug_count > 0)
          .sort((left, right) => right.counts.likely_generation_bug_count - left.counts.likely_generation_bug_count)
          .slice(0, 50)
          .map((row) => ({
            set_key: row.set_key,
            set_name: row.set_name,
            likely_generation_bug_count: row.counts.likely_generation_bug_count,
            unsupported_count: row.counts.unsupported_by_current_index,
          })),
      },
      blocked_from_apply: blockedRows,
      controlled_set_repair_candidates: controlledCandidates,
    },
  };
}

function sumTriagesByCategory(triages, category) {
  let total = 0;
  for (const triage of Object.values(triages)) {
    total += triage.summary?.by_category?.[category] ?? 0;
  }
  return total;
}

function buildTruthReadinessReport(generatedAt, readinessRows) {
  return {
    version: 'ENGLISH_MASTER_INDEX_TRUTH_READINESS_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    scoring_model: {
      dimensions: [
        'source_coverage_score',
        'finish_profile_score',
        'human_evidence_score',
        'alias_stability_score',
        'conflict_score',
        'candidate_ratio',
        'master_verified_ratio',
        'unsupported_ratio',
      ],
      classifications: ['proof_ready', 'high_confidence', 'moderate_confidence', 'source_limited', 'blocked'],
    },
    summary: summarizeReadiness(readinessRows),
    sets: readinessRows,
  };
}

function buildRepairPriorityReport(generatedAt, repairRows) {
  return {
    version: 'ENGLISH_MASTER_INDEX_REPAIR_PRIORITY_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'This report ranks future proof-loop targets only. It does not schedule, apply, quarantine, insert, update, or delete data.',
    ordering: [
      'high confidence + low conflict',
      'modern sets with strong source support',
      'sets with severe overgeneration risk after source acquisition',
      'high collector visibility sets',
      'complex legacy sets later',
    ],
    summary: {
      total_ranked_sets: repairRows.length,
      by_recommendation: repairRows.reduce((counts, row) => {
        addCount(counts, row.recommendation, 1);
        return counts;
      }, {}),
    },
    ranked_sets: repairRows,
  };
}

function buildActionPlanMarkdown(actionPlan) {
  const statusRows = Object.entries(actionPlan.summary.global_status_counts).map(([status, count]) => [status, count]);
  const readinessRows = Object.entries(actionPlan.summary.readiness_by_classification).map(([classification, count]) => [classification, count]);
  const provenRows = actionPlan.sections.already_proven.map((row) => [
    row.set,
    row.set_name ?? '',
    row.verified_printings,
    row.verified_percent,
    row.supported_finish_profiles.join(', '),
    row.apply_status,
    row.rollback_artifact_exists,
  ]);
  const sourceRows = Object.entries(actionPlan.sections.needs_source_acquisition).map(([lane, entry]) => [
    lane,
    entry.total_rows,
    entry.categories.join(', '),
  ]);
  const aliasRows = actionPlan.sections.needs_alias_resolution.top_sets.slice(0, 25).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.alias_risk_count,
    row.subset_source_need_count,
  ]);
  const generationRows = actionPlan.sections.likely_generation_bug_candidates.top_sets.slice(0, 25).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.likely_generation_bug_count,
    row.unsupported_count,
  ]);
  const blockedRows = actionPlan.sections.blocked_from_apply.slice(0, 30).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.readiness_score,
    row.reasons.join(', '),
    row.counts.total_rows_considered,
  ]);
  const repairRows = actionPlan.sections.controlled_set_repair_candidates.slice(0, 25).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.priority_score,
    row.recommendation,
    row.readiness_classification,
    row.expected_repair_safety,
  ]);
  return [
    '# English Master Index Action Plan V1',
    '',
    `Generated: ${actionPlan.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.',
    '',
    'Global principles:',
    '',
    '- `unsupported_by_current_index` is not deletion authority.',
    '- `missing_from_grookai` is not insertion authority.',
    '- `candidate_unconfirmed` is not truth.',
    '- `api_agreed` is not master truth.',
    '- Only `master_verified` evidence may eventually participate in controlled normalization.',
    '',
    '## Safety Confirmation',
    '',
    markdownTable(['check', 'value'], Object.entries(actionPlan.safety_checks).map(([key, value]) => [key, value])),
    '',
    '## Global Status Counts',
    '',
    markdownTable(['status', 'count'], statusRows),
    '',
    '## Truth Readiness Summary',
    '',
    markdownTable(['classification', 'set_count'], readinessRows),
    '',
    '## 1. Already Proven',
    '',
    provenRows.length
      ? markdownTable(['set', 'name', 'verified_printings', 'verified_percent', 'finish_profiles', 'apply_status', 'rollback_artifact_exists'], provenRows)
      : 'No sets are globally proof-ready in the current artifacts.',
    '',
    '## 2. Do Not Touch',
    '',
    actionPlan.sections.do_not_touch.explanation,
    '',
    markdownTable(['status', 'count'], statusRows.filter(([status]) => BLOCKING_CATEGORIES.includes(status))),
    '',
    '## 3. Needs Source Acquisition',
    '',
    markdownTable(['lane', 'rows', 'categories'], sourceRows),
    '',
    '## 4. Needs Alias Resolution',
    '',
    markdownTable(['set', 'name', 'alias_risk_count', 'subset_source_need_count'], aliasRows),
    '',
    '## 5. Likely Generation Bug Candidates',
    '',
    actionPlan.sections.likely_generation_bug_candidates.explanation,
    '',
    markdownTable(['set', 'name', 'likely_generation_bug_count', 'unsupported_count'], generationRows),
    '',
    '## 6. Blocked From Apply',
    '',
    markdownTable(['set', 'name', 'readiness_score', 'reasons', 'rows'], blockedRows),
    '',
    '## 7. Controlled Set Repair Candidates',
    '',
    repairRows.length
      ? markdownTable(['set', 'name', 'priority_score', 'recommendation', 'readiness', 'expected_repair_safety'], repairRows)
      : 'No broad repair candidate should apply automatically. Use this report to choose the next Ascended Heroes-style proof loop.',
    '',
  ].join('\n');
}

function buildTruthReadinessMarkdown(report) {
  const summaryRows = Object.entries(report.summary).map(([classification, count]) => [classification, count]);
  const setRows = report.sets.slice(0, 125).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.classification,
    row.readiness_score,
    row.source_coverage_score,
    row.finish_profile_score,
    row.human_evidence_score,
    row.alias_stability_score,
    row.unsupported_ratio,
    row.candidate_ratio,
  ]);
  return [
    '# English Master Index Truth Readiness V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit only. Scores are planning signals only and do not authorize mutation.',
    '',
    '## Summary',
    '',
    markdownTable(['classification', 'set_count'], summaryRows),
    '',
    '## Set Readiness',
    '',
    markdownTable([
      'set',
      'name',
      'classification',
      'readiness',
      'source',
      'finish',
      'human',
      'alias',
      'unsupported_ratio',
      'candidate_ratio',
    ], setRows),
    '',
  ].join('\n');
}

function buildRepairPriorityMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_recommendation).map(([recommendation, count]) => [recommendation, count]);
  const rankedRows = report.ranked_sets.slice(0, 125).map((row) => [
    row.set_key,
    row.set_name ?? '',
    row.priority_score,
    row.recommendation,
    row.readiness_classification,
    row.unsupported_count,
    row.candidate_count,
    row.missing_count,
    row.alias_blocked_count,
    row.expected_repair_safety,
  ]);
  return [
    '# English Master Index Repair Priority V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.rule,
    '',
    '## Recommendation Summary',
    '',
    markdownTable(['recommendation', 'set_count'], summaryRows),
    '',
    '## Ranked Future Proof-Loop Targets',
    '',
    markdownTable([
      'set',
      'name',
      'priority',
      'recommendation',
      'readiness',
      'unsupported',
      'candidate',
      'missing',
      'alias_blocked',
      'safety',
    ], rankedRows),
    '',
  ].join('\n');
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [
    masterIndex,
    grookaiAudit,
    setAudit,
    setUnmapped,
    nameMismatch,
    unsupported,
    missing,
    candidate,
    apiAgreed,
  ] = await Promise.all([
    readJson('english_master_index_v1.json'),
    readJson('english_master_index_grookai_audit_v1.json'),
    readJson('english_master_index_set_audit_v1.json'),
    readJson('english_master_index_set_unmapped_triage_v1.json'),
    readJson('english_master_index_name_mismatch_triage_v1.json'),
    readJson('english_master_index_unsupported_triage_v1.json'),
    readJson('english_master_index_missing_from_grookai_triage_v1.json'),
    readJson('english_master_index_candidate_unconfirmed_triage_v1.json'),
    readJson('english_master_index_api_agreed_triage_v1.json'),
  ]);

  const triages = {
    setUnmapped,
    nameMismatch,
    unsupported,
    missing,
    candidate,
    apiAgreed,
  };
  const setMap = new Map();
  collectSetMetadata(setMap, setAudit);
  collectStatusCounts(setMap, grookaiAudit);
  collectTriageCategories(setMap, setUnmapped, 'by_set_code');
  collectTriageCategories(setMap, nameMismatch, 'by_set_code');
  collectTriageCategories(setMap, unsupported, 'by_set_code');
  collectTriageCategories(setMap, missing, 'by_set_key');
  collectTriageCategories(setMap, candidate, 'by_set_code');
  collectTriageCategories(setMap, apiAgreed, 'by_set_code');

  const readinessRows = [...setMap.values()].map((bucket) => {
    bucket.readiness = readinessForSet(bucket);
    return {
      set_key: bucket.set_key,
      set_name: bucket.set_name,
      source_status: bucket.source_status,
      source_evidence_rows: bucket.source_evidence_rows,
      source_acquisition_counts: bucket.source_acquisition_counts,
      ...bucket.readiness,
    };
  }).sort((left, right) => right.readiness_score - left.readiness_score || left.set_key.localeCompare(right.set_key));

  const repairRows = [...setMap.values()]
    .map(repairPriorityForSet)
    .sort((left, right) => right.priority_score - left.priority_score || left.set_key.localeCompare(right.set_key));

  const actionPlan = buildActionPlan({
    generatedAt,
    masterIndex,
    grookaiAudit,
    triages,
    readinessRows,
    repairRows,
  });
  const truthReadiness = buildTruthReadinessReport(generatedAt, readinessRows);
  const repairPriority = buildRepairPriorityReport(generatedAt, repairRows);

  await Promise.all([
    writeJson('english_master_index_action_plan_v1.json', actionPlan),
    writeMarkdown('english_master_index_action_plan_v1.md', buildActionPlanMarkdown(actionPlan)),
    writeJson('english_master_index_truth_readiness_v1.json', truthReadiness),
    writeMarkdown('english_master_index_truth_readiness_v1.md', buildTruthReadinessMarkdown(truthReadiness)),
    writeJson('english_master_index_repair_priority_v1.json', repairPriority),
    writeMarkdown('english_master_index_repair_priority_v1.md', buildRepairPriorityMarkdown(repairPriority)),
  ]);

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    readiness_summary: truthReadiness.summary,
    repair_priority_summary: repairPriority.summary.by_recommendation,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[master-index-action-plan] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
