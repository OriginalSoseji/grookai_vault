const BLOCKING_FLAGS = new Set([
  'ambiguous_variant',
  'foreign_language',
  'graded_or_slab',
  'lot_or_bundle',
  'missing_price',
  'missing_source_url',
  'proxy_or_reprint',
  'sealed_product',
  'source_terms_unclear',
  'world_championship_replica',
  'wrong_finish',
  'wrong_number',
  'wrong_print_run',
  'wrong_set',
]);

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === '') {
      continue;
    }
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function uniqueCount(rows, getKey) {
  return new Set(rows.map(getKey).filter(Boolean)).size;
}

function candidateHasBlockingFlag(candidate) {
  return (candidate.exclusion_flags ?? []).some((flag) => BLOCKING_FLAGS.has(flag));
}

function reviewDisposition(candidate) {
  const flags = new Set(candidate.exclusion_flags ?? []);
  if (flags.has('wrong_set')) return 'blocked_wrong_set';
  if (flags.has('wrong_number')) return 'blocked_wrong_number';
  if (flags.has('wrong_print_run')) return 'blocked_wrong_print_run';
  if (flags.has('wrong_finish')) return 'blocked_wrong_finish';
  if (flags.has('missing_price')) return 'blocked_missing_price';
  if (flags.has('missing_source_url')) return 'blocked_missing_source_url';
  if (flags.has('ambiguous_variant')) return 'review_ambiguous_variant';
  if (flags.has('graded_or_slab')) return 'review_graded_or_slab';
  if (flags.has('sealed_product')) return 'review_sealed_product';
  if (flags.has('world_championship_replica')) return 'review_world_championship_replica';
  if (candidate.match_confidence_hint === 'high') return 'review_high_confidence_reference';
  if (candidate.match_confidence_hint === 'medium') return 'review_medium_confidence_reference';
  return 'review_low_confidence_reference';
}

function topRows(rows, limit) {
  return rows.slice(0, limit).map((row) => ({ ...row }));
}

export function buildMarketEvidenceReviewGateV1({
  acquisition,
  generatedAt = new Date().toISOString(),
  sampleLimit = 50,
} = {}) {
  if (!acquisition || typeof acquisition !== 'object') {
    throw new Error('[market-evidence-review-gate] acquisition is required');
  }
  if (acquisition.contract !== 'MARKET_EVIDENCE_ENGINE_V1') {
    throw new Error('[market-evidence-review-gate] acquisition contract mismatch');
  }
  if (!Array.isArray(acquisition.candidate_evidence)) {
    throw new Error('[market-evidence-review-gate] candidate_evidence must be an array');
  }
  if (!Array.isArray(acquisition.reviewed_targets)) {
    throw new Error('[market-evidence-review-gate] reviewed_targets must be an array');
  }
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) {
    throw new Error('[market-evidence-review-gate] sampleLimit must be a positive integer');
  }

  const candidates = acquisition.candidate_evidence;
  const reviewedTargets = acquisition.reviewed_targets;
  const candidatesWithBlockingFlags = candidates.filter(candidateHasBlockingFlag);
  const candidatesWithoutBlockingFlags = candidates.filter((candidate) => !candidateHasBlockingFlag(candidate));
  const directPublishableCandidates = candidates.filter((candidate) => candidate.can_publish_price_directly === true);
  const nonReviewGatedCandidates = candidates.filter((candidate) => candidate.needs_review !== true);
  const noMatchTargets = reviewedTargets.filter((target) => target.status === 'no_pricecharting_csv_match');

  const dispositionRows = candidates.map((candidate) => ({
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    raw_title: candidate.raw_title,
    raw_price: candidate.raw_price,
    condition_hint: candidate.condition_hint,
    match_confidence_hint: candidate.match_confidence_hint,
    disposition: reviewDisposition(candidate),
    exclusion_flags: candidate.exclusion_flags ?? [],
    can_publish_price_directly: candidate.can_publish_price_directly,
    needs_review: candidate.needs_review,
  }));

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-05A_RAW_EVIDENCE_REVIEW_GATE_V1',
    mode: 'local_review_gate_only',
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
      raw_evidence_objects_created: false,
      raw_evidence_objects_persisted_to_db: false,
      review_artifact_created: true,
    },
    input_summary: {
      source_phase: acquisition.phase ?? null,
      source_generated_at: acquisition.generated_at ?? null,
      candidate_evidence_count: candidates.length,
      reviewed_target_count: reviewedTargets.length,
    },
    summary: {
      reviewed_target_count: reviewedTargets.length,
      targets_with_candidate_evidence: uniqueCount(candidates, (candidate) => candidate.card_print_id),
      targets_without_candidate_evidence: noMatchTargets.length,
      candidate_evidence_count: candidates.length,
      candidates_without_blocking_flags: candidatesWithoutBlockingFlags.length,
      candidates_with_blocking_flags: candidatesWithBlockingFlags.length,
      direct_publishable_candidate_count: directPublishableCandidates.length,
      non_review_gated_candidate_count: nonReviewGatedCandidates.length,
      review_required_candidate_count: candidates.filter((candidate) => candidate.needs_review === true).length,
      warehouse_ready_reference_candidate_count: candidates.filter((candidate) => (
        candidate.source_url
        && candidate.raw_price !== null
        && candidate.can_publish_price_directly === false
        && candidate.needs_review === true
      )).length,
    },
    counts: {
      target_status_counts: countBy(reviewedTargets, (target) => target.status),
      source_counts: countBy(candidates, (candidate) => candidate.source),
      confidence_counts: countBy(candidates, (candidate) => candidate.match_confidence_hint),
      condition_counts: countBy(candidates, (candidate) => candidate.condition_hint),
      disposition_counts: countBy(dispositionRows, (row) => row.disposition),
      exclusion_flag_counts: countBy(candidates.flatMap((candidate) => candidate.exclusion_flags ?? []), (flag) => flag),
    },
    proofs: {
      no_candidate_can_publish_directly: directPublishableCandidates.length === 0,
      every_candidate_is_review_gated: nonReviewGatedCandidates.length === 0,
      no_database_write_boundary: true,
      no_pricing_rollup_boundary: true,
      no_public_price_publication_boundary: true,
    },
    samples: {
      no_match_targets: topRows(noMatchTargets, sampleLimit),
      high_confidence_reference_candidates: topRows(
        dispositionRows.filter((row) => row.disposition === 'review_high_confidence_reference'),
        sampleLimit,
      ),
      blocked_or_ambiguous_candidates: topRows(
        dispositionRows.filter((row) => row.disposition.startsWith('blocked_') || row.disposition.startsWith('review_ambiguous')),
        sampleLimit,
      ),
    },
  };
}
