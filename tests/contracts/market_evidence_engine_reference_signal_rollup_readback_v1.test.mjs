import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_INTERNAL_ROLLUP_VERSION,
  MARKET_REFERENCE_SIGNAL_ROLLUP_READBACK_VERSION,
  buildMarketReferenceSignalRollupReadbackV1,
} from "../../backend/pricing/market_reference_signal_rollup_readback_v1.mjs";

test("MEE-09G rollup readback keeps internal lock findings strict", () => {
  const report = buildMarketReferenceSignalRollupReadbackV1({
    rollups: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      rollup_version: EXPECTED_INTERNAL_ROLLUP_VERSION,
      review_status: "review_required_single_source",
      currency: "USD",
      source_count: 1,
      eligible_evidence_count: 2,
      reference_median: 5,
      variance_band: "bounded_variance",
      review_flags: ["single_source_only"],
      needs_review: true,
      publishable: false,
      app_visible: false,
      market_truth: false,
    }],
  });

  assert.equal(report.readback_version, MARKET_REFERENCE_SIGNAL_ROLLUP_READBACK_VERSION);
  assert.equal(report.total_rows, 1);
  assert.equal(report.internal_lock_counts.needs_review_true, 1);
  assert.equal(report.internal_lock_counts.publishable_true, 0);
  assert.equal(report.status_counts.review_required_single_source, 1);
  assert.deepEqual(report.findings, []);
  assert.equal(report.ready, true);
});

test("MEE-09G rollup readback flags any public visibility leak", () => {
  const report = buildMarketReferenceSignalRollupReadbackV1({
    rollups: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      rollup_version: EXPECTED_INTERNAL_ROLLUP_VERSION,
      review_status: "review_required_context",
      currency: "USD",
      needs_review: false,
      publishable: true,
      app_visible: true,
      market_truth: true,
    }],
  });

  assert.equal(report.ready, false);
  assert.match(report.findings.join(","), /publishable_rollup_rows_detected/);
  assert.match(report.findings.join(","), /app_visible_rollup_rows_detected/);
  assert.match(report.findings.join(","), /market_truth_rollup_rows_detected/);
  assert.match(report.findings.join(","), /needs_review_false_rows_detected/);
});

test("MEE-09G rollup readback supports explicit expected rollup version", () => {
  const report = buildMarketReferenceSignalRollupReadbackV1({
    expectedRollupVersion: "MEE_TEST_ROLLUP_REFRESH",
    rollups: [{
      card_print_id: "00000000-0000-0000-0000-000000000002",
      gv_id: "GV-PK-TEST-002",
      rollup_version: "MEE_TEST_ROLLUP_REFRESH",
      review_status: "review_required_context",
      currency: "USD",
      source_count: 2,
      eligible_evidence_count: 4,
      reference_median: 12,
      variance_band: "bounded_variance",
      review_flags: [],
      needs_review: true,
      publishable: false,
      app_visible: false,
      market_truth: false,
    }],
  });

  assert.equal(report.ready, true);
  assert.equal(report.expected_rollup_version, "MEE_TEST_ROLLUP_REFRESH");
  assert.equal(report.internal_lock_counts.unexpected_rollup_version_rows, 0);
});
