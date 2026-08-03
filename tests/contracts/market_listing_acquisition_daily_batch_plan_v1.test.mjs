import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_VERSION,
  buildMarketListingAcquisitionDailyBatchPlanV1,
} from "../../backend/pricing/market_listing_acquisition_daily_batch_plan_v1.mjs";

function request(index, overrides = {}) {
  return {
    ordinal: index,
    query_key: `query-${index}`,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    card_print_id: `card-${index}`,
    gv_id: `GV-PK-TEST-${index}`,
    strategy: index % 2 === 0 ? "strict_identity" : "special_lane",
    query_text: `Pokemon Test ${index}`,
    query_filters: {
      category_ids: ["183454"],
      limit: 200,
    },
    target_hints: {
      priority: index > 3 ? "deprioritized_common_rare" : "priority_special_lane",
    },
    expected_max_result_count: 200,
    expected_call_count: 1,
    can_publish_price_directly: false,
    market_truth: false,
    app_visible: false,
    ...overrides,
  };
}

function dryRunPlan() {
  return {
    package_id: "MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1",
    package_fingerprint_sha256: "source-fingerprint",
    request_manifest_hash_sha256: "source-request-hash",
    schema_migration_hash_sha256: "schema-hash",
    ready_for_acquisition_approval: true,
    summary: {
      daily_call_ceiling: 3,
    },
    boundary: {
      provider_calls: false,
      db_writes: false,
      app_visible_pricing: false,
    },
    acquisition_requests: [request(1), request(2), request(3), request(4), request(5)],
  };
}

test("MEE-11K slices a dry-run queue into a bounded daily batch without fetch or writes", () => {
  const report = buildMarketListingAcquisitionDailyBatchPlanV1({
    dryRunPlan: dryRunPlan(),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.version, MARKET_LISTING_ACQUISITION_DAILY_BATCH_PLAN_VERSION);
  assert.equal(report.mode, "daily_batch_plan_only_no_provider_calls_no_writes");
  assert.equal(report.ready_for_acquisition_approval, true);
  assert.equal(report.summary.batch_request_count, 3);
  assert.equal(report.summary.remaining_request_count, 2);
  assert.equal(report.summary.next_start_index, 3);
  assert.equal(report.summary.priority_counts.priority_special_lane, 3);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.app_visible_pricing, false);
});

test("MEE-11K can continue from a later start index", () => {
  const report = buildMarketListingAcquisitionDailyBatchPlanV1({
    dryRunPlan: dryRunPlan(),
    batchOrdinal: 2,
    startIndex: 3,
    callLimit: 3,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.summary.batch_ordinal, 2);
  assert.equal(report.summary.start_index, 3);
  assert.equal(report.summary.batch_request_count, 2);
  assert.equal(report.summary.remaining_request_count, 0);
  assert.equal(report.summary.rarity_priority_counts.low_priority_common_rare, 2);
});

test("MEE-11K adaptive mode freezes extra candidates while preserving the provider call ceiling", () => {
  const source = dryRunPlan();
  source.summary.daily_call_ceiling = 4;
  source.acquisition_requests = [
    request(1, { strategy: "set_shelf_broad", offset: 0 }),
    request(2, { strategy: "set_shelf_broad", offset: 200 }),
    request(3, { strategy: "set_shelf_singles", offset: 0 }),
    request(4, { strategy: "set_shelf_sealed", offset: 0 }),
    request(5, { strategy: "strict_identity", offset: 0 }),
    request(6, { strategy: "variant_finish", offset: 0 }),
  ];

  const report = buildMarketListingAcquisitionDailyBatchPlanV1({
    dryRunPlan: source,
    callLimit: 4,
    adaptiveYield: true,
    candidateMultiplier: 2,
    discoveryCallShare: 0.75,
    generatedAt: "2026-08-03T00:00:00.000Z",
  });

  assert.equal(report.mode, "adaptive_daily_batch_plan_only_no_provider_calls_no_writes");
  assert.equal(report.summary.provider_call_ceiling, 4);
  assert.equal(report.summary.candidate_request_count, 5);
  assert.equal(report.summary.provider_call_lane_ceilings.discovery, 3);
  assert.equal(report.summary.provider_call_lane_ceilings.precision, 1);
  assert.equal(report.summary.disabled_strategy_counts.set_shelf_sealed, 1);
  assert.equal(report.acquisition_requests.some((entry) => entry.strategy === "set_shelf_sealed"), false);
  assert.equal(report.summary.estimated_max_listing_envelope, 800);
});

test("MEE-11K audit script does not fetch providers or write pricing surfaces", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']market_listing_/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
});
