import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1 prepares a separate bounded local plan only", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_lifecycle_backfill_batch_02_plan_v1.mjs", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        "../../docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(manifest.package_id, "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-02-V1");
  assert.equal(manifest.mode, "local_backfill_batch_plan_only_no_db_writes");
  assert.equal(manifest.limits.total_limit, 5000);
  assert.equal(manifest.row_counts.market_evidence_observations, 5000);
  assert.equal(manifest.row_counts.market_evidence_lifecycle_events, 35000);
  assert.equal(manifest.row_counts.reference_observations, 2500);
  assert.equal(manifest.row_counts.active_listing_observations, 2500);
  assert.equal(manifest.findings.length, 0);
  assert.equal(manifest.duplicate_risk.observation_ids_unique, true);
  assert.equal(manifest.duplicate_risk.observation_keys_unique, true);
  assert.equal(manifest.duplicate_risk.event_hashes_unique, true);
  assert.equal(manifest.duplicate_risk.excludes_existing_market_evidence_observations, true);
  assert.equal(typeof manifest.manifest_hashes.market_evidence_observations_jsonl_sha256, "string");
  assert.equal(typeof manifest.manifest_hashes.market_evidence_lifecycle_events_jsonl_sha256, "string");
  assert.equal(typeof manifest.manifest_hashes.readback_sql_sha256, "string");

  for (const [key, value] of Object.entries(manifest.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }

  assert.doesNotMatch(script, /insert\s+into\s+public\./i);
  assert.doesNotMatch(script, /update\s+public\./i);
  assert.doesNotMatch(script, /delete\s+from\s+public\./i);
  assert.doesNotMatch(script, /on\s+conflict/i);
  assert.doesNotMatch(script, /\bmerge\b/i);
  assert.doesNotMatch(script, /supabase\s+migration/i);
});
