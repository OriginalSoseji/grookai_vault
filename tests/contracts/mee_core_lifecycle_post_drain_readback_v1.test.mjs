import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE core lifecycle post-drain readback proves active-listing coverage and reference backlog", () => {
  const report = JSON.parse(
    readFileSync(
      "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_POST_DRAIN_READBACK_V1/report.json",
      "utf8",
    ),
  );

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-POST-DRAIN-READBACK-V1");
  assert.deepEqual(report.findings, [
    "reference_rows_remaining",
    "reference_coverage_mismatch",
  ]);

  assert.ok(report.coverage.source_totals.reference_normalized_evidence > report.coverage.lifecycle_totals.reference_observations);
  assert.ok(report.coverage.source_totals.active_listing_candidates >= 108600);
  assert.equal(report.coverage.lifecycle_totals.reference_observations, 11025);
  assert.equal(
    report.coverage.lifecycle_totals.active_listing_observations,
    report.coverage.source_totals.active_listing_candidates,
  );
  assert.equal(
    report.coverage.remaining.reference,
    report.coverage.source_totals.reference_normalized_evidence - report.coverage.lifecycle_totals.reference_observations,
  );
  assert.equal(report.coverage.remaining.active_listing, 0);

  const expectedObservationCount = (
    report.coverage.lifecycle_totals.reference_observations
    + report.coverage.lifecycle_totals.active_listing_observations
    + 3
  );
  assert.equal(report.stage_integrity.observation_count, expectedObservationCount);
  assert.equal(report.stage_integrity.event_count, report.stage_integrity.expected_event_count);
  assert.equal(report.stage_integrity.event_hash_distinct_count, report.stage_integrity.expected_event_count);
  assert.equal(report.stage_integrity.duplicate_observation_keys, 0);
  assert.equal(report.stage_integrity.unexpected_stage_count, 0);

  for (const stage of [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
  ]) {
    assert.equal(report.stage_integrity.stage_counts[stage], report.stage_integrity.observation_count);
  }

  assert.equal(report.stage_integrity.app_visible_true_observations, 0);
  assert.equal(report.stage_integrity.market_truth_true_observations, 0);
  assert.equal(report.stage_integrity.publishable_true_observations, 0);
  assert.equal(report.public_boundary.pricing_observations_count, 0);
  assert.ok(report.public_boundary.ebay_active_prices_latest_count >= 0);
  assert.equal(report.public_boundary.v_card_pricing_references_market_evidence, false);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
