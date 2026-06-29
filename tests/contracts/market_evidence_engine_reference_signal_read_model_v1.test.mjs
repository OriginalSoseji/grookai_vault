import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION,
  buildMarketReferenceSignalReadModelV1,
} from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import {
  EXPECTED_PUBLISHABLE_COUNT,
  EXPECTED_SIGNAL_COUNT,
  PACKAGE_ID,
  SIGNAL_CURRENCY,
} from "../../scripts/audits/market_reference_signal_read_model_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE-09B builds internal non-publishable signal candidates from eligible rows only", () => {
  const candidates = [
    { id: "c1", card_print_id: "card-1", gv_id: "GV-PK-TEST-1", source: "tcgcsv_reference" },
    { id: "c2", card_print_id: "card-1", gv_id: "GV-PK-TEST-1", source: "pokemontcg_io_reference" },
    { id: "c3", card_print_id: "card-1", gv_id: "GV-PK-TEST-1", source: "tcgcsv_reference" },
  ];
  const normalizedEvidence = [
    { candidate_id: "c1", card_print_id: "card-1", source: "tcgcsv_reference", metric_key: "marketprice", normalized_price: 10, normalized_currency: "USD", model_disposition: "reference_model_candidate", model_eligible: true },
    { candidate_id: "c2", card_print_id: "card-1", source: "pokemontcg_io_reference", metric_key: "tcgplayer_market", normalized_price: 14, normalized_currency: "USD", model_disposition: "reference_model_candidate", model_eligible: true },
    { candidate_id: "c2", card_print_id: "card-1", source: "pokemontcg_io_reference", metric_key: "cardmarket_avg", normalized_price: 30, normalized_currency: "EUR", model_disposition: "reference_model_candidate", model_eligible: true },
    { candidate_id: "c3", card_print_id: "card-1", source: "tcgcsv_reference", metric_key: "listedmedian", normalized_price: 1000, normalized_currency: "USD", model_disposition: "quarantined_price_outlier", model_eligible: false },
  ];

  const model = buildMarketReferenceSignalReadModelV1({ candidates, normalizedEvidence });

  assert.equal(model.read_model_version, MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION);
  assert.equal(model.summary.signal_count, 1);
  assert.equal(model.summary.publishable_count, 0);
  assert.equal(model.signals[0].publishable, false);
  assert.equal(model.signals[0].reference_median, 12);
  assert.equal(model.signals[0].reference_low, 10);
  assert.equal(model.signals[0].reference_high, 14);
  assert.equal(model.signals[0].quarantined_evidence_count, 1);
  assert.equal(model.signals[0].currency_excluded_evidence_count, 1);
  assert.equal(model.signals[0].signal_band, "single_source_reference_candidate");
});

test("MEE-09B constants lock the current readback target", () => {
  assert.equal(PACKAGE_ID, "MARKET-REFERENCE-SIGNAL-READ-MODEL-V1");
  assert.equal(EXPECTED_SIGNAL_COUNT, 993);
  assert.equal(EXPECTED_PUBLISHABLE_COUNT, 0);
  assert.equal(SIGNAL_CURRENCY, "USD");
});

test("MEE-09B script stays read-only and non-public", () => {
  const script = source("scripts/audits/market_reference_signal_read_model_v1.mjs");

  assert.match(script, /internal_reference_signal_read_model_no_writes/);
  assert.match(script, /public_price_publication: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
