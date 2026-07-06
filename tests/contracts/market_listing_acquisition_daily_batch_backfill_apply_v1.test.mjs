import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE-11N apply script preserves approved boundary language", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs", import.meta.url), "utf8");

  assert.match(script, /MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1/);
  assert.match(script, /EXPECTED_PLAN_PACKAGE_FINGERPRINT = "2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44"/);
  assert.match(script, /EXPECTED_ROW_MANIFEST_HASH = "92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a"/);
  assert.match(script, /--allow-dynamic-plan/);
  assert.match(script, /dynamic_idempotent_apply/);
  assert.match(script, /buildDynamicSkipState/);
  assert.match(script, /skipRowForTable/);
  assert.match(script, /raw_payload_collision_planned_ids/);
  assert.match(script, /seller_unique_collision_planned_ids/);
  assert.match(script, /remote_id_collisions_detected/);
  assert.doesNotMatch(script, /\bupsert\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
