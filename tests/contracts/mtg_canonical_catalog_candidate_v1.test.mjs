import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMtgCanonicalCandidateV1,
  reconcileMtgCatalogCandidatesV1,
  scryfallCardPaperEligibilityV1,
  scryfallTcgplayerLinksV1,
} from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";

function card(overrides = {}) {
  return {
    id: "572feb8c-6976-40a8-8a34-b4db836cca56",
    oracle_id: "bdcb7aed-3595-4c7e-b9da-543e92de919a",
    name: "Locke Cole",
    lang: "en",
    games: ["paper", "arena", "mtgo"],
    digital: false,
    set_id: "d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea",
    set: "fin",
    set_name: "Final Fantasy",
    set_type: "expansion",
    collector_number: "234",
    layout: "normal",
    finishes: ["nonfoil", "foil"],
    tcgplayer_id: 633195,
    rarity: "uncommon",
    image_uris: { normal: "https://example/normal.jpg" },
    ...overrides,
  };
}

test("English paper printing is eligible", () => {
  assert.deepEqual(scryfallCardPaperEligibilityV1(card()), {
    eligible: true,
    reasons: [],
  });
});

test("digital and non-English cards stay outside V1", () => {
  const result = scryfallCardPaperEligibilityV1(
    card({ lang: "ja", games: ["arena"], digital: true }),
  );
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ["not_english", "not_paper", "digital_only"]);
});

test("standard and etched product IDs remain separate roles", () => {
  const links = scryfallTcgplayerLinksV1(
    card({
      finishes: ["nonfoil", "foil", "etched"],
      tcgplayer_id: 100,
      tcgplayer_etched_id: 101,
    }),
  );
  assert.deepEqual(links, [
    {
      product_id: 100,
      source_role: "tcgplayer_standard_product",
      expected_finish_family: ["foil", "nonfoil"],
      expected_source_subtypes: ["foil", "normal"],
    },
    {
      product_id: 101,
      source_role: "tcgplayer_etched_product",
      expected_finish_family: ["etched"],
      expected_source_subtypes: [],
    },
  ]);
});

test("canonical candidate preserves treatment and finish dimensions", () => {
  const result = buildMtgCanonicalCandidateV1(
    card({
      collector_number: "234s",
      frame_effects: ["showcase"],
      full_art: true,
      promo_types: ["universesbeyond"],
    }),
  );
  assert.equal(result.status, "candidate");
  assert.equal(result.identity_domain, "mtg_eng_paper_print");
  assert.equal(result.identity_payload.collector_number, "234s");
  assert.deepEqual(result.identity_payload.frame_effects, ["showcase"]);
  assert.deepEqual(result.printing_finishes, ["foil", "nonfoil"]);
  assert.equal(result.publishable, false);
  assert.equal(result.source_image_policy, "reference_only_until_self_hosted_and_hashed");
});

test("identity hash is deterministic and changes with treatment", () => {
  const first = buildMtgCanonicalCandidateV1(card());
  const second = buildMtgCanonicalCandidateV1(card());
  const treatment = buildMtgCanonicalCandidateV1(
    card({ frame_effects: ["showcase"] }),
  );
  assert.equal(first.identity_key_hash, second.identity_key_hash);
  assert.notEqual(first.identity_key_hash, treatment.identity_key_hash);
});

test("reconciliation counts exact warehouse links without publishing", () => {
  const result = reconcileMtgCatalogCandidatesV1(
    [card(), card({ id: "other", collector_number: "235", tcgplayer_id: 633196 })],
    [{ product_id: 633195 }],
  );
  assert.equal(result.eligible_candidate_count, 2);
  assert.equal(result.exact_tcgplayer_price_lane_count, 4);
  assert.equal(result.warehouse_present_price_lane_count, 2);
  assert.equal(result.warehouse_missing_price_lane_count, 2);
  assert.equal(result.exact_link_collision_count, 0);
  assert.equal(result.publishable, false);
});

test("duplicate TCGPlayer product and subtype ownership is a collision", () => {
  const result = reconcileMtgCatalogCandidatesV1(
    [card(), card({ id: "other", collector_number: "235" })],
    [{ product_id: 633195 }],
  );
  assert.equal(result.exact_link_collision_count, 2);
  assert.deepEqual(result.collision_source_price_rows, [
    "633195:foil",
    "633195:normal",
  ]);
});

test("shared product ID with distinct foil and normal lanes is not a collision", () => {
  const result = reconcileMtgCatalogCandidatesV1(
    [
      card({ finishes: ["nonfoil"] }),
      card({ id: "foil", collector_number: "234★", finishes: ["foil"] }),
    ],
    [{ product_id: 633195 }],
  );
  assert.equal(result.exact_link_collision_count, 0);
});
