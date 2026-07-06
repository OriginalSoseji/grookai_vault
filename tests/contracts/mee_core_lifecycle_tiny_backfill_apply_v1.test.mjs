import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1 is scoped to exact lifecycle inserts", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_tiny_backfill_apply_v1.mjs", import.meta.url),
    "utf8",
  );
  const report = JSON.parse(
    readFileSync(
      new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1/report.json", import.meta.url),
      "utf8",
    ),
  );
  const applySql = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1/apply.sql", import.meta.url),
    "utf8",
  );

  assert.match(script, /APPROVED_PACKAGE_FINGERPRINT = "aabb3f8d7556afed1ff8a85a75cc44007f7d468a225f60f813650251b0218e2f"/);
  assert.match(script, /APPROVED_PROJECTION_FINGERPRINT = "99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d"/);
  assert.match(script, /insert into public\.market_evidence_observations/i);
  assert.match(script, /insert into public\.market_evidence_lifecycle_events/i);
  assert.doesNotMatch(script, /insert into public\.pricing_observations/i);
  assert.doesNotMatch(script, /insert into public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(script, /create\s+(or\s+replace\s+)?view\s+public\.v_card_pricing_ui_v1/i);
  assert.doesNotMatch(script, /delete\s+from\s+public\./i);
  assert.doesNotMatch(script, /update\s+public\./i);
  assert.doesNotMatch(script, /on\s+conflict/i);
  assert.doesNotMatch(script, /\bmerge\b/i);
  assert.doesNotMatch(script, /supabase\s+migration/i);

  assert.equal(report.package_id, "MEE-CORE-LIFECYCLE-TINY-BACKFILL-APPLY-V1");
  assert.equal(report.source_plan_fingerprint, "aabb3f8d7556afed1ff8a85a75cc44007f7d468a225f60f813650251b0218e2f");
  assert.equal(report.source_projection_fingerprint, "99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d");
  assert.equal(report.apply_summary.inserted_market_evidence_observations, 6);
  assert.equal(report.apply_summary.inserted_market_evidence_lifecycle_events, 42);
  assert.equal(report.readback.observations.actual, 6);
  assert.equal(report.readback.events.actual, 42);
  assert.equal(report.readback.events.distinct_event_hashes, 42);
  assert.equal(report.readback.current_view.actual, 6);
  assert.equal(report.readback.current_view.rollup_eligible_state_count, 6);
  assert.equal(report.readback.current_view.app_visible_true, 0);
  assert.equal(report.readback.current_view.market_truth_true, 0);
  assert.equal(report.readback.public_pricing_surface.pricing_observations_count, 0);
  assert.equal(report.readback.public_pricing_surface.v_card_pricing_references_market_evidence, false);
  assert.equal(report.findings.length, 0);

  assert.match(applySql, /insert into public\.market_evidence_observations/i);
  assert.match(applySql, /insert into public\.market_evidence_lifecycle_events/i);
  assert.doesNotMatch(applySql, /insert into public\.pricing_observations/i);
  assert.doesNotMatch(applySql, /insert into public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(applySql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(applySql, /update\s+public\./i);
  assert.doesNotMatch(applySql, /on\s+conflict/i);
  assert.doesNotMatch(applySql, /\bmerge\b/i);
});
