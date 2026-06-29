import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SCRIPT_PATH = "scripts/audits/market_evidence_lifecycle_backfill_batch_apply_v1.mjs";
const REPORT_PATH =
  "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_APPLY_V1/report.json";

test("MEE core lifecycle batch apply remains bounded to lifecycle tables", () => {
  const script = readFileSync(SCRIPT_PATH, "utf8").toLowerCase();

  assert.match(script, /142dce4e526c092034c7ba0ac86af23c604c469223fd21062c5c83fd3a744f6c/);
  assert.match(script, /market_evidence_observations/);
  assert.match(script, /market_evidence_lifecycle_events/);

  const forbiddenWritePatterns = [
    /insert\s+into\s+public\.pricing_observations/,
    /insert\s+into\s+public\.ebay_active_prices_latest/,
    /create\s+view\s+public\.v_card_pricing_ui_v1/,
    /delete\s+from\s+public\./,
    /update\s+public\./,
    /merge\s+into/,
    /on\s+conflict/,
    /\.upsert\s*\(/,
    /supabase\s+migration/,
  ];

  for (const pattern of forbiddenWritePatterns) {
    assert.doesNotMatch(script, pattern);
  }
});

test("MEE core lifecycle batch apply report proves clean readback", () => {
  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-APPLY-V1");
  assert.equal(report.source_plan_fingerprint, "142dce4e526c092034c7ba0ac86af23c604c469223fd21062c5c83fd3a744f6c");
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
