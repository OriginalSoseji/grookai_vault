import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1 prepares only local lifecycle rows", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_tiny_backfill_plan_v1.mjs", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const observationsJsonl = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/market_evidence_observations.jsonl", import.meta.url),
    "utf8",
  );
  const eventsJsonl = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/market_evidence_lifecycle_events.jsonl", import.meta.url),
    "utf8",
  );

  assert.equal(manifest.package_id, "MEE-CORE-LIFECYCLE-TINY-BACKFILL-PLAN-V1");
  assert.equal(manifest.mode, "local_backfill_plan_only_no_db_writes");
  assert.equal(
    manifest.source_projection_fingerprint,
    "99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d",
  );
  assert.equal(manifest.row_counts.market_evidence_observations, 6);
  assert.equal(manifest.row_counts.market_evidence_lifecycle_events, 42);
  assert.equal(manifest.findings.length, 0);
  assert.equal(
    sha256(observationsJsonl),
    manifest.manifest_hashes.market_evidence_observations_jsonl_sha256,
  );
  assert.equal(
    sha256(eventsJsonl),
    manifest.manifest_hashes.market_evidence_lifecycle_events_jsonl_sha256,
  );

  const observations = observationsJsonl.trim().split("\n").map((line) => JSON.parse(line));
  const events = eventsJsonl.trim().split("\n").map((line) => JSON.parse(line));
  const observationIds = new Set(observations.map((row) => row.id));
  const expectedStages = [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
  ];

  for (const event of events) {
    assert.equal(observationIds.has(event.observation_id), true);
    assert.equal(event.needs_review, true);
    assert.equal(event.publishable, false);
    assert.equal(event.app_visible, false);
    assert.equal(event.market_truth, false);
  }

  for (const observation of observations) {
    const stages = events
      .filter((event) => event.observation_id === observation.id)
      .sort((left, right) => left.stage_order - right.stage_order)
      .map((event) => event.to_state);
    assert.deepEqual(stages, expectedStages);
  }

  assert.equal(manifest.boundary_proof.db_writes, false);
  assert.equal(manifest.boundary_proof.evidence_backfill_apply, false);
  assert.equal(manifest.boundary_proof.provider_calls, false);
  assert.equal(manifest.boundary_proof.pricing_observations_writes, false);
  assert.equal(manifest.boundary_proof.ebay_active_prices_latest_writes, false);
  assert.equal(manifest.boundary_proof.public_pricing_views, false);
  assert.equal(manifest.boundary_proof.migrations, false);

  assert.doesNotMatch(script, /supabase\s+db\s+query/i);
  assert.doesNotMatch(script, /insert\s+into\s+public\./i);
  assert.doesNotMatch(script, /update\s+public\./i);
  assert.doesNotMatch(script, /delete\s+from\s+public\./i);
});
