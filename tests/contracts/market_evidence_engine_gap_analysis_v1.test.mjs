import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMarketEvidenceGapAnalysisV1 } from "../../backend/pricing/market_evidence_gap_analysis_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleCsv = [
  "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-17-price,condition-18-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date",
  "1,Pokemon Promo,Snivy #BW01,$2.00,,,$10.00,,,,,,,,,,,,,,,5,Pokemon Card,,,,2011-01-01",
  "2,Pokemon Base Set,Charizard [1st Edition] #4,$999.00,,,$3000.00,,,,,,,,,,,,,,,5,Pokemon Card,,,,1999-01-01",
  "3,Pokemon Jungle,Pikachu #60,$5.00,,,$30.00,,,,,,,,,,,,,,,5,Pokemon Card,,,,1999-01-01",
].join("\n");

const sampleAcquisition = {
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  reviewed_targets: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-PR-BLW-BW01",
      name: "Snivy",
      set_code: "bwp",
      number_plain: "01",
      status: "no_pricecharting_csv_match",
    },
    {
      card_print_id: "22222222-2222-2222-2222-222222222222",
      gv_id: "GV-PK-XYZ-1",
      name: "Missingmon",
      set_code: "xyz",
      number_plain: "1",
      status: "no_pricecharting_csv_match",
    },
  ],
  candidate_evidence: [
    {
      card_print_id: "33333333-3333-3333-3333-333333333333",
      gv_id: "GV-PK-BS-4",
      raw_title: "Charizard [1st Edition] #4 | Pokemon Base Set",
      raw_price: 999,
      condition_hint: "loose_ungraded",
      match_confidence_hint: "medium",
      exclusion_flags: ["ambiguous_variant", "manual_review_required", "wrong_print_run"],
      raw_payload: {
        product_name: "Charizard [1st Edition] #4",
      },
    },
  ],
};

test("MEE-05B buckets no-match targets and ambiguous candidates without writes", () => {
  const analysis = buildMarketEvidenceGapAnalysisV1({
    acquisition: sampleAcquisition,
    csvRaw: sampleCsv,
    generatedAt: "2026-06-25T08:00:00.000Z",
  });

  assert.equal(analysis.mode, "local_gap_analysis_only");
  assert.equal(analysis.boundary.provider_calls, false);
  assert.equal(analysis.boundary.source_fetches, false);
  assert.equal(analysis.boundary.db_writes, false);
  assert.equal(analysis.boundary.pricing_rollups, false);
  assert.equal(analysis.boundary.migration_apply, false);
  assert.equal(analysis.boundary.public_price_publication, false);
  assert.equal(analysis.summary.no_match_target_count, 2);
  assert.equal(analysis.summary.ambiguous_or_blocked_candidate_count, 1);
  assert.equal(analysis.counts.no_match_by_gap_reason.name_present_prefixed_number_gap, 1);
  assert.equal(analysis.counts.no_match_by_gap_reason.no_name_in_pricecharting_csv, 1);
  assert.equal(analysis.counts.ambiguous_or_blocked_by_disposition.blocked_wrong_print_run, 1);
  assert.equal(analysis.counts.ambiguous_or_blocked_by_variant_label["1st Edition"], 1);
});

test("MEE-05B script and plan stay local and non-publishing", () => {
  const moduleSource = source("backend/pricing/market_evidence_gap_analysis_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_gap_analysis_v1.mjs");
  const planDoc = source("docs/plans/market_evidence_engine_v1/MEE_05B_RAW_EVIDENCE_GAP_ANALYSIS_V1.md");
  const pkg = source("package.json");

  assert.match(planDoc, /No provider calls, source page fetches, database writes, pricing rollups/);
  assert.match(pkg, /"mee:gap-analysis"/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
