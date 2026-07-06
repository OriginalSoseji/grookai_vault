export const MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION = "MEE_10F_ACTIVE_LISTING_NORMALIZATION_PLAN_V1";
export const EXPECTED_ACTIVE_LISTING_INPUT_COUNT = 15;

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function isGraded(row) {
  const condition = String(row.condition_hint ?? "").trim().toLowerCase();
  return condition === "graded" || /\b(psa|bgs|cgc|sgc|tag)\b/i.test(row.raw_title ?? "");
}

function normalizeActiveListing(row) {
  const price = asNumber(row.raw_price);
  const qualityFlags = new Set(row.exclusion_flags ?? []);
  qualityFlags.add("active_listing_unverified");
  qualityFlags.add("sold_comp_missing");
  qualityFlags.add("manual_review_required");

  let disposition = "review_required_active_listing";
  if (row.needs_review !== true) {
    disposition = "blocked_candidate";
    qualityFlags.add("missing_review_gate");
  }
  if (row.can_publish_price_directly === true) {
    disposition = "blocked_candidate";
    qualityFlags.add("unsafe_direct_publish_flag");
  }
  if (price === null) {
    disposition = "blocked_candidate";
    qualityFlags.add("missing_or_invalid_price");
  }
  if (!row.source_url) {
    disposition = "blocked_candidate";
    qualityFlags.add("missing_source_url");
  }
  if (isGraded(row)) {
    if (disposition !== "blocked_candidate") disposition = "quarantined_active_listing_context";
    qualityFlags.add("graded_listing_context");
  }

  return {
    candidate_id: row.id ?? row.candidate_id ?? null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source: row.source,
    source_type: row.source_type,
    source_url: row.source_url ?? null,
    raw_title: row.raw_title ?? null,
    normalized_price: price,
    normalized_currency: row.currency ?? "USD",
    condition_hint: row.condition_hint ?? null,
    finish_hint: row.finish_hint ?? null,
    observed_at: row.observed_at ?? null,
    match_confidence_hint: row.match_confidence_hint ?? null,
    normalizer_version: MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION,
    metric_key: "active_listing_ask",
    metric_family: "active_listing_ask_bucket",
    model_disposition: disposition,
    model_eligible: false,
    evidence_quality_score: disposition === "review_required_active_listing" ? 0.2 : 0.05,
    weight_hint: 0,
    quality_flags: [...qualityFlags].sort(),
    needs_review: row.needs_review === true,
    can_publish_price_directly: false,
    normalized_payload: {
      source_candidate: row,
      policy_note: "Active listings are review evidence only until sold-comparable support and manual review are added.",
    },
  };
}

export function buildMarketReferenceActiveListingNormalizationPlanV1({
  candidates = [],
} = {}) {
  const normalized_evidence = candidates.map(normalizeActiveListing);
  const findings = [];

  if (normalized_evidence.length !== EXPECTED_ACTIVE_LISTING_INPUT_COUNT) findings.push("active_listing_input_count_mismatch");
  if (normalized_evidence.some((row) => row.source !== "ebay_active")) findings.push("unexpected_source_detected");
  if (normalized_evidence.some((row) => row.source_type !== "active_listing")) findings.push("unexpected_source_type_detected");
  if (normalized_evidence.some((row) => row.model_eligible === true)) findings.push("active_listing_model_eligible_leak");
  if (normalized_evidence.some((row) => row.can_publish_price_directly === true)) findings.push("direct_publish_leak");
  if (normalized_evidence.some((row) => row.quality_flags.includes("unsafe_direct_publish_flag"))) findings.push("unsafe_direct_publish_input_detected");

  return {
    version: MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION,
    mode: "local_active_listing_normalization_policy_plan_only",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
      market_truth: false,
    },
    summary: {
      normalized_evidence_count: normalized_evidence.length,
      model_eligible_count: normalized_evidence.filter((row) => row.model_eligible === true).length,
      review_required_count: normalized_evidence.filter((row) => row.model_disposition === "review_required_active_listing").length,
      quarantined_count: normalized_evidence.filter((row) => row.model_disposition.startsWith("quarantined_")).length,
      blocked_count: normalized_evidence.filter((row) => row.model_disposition === "blocked_candidate").length,
      direct_publishable_count: normalized_evidence.filter((row) => row.can_publish_price_directly === true).length,
    },
    counts: {
      source_counts: countBy(normalized_evidence, (row) => row.source),
      currency_counts: countBy(normalized_evidence, (row) => row.normalized_currency),
      disposition_counts: countBy(normalized_evidence, (row) => row.model_disposition),
      quality_flag_counts: countBy(normalized_evidence.flatMap((row) => row.quality_flags), (flag) => flag),
    },
    schema_status: {
      current_market_reference_normalized_evidence_allows_ebay_active: false,
      current_disposition_constraint_allows_active_listing_review_candidate: false,
      requires_schema_extension_before_persisting_normalized_rows: true,
    },
    findings,
    ready_for_schema_plan: findings.length === 0,
    normalized_evidence,
  };
}
