import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SCRIPT_PATH = "scripts/audits/market_evidence_lifecycle_backfill_batch_apply_v1.mjs";
const REPORT_PATH =
  "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_APPLY_V1/report.json";

test("MEE core lifecycle batch 02 apply runner supports bounded package overrides", () => {
  const script = readFileSync(SCRIPT_PATH, "utf8");

  assert.match(script, /MEE_LIFECYCLE_PLAN_DIR/);
  assert.match(script, /MEE_LIFECYCLE_APPLY_DIR/);
  assert.match(script, /MEE_LIFECYCLE_APPLY_PACKAGE_ID/);
  assert.match(script, /MEE_LIFECYCLE_APPROVED_FINGERPRINT/);
  assert.match(script, /market_evidence_observations/);
  assert.match(script, /market_evidence_lifecycle_events/);

  const forbiddenWritePatterns = [
    /insert\s+into\s+public\.pricing_observations/i,
    /insert\s+into\s+public\.ebay_active_prices_latest/i,
    /create\s+view\s+public\.v_card_pricing_ui_v1/i,
    /delete\s+from\s+public\./i,
    /update\s+public\./i,
    /merge\s+into/i,
    /on\s+conflict/i,
    /\.upsert\s*\(/i,
    /supabase\s+migration/i,
  ];

  for (const pattern of forbiddenWritePatterns) {
    assert.doesNotMatch(script, pattern);
  }
});

test("MEE core lifecycle batch 02 apply report proves clean readback", () => {
  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-02-APPLY-V1");
  assert.equal(report.source_plan_fingerprint, "cd9fc4cecd4d09bad578be7300383f4cbd5f41c50696d72678e40824815ce125");
  assert.equal(report.package_readback_sql.output_artifact,
    "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_APPLY_V1/package_readback_output.txt",
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
