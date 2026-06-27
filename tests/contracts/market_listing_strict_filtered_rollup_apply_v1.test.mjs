import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("strict filtered rollup apply is fingerprint-gated and only writes internal rollups", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1/);
  assert.match(script, /EXPECTED_SOURCE_PLAN_FINGERPRINT = "969085b81bd0397cc82c08c336720ef285aef04a4b32f9cbae16d37c351ff42f"/);
  assert.match(script, /EXPECTED_SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT = "7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec"/);
  assert.match(script, /EXPECTED_ROLLUP_COUNT = 2243/);
  assert.match(script, /allowDynamicPlan/);
  assert.match(script, /--allow-dynamic-plan/);
  assert.match(script, /MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1/);
  assert.match(script, /MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1/);
  assert.match(script, /--rollup-version-suffix=/);
  assert.match(script, /--run-key=/);
  assert.match(script, /normalizeRollupVersionSuffix/);
  assert.match(script, /BASE_ROLLUP_VERSION_BY_EVIDENCE_CLASS/);
  assert.match(script, /needs_review:\s*true/);
  assert.match(script, /publishable:\s*false/);
  assert.match(script, /app_visible:\s*false/);
  assert.match(script, /market_truth:\s*false/);
  assert.match(script, /if \(args\.apply\)/);
  assert.match(script, /\.from\("market_listing_rollups"\)[\s\S]*\.insert\(chunk\)/);
  assert.doesNotMatch(script, /\.from\("market_listing_card_candidates"\)[\s\S]*\.insert/);
  assert.doesNotMatch(script, /\.from\("pricing_observations"\)/);
  assert.doesNotMatch(script, /\.from\("ebay_active_prices_latest"\)/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
});
