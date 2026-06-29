import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION,
  buildMarketReferenceSignalReviewGateV1,
} from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import {
  EXPECTED_PUBLISHABLE_COUNT,
  EXPECTED_SIGNAL_COUNT,
  PACKAGE_ID,
  SIGNAL_CURRENCY,
} from "../../scripts/audits/market_reference_signal_review_gate_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE-09C classifies reference signals into review buckets", () => {
  const gate = buildMarketReferenceSignalReviewGateV1({
    signals: [
      {
        card_print_id: "card-1",
        gv_id: "GV-PK-TEST-1",
        publishable: false,
        source_count: 2,
        eligible_evidence_count: 4,
        quarantined_evidence_count: 0,
        currency_excluded_evidence_count: 0,
        reference_low: 10,
        reference_median: 12,
        reference_high: 15,
      },
      {
        card_print_id: "card-2",
        gv_id: "GV-PK-TEST-2",
        publishable: false,
        source_count: 1,
        eligible_evidence_count: 4,
        quarantined_evidence_count: 1,
        currency_excluded_evidence_count: 0,
        reference_low: 10,
        reference_median: 20,
        reference_high: 120,
      },
      {
        card_print_id: "card-3",
        gv_id: "GV-PK-MCD-1",
        publishable: false,
        source_count: 2,
        eligible_evidence_count: 4,
        quarantined_evidence_count: 0,
        currency_excluded_evidence_count: 0,
        reference_low: 10,
        reference_median: 11,
        reference_high: 12,
      },
    ],
  });

  assert.equal(gate.review_gate_version, MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION);
  assert.equal(gate.summary.reviewed_signal_count, 3);
  assert.equal(gate.summary.publishable_count, 0);
  assert.equal(gate.reviewed_signals[0].review_status, "review_ready_multi_source");
  assert.equal(gate.reviewed_signals[1].review_status, "review_required_high_variance");
  assert.equal(gate.reviewed_signals[2].review_status, "blocked_special_lane_review");
});

test("MEE-09C constants lock the current target and currency", () => {
  assert.equal(PACKAGE_ID, "MARKET-REFERENCE-SIGNAL-REVIEW-GATE-V1");
  assert.equal(EXPECTED_SIGNAL_COUNT, 993);
  assert.equal(EXPECTED_PUBLISHABLE_COUNT, 0);
  assert.equal(SIGNAL_CURRENCY, "USD");
});

test("MEE-09C script stays read-only and non-public", () => {
  const script = source("scripts/audits/market_reference_signal_review_gate_v1.mjs");

  assert.match(script, /internal_reference_signal_review_gate_no_writes/);
  assert.match(script, /public_price_publication: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /stored_rollup_created: false/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
