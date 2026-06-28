import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_TCGDEX_CANDIDATES,
  EXPECTED_TCGDEX_NORMALIZED,
  PACKAGE_ID,
  ROLLUP_VERSION,
} from "../../scripts/audits/market_reference_tcgdex_signal_rollup_refresh_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("TCGdex signal rollup refresh constants define internal-only version", () => {
  assert.equal(PACKAGE_ID, "MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1");
  assert.equal(ROLLUP_VERSION, "MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1");
  assert.equal(EXPECTED_TCGDEX_CANDIDATES, 310744);
  assert.equal(EXPECTED_TCGDEX_NORMALIZED, 310744);
});

test("TCGdex signal rollup refresh only writes internal signal rollups", () => {
  const script = source("scripts/audits/market_reference_tcgdex_signal_rollup_refresh_v1.mjs");

  assert.match(script, /market_reference_signal_rollups/);
  assert.match(script, /publishable !== false/);
  assert.match(script, /app_visible !== false/);
  assert.match(script, /market_truth !== false/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});
