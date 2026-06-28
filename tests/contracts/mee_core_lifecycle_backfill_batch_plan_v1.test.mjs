import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJsonl(text) {
  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const manifestPath = "../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1/manifest.json";
const artifactsAvailable = (() => {
  try {
    readFileSync(new URL(manifestPath, import.meta.url), "utf8");
    return true;
  } catch {
    return false;
  }
})();
const artifactTest = artifactsAvailable ? test : test.skip;

test("MEE lifecycle batch planner keeps reference source filtering explicit and optional", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /process\.env\.MEE_LIFECYCLE_REFERENCE_SOURCES/);
  assert.match(script, /\.split\(",">\)|\.split\(","\)/);
  assert.match(script, /REFERENCE_SOURCES\.length > 0 \? `and c\.source in \(\$\{sqlInList\(REFERENCE_SOURCES\)\}\)` : ""/);
  assert.match(script, /function sqlInList\(values\)/);
});

artifactTest("MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1 prepares a bounded local plan only", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL(manifestPath, import.meta.url),
      "utf8",
    ),
  );
  const observationsText = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1/market_evidence_observations.jsonl", import.meta.url),
    "utf8",
  );
  const eventsText = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1/market_evidence_lifecycle_events.jsonl", import.meta.url),
    "utf8",
  );
  const readbackSql = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1/readback.sql", import.meta.url),
    "utf8",
  );

  assert.equal(manifest.package_id, "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-V1");
  assert.equal(manifest.mode, "local_backfill_batch_plan_only_no_db_writes");
  assert.equal(manifest.limits.total_limit, 5000);
  assert.equal(manifest.row_counts.market_evidence_observations, observationsText.trim() ? readJsonl(observationsText).length : 0);
  assert.equal(manifest.row_counts.market_evidence_lifecycle_events, eventsText.trim() ? readJsonl(eventsText).length : 0);
  assert.equal(manifest.row_counts.reference_observations, 0);
  assert.equal(manifest.row_counts.active_listing_observations, 0);
  assert.equal(manifest.findings.length, 0);
  assert.equal(manifest.duplicate_risk.observation_ids_unique, true);
  assert.equal(manifest.duplicate_risk.observation_keys_unique, true);
  assert.equal(manifest.duplicate_risk.event_hashes_unique, true);
  assert.equal(manifest.duplicate_risk.excludes_existing_market_evidence_observations, true);

  assert.equal(sha256(observationsText), manifest.manifest_hashes.market_evidence_observations_jsonl_sha256);
  assert.equal(sha256(eventsText), manifest.manifest_hashes.market_evidence_lifecycle_events_jsonl_sha256);
  assert.equal(sha256(readbackSql), manifest.manifest_hashes.readback_sql_sha256);

  const observations = readJsonl(observationsText);
  const events = readJsonl(eventsText);
  const observationIds = new Set(observations.map((row) => row.id));
  const eventHashes = new Set(events.map((row) => row.event_hash));
  const expectedStages = [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
  ];

  assert.equal(observationIds.size, observations.length);
  assert.equal(eventHashes.size, events.length);

  for (const event of events) {
    assert.equal(observationIds.has(event.observation_id), true);
    assert.equal(event.needs_review, true);
    assert.equal(event.publishable, false);
    assert.equal(event.app_visible, false);
    assert.equal(event.market_truth, false);
  }

  for (const observation of observations.slice(0, 25)) {
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

  assert.doesNotMatch(script, /insert\s+into\s+public\./i);
  assert.doesNotMatch(script, /update\s+public\./i);
  assert.doesNotMatch(script, /delete\s+from\s+public\./i);
  assert.doesNotMatch(script, /on\s+conflict/i);
  assert.doesNotMatch(script, /\bmerge\b/i);
  assert.doesNotMatch(script, /supabase\s+migration/i);
  assert.doesNotMatch(readbackSql, /insert\s+into\s+public\./i);
  assert.doesNotMatch(readbackSql, /update\s+public\./i);
  assert.doesNotMatch(readbackSql, /delete\s+from\s+public\./i);
});
