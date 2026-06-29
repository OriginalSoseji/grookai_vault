import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("MEE-07A defines a separate free-reference warehouse boundary", () => {
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md");

  assert.match(plan, /Contract plan only/);
  assert.match(plan, /tcgcsv_reference/);
  assert.match(plan, /pokemontcg_io_reference/);
  assert.match(plan, /market_reference_acquisition_runs/);
  assert.match(plan, /market_reference_raw_snapshots/);
  assert.match(plan, /market_reference_candidates/);
  assert.match(plan, /market_reference_normalized_evidence/);
  assert.match(plan, /market_reference_coverage_reports/);
  assert.match(plan, /market_reference_signal_rollups` is intentionally deferred/);
});

test("MEE-07A prevents reference evidence from becoming public pricing truth", () => {
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md");

  assert.match(plan, /Reference evidence is not Market Truth/);
  assert.match(plan, /Reference evidence must not write `pricing_observations`/);
  assert.match(plan, /Reference evidence must not write `ebay_active_prices_latest`/);
  assert.match(plan, /can_publish_price_directly = false/);
  assert.match(plan, /needs_review = true/);
  assert.match(plan, /app UI reads no reference warehouse tables directly/);
  assert.match(plan, /Backfill must not call providers/);
  assert.match(plan, /Backfill must not compute public prices/);
});

test("MEE-07A approved migration exists and matches the reviewed candidate", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  const referenceWarehouseMigrations = migrations.filter((name) => /market_reference_warehouse_v1/i.test(name));
  const candidate = source("docs/sql/market_reference_warehouse_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625000000_market_reference_warehouse_v1.sql");

  assert.deepEqual(referenceWarehouseMigrations, ["20260625000000_market_reference_warehouse_v1.sql"]);
  assert.equal(sha256(migration), sha256(candidate));
});
