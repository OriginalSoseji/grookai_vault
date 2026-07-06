import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1 projects ordered internal lifecycle rows only", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_projection_dry_run_v1.mjs", import.meta.url),
    "utf8",
  );
  const report = JSON.parse(
    readFileSync(
      new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1.json", import.meta.url),
      "utf8",
    ),
  );

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-PROJECTION-DRY-RUN-V1");
  assert.equal(report.mode, "read_only_projection_no_db_writes");
  assert.equal(report.summary.stage_sequence_valid, true);
  assert.equal(report.findings.length, 0);
  assert.equal(report.boundary_proof.db_writes, false);
  assert.equal(report.boundary_proof.evidence_backfill, false);
  assert.equal(report.boundary_proof.provider_calls, false);
  assert.equal(report.boundary_proof.public_pricing_views, false);
  assert.equal(report.boundary_proof.app_visible_pricing, false);
  assert.equal(report.boundary_proof.migrations, false);

  const expectedStages = [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
  ];

  for (const sample of report.projected_samples) {
    assert.equal(sample.lifecycle_events.length, expectedStages.length);
    assert.deepEqual(
      sample.lifecycle_events.map((event) => event.to_state),
      expectedStages,
    );
    for (const event of sample.lifecycle_events) {
      assert.equal(event.needs_review, true);
      assert.equal(event.publishable, false);
      assert.equal(event.app_visible, false);
      assert.equal(event.market_truth, false);
      assert.equal(event.event_payload.dry_run_only, true);
    }
  }

  assert.doesNotMatch(script, /insert\s+into\s+public\./i);
  assert.doesNotMatch(script, /update\s+public\./i);
  assert.doesNotMatch(script, /delete\s+from\s+public\./i);
  assert.doesNotMatch(script, /insert\s+into\s+public\.pricing_observations/i);
  assert.doesNotMatch(script, /insert\s+into\s+public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(script, /create\s+(or\s+replace\s+)?view\s+public\.v_card_pricing_ui_v1/i);
});
