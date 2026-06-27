import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_VERSION,
  buildMarketListingAcquisitionDryRunPlanV1,
} from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

const uuid = (index) => `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;

function target(index, overrides = {}) {
  return {
    card_print_id: uuid(index),
    gv_id: `GV-PK-TEST-${index}`,
    name: index % 2 === 0 ? "Pikachu" : "Charizard",
    set_code: index % 2 === 0 ? "sv1" : "base-shadowless",
    set_name: index % 2 === 0 ? "Scarlet & Violet" : "Base Set Shadowless",
    printed_set_abbrev: index % 2 === 0 ? "SVI" : "BS",
    number: String(index),
    number_plain: String(index),
    rarity: "Rare",
    ...overrides,
  };
}

test("MEE-11D builds an ebay active listing dry-run plan without fetch or writes", () => {
  const report = buildMarketListingAcquisitionDryRunPlanV1({
    targets: [target(1), target(2)],
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.version, MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_VERSION);
  assert.equal(report.mode, "dry_run_plan_only_no_provider_calls_no_writes");
  assert.equal(report.summary.planned_target_count, 2);
  assert.equal(report.summary.acquisition_request_count, 4);
  assert.equal(report.summary.planned_call_count, 4);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.market_listing_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.acquisition_requests.every((request) => request.source === "ebay_active"), true);
  assert.equal(report.acquisition_requests.every((request) => request.provider_route === "ebay_browse_api"), true);
  assert.equal(report.acquisition_requests.every((request) => request.source_fetch_allowed_by_this_package === false), true);
  assert.equal(report.acquisition_requests.every((request) => request.needs_review === true), true);
  assert.equal(report.acquisition_requests.every((request) => request.can_publish_price_directly === false), true);
  assert.equal(report.acquisition_requests.every((request) => request.market_truth === false), true);
  assert.equal(report.acquisition_requests.every((request) => request.app_visible === false), true);
});

test("MEE-11D deprioritizes common and ordinary rare targets without excluding them", () => {
  const report = buildMarketListingAcquisitionDryRunPlanV1({
    targets: [
      target(1, {
        name: "Low Common",
        set_code: "sv1",
        set_name: "Scarlet & Violet",
        rarity: "Common",
      }),
      target(2, {
        name: "Plain Rare",
        set_code: "sv1",
        set_name: "Scarlet & Violet",
        rarity: "Rare",
      }),
      target(3, {
        name: "Collector Holo",
        set_code: "sv1",
        set_name: "Scarlet & Violet",
        rarity: "Rare Holo",
      }),
    ],
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.summary.planned_target_count, 3);
  assert.equal(report.summary.priority_counts.deprioritized_common_rare, 2);
  assert.equal(report.summary.rarity_priority_counts.low_priority_common_rare, 2);
  assert.equal(report.acquisition_requests[0].gv_id, "GV-PK-TEST-3");
  assert.equal(report.acquisition_requests.filter((request) => request.gv_id === "GV-PK-TEST-1").length, 1);
  assert.equal(report.acquisition_requests.filter((request) => request.gv_id === "GV-PK-TEST-2").length, 1);
});

test("MEE-11D reports when planned calls exceed a one-day ceiling but stays approvable as a multi-day plan", () => {
  const report = buildMarketListingAcquisitionDryRunPlanV1({
    targets: [target(1), target(2), target(3), target(4)],
    dailyCallCeiling: 3,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_acquisition_approval, true);
  assert.ok(report.findings.includes("planned_calls_exceed_single_day_ceiling"));
  assert.equal(report.summary.estimated_day_count_at_ceiling > 1, true);
});

test("MEE-11D audit script does not contain provider fetches or pricing writes", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']market_listing_/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
});
