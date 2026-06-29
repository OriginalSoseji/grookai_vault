import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("market listing review gate threshold plan stays read-only and non-public", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_review_gate_threshold_plan_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-REVIEW-GATE-THRESHOLD-PLAN-V1/);
  assert.match(script, /read_only_review_gate_threshold_plan_no_writes/);
  assert.match(script, /RAW_SINGLE_ACTIVE_ASK_REVIEW/);
  assert.match(script, /SLAB_ACTIVE_ASK_REVIEW/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /public_price_rollups:\s*false/);
  assert.match(script, /review_ready_internal_candidate/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
