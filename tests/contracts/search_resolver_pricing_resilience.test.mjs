import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("ordinary pricing fails open while complete value-sort reads fail closed", () => {
  const source = readFileSync(
    "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
    "utf8",
  );

  assert.match(
    source,
    /public bridge read failed; the page will continue without remaining pricing enrichment/,
  );
  assert.match(source, /if\s*\(\s*error\s*\)\s*\{[\s\S]*?break;/);
  assert.match(source, /catch\s*\(error\)[\s\S]*?break;/);
  assert.match(source, /return \{ pricingByCardId, complete, incompleteReason \};/);
  assert.match(source, /result\.pricingByCardId/);
  assert.match(
    source,
    /if \(options\.requireComplete && !result\.complete\)[\s\S]*?throw new PublicPricingSortUnavailableError/,
  );
  assert.doesNotMatch(source, /if\s*\(\s*error\s*\)\s*\{\s*throw error;\s*\}/);
});
