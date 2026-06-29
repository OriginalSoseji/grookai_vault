import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("nightly ingest orchestrator plan is dry-run only and requires strict-filtered apply/readback", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_nightly_ingest_orchestrator_plan_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-NIGHTLY-INGEST-ORCHESTRATOR-PLAN-V1/);
  assert.match(script, /local_orchestrator_plan_no_provider_calls_no_db_writes/);
  assert.match(script, /MARKET_LISTING_NIGHTLY_INGEST_V1/);
  assert.match(script, /market_listing_strict_filtered_rollup_apply_v1\.mjs/);
  assert.match(script, /market_listing_nightly_ingest_readback_v1\.mjs/);
  assert.match(script, /Apply strict title evidence filtering before rollup medians are calculated/);
  assert.match(script, /No pricing_observations writes/);
  assert.match(script, /No ebay_active_prices_latest writes/);
  assert.match(script, /No card_prints\/card_printings writes/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
