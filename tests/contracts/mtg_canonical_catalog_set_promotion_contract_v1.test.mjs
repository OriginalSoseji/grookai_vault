import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import {
  buildMtgCanonicalSetPromotionContractV1,
  MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1,
} from "../../scripts/audits/mtg_canonical_catalog_set_promotion_contract_v1.mjs";

function payload() {
  const candidate = buildMtgCanonicalCandidateV1({
    id: "572feb8c-6976-40a8-8a34-b4db836cca56",
    oracle_id: "bdcb7aed-3595-4c7e-b9da-543e92de919a",
    name: "Locke Cole",
    lang: "en",
    games: ["paper"],
    digital: false,
    set_id: "d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea",
    set: "msh",
    set_name: "Marvel Super Heroes",
    set_type: "expansion",
    released_at: "2026-06-26",
    collector_number: "234",
    layout: "normal",
    finishes: ["nonfoil", "foil"],
    tcgplayer_id: 633195,
    rarity: "uncommon",
  });
  return buildMtgCanaryPayloadV1(
    {
      candidates: [candidate],
      warehouseProducts: new Map([[633195, {
        subtypes: new Set(["normal", "foil"]),
        positive_market_subtypes: new Set(["normal", "foil"]),
      }]]),
      sourceBulkSha256: "a".repeat(64),
      stagingMigrationSha256: "b".repeat(64),
      foundationMigrationSha256: "c".repeat(64),
      repository: { commit_sha: "d".repeat(40), branch: "agent/mtg-pricing-readiness-v1" },
    },
    { plan_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1" },
  );
}

test("set promotion binds a frozen staged batch without migration work", () => {
  const source = payload();
  const plan = buildMtgCanonicalSetPromotionContractV1(source);
  assert.equal(plan.source_plan_version, "MTG_CANONICAL_CATALOG_SET_BATCH_V1");
  assert.equal(plan.selected_set.code, "msh");
  assert.equal(plan.total_rows, 8);
  assert.equal(plan.staging_rows_sha256, plan.staging_contract.staged_rows_sha256);
  assert.equal(
    plan.rows.card_prints[0].data_quality_flags.mtg_catalog_release_v1.status,
    "hidden_by_release_control",
  );
});

test("set promotion rejects canary payload versions", () => {
  const source = payload();
  source.plan_version = "MTG_CANONICAL_CATALOG_CANARY_PLAN_V1";
  const { writer_payload_fingerprint: ignored, ...core } = source;
  source.writer_payload_fingerprint = createHash("sha256")
    .update(JSON.stringify(core))
    .digest("hex");
  assert.throws(() => buildMtgCanonicalSetPromotionContractV1(source), /Unsupported set payload/);
});

test("set promotion boundaries prohibit adjacent mutation", () => {
  const contract = MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1;
  assert.equal(contract.required_release_status, "hidden");
  assert.equal(contract.migration_writes, false);
  assert.equal(contract.release_control_writes, false);
  assert.equal(contract.canonical_updates, false);
  assert.equal(contract.image_pointer_writes, false);
  assert.equal(contract.pricing_writes, false);
  assert.equal(contract.pokemon_mutation, false);
});
