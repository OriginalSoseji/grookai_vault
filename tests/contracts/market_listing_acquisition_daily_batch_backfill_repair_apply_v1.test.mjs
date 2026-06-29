import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE-11Q repair apply script is scoped to missing seller snapshots and price events", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_acquisition_daily_batch_backfill_repair_apply_v1.mjs", import.meta.url), "utf8");

  assert.match(script, /MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-REPAIR-APPLY-V1/);
  assert.match(script, /EXPECTED_PACKAGE_FINGERPRINT = "b0b65f427302042ba29889133a968551110cd277c7b5bfa2a68edd505b8ce79a"/);
  assert.match(script, /EXPECTED_ROW_MANIFEST_HASH = "d49476930339252c71ab15dd71e4a83a1ef207b627a5e4b5767d8afb04d9cb04"/);
  assert.doesNotMatch(script, /\bupsert\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
