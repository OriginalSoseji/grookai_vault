import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_ACTIVE_LISTING_INPUT_COUNT,
  MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION,
  buildMarketReferenceActiveListingNormalizationPlanV1,
} from "../../backend/pricing/market_reference_active_listing_normalization_plan_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function candidate(index, overrides = {}) {
  return {
    id: `candidate-${index}`,
    card_print_id: `card-${index}`,
    gv_id: `GV-PK-TEST-${index}`,
    source: "ebay_active",
    source_type: "active_listing",
    source_url: `https://www.ebay.com/itm/${index}`,
    raw_title: `Pokemon Test ${index}`,
    raw_price: 100 + index,
    currency: "USD",
    condition_hint: "Ungraded",
    finish_hint: null,
    observed_at: "2026-06-25T00:00:00.000Z",
    match_confidence_hint: "exact_candidate",
    exclusion_flags: ["manual_review_required"],
    needs_review: true,
    can_publish_price_directly: false,
    ...overrides,
  };
}

test("MEE-10F normalizes active listings as non-publishable review evidence only", () => {
  const rows = Array.from({ length: EXPECTED_ACTIVE_LISTING_INPUT_COUNT }, (_, index) => candidate(index + 1));
  rows[0].condition_hint = "Graded";
  const plan = buildMarketReferenceActiveListingNormalizationPlanV1({ candidates: rows });

  assert.equal(plan.version, MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION);
  assert.equal(plan.ready_for_schema_plan, true);
  assert.equal(plan.summary.normalized_evidence_count, 15);
  assert.equal(plan.summary.model_eligible_count, 0);
  assert.equal(plan.summary.review_required_count, 14);
  assert.equal(plan.summary.quarantined_count, 1);
  assert.equal(plan.summary.direct_publishable_count, 0);
  assert.equal(plan.schema_status.requires_schema_extension_before_persisting_normalized_rows, true);
  assert.equal(plan.normalized_evidence[0].model_eligible, false);
  assert.equal(plan.normalized_evidence[0].can_publish_price_directly, false);
});

test("MEE-10F blocks unsafe active listing rows", () => {
  const rows = Array.from({ length: EXPECTED_ACTIVE_LISTING_INPUT_COUNT }, (_, index) => candidate(index + 1));
  rows[0].can_publish_price_directly = true;
  const plan = buildMarketReferenceActiveListingNormalizationPlanV1({ candidates: rows });

  assert.equal(plan.ready_for_schema_plan, false);
  assert.ok(plan.findings.includes("unsafe_direct_publish_input_detected"));
  assert.equal(plan.normalized_evidence[0].model_disposition, "blocked_candidate");
});

test("MEE-10F script is read-only and non-public", () => {
  const script = source("scripts/audits/market_reference_active_listing_normalization_plan_v1.mjs");
  const moduleSource = source("backend/pricing/market_reference_active_listing_normalization_plan_v1.mjs");
  const combined = `${script}\n${moduleSource}`;

  assert.match(combined, /local_active_listing_normalization_policy_plan_only/);
  assert.match(combined, /public_price_publication: false/);
  assert.match(combined, /app_visible_pricing: false/);
  assert.match(combined, /market_truth: false/);
  assert.doesNotMatch(combined, /\.insert\s*\(/);
  assert.doesNotMatch(combined, /\.upsert\s*\(/);
  assert.doesNotMatch(combined, /\.delete\s*\(/);
  assert.doesNotMatch(combined, /\.update\s*\(/);
  assert.doesNotMatch(combined, /\.rpc\s*\(/);
  assert.doesNotMatch(combined, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(combined, /\.from\(["']ebay_active_prices_latest["']\)/);
});
