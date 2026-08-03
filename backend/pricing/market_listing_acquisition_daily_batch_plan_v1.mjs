import { createHash } from "node:crypto";

import {
  DEFAULT_ADAPTIVE_CANDIDATE_MULTIPLIER,
  DEFAULT_DISCOVERY_CALL_SHARE,
  MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION,
  buildAdaptiveCandidateSelectionV1,
} from "./market_listing_acquisition_adaptive_yield_v1.mjs";

export const MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_VERSION = "MEE_11K_MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function validateDryRunPlan(plan, findings) {
  if (plan?.package_id !== "MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1") findings.push("unexpected_source_package");
  if (plan?.ready_for_acquisition_approval !== true) findings.push("source_plan_not_ready");
  if (!Array.isArray(plan?.acquisition_requests)) findings.push("missing_acquisition_requests");
  if (plan?.boundary?.provider_calls !== false) findings.push("source_plan_provider_call_boundary_failed");
  if (plan?.boundary?.db_writes !== false) findings.push("source_plan_db_write_boundary_failed");
  if (plan?.boundary?.app_visible_pricing !== false) findings.push("source_plan_app_visible_boundary_failed");
}

export function buildMarketListingAcquisitionDailyBatchPlanV1({
  dryRunPlan,
  generatedAt = new Date().toISOString(),
  batchOrdinal = 1,
  startIndex = 0,
  callLimit,
  adaptiveYield = false,
  candidateMultiplier = DEFAULT_ADAPTIVE_CANDIDATE_MULTIPLIER,
  discoveryCallShare = DEFAULT_DISCOVERY_CALL_SHARE,
} = {}) {
  const findings = [];
  validateDryRunPlan(dryRunPlan, findings);

  const sourceRequests = Array.isArray(dryRunPlan?.acquisition_requests) ? dryRunPlan.acquisition_requests : [];
  const dailyCeiling = Number(dryRunPlan?.summary?.daily_call_ceiling) || 4000;
  const resolvedCallLimit = Math.max(1, Math.min(Number(callLimit) || dailyCeiling, dailyCeiling));
  const resolvedStartIndex = Math.max(0, Number(startIndex) || 0);
  const sourceWindow = sourceRequests.slice(resolvedStartIndex);
  const adaptiveSelection = adaptiveYield
    ? buildAdaptiveCandidateSelectionV1({
      requests: sourceWindow,
      providerCallCeiling: resolvedCallLimit,
      candidateMultiplier,
      discoveryCallShare,
    })
    : null;
  const batchRequests = adaptiveSelection?.candidates
    ?? sourceWindow.slice(0, resolvedCallLimit);
  const nextStartIndex = adaptiveYield ? null : resolvedStartIndex + batchRequests.length;
  const remainingRequestCount = adaptiveYield
    ? Math.max(0, sourceWindow.length - batchRequests.length)
    : Math.max(0, sourceRequests.length - nextStartIndex);

  if (batchRequests.length === 0) findings.push("empty_batch");
  if (!adaptiveYield && batchRequests.length > dailyCeiling) findings.push("batch_exceeds_daily_ceiling");
  if (batchRequests.some((request) => request.source !== "ebay_active")) findings.push("unexpected_source");
  if (batchRequests.some((request) => request.provider_route !== "ebay_browse_api")) findings.push("unexpected_provider_route");
  if (batchRequests.some((request) => request.can_publish_price_directly !== false)) findings.push("direct_publish_detected");
  if (batchRequests.some((request) => request.app_visible !== false)) findings.push("app_visible_detected");
  if (batchRequests.some((request) => request.market_truth !== false)) findings.push("market_truth_detected");

  const requestManifestHash = sha256(batchRequests.map((request) => ({
    ordinal: request.ordinal,
    query_key: request.query_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    strategy: request.strategy,
    query_text: request.query_text,
    query_filters: request.query_filters,
  })));
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_VERSION,
    source_package_fingerprint: dryRunPlan?.package_fingerprint_sha256 ?? null,
    source_request_manifest_hash: dryRunPlan?.request_manifest_hash_sha256 ?? null,
    batch_ordinal: batchOrdinal,
    start_index: resolvedStartIndex,
    call_limit: resolvedCallLimit,
    adaptive_yield: adaptiveYield,
    adaptive_yield_version: adaptiveYield ? MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION : null,
    candidate_multiplier: adaptiveSelection?.candidate_multiplier ?? 1,
    discovery_call_share: adaptiveSelection?.discovery_call_share ?? null,
    provider_call_lane_ceilings: adaptiveSelection?.provider_call_lane_ceilings ?? null,
    request_count: batchRequests.length,
    request_manifest_hash: requestManifestHash,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_VERSION,
    generated_at: generatedAt,
    mode: adaptiveYield
      ? "adaptive_daily_batch_plan_only_no_provider_calls_no_writes"
      : "daily_batch_plan_only_no_provider_calls_no_writes",
    source_package_fingerprint_sha256: dryRunPlan?.package_fingerprint_sha256 ?? null,
    source_request_manifest_hash_sha256: dryRunPlan?.request_manifest_hash_sha256 ?? null,
    schema_migration_hash_sha256: dryRunPlan?.schema_migration_hash_sha256 ?? null,
    package_fingerprint_sha256: packageFingerprint,
    request_manifest_hash_sha256: requestManifestHash,
    ready_for_acquisition_approval: findings.length === 0,
    summary: {
      batch_ordinal: Number(batchOrdinal) || 1,
      start_index: resolvedStartIndex,
      next_start_index: nextStartIndex,
      source_request_count: sourceRequests.length,
      batch_request_count: batchRequests.length,
      candidate_request_count: batchRequests.length,
      remaining_request_count: remainingRequestCount,
      continuation_mode: adaptiveYield ? "regenerate_from_fresh_target_plan" : "sequential_start_index",
      daily_call_ceiling: dailyCeiling,
      call_limit: resolvedCallLimit,
      provider_call_ceiling: resolvedCallLimit,
      estimated_max_listing_envelope: adaptiveYield
        ? resolvedCallLimit * Math.max(0, ...batchRequests.map((request) => Number(request.expected_max_result_count) || 0))
        : batchRequests.reduce((sum, request) => sum + (Number(request.expected_max_result_count) || 0), 0),
      adaptive_yield: adaptiveYield,
      adaptive_yield_version: adaptiveYield ? MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION : null,
      candidate_multiplier: adaptiveSelection?.candidate_multiplier ?? 1,
      discovery_call_share: adaptiveSelection?.discovery_call_share ?? null,
      provider_call_lane_ceilings: adaptiveSelection?.provider_call_lane_ceilings ?? null,
      candidate_lane_ceilings: adaptiveSelection?.candidate_lane_ceilings ?? null,
      candidate_lane_counts: adaptiveSelection?.candidate_lane_counts ?? null,
      disabled_strategy_counts: adaptiveSelection?.disabled_strategy_counts ?? {},
      priority_counts: countBy(batchRequests, (request) => request.target_hints?.priority),
      rarity_priority_counts: countBy(batchRequests, (request) => request.target_hints?.priority === "deprioritized_common_rare" ? "low_priority_common_rare" : "normal_or_collector_priority"),
      strategy_counts: countBy(batchRequests, (request) => request.strategy),
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    findings,
    acquisition_requests: batchRequests,
  };
}
