import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_AUDIT_PACKAGE_FINGERPRINT,
  EXPECTED_BACKFILL_PLAN_FINGERPRINT,
  EXPECTED_CANDIDATE_ROWS,
  EXPECTED_NORMALIZED_ROWS,
  PACKAGE_ID,
} from "../../scripts/audits/market_reference_tcgdex_pricing_backfill_apply_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("TCGdex backfill apply constants preserve approved audit plan", () => {
  assert.equal(PACKAGE_ID, "MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-APPLY-V1");
  assert.equal(EXPECTED_AUDIT_PACKAGE_FINGERPRINT, "da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899");
  assert.equal(EXPECTED_BACKFILL_PLAN_FINGERPRINT, "60ed28faf7ed421344fe4637e421d0b1e7029a563fc8ee1d46caede95e0aa4c9");
  assert.equal(EXPECTED_CANDIDATE_ROWS, 310744);
  assert.equal(EXPECTED_NORMALIZED_ROWS, 310744);
});

test("TCGdex backfill apply script targets internal reference warehouse only", () => {
  const script = source("scripts/audits/market_reference_tcgdex_pricing_backfill_apply_v1.mjs");

  assert.match(script, /market_reference_candidates/);
  assert.match(script, /market_reference_normalized_evidence/);
  assert.match(script, /candidate_hash/);
  assert.match(script, /--apply/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});
