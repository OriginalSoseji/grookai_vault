import assert from "node:assert/strict";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import {
  buildMtgCanaryPayloadV1,
  deterministicUuidV5,
} from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";

const REPOSITORY = {
  commit_sha: "a".repeat(40),
  branch: "agent/mtg-pricing-readiness-v1",
};

function candidate(overrides = {}) {
  return buildMtgCanonicalCandidateV1({
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
    artist: "AKAGI",
    image_uris: { normal: "https://example/normal.jpg" },
    ...overrides,
  });
}

test("UUID V5 generation is deterministic and standards-shaped", () => {
  const first = deterministicUuidV5("mtg:test");
  assert.equal(first, deterministicUuidV5("mtg:test"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("one-set plan keeps parent, identity, printing, and mapping rows exact", () => {
  const warehouseProducts = new Map([
    [
      633195,
      {
        subtypes: new Set(["normal", "foil"]),
        positive_market_subtypes: new Set(["normal", "foil"]),
      },
    ],
  ]);
  const plan = buildMtgCanaryPayloadV1({
    candidates: [candidate()],
    warehouseProducts,
    sourceBulkSha256: "a".repeat(64),
    migrationSha256: "b".repeat(64),
    repository: REPOSITORY,
  });

  assert.equal(plan.counts.sets, 1);
  assert.equal(plan.counts.card_prints, 1);
  assert.equal(plan.counts.card_print_identity, 1);
  assert.equal(plan.counts.card_printings, 2);
  assert.equal(plan.counts.external_printing_mappings, 2);
  assert.equal(plan.counts.positive_market_lanes, 2);
  assert.equal(plan.rows.card_prints[0].tcgplayer_id, null);
  assert.equal(plan.rows.card_prints[0].image_url, null);
  assert.equal(plan.boundaries.database_writes, false);
});

test("collision lane is quarantined instead of mapped", () => {
  const warehouseProducts = new Map([
    [
      633195,
      {
        subtypes: new Set(["normal", "foil"]),
        positive_market_subtypes: new Set(["normal", "foil"]),
      },
    ],
  ]);
  const plan = buildMtgCanaryPayloadV1({
    candidates: [candidate()],
    warehouseProducts,
    collisionSourceRows: new Set(["633195:foil"]),
    sourceBulkSha256: "a".repeat(64),
    migrationSha256: "b".repeat(64),
    repository: REPOSITORY,
  });

  assert.equal(plan.counts.external_printing_mappings, 1);
  assert.equal(plan.counts.quarantined_collision_lanes, 1);
  assert.equal(plan.rows.external_printing_mappings[0].external_id, "633195:normal");
});

test("canary fingerprint changes when source evidence changes", () => {
  const warehouseProducts = new Map([
    [
      633195,
      {
        subtypes: new Set(["normal", "foil"]),
        positive_market_subtypes: new Set(["normal", "foil"]),
      },
    ],
  ]);
  const base = {
    candidates: [candidate()],
    warehouseProducts,
    sourceBulkSha256: "a".repeat(64),
    migrationSha256: "b".repeat(64),
    repository: REPOSITORY,
  };
  const first = buildMtgCanaryPayloadV1(base);
  const second = buildMtgCanaryPayloadV1({ ...base, sourceBulkSha256: "c".repeat(64) });
  assert.notEqual(first.writer_payload_fingerprint, second.writer_payload_fingerprint);
});
