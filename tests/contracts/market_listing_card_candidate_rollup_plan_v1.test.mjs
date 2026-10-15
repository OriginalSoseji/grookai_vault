import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE-11S candidate rollup plan stays review-only and non-public", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs", import.meta.url), "utf8");

  assert.match(script, /MARKET-LISTING-CARD-CANDIDATE-ROLLUP-PLAN-V1/);
  assert.match(script, /needs_review: true/);
  assert.match(script, /can_publish_price_directly: false/);
  assert.match(script, /publishable: false/);
  assert.match(script, /app_visible: false/);
  assert.match(script, /market_truth: false/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.match(script, /slabIdentityFromEvent/);
  assert.match(script, /slabIdentitySummary/);
  assert.match(script, /reviewable_same_grade_identity/);
  assert.match(script, /blocked_mixed_grader_grade/);
  assert.match(script, /can_auto_approve: false/);
});
