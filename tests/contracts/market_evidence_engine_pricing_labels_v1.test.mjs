import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("card pricing rail labels reference and market lanes explicitly", () => {
  const pricingRail = source("apps/web/src/components/pricing/CardPagePricingRail.tsx");

  assert.doesNotMatch(pricingRail, /JustTCG/);
  assert.match(pricingRail, /Evidence-anchored Grookai Value/);
  assert.match(pricingRail, /Lowest Available Today/);
  assert.match(pricingRail, /eBay active ask/);
  assert.match(pricingRail, /Median active ask/);
  assert.match(pricingRail, /Ask Range/);
  assert.match(pricingRail, /Active asks are asking-price evidence, not sold comps\./);
  assert.doesNotMatch(pricingRail, /source=\{pricing\?\.primary_source\}/);
  assert.doesNotMatch(pricingRail, />\* Market reference</);
});

test("market evidence engine resume does not send future work back to initial reference implementation", () => {
  const resume = source("docs/system/RESUME_PRICING_V1.md");
  const checkpointIndex = source("docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md");

  assert.match(checkpointIndex, /PRICING_CHECKPOINT_12_REFERENCE_LAYER_IMPLEMENTATION/);
  assert.match(resume, /Market Evidence Engine/i);
  assert.doesNotMatch(resume, /Primary next step:\s*\n\n- `REFERENCE_PRICING_LAYER_V1`/);
});
