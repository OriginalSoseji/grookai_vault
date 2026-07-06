import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("search pricing enrichment fails open instead of breaking resolver results", () => {
  const source = readFileSync(
    "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
    "utf8",
  );

  assert.match(
    source,
    /public bridge read failed; search will continue without pricing enrichment/,
  );
  assert.match(source, /if\s*\(\s*error\s*\)\s*\{[\s\S]*return new Map\(\);/);
  assert.doesNotMatch(source, /if\s*\(\s*error\s*\)\s*\{\s*throw error;\s*\}/);
});

