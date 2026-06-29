import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPokemonTcgSecondSourceBackfillPlanV1,
} from "../../backend/pricing/market_reference_pokemontcg_second_source_backfill_plan_v1.mjs";

function candidate() {
  return {
    card_print_id: "00000000-0000-0000-0000-000000000001",
    gv_id: "GV-PK-TEST-001",
    source: "pokemontcg_io_reference",
    source_type: "reference_price",
    source_url: "https://api.pokemontcg.io/v2/cards/base1-58",
    raw_title: "Pikachu #58 | Base | tcgplayer normal market",
    raw_price: 10.5,
    currency: "USD",
    condition_hint: "tcgplayer:market",
    finish_hint: "normal",
    observed_at: "2026-06-25T00:00:00.000Z",
    match_confidence_hint: "high",
    exclusion_flags: [],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: {
      provider: "tcgplayer",
      provider_card_id: "base1-58",
      variant: "normal",
      metric: "market",
    },
  };
}

function normalized() {
  return {
    ...candidate(),
    normalized_price: 10.5,
    normalized_currency: "USD",
    metric_key: "market",
    metric_family: "reference_market_bucket",
    model_disposition: "reference_model_candidate",
    model_eligible: true,
    evidence_quality_score: 0.81,
    weight_hint: 0.81,
    quality_flags: [],
    group_reference_median: 10.5,
    normalizer_version: "MEE_06C_REFERENCE_NORMALIZER_V1",
  };
}

test("MEE-09K builds second-source backfill plan with review locks and no DB writes", () => {
  const plan = buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest: {
      ready: true,
      findings: [],
      summary: { covered_targets: 570 },
      candidate_evidence: [candidate()],
    },
    normalizedArtifact: {
      proofs: {
        no_database_write_boundary: true,
        no_public_price_publication_boundary: true,
      },
      normalized_evidence: [normalized()],
    },
    manifestHash: "e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc",
    normalizedHash: "387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda",
  });

  assert.equal(plan.boundary.db_writes, false);
  assert.equal(plan.boundary.public_price_publication, false);
  assert.equal(plan.rows.candidateRows[0].needs_review, true);
  assert.equal(plan.rows.candidateRows[0].can_publish_price_directly, false);
  assert.equal(plan.rows.normalizedRows[0].normalized_payload.can_publish_price_directly, false);
  assert.equal(plan.findings.includes("normalized_rows_without_candidate_hash_match"), false);
});

test("MEE-09K blocks remote candidate hash collisions", () => {
  const plan = buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest: {
      ready: true,
      findings: [],
      summary: { covered_targets: 570 },
      candidate_evidence: [candidate()],
    },
    normalizedArtifact: {
      proofs: {
        no_database_write_boundary: true,
        no_public_price_publication_boundary: true,
      },
      normalized_evidence: [normalized()],
    },
    manifestHash: "e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc",
    normalizedHash: "387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda",
    remoteCollisionSummary: { checked: true, candidate_hash_collisions: 1 },
  });

  assert.equal(plan.ready_for_apply_package, false);
  assert.ok(plan.findings.includes("remote_candidate_hash_collisions_detected"));
});
