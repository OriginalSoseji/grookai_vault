const NORMALIZER_VERSION = 'MEE_06C_REFERENCE_NORMALIZER_V1';

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

const HIGH_METRICS = new Set(['high', 'highprice']);
const STRONG_METRICS = new Set([
  'market',
  'marketprice',
  'averagesellprice',
  'avg7',
  'avg30',
  'trendprice',
]);
const MEDIUM_METRICS = new Set(['mid', 'midprice']);
const LOW_METRICS = new Set(['low', 'lowprice', 'directlow', 'directlowprice']);

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === '') continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeMetricKey(candidate) {
  const payloadMetric = normalizeText(candidate?.raw_payload?.metric);
  const condition = normalizeText(candidate?.condition_hint);
  const raw = payloadMetric ?? (condition?.includes(':') ? condition.split(':').pop() : condition);
  return normalizeText(raw)?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? 'unknown';
}

function normalizedPrice(candidate) {
  const price = Number(candidate?.raw_price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
}

function metricFamily(metricKey) {
  if (HIGH_METRICS.has(metricKey)) return 'high_ask_bucket';
  if (STRONG_METRICS.has(metricKey)) return 'reference_market_bucket';
  if (MEDIUM_METRICS.has(metricKey)) return 'reference_mid_bucket';
  if (LOW_METRICS.has(metricKey)) return 'reference_low_bucket';
  return 'unknown_reference_bucket';
}

function metricBaseScore(metricKey) {
  if (STRONG_METRICS.has(metricKey)) return 0.78;
  if (MEDIUM_METRICS.has(metricKey)) return 0.62;
  if (LOW_METRICS.has(metricKey)) return 0.42;
  if (HIGH_METRICS.has(metricKey)) return 0.05;
  return 0.25;
}

function sourceScoreAdjustment(source) {
  if (source === 'tcgcsv_reference') return 0.04;
  if (source === 'pokemontcg_io_reference') return 0.03;
  if (source === 'pricecharting_reference') return 0.02;
  if (source === 'justtcg_reference') return 0;
  return -0.05;
}

function candidateHasBlockingFlag(candidate) {
  return (candidate?.exclusion_flags ?? []).some((flag) => BLOCKING_FLAGS.has(flag));
}

function groupKey(candidate) {
  return [
    candidate.card_print_id ?? candidate.gv_id ?? 'unknown',
    candidate.source ?? 'unknown',
    candidate.currency ?? 'unknown',
    candidate.finish_hint ?? 'unknown',
  ].join('::');
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100;
}

function referenceMedianByGroup(candidates) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const price = normalizedPrice(candidate);
    const metricKey = normalizeMetricKey(candidate);
    if (price === null || HIGH_METRICS.has(metricKey)) continue;
    const key = groupKey(candidate);
    const rows = grouped.get(key) ?? [];
    rows.push(price);
    grouped.set(key, rows);
  }
  return new Map(Array.from(grouped.entries()).map(([key, values]) => [key, median(values)]));
}

function outlierDisposition(price, groupMedian) {
  if (price === null || groupMedian === null || groupMedian <= 0) return null;
  if (price >= 100 && price >= groupMedian * 4) return 'high_price_outlier';
  if (groupMedian >= 25 && price <= groupMedian / 8) return 'low_price_outlier';
  return null;
}

function clampScore(value) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function normalizeCandidate(candidate, { groupMedian }) {
  const metricKey = normalizeMetricKey(candidate);
  const price = normalizedPrice(candidate);
  const qualityFlags = [];
  let disposition = 'reference_model_candidate';
  let score = metricBaseScore(metricKey) + sourceScoreAdjustment(candidate.source);

  if (candidate.can_publish_price_directly === true) {
    qualityFlags.push('unsafe_direct_publish_flag');
    disposition = 'blocked_candidate';
  }
  if (candidate.needs_review !== true) {
    qualityFlags.push('missing_review_gate');
    disposition = 'blocked_candidate';
  }
  if (candidateHasBlockingFlag(candidate)) {
    qualityFlags.push('blocking_exclusion_flag');
    disposition = 'blocked_candidate';
  }
  if (price === null) {
    qualityFlags.push('missing_or_invalid_price');
    disposition = 'blocked_candidate';
  }
  if (HIGH_METRICS.has(metricKey)) {
    qualityFlags.push('high_ask_bucket_not_model_input');
    if (disposition !== 'blocked_candidate') disposition = 'quarantined_metric';
  }

  const outlier = outlierDisposition(price, groupMedian);
  if (outlier) {
    qualityFlags.push(outlier);
    if (disposition === 'reference_model_candidate') disposition = 'quarantined_price_outlier';
  }

  const modelEligible = disposition === 'reference_model_candidate';
  if (!modelEligible) {
    score = Math.min(score, 0.1);
  }

  return {
    card_print_id: candidate.card_print_id ?? null,
    gv_id: candidate.gv_id ?? null,
    source: candidate.source ?? null,
    source_type: candidate.source_type ?? null,
    source_url: candidate.source_url ?? null,
    raw_title: candidate.raw_title ?? null,
    normalized_price: price,
    normalized_currency: normalizeText(candidate.currency) ?? 'USD',
    condition_hint: candidate.condition_hint ?? null,
    finish_hint: candidate.finish_hint ?? null,
    metric_key: metricKey,
    metric_family: metricFamily(metricKey),
    observed_at: candidate.observed_at ?? null,
    match_confidence_hint: candidate.match_confidence_hint ?? null,
    group_reference_median: groupMedian,
    model_disposition: disposition,
    model_eligible: modelEligible,
    evidence_quality_score: clampScore(score),
    weight_hint: modelEligible ? clampScore(score) : 0,
    quality_flags: qualityFlags.sort(),
    needs_review: candidate.needs_review === true,
    can_publish_price_directly: false,
    raw_payload: candidate.raw_payload ?? null,
    normalizer_version: NORMALIZER_VERSION,
  };
}

export function normalizeReferenceEvidenceV1({
  acquisition,
  generatedAt = new Date().toISOString(),
  sampleLimit = 50,
} = {}) {
  if (!acquisition || typeof acquisition !== 'object') {
    throw new Error('[market-evidence-normalizer] acquisition is required');
  }
  if (acquisition.contract !== 'MARKET_EVIDENCE_ENGINE_V1') {
    throw new Error('[market-evidence-normalizer] acquisition contract mismatch');
  }
  if (!Array.isArray(acquisition.candidate_evidence)) {
    throw new Error('[market-evidence-normalizer] candidate_evidence must be an array');
  }
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) {
    throw new Error('[market-evidence-normalizer] sampleLimit must be a positive integer');
  }

  const candidates = acquisition.candidate_evidence;
  const medians = referenceMedianByGroup(candidates);
  const normalized_evidence = candidates.map((candidate) => normalizeCandidate(candidate, {
    groupMedian: medians.get(groupKey(candidate)) ?? null,
  }));

  const eligible = normalized_evidence.filter((row) => row.model_eligible);
  const quarantined = normalized_evidence.filter((row) => row.model_disposition.startsWith('quarantined_'));
  const blocked = normalized_evidence.filter((row) => row.model_disposition === 'blocked_candidate');

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1',
    mode: 'local_reference_evidence_normalization_only',
    normalizer_version: NORMALIZER_VERSION,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
      normalized_evidence_created: true,
      normalized_evidence_persisted_to_db: false,
    },
    input_summary: {
      source_phase: acquisition.phase ?? null,
      source_generated_at: acquisition.generated_at ?? null,
      candidate_evidence_count: candidates.length,
    },
    summary: {
      normalized_evidence_count: normalized_evidence.length,
      model_eligible_count: eligible.length,
      quarantined_count: quarantined.length,
      blocked_count: blocked.length,
      direct_publishable_count: normalized_evidence.filter((row) => row.can_publish_price_directly === true).length,
    },
    counts: {
      source_counts: countBy(normalized_evidence, (row) => row.source),
      currency_counts: countBy(normalized_evidence, (row) => row.normalized_currency),
      metric_family_counts: countBy(normalized_evidence, (row) => row.metric_family),
      disposition_counts: countBy(normalized_evidence, (row) => row.model_disposition),
      quality_flag_counts: countBy(normalized_evidence.flatMap((row) => row.quality_flags), (flag) => flag),
    },
    proofs: {
      no_database_write_boundary: true,
      no_pricing_rollup_boundary: true,
      no_public_price_publication_boundary: true,
      no_candidate_can_publish_directly: normalized_evidence.every((row) => row.can_publish_price_directly === false),
      only_model_eligible_rows_receive_weight: normalized_evidence.every((row) => row.model_eligible || row.weight_hint === 0),
    },
    samples: {
      model_eligible: eligible.slice(0, sampleLimit),
      quarantined: quarantined.slice(0, sampleLimit),
      blocked: blocked.slice(0, sampleLimit),
    },
    normalized_evidence,
  };
}
