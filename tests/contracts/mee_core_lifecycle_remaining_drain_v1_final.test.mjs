import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE core lifecycle remaining drain final resume completed with internal-only readback", () => {
  const report = JSON.parse(
    readFileSync(
      "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_REMAINING_DRAIN_V1/report.json",
      "utf8",
    ),
  );

  assert.equal(report.run_id, "MEE-CORE-LIFECYCLE-REMAINING-DRAIN-V1");
  assert.equal(report.stopped_reason, "final_partial_batch_applied");
  assert.equal(report.batch_count, 8);
  assert.equal(report.total_inserted_observations, 75035);
  assert.equal(report.total_inserted_lifecycle_events, 525245);

  const expectedBatches = [
    [15, 10000, 70000],
    [16, 10000, 70000],
    [17, 10000, 70000],
    [18, 10000, 70000],
    [19, 10000, 70000],
    [20, 10000, 70000],
    [21, 10000, 70000],
    [22, 5035, 35245],
  ];

  for (const [batchNumber, observations, events] of expectedBatches) {
    const batch = report.batches.find((row) => row.batch_number === batchNumber);
    assert.ok(batch, `batch ${batchNumber} report must exist`);
    assert.equal(batch.row_counts.market_evidence_observations, observations);
    assert.equal(batch.row_counts.market_evidence_lifecycle_events, events);
    assert.equal(batch.readback.observations.actual, observations);
    assert.equal(batch.readback.events.actual, events);
    assert.equal(batch.readback.events.distinct_event_hashes, events);
    assert.equal(batch.readback.current_view.app_visible_true, 0);
    assert.equal(batch.readback.current_view.market_truth_true, 0);
    assert.equal(batch.readback.public_pricing_surface.pricing_observations_count, 0);
    assert.equal(batch.readback.public_pricing_surface.v_card_pricing_references_market_evidence, false);
  }

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
