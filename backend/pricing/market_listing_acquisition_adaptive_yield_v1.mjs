import { createHash } from "node:crypto";

export const MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION = "MEE_11V_MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_V1";
export const DEFAULT_ADAPTIVE_CANDIDATE_MULTIPLIER = 3;
export const DEFAULT_DISCOVERY_CALL_SHARE = 0.9;

const DISABLED_STRATEGIES = new Set([
  "set_shelf_language",
  "set_shelf_sealed",
  "set_shelf_slabs",
]);

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
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function boundedFraction(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(number, 1));
}

export function providerCallLaneForRequest(request) {
  const strategy = String(request?.strategy ?? "");
  if (DISABLED_STRATEGIES.has(strategy)) return "disabled";
  if (strategy === "set_shelf_broad" || strategy === "set_shelf_singles") return "discovery";
  return "precision";
}

export function buildAdaptiveCandidateSelectionV1({
  requests = [],
  providerCallCeiling,
  candidateMultiplier = DEFAULT_ADAPTIVE_CANDIDATE_MULTIPLIER,
  discoveryCallShare = DEFAULT_DISCOVERY_CALL_SHARE,
} = {}) {
  const ceiling = Math.max(1, Number(providerCallCeiling) || 1);
  const multiplier = Math.max(1, Math.min(Number(candidateMultiplier) || DEFAULT_ADAPTIVE_CANDIDATE_MULTIPLIER, 10));
  const discoveryShare = boundedFraction(discoveryCallShare, DEFAULT_DISCOVERY_CALL_SHARE);
  const discoveryCallCeiling = Math.min(ceiling, Math.max(0, Math.round(ceiling * discoveryShare)));
  const precisionCallCeiling = ceiling - discoveryCallCeiling;
  const laneCallCeilings = {
    discovery: discoveryCallCeiling,
    precision: precisionCallCeiling,
  };
  const laneCandidateCeilings = {
    discovery: Math.max(discoveryCallCeiling, Math.ceil(discoveryCallCeiling * multiplier)),
    precision: Math.max(precisionCallCeiling, Math.ceil(precisionCallCeiling * multiplier)),
  };
  const laneCandidates = {
    discovery: [],
    precision: [],
  };
  const disabledStrategyCounts = {};

  for (const request of requests) {
    const lane = providerCallLaneForRequest(request);
    if (lane === "disabled") {
      const strategy = request?.strategy ?? "unknown";
      disabledStrategyCounts[strategy] = (disabledStrategyCounts[strategy] ?? 0) + 1;
      continue;
    }
    if (laneCandidates[lane].length >= laneCandidateCeilings[lane]) continue;
    laneCandidates[lane].push({
      ...request,
      provider_call_lane: lane,
    });
  }

  return {
    candidates: [...laneCandidates.discovery, ...laneCandidates.precision],
    provider_call_ceiling: ceiling,
    candidate_multiplier: multiplier,
    discovery_call_share: discoveryShare,
    provider_call_lane_ceilings: laneCallCeilings,
    candidate_lane_ceilings: laneCandidateCeilings,
    candidate_lane_counts: {
      discovery: laneCandidates.discovery.length,
      precision: laneCandidates.precision.length,
    },
    disabled_strategy_counts: Object.fromEntries(Object.entries(disabledStrategyCounts).sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function adaptiveRequestFamilyKeyV1(request) {
  return sha256({
    source: request?.source ?? null,
    provider_route: request?.provider_route ?? null,
    strategy: request?.strategy ?? null,
    query_text: request?.query_text ?? null,
    category_ids: request?.query_filters?.category_ids ?? [],
    buying_options: request?.query_filters?.buying_options ?? [],
    fieldgroups: request?.query_filters?.fieldgroups ?? [],
    limit: Number(request?.query_filters?.limit) || null,
    card_print_id: request?.card_print_id ?? null,
    card_printing_id: request?.card_printing_id ?? null,
  });
}

export function listingIdsFromResponseV1(response) {
  return (response?.projected_observations ?? [])
    .map((observation) => observation?.source_listing_id)
    .filter(Boolean);
}

export function shouldSkipAdaptiveRequestV1({ request, familyState } = {}) {
  if (!familyState) return null;
  if (familyState.exhausted_reason) return {
    reason: familyState.exhausted_reason,
    provider_total: familyState.provider_total,
  };
  const offset = Math.max(0, Number(request?.offset) || 0);
  if (Number.isFinite(familyState.provider_total) && offset >= familyState.provider_total) {
    return {
      reason: familyState.provider_total === 0 ? "zero_result_family" : "provider_total_exhausted",
      provider_total: familyState.provider_total,
    };
  }
  return null;
}

export function updateAdaptiveFamilyStateV1({ request, response, previousState } = {}) {
  const limit = Math.max(1, Number(request?.query_filters?.limit) || 1);
  const fetchedItemCount = Math.max(0, Number(response?.fetched_item_count) || 0);
  const providerTotal = Number(response?.provider_total);
  const listingIds = listingIdsFromResponseV1(response);
  const previousListingIds = previousState?.last_listing_ids ?? [];
  const repeatedPage = listingIds.length > 0
    && listingIds.length === previousListingIds.length
    && listingIds.every((listingId, index) => listingId === previousListingIds[index]);

  let exhaustedReason = null;
  if (repeatedPage) exhaustedReason = "repeated_page_exhausted";
  else if (Number.isFinite(providerTotal) && providerTotal === 0) exhaustedReason = "zero_result_family";
  else if (
    fetchedItemCount < limit
    && (!Number.isFinite(providerTotal) || (Math.max(0, Number(request?.offset) || 0) + fetchedItemCount) >= providerTotal)
  ) exhaustedReason = "short_page_exhausted";

  return {
    provider_total: Number.isFinite(providerTotal) ? providerTotal : previousState?.provider_total ?? null,
    last_offset: Math.max(0, Number(request?.offset) || 0),
    last_fetched_item_count: fetchedItemCount,
    last_listing_ids: listingIds,
    exhausted_reason: exhaustedReason,
    repeated_page: repeatedPage,
  };
}
