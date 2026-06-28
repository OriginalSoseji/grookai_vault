import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const reportPath = "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_REMAINING_DRAIN_V1/report.json";
const artifactsAvailable = existsSync(reportPath);
const artifactTest = artifactsAvailable ? test : test.skip;

artifactTest("MEE core lifecycle remaining drain final resume completed with internal-only readback", () => {
  const report = JSON.parse(
    readFileSync(
      reportPath,
      "utf8",
    ),
  );

  assert.equal(report.run_id, "MEE-CORE-LIFECYCLE-REMAINING-DRAIN-V1");
  assert.equal(report.stopped_reason, "no_eligible_source_rows_remaining");
  assert.equal(report.batch_count, 0);
  assert.equal(report.total_inserted_observations, 0);
  assert.equal(report.total_inserted_lifecycle_events, 0);
  assert.deepEqual(report.batches, []);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
