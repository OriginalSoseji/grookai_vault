import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const REPORT_PATH =
  "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_APPLY_V1/report.json";

test("MEE core lifecycle batch 03 apply report proves clean readback", () => {
  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-03-APPLY-V1");
  assert.equal(report.source_plan_fingerprint, "06860a3ab0d54291ee13326e0f8d4ba4591fa671125662a5b39d295b3efaf8e0");
  assert.equal(
    report.package_readback_sql.output_artifact,
    "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_APPLY_V1/package_readback_output.txt",
  );
  assert.equal(report.apply_summary.inserted_market_evidence_observations, 5000);
  assert.equal(report.apply_summary.inserted_market_evidence_lifecycle_events, 35000);
  assert.equal(report.readback.observations.actual, 5000);
  assert.equal(report.readback.events.actual, 35000);
  assert.equal(report.readback.events.distinct_event_hashes, 35000);
  assert.equal(report.readback.current_view.actual, 5000);
  assert.equal(report.readback.current_view.app_visible_true, 0);
  assert.equal(report.readback.current_view.market_truth_true, 0);
  assert.equal(report.readback.public_pricing_surface.pricing_observations_count, 0);
  assert.equal(report.readback.public_pricing_surface.v_card_pricing_references_market_evidence, false);
  assert.deepEqual(report.findings, []);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
