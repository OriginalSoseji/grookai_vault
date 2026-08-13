import assert from "node:assert/strict";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import { verifyMtgCanaryPayloadIntegrityV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_preflight_v1.mjs";

function validPayload() {
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
    migrationSha256: "b".repeat(64),
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/mtg-pricing-readiness-v1",
    },
  });
}

test("valid canary payload passes offline integrity", () => {
  assert.deepEqual(verifyMtgCanaryPayloadIntegrityV1(validPayload()), {
    ok: true,
    issues: [],
  });
});

test("mutated canary payload fails its fingerprint", () => {
  const payload = validPayload();
  payload.rows.card_prints[0].name = "Changed";
  const result = verifyMtgCanaryPayloadIntegrityV1(payload);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes("writer_payload_fingerprint_mismatch"));
});

test("image pointers and parent tcgplayer IDs remain prohibited", () => {
  const payload = validPayload();
  payload.rows.card_prints[0].image_url = "https://example.invalid/card.jpg";
  payload.rows.card_prints[0].tcgplayer_id = "633195";
  const result = verifyMtgCanaryPayloadIntegrityV1(payload);
  assert.ok(result.issues.includes("parent_image_pointer_must_be_null"));
  assert.ok(result.issues.includes("parent_tcgplayer_id_must_be_null"));
});
