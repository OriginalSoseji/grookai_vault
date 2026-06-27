import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMarketEvidenceReviewGateV1 } from "../../backend/pricing/market_evidence_review_gate_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleAcquisition = {
  generated_at: "2026-06-25T05:00:00.000Z",
  contract: "MARKET_EVIDENCE_ENGINE_V1",
  phase: "MEE-04D_PRICECHARTING_CSV_RAW_EVIDENCE_V1",
  reviewed_targets: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      name: "Charizard",
      set_code: "base1",
      number_plain: "4",
      status: "candidate_evidence_created",
    },
    {
      card_print_id: "22222222-2222-2222-2222-222222222222",
      gv_id: "GV-PK-MISS-1",
      name: "Missingmon",
      set_code: "miss",
      number_plain: "1",
      status: "no_pricecharting_csv_match",
    },
  ],
  candidate_evidence: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      source: "pricecharting_reference",
      raw_title: "Charizard #4 | Pokemon Base Set",
      raw_price: 199.99,
      condition_hint: "loose_ungraded",
      match_confidence_hint: "high",
      exclusion_flags: ["manual_review_required"],
      needs_review: true,
      can_publish_price_directly: false,
      source_url: "https://www.pricecharting.com/game/pokemon-base-set/charizard-4",
    },
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      source: "pricecharting_reference",
      raw_title: "Charizard [1st Edition] #4 | Pokemon Base Set",
      raw_price: 9999.99,
      condition_hint: "loose_ungraded",
      match_confidence_hint: "medium",
      exclusion_flags: ["ambiguous_variant", "manual_review_required", "wrong_print_run"],
      needs_review: true,
      can_publish_price_directly: false,
      source_url: "https://www.pricecharting.com/game/pokemon-base-set/charizard-1st-edition-4",
    },
  ],
};

test("MEE-05A summarizes raw evidence without permitting price publication", () => {
  const review = buildMarketEvidenceReviewGateV1({
    acquisition: sampleAcquisition,
    generatedAt: "2026-06-25T06:00:00.000Z",
  });

  assert.equal(review.mode, "local_review_gate_only");
  assert.equal(review.boundary.provider_calls, false);
  assert.equal(review.boundary.source_fetches, false);
  assert.equal(review.boundary.db_writes, false);
  assert.equal(review.boundary.pricing_rollups, false);
  assert.equal(review.boundary.migration_apply, false);
  assert.equal(review.boundary.public_price_publication, false);
  assert.equal(review.summary.reviewed_target_count, 2);
  assert.equal(review.summary.targets_with_candidate_evidence, 1);
  assert.equal(review.summary.targets_without_candidate_evidence, 1);
  assert.equal(review.summary.candidate_evidence_count, 2);
  assert.equal(review.summary.direct_publishable_candidate_count, 0);
  assert.equal(review.summary.non_review_gated_candidate_count, 0);
  assert.equal(review.proofs.no_candidate_can_publish_directly, true);
  assert.equal(review.proofs.every_candidate_is_review_gated, true);
  assert.equal(review.counts.disposition_counts.review_high_confidence_reference, 1);
  assert.equal(review.counts.disposition_counts.blocked_wrong_print_run, 1);
  assert.equal(review.counts.exclusion_flag_counts.ambiguous_variant, 1);
  assert.equal(review.counts.exclusion_flag_counts.wrong_print_run, 1);
});

test("MEE-05A rejects malformed acquisition artifacts", () => {
  assert.throws(
    () => buildMarketEvidenceReviewGateV1({ acquisition: { contract: "OTHER", candidate_evidence: [], reviewed_targets: [] } }),
    /contract mismatch/,
  );
  assert.throws(
    () => buildMarketEvidenceReviewGateV1({ acquisition: { contract: "MARKET_EVIDENCE_ENGINE_V1", candidate_evidence: [] } }),
    /reviewed_targets must be an array/,
  );
});

test("MEE-05A script and plan stay local and non-publishing", () => {
  const moduleSource = source("backend/pricing/market_evidence_review_gate_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_review_gate_v1.mjs");
  const planDoc = source("docs/plans/market_evidence_engine_v1/MEE_05A_RAW_EVIDENCE_REVIEW_GATE_V1.md");
  const pkg = source("package.json");

  assert.match(planDoc, /No provider calls, source page fetches, database writes, pricing rollups/);
  assert.match(planDoc, /can_publish_price_directly = false/);
  assert.match(pkg, /"mee:review-gate"/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
