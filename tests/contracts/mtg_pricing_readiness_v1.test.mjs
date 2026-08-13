import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMtgSourceProductV1,
  evaluateMtgPricingReadinessV1,
  MTG_PRICING_READINESS_POLICY_V1,
} from "../../backend/pricing/mtg_pricing_readiness_policy_v1.mjs";

function readySnapshot() {
  return {
    source: {
      category_id: 1,
      source_active: true,
      active_group_count: 453,
      active_product_count: 117267,
      latest_observed_on: "2026-08-13",
      latest_positive_market_price_count: 158310,
    },
    canonical: {
      game_count: 1,
      set_count: 400,
      card_print_count: 100000,
      finish_keys: ["normal", "foil"],
    },
    mappings: {
      exact_mapping_count: 500,
      published_snapshot_count: 0,
    },
  };
}

test("ordinary MTG card metadata is only a raw-single candidate", () => {
  const result = classifyMtgSourceProductV1({
    name: "Lightning Bolt",
    extended_data: [
      { name: "Number", value: "150" },
      { name: "Rarity", value: "U" },
      { name: "SubType", value: "Instant" },
    ],
  });

  assert.equal(result.policy_version, MTG_PRICING_READINESS_POLICY_V1);
  assert.equal(result.source_class, "raw_single_candidate");
  assert.equal(result.candidate_only, true);
  assert.equal(result.publishable, false);
  assert.equal(result.requires_canonical_identity, true);
});

test("packaged MTG product without card evidence stays out of singles", () => {
  const result = classifyMtgSourceProductV1({
    name: "Collector Booster Box",
    extended_data: [],
  });

  assert.equal(result.source_class, "packaged_or_sealed_candidate");
  assert.deepEqual(result.packaging_signals, ["booster box", "collector booster"]);
  assert.equal(result.publishable, false);
});

test("treatment and language terms are evidence signals, not identity", () => {
  const result = classifyMtgSourceProductV1({
    name: "The Eternal Wanderer (Japanese) (Borderless)",
    extended_data: [
      { name: "Number", value: "1" },
      { name: "Rarity", value: "P" },
    ],
  });

  assert.deepEqual(result.language_signals, ["japanese"]);
  assert.deepEqual(result.treatment_signals, ["borderless"]);
  assert.equal(result.publishable, false);
});

test("complete source, canon, and mapping evidence is ready", () => {
  const result = evaluateMtgPricingReadinessV1(readySnapshot());
  assert.equal(result.status, "ready");
  assert.equal(result.publication_ready, true);
  assert.equal(result.next_gate, "bounded_mtg_publication_canary_plan");
});

test("source warehouse alone never authorizes publication", () => {
  const snapshot = readySnapshot();
  snapshot.canonical = {
    game_count: 0,
    set_count: 0,
    card_print_count: 0,
    finish_keys: ["normal", "reverse", "holo"],
  };
  snapshot.mappings.exact_mapping_count = 0;

  const result = evaluateMtgPricingReadinessV1(snapshot);
  assert.equal(result.status, "blocked");
  assert.equal(result.source_ready, true);
  assert.equal(result.canonical_ready, false);
  assert.equal(result.publication_ready, false);
  assert.equal(result.next_gate, "mtg_canonical_catalog_import_contract");
  assert.deepEqual(result.blocker_ids, [
    "mtg_canonical_game_present",
    "mtg_canonical_sets_present",
    "mtg_canonical_card_prints_present",
    "mtg_finish_vocabulary_present",
    "mtg_exact_source_mappings_present",
  ]);
});

test("published MTG rows in the Pokémon lane are a blocker", () => {
  const snapshot = readySnapshot();
  snapshot.mappings.published_snapshot_count = 1;
  const result = evaluateMtgPricingReadinessV1(snapshot);

  assert.equal(result.status, "blocked");
  assert.ok(result.blocker_ids.includes("mtg_publication_isolated"));
});

test("missing current source evidence requires warehouse repair first", () => {
  const snapshot = readySnapshot();
  snapshot.source.latest_positive_market_price_count = 0;
  const result = evaluateMtgPricingReadinessV1(snapshot);

  assert.equal(result.source_ready, false);
  assert.equal(result.next_gate, "repair_mtg_source_warehouse_coverage");
});

