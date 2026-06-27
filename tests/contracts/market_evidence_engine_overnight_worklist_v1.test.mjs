import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE overnight worklist runner is read-only and provider-free", () => {
  const script = source("scripts/audits/market_evidence_engine_overnight_worklist_v1.mjs");
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_03_OVERNIGHT_WORKLIST_PLAN_V1.md");
  const pkg = source("package.json");

  assert.match(pkg, /"mee:overnight:worklist"/);
  assert.match(plan, /No migration was created/);
  assert.match(plan, /No database writes, provider calls, scraper jobs, or pricing rollups/);
  assert.match(plan, /v_pricing_observations_accepted/);
  assert.match(plan, /justtcg_variant_prices_latest/);

  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /searchActiveListings|fetchItemDetails|fetch\(/);
  assert.match(script, /mode: 'read_only_worklist'/);
});
