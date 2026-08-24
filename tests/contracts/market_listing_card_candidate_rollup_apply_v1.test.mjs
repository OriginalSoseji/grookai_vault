import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE-11T candidate rollup apply script is scoped to review-only internal rows", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_card_candidate_rollup_apply_v1.mjs", import.meta.url), "utf8");

  assert.match(script, /MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1/);
  assert.match(script, /EXPECTED_PACKAGE_FINGERPRINT = "c2c4a7de394de8abbc3b4f6361e648f2741a6995eef03bfc505cda737e2edbd9"/);
  assert.match(script, /EXPECTED_ROW_MANIFEST_HASH = "963575b361071c26c573bbc300163bbe1385df2b8742d048864ddeba324cd9bc"/);
  assert.match(script, /create temp table tmp_market_listing_card_candidates/);
  assert.match(script, /create temp table tmp_market_listing_rollups/);
  assert.match(script, /on commit preserve rows/);
  assert.match(script, /create index tmp_market_listing_card_candidates_id_idx/);
  assert.match(script, /create index tmp_market_listing_rollups_key_idx/);
  assert.match(script, /set local statement_timeout = '30min'/);
  assert.match(script, /direct apply readback does not match the plan; rolling back/);
  assert.match(script, /committed direct apply readback does not match the plan/);
  assert.match(script, /on conflict do nothing returning 1/);
  assert.match(script, /verifyPlanFiles/);
  assert.match(script, /computed_row_manifest_hash_mismatch/);
  assert.doesNotMatch(script, /\bupsert\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s*\(/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
