import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_MEE_09O_PLAN_HASH,
  MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_ACQUISITION_PLAN_VERSION,
  buildRemainingSingleSourceExactSourceAcquisitionPlanV1,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_acquisition_plan_v1.mjs";

const uuid = (index) => `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;

function route(source, index) {
  return {
    source,
    source_type: source === "ebay_active" ? "active_listing" : source === "ebay_sold_candidate" ? "sold_comp_candidate" : "manual_review_candidate",
    acquisition_mode: source === "ebay_active" ? "approved_api" : source === "ebay_sold_candidate" ? "approved_path_required" : "operator_curated",
    query_kind: source === "manual_review_candidate" ? "operator_review_seed" : "exact_event_or_promo_api_search_terms",
    query_text: `Pokemon "Victory Cup" "Battle Road" ${index} ${source}`,
    search_url_template: source === "manual_review_candidate" ? null : `https://example.test/search?q=${index}-${source}`,
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    query_status: "planned_not_fetched",
    inclusion_hints: ["exact_name_or_event_title"],
    exclusion_hints: ["manual_review_required"],
    evidence_goal: "test",
  };
}

function exactPlan({ planHash = EXPECTED_MEE_09O_PLAN_HASH } = {}) {
  const targets = Array.from({ length: 18 }, (_, index) => ({
    ordinal: index + 1,
    card_print_id: uuid(index + 1),
    gv_id: `GV-PK-PR-BLW-${index + 1}`,
    name: "Victory Cup",
    set_code: "bwp",
    provider_number: String(index + 1),
    number_plain: String(index + 1),
    family: "battle_road_victory_cup",
    worklist_reasons: ["review_required_single_source"],
    exact_routes: [
      route("ebay_active", index + 1),
      route("ebay_sold_candidate", index + 1),
      route("manual_review_candidate", index + 1),
    ],
  }));

  return {
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-PLAN-V1",
    ready: true,
    plan_hash: planHash,
    summary: {
      target_count: 18,
      route_count: 54,
      family_counts: { battle_road_victory_cup: 18 },
    },
    targets,
  };
}

test("MEE-09P builds a fetch-approval package without fetching or writing", () => {
  const report = buildRemainingSingleSourceExactSourceAcquisitionPlanV1({
    exactPlan: exactPlan(),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.version, MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_ACQUISITION_PLAN_VERSION);
  assert.equal(report.ready_for_fetch_approval, true);
  assert.equal(report.summary.target_count, 18);
  assert.equal(report.summary.acquisition_request_count, 54);
  assert.deepEqual(report.summary.source_counts, {
    ebay_active: 18,
    ebay_sold_candidate: 18,
    manual_review_candidate: 18,
  });
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.public_price_publication, false);
  assert.equal(report.acquisition_requests.some((request) => request.source_fetch_allowed_by_this_package), false);
  assert.equal(report.acquisition_requests.some((request) => request.can_publish_price_directly), false);
});

test("MEE-09P blocks a package when the 09O plan hash does not match approval", () => {
  const report = buildRemainingSingleSourceExactSourceAcquisitionPlanV1({
    exactPlan: exactPlan({ planHash: "wrong" }),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_fetch_approval, false);
  assert.ok(report.findings.includes("plan_hash_mismatch"));
});
