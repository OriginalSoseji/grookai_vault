import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_CANDIDATE_SOURCE_COUNTS,
  EXPECTED_NORMALIZED_DISPOSITION_COUNTS,
  EXPECTED_ROW_COUNTS,
  PACKAGE_ID,
} from "../../scripts/audits/market_reference_warehouse_readback_smoke_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE-09A readback smoke locks expected warehouse counts", () => {
  assert.equal(PACKAGE_ID, "MARKET-REFERENCE-WAREHOUSE-READBACK-SMOKE-V1");
  assert.deepEqual(EXPECTED_ROW_COUNTS, {
    market_reference_acquisition_runs: 5,
    market_reference_raw_snapshots: 10788,
    market_reference_candidates: 11025,
    market_reference_normalized_evidence: 11025,
    market_reference_coverage_reports: 1,
  });
  assert.deepEqual(EXPECTED_CANDIDATE_SOURCE_COUNTS, {
    pokemontcg_io_reference: 3618,
    tcgcsv_reference: 7407,
  });
  assert.deepEqual(EXPECTED_NORMALIZED_DISPOSITION_COUNTS, {
    "quarantined_metric:false": 2047,
    "quarantined_price_outlier:false": 148,
    "reference_model_candidate:true": 8830,
  });
});

test("MEE-09A readback smoke stays read-only and non-publishing", () => {
  const script = source("scripts/audits/market_reference_warehouse_readback_smoke_v1.mjs");

  assert.match(script, /remote_readback_smoke_no_writes/);
  assert.match(script, /pricing_observations_writes: false/);
  assert.match(script, /public_price_publication: false/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
