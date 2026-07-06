import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeReferenceEvidenceV1 } from "../../backend/pricing/market_evidence_normalized_reference_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleAcquisition = {
  generated_at: "2026-06-25T17:12:57.950Z",
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1",
  reviewed_targets: [],
  candidate_evidence: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-11",
      source: "tcgcsv_reference",
      source_type: "reference_price",
      source_url: "https://www.tcgplayer.com/product/123",
      raw_title: "Nidoking | Base Set | Holofoil marketPrice",
      raw_price: 38.45,
      currency: "USD",
      condition_hint: "tcgcsv:marketPrice",
      finish_hint: "holo",
      observed_at: "2026-06-25T00:00:00.000Z",
      match_confidence_hint: "high",
      exclusion_flags: ["manual_review_required"],
      needs_review: true,
      can_publish_price_directly: false,
      raw_payload: { metric: "marketPrice" },
    },
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-11",
      source: "tcgcsv_reference",
      source_type: "reference_price",
      source_url: "https://www.tcgplayer.com/product/123",
      raw_title: "Nidoking | Base Set | Holofoil midPrice",
      raw_price: 31.64,
      currency: "USD",
      condition_hint: "tcgcsv:midPrice",
      finish_hint: "holo",
      observed_at: "2026-06-25T00:00:00.000Z",
      match_confidence_hint: "high",
      exclusion_flags: ["manual_review_required"],
      needs_review: true,
      can_publish_price_directly: false,
      raw_payload: { metric: "midPrice" },
    },
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-11",
      source: "tcgcsv_reference",
      source_type: "reference_price",
      source_url: "https://www.tcgplayer.com/product/123",
      raw_title: "Nidoking | Base Set | Holofoil highPrice",
      raw_price: 510.23,
      currency: "USD",
      condition_hint: "tcgcsv:highPrice",
      finish_hint: "holo",
      observed_at: "2026-06-25T00:00:00.000Z",
      match_confidence_hint: "high",
      exclusion_flags: ["manual_review_required"],
      needs_review: true,
      can_publish_price_directly: false,
      raw_payload: { metric: "highPrice" },
    },
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-11",
      source: "tcgcsv_reference",
      source_type: "reference_price",
      source_url: "https://www.tcgplayer.com/product/123",
      raw_title: "Nidoking | Base Set | Holofoil directLowPrice",
      raw_price: 388.65,
      currency: "USD",
      condition_hint: "tcgcsv:directLowPrice",
      finish_hint: "holo",
      observed_at: "2026-06-25T00:00:00.000Z",
      match_confidence_hint: "high",
      exclusion_flags: ["manual_review_required"],
      needs_review: true,
      can_publish_price_directly: false,
      raw_payload: { metric: "directLowPrice" },
    },
  ],
};

test("MEE-06C normalizes reference evidence and quarantines weak/outlier buckets", () => {
  const result = normalizeReferenceEvidenceV1({
    acquisition: sampleAcquisition,
    generatedAt: "2026-06-25T18:00:00.000Z",
  });

  assert.equal(result.mode, "local_reference_evidence_normalization_only");
  assert.equal(result.boundary.provider_calls, false);
  assert.equal(result.boundary.source_fetches, false);
  assert.equal(result.boundary.db_writes, false);
  assert.equal(result.boundary.pricing_rollups, false);
  assert.equal(result.boundary.public_price_publication, false);
  assert.equal(result.summary.normalized_evidence_count, 4);
  assert.equal(result.summary.model_eligible_count, 2);
  assert.equal(result.summary.quarantined_count, 2);
  assert.equal(result.proofs.no_candidate_can_publish_directly, true);
  assert.equal(result.proofs.only_model_eligible_rows_receive_weight, true);

  const market = result.normalized_evidence.find((row) => row.metric_key === "marketprice");
  assert.equal(market.model_disposition, "reference_model_candidate");
  assert.equal(market.model_eligible, true);
  assert.ok(market.evidence_quality_score > 0.7);

  const high = result.normalized_evidence.find((row) => row.metric_key === "highprice");
  assert.equal(high.model_disposition, "quarantined_metric");
  assert.equal(high.model_eligible, false);
  assert.equal(high.weight_hint, 0);
  assert.ok(high.quality_flags.includes("high_ask_bucket_not_model_input"));

  const directLow = result.normalized_evidence.find((row) => row.metric_key === "directlowprice");
  assert.equal(directLow.model_disposition, "quarantined_price_outlier");
  assert.equal(directLow.model_eligible, false);
  assert.ok(directLow.quality_flags.includes("high_price_outlier"));
});

test("MEE-06C blocks unsafe candidates instead of making them model eligible", () => {
  const result = normalizeReferenceEvidenceV1({
    acquisition: {
      ...sampleAcquisition,
      candidate_evidence: [
        {
          ...sampleAcquisition.candidate_evidence[0],
          raw_price: null,
          exclusion_flags: ["missing_price", "manual_review_required"],
        },
      ],
    },
  });

  assert.equal(result.summary.model_eligible_count, 0);
  assert.equal(result.summary.blocked_count, 1);
  assert.equal(result.normalized_evidence[0].model_disposition, "blocked_candidate");
  assert.equal(result.normalized_evidence[0].weight_hint, 0);
});

test("MEE-06C script stays local and non-publishing", () => {
  const moduleSource = source("backend/pricing/market_evidence_normalized_reference_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_normalized_reference_v1.mjs");
  const pkg = source("package.json");

  assert.match(pkg, /"mee:normalize-reference"/);
  assert.match(scriptSource, /findLatestReferenceAcquisition/);
  assert.match(moduleSource, /high_ask_bucket_not_model_input/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
