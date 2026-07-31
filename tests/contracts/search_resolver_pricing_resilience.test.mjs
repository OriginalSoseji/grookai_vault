import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("ordinary market pricing fails open while complete value-sort reads fail closed", () => {
  const source = readFileSync(
    "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
    "utf8",
  );

  assert.match(source, /getMarketPricingReadModelV1/);
  assert.match(source, /raw_price_source: "tcgplayer_market"/);
  assert.match(
    source,
    /shared market read failed; the page will continue without remaining pricing enrichment/,
  );
  assert.match(source, /return \{ pricingByCardId, complete, incompleteReason \};/);
  assert.match(source, /return result\.pricingByCardId/);
  assert.match(
    source,
    /if \(options\.requireComplete && !result\.complete\)[\s\S]*?throw new PublicPricingSortUnavailableError/,
  );
  assert.doesNotMatch(
    source,
    /v_market_evidence_public_pricing_bridge_reference_anchored_v1/,
  );
});
