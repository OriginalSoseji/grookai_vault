import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE warehouse implementation plan preserves evidence lane boundaries", () => {
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_02_WAREHOUSE_IMPLEMENTATION_PLAN_V1.md");

  assert.match(plan, /Implementation plan only/);
  assert.match(plan, /market_evidence_raw_snapshots/);
  assert.match(plan, /market_evidence_normalized_listings/);
  assert.match(plan, /pricing_observations/);
  assert.match(plan, /v_pricing_observations_accepted/);
  assert.match(plan, /Only `pricing_observations` plus `classification = accepted` and `mapping_status = mapped` can feed market pricing/);
  assert.match(plan, /No Raw Or Normalized Direct Pricing Consumers/);
  assert.match(plan, /No Broad Backfill By Default/);
  assert.match(plan, /MEE-02A: Migration Draft Only/);
  assert.match(plan, /Do not apply the migration until the user approves/);
});

test("MEE-02 has not added a warehouse migration yet", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  const marketEvidenceMigrations = migrations.filter((name) => /market_evidence_warehouse_v1/i.test(name));

  assert.deepEqual(marketEvidenceMigrations, []);
});
