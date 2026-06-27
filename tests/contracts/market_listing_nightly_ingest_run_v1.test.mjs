import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("nightly ingest run wrapper is gated before provider calls or warehouse writes", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_nightly_ingest_run_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-NIGHTLY-INGEST-RUN-V1/);
  assert.match(script, /dry_run_readiness_no_provider_calls_no_db_writes/);
  assert.match(script, /MARKET_LISTING_NIGHTLY_INGEST_V1/);
  assert.match(script, /DEFAULT_CALL_CEILING\s*=\s*4000/);
  assert.match(script, /strictRollupVersionsForRun/);
  assert.match(script, /run_specific_strict_rollup_versions_already_exist/);
  assert.match(script, /daily_batch_backfill_apply_dynamic_idempotency_required/);
  assert.match(script, /dynamic_idempotent_apply/);
  assert.match(script, /run_blocked_by_preflight_findings/);
  assert.match(script, /Patch daily batch backfill apply to support dynamic package fingerprints and idempotent delta inserts/);
  assert.match(script, /market_listing_acquisition_daily_batch_fetch_v1\.mjs/);
  assert.match(script, /market_listing_acquisition_daily_batch_backfill_apply_v1\.mjs/);
  assert.match(script, /"--allow-dynamic-plan", "--apply"/);
  assert.match(script, /market_listing_card_candidate_rollup_plan_v1\.mjs/);
  assert.match(script, /market_listing_card_candidate_rollup_apply_v1\.mjs/);
  assert.match(script, /card_candidate_rollup_apply_dynamic_idempotency_required/);
  assert.match(script, /market_listing_strict_filtered_rollup_apply_v1\.mjs/);
  assert.match(script, /market_listing_nightly_ingest_readback_v1\.mjs/);
  assert.match(script, /No public pricing views/);
  assert.match(script, /No app-visible pricing/);
  assert.match(script, /No pricing_observations writes/);
  assert.match(script, /No ebay_active_prices_latest writes/);
  assert.match(script, /No identity-table writes/);
  assert.match(script, /No card_prints\/card_printings writes/);
  assert.match(script, /No image\/storage writes/);
  assert.match(script, /No migrations/);
  assert.match(script, /pricing_observations_writes:\s*false/);
  assert.match(script, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(script, /public_pricing_views:\s*false/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /identity_table_writes:\s*false/);
  assert.match(script, /card_prints_writes:\s*false/);
  assert.match(script, /card_printings_writes:\s*false/);
  assert.match(script, /vault_writes:\s*false/);
  assert.match(script, /image_writes:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
