import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("market evidence cleanup baseline is read-only and checks public exposure gates", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_evidence_cleanup_baseline_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-EVIDENCE-CLEANUP-BASELINE-V1/);
  assert.match(script, /read_only_cleanup_baseline_no_writes_no_provider_calls/);
  assert.match(script, /public_pricing_view_still_references_justtcg/);
  assert.match(script, /listing_rollups_have_app_visible_leak/);
  assert.match(script, /reference_signal_rollups_have_app_visible_leak/);
  assert.match(script, /market_listing_card_candidates/);
  assert.match(script, /market_listing_rollups/);
  assert.match(script, /market_reference_signal_rollups/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
