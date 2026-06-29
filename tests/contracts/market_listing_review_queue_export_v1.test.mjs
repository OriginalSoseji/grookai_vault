import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("market listing review queue export is local-only and non-public", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_review_queue_export_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-REVIEW-QUEUE-EXPORT-V1/);
  assert.match(script, /local_review_queue_export_no_writes_no_provider_calls/);
  assert.match(script, /review_queue_csv_path/);
  assert.match(script, /review_required_contamination/);
  assert.match(script, /review_ready_internal_candidate/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /public_price_rollups:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
