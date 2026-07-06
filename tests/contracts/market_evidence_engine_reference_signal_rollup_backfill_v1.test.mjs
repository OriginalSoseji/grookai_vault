import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_REFERENCE_SIGNAL_ROLLUP_LANE,
  MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION,
  buildMarketReferenceSignalRollupRowsV1,
} from "../../backend/pricing/market_reference_signal_rollup_rows_v1.mjs";

test("MEE-09F rollup row builder keeps reference signals internal-only", () => {
  const rows = buildMarketReferenceSignalRollupRowsV1({
    signals: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      currency: "USD",
      sources: ["tcgcsv", "pokemontcg_io"],
      source_counts: { tcgcsv: 2, pokemontcg_io: 1 },
      source_metric_counts: { marketPrice: 1, normal: 2 },
      signal_band: "multi_source_reference_candidate",
    }],
    reviewedSignals: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      review_status: "review_required_context",
      source_count: 2,
      eligible_evidence_count: 3,
      quarantined_evidence_count: 0,
      currency_excluded_evidence_count: 0,
      reference_low: 1,
      reference_median: 2,
      reference_high: 3,
      price_ratio: 3,
      variance_band: "bounded_variance",
      flags: ["thin_evidence"],
    }],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rollup_version, MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION);
  assert.equal(rows[0].rollup_lane, MARKET_REFERENCE_SIGNAL_ROLLUP_LANE);
  assert.equal(rows[0].needs_review, true);
  assert.equal(rows[0].publishable, false);
  assert.equal(rows[0].app_visible, false);
  assert.equal(rows[0].market_truth, false);
  assert.deepEqual(rows[0].source_summary.sources, ["tcgcsv", "pokemontcg_io"]);
  assert.equal(rows[0].signal_payload.review.review_status, "review_required_context");
});

test("MEE-09F rollup row builder refuses orphan review rows", () => {
  assert.throws(() => buildMarketReferenceSignalRollupRowsV1({
    signals: [],
    reviewedSignals: [{ card_print_id: "missing" }],
  }), /missing signal/);
});

test("MEE-09F rollup row builder supports explicit versioned refresh rows", () => {
  const rows = buildMarketReferenceSignalRollupRowsV1({
    rollupVersion: "MEE_TEST_REFRESH_VERSION",
    signals: [{
      card_print_id: "00000000-0000-0000-0000-000000000002",
      gv_id: "GV-PK-TEST-002",
      currency: "USD",
      sources: ["tcgcsv_reference", "pokemontcg_io_reference"],
      source_counts: { tcgcsv_reference: 2, pokemontcg_io_reference: 2 },
      source_metric_counts: { marketPrice: 1, market: 1 },
      signal_band: "multi_source_reference_candidate",
    }],
    reviewedSignals: [{
      card_print_id: "00000000-0000-0000-0000-000000000002",
      gv_id: "GV-PK-TEST-002",
      review_status: "review_required_context",
      source_count: 2,
      eligible_evidence_count: 4,
      quarantined_evidence_count: 0,
      currency_excluded_evidence_count: 0,
      reference_low: 1,
      reference_median: 2,
      reference_high: 3,
      price_ratio: 3,
      variance_band: "bounded_variance",
      flags: [],
    }],
  });

  assert.equal(rows[0].rollup_version, "MEE_TEST_REFRESH_VERSION");
  assert.equal(rows[0].publishable, false);
  assert.equal(rows[0].app_visible, false);
});
