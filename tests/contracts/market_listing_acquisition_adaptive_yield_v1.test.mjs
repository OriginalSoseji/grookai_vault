import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptiveRequestFamilyKeyV1,
  buildAdaptiveCandidateSelectionV1,
  shouldSkipAdaptiveRequestV1,
  updateAdaptiveFamilyStateV1,
} from "../../backend/pricing/market_listing_acquisition_adaptive_yield_v1.mjs";

function request(strategy, queryText, offset = 0) {
  return {
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    strategy,
    query_text: queryText,
    query_filters: { category_ids: ["183454"], limit: 200 },
    offset,
  };
}

test("MEE-11V removes known zero-yield shelf lanes and protects discovery and precision budgets", () => {
  const selection = buildAdaptiveCandidateSelectionV1({
    requests: [
      request("set_shelf_broad", "Set A", 0),
      request("set_shelf_broad", "Set A", 200),
      request("set_shelf_singles", "Set B", 0),
      request("set_shelf_language", "Set B language", 0),
      request("set_shelf_sealed", "Set B sealed", 0),
      request("strict_identity", "Card A", 0),
      request("variant_finish", "Card B", 0),
    ],
    providerCallCeiling: 4,
    candidateMultiplier: 2,
    discoveryCallShare: 0.75,
  });

  assert.deepEqual(selection.provider_call_lane_ceilings, { discovery: 3, precision: 1 });
  assert.deepEqual(selection.candidate_lane_counts, { discovery: 3, precision: 2 });
  assert.equal(selection.disabled_strategy_counts.set_shelf_language, 1);
  assert.equal(selection.disabled_strategy_counts.set_shelf_sealed, 1);
  assert.equal(selection.candidates.some((entry) => entry.provider_call_lane === "disabled"), false);
});

test("MEE-11V stops a family when the next offset is beyond provider total", () => {
  const first = request("set_shelf_broad", "Pokemon Brilliant Stars", 0);
  const state = updateAdaptiveFamilyStateV1({
    request: first,
    response: {
      provider_total: 2181,
      fetched_item_count: 200,
      projected_observations: Array.from({ length: 200 }, (_, index) => ({ source_listing_id: `item-${index}` })),
    },
  });
  const skip = shouldSkipAdaptiveRequestV1({
    request: request("set_shelf_broad", "Pokemon Brilliant Stars", 2200),
    familyState: state,
  });

  assert.equal(skip.reason, "provider_total_exhausted");
  assert.equal(adaptiveRequestFamilyKeyV1(first), adaptiveRequestFamilyKeyV1(request("set_shelf_broad", "Pokemon Brilliant Stars", 2200)));
});

test("MEE-11V detects an exact repeated provider page", () => {
  const firstState = updateAdaptiveFamilyStateV1({
    request: request("set_shelf_broad", "Pokemon Set", 0),
    response: {
      provider_total: 5000,
      fetched_item_count: 2,
      projected_observations: [{ source_listing_id: "one" }, { source_listing_id: "two" }],
    },
  });
  const repeatedState = updateAdaptiveFamilyStateV1({
    request: { ...request("set_shelf_broad", "Pokemon Set", 200), query_filters: { limit: 2 } },
    response: {
      provider_total: 5000,
      fetched_item_count: 2,
      projected_observations: [{ source_listing_id: "one" }, { source_listing_id: "two" }],
    },
    previousState: firstState,
  });

  assert.equal(repeatedState.repeated_page, true);
  assert.equal(repeatedState.exhausted_reason, "repeated_page_exhausted");
});

test("MEE-11V does not stop a short page when provider total proves more results remain", () => {
  const state = updateAdaptiveFamilyStateV1({
    request: request("set_shelf_broad", "Pokemon Set", 0),
    response: {
      provider_total: 500,
      fetched_item_count: 100,
      projected_observations: Array.from({ length: 100 }, (_, index) => ({ source_listing_id: `item-${index}` })),
    },
  });

  assert.equal(state.exhausted_reason, null);
  assert.equal(shouldSkipAdaptiveRequestV1({
    request: request("set_shelf_broad", "Pokemon Set", 200),
    familyState: state,
  }), null);
});
