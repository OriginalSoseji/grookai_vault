import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("nightly ingest readback is read-only and proves public pricing boundary", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_nightly_ingest_readback_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-NIGHTLY-INGEST-READBACK-V1/);
  assert.match(script, /read_only_nightly_ingest_morning_report_no_writes/);
  assert.match(script, /MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1/);
  assert.match(script, /MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1/);
  assert.match(script, /public_pricing_view_references_market_listing/);
  assert.match(script, /public_pricing_view_references_market_reference/);
  assert.match(script, /public_pricing_view_references_justtcg/);
  assert.match(script, /strict_rollups_app_visible_boundary_leak/);
  assert.match(script, /candidate_direct_publish_boundary_leak/);
  assert.match(script, /provider_calls:\s*false/);
  assert.match(script, /db_writes:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
