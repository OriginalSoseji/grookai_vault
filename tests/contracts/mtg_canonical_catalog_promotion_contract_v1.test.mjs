import assert from "node:assert/strict";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import {
  buildMtgCanonicalPromotionContractV1,
  MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1,
  stripMtgPromotionMigrationEnvelopeV1,
} from "../../scripts/audits/mtg_canonical_catalog_promotion_contract_v1.mjs";

function payload() {
  const candidate = buildMtgCanonicalCandidateV1({
    id: "572feb8c-6976-40a8-8a34-b4db836cca56",
    oracle_id: "bdcb7aed-3595-4c7e-b9da-543e92de919a",
    name: "Locke Cole",
    lang: "en",
    games: ["paper"],
    digital: false,
    set_id: "d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea",
    set: "fin",
    set_name: "Final Fantasy",
    set_type: "expansion",
    released_at: "2025-06-13",
    collector_number: "234",
    layout: "normal",
    finishes: ["nonfoil", "foil"],
    tcgplayer_id: 633195,
    rarity: "uncommon",
  });
  return buildMtgCanaryPayloadV1({
    candidates: [candidate],
    warehouseProducts: new Map([
      [
        633195,
        {
          subtypes: new Set(["normal", "foil"]),
          positive_market_subtypes: new Set(["normal", "foil"]),
        },
      ],
    ]),
    sourceBulkSha256: "a".repeat(64),
    stagingMigrationSha256: "b".repeat(64),
    foundationMigrationSha256: "c".repeat(64),
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/mtg-pricing-readiness-v1",
    },
  });
}

test("promotion contract preserves exact rows and adds only hidden release evidence", () => {
  const source = payload();
  const plan = buildMtgCanonicalPromotionContractV1({
    payload: source,
    foundationMigrationSha256: "c".repeat(64),
    visibilityMigrationSha256: "d".repeat(64),
  });
  assert.equal(plan.total_rows, 8);
  assert.match(plan.staging_batch_id, /^[0-9a-f-]{36}$/);
  assert.equal(plan.rows.card_prints[0].name, source.rows.card_prints[0].name);
  assert.equal(
    plan.rows.card_prints[0].data_quality_flags.mtg_catalog_release_v1.status,
    "hidden_by_release_control",
  );
  assert.equal(source.rows.card_prints[0].data_quality_flags.mtg_catalog_release_v1, undefined);
});

test("promotion contract prohibits visibility, pricing, image, Pokemon, and destructive writes", () => {
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.required_release_status, "hidden");
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.pricing_writes, false);
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.image_pointer_writes, false);
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.pokemon_mutation, false);
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.canonical_updates, false);
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.deletes, false);
  assert.equal(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.truncates, false);
});

test("promotion plan changes when the visibility migration changes", () => {
  const source = payload();
  const first = buildMtgCanonicalPromotionContractV1({
    payload: source,
    foundationMigrationSha256: "c".repeat(64),
    visibilityMigrationSha256: "d".repeat(64),
  });
  const second = buildMtgCanonicalPromotionContractV1({
    payload: source,
    foundationMigrationSha256: "c".repeat(64),
    visibilityMigrationSha256: "e".repeat(64),
  });
  assert.notEqual(first.promotion_plan_sha256, second.promotion_plan_sha256);
});

test("rollback parser preserves governing comments and removes one transaction envelope", () => {
  const body = stripMtgPromotionMigrationEnvelopeV1(
    "-- contract comment\n-- second comment\n\nbegin;\nselect 1;\ncommit;\n",
  );
  assert.match(body, /^-- contract comment/);
  assert.match(body, /select 1;/);
  assert.doesNotMatch(body, /(^|\n)\s*(begin|commit);/i);
});
