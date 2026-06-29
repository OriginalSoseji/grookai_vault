import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT,
  MARKET_REFERENCE_ACTIVE_LISTING_REVIEW_QUEUE_VERSION,
  buildMarketReferenceActiveListingReviewQueueV1,
} from "../../backend/pricing/market_reference_active_listing_review_queue_v1.mjs";

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

test("MEE-10E active listing queue keeps candidates review-only", () => {
  const queue = buildMarketReferenceActiveListingReviewQueueV1({
    candidates: Array.from({ length: EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT }, (_, index) => candidate(index + 1)),
  });

  assert.equal(queue.queue_version, MARKET_REFERENCE_ACTIVE_LISTING_REVIEW_QUEUE_VERSION);
  assert.equal(queue.ready, true);
  assert.equal(queue.summary.candidate_count, 15);
  assert.equal(queue.summary.publishable_count, 0);
  assert.equal(queue.summary.needs_review_count, 15);
  assert.equal(queue.summary.review_flag_counts.active_listing_unverified, 15);
  assert.equal(queue.summary.review_flag_counts.sold_comp_missing, 15);
  assert.equal(queue.summary.review_flag_counts.graded_listing_context ?? 0, 0);
  assert.equal(queue.review_items[0].review_status, "review_required_active_listing");
  assert.equal(queue.review_items[0].can_publish_price_directly, false);
});

test("MEE-10E does not treat ungraded as graded context", () => {
  const rows = Array.from({ length: EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT }, (_, index) => candidate(index + 1));
  rows[0].condition_hint = "Graded";
  const queue = buildMarketReferenceActiveListingReviewQueueV1({ candidates: rows });

  assert.equal(queue.summary.review_flag_counts.graded_listing_context, 1);
});

test("MEE-10E blocks any direct-publish active listing", () => {
  const rows = Array.from({ length: EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT }, (_, index) => candidate(index + 1));
  rows[0].can_publish_price_directly = true;
  const queue = buildMarketReferenceActiveListingReviewQueueV1({ candidates: rows });

  assert.equal(queue.ready, false);
  assert.ok(queue.findings.includes("direct_publish_candidate_detected"));
});

test("MEE-10E script is read-only and non-public", () => {
  const script = source("scripts/audits/market_reference_active_listing_review_queue_v1.mjs");

  assert.match(script, /internal_active_listing_review_queue_no_writes/);
  assert.match(script, /public_price_publication: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /market_truth: false/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
