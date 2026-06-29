import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION,
  buildPokemonTcgSecondSourceBatchV1,
} from "../../backend/pricing/market_reference_pokemontcg_second_source_batch_v1.mjs";

test("MEE-09I builds PokemonTCG.io second-source batch without publishable candidates", () => {
  const batch = buildPokemonTcgSecondSourceBatchV1({
    workItems: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      name: "Pikachu",
      set_code: "base1",
      number_plain: "58",
      rarity: "Common",
      proposed_sources: ["pokemontcg_io_reference"],
      existing_sources: ["tcgcsv_reference"],
      reasons: ["single_source_reference_signal"],
    }],
    idMappings: new Map([[
      "00000000-0000-0000-0000-000000000001",
      { pokemonapi_id: "base1-58", match_basis: "external_mappings.pokemonapi" },
    ]]),
  });

  assert.equal(batch.phase, MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION);
  assert.equal(batch.items.length, 1);
  assert.equal(batch.items[0].source, "pokemontcg_io_reference");
  assert.equal(batch.items[0].pokemonapi_id, "base1-58");
  assert.equal(batch.items[0].can_publish_price_directly, false);
  assert.equal(batch.items[0].needs_review, true);
  assert.equal(batch.boundary.db_writes, false);
});

test("MEE-09I derives PokemonTCG.io IDs from set code and number when no mapping exists", () => {
  const batch = buildPokemonTcgSecondSourceBatchV1({
    workItems: [{
      card_print_id: "00000000-0000-0000-0000-000000000002",
      gv_id: "GV-PK-TEST-002",
      name: "Serperior",
      set_code: "bw6",
      number_plain: "125",
      proposed_sources: ["pokemontcg_io_reference"],
    }],
  });

  assert.equal(batch.items[0].pokemonapi_id, "bw6-125");
  assert.equal(batch.items[0].match_basis, "derived_set_code_number");
  assert.equal(batch.items[0].can_publish_price_directly, false);
});

test("MEE-09I prefers provider printed number over normalized number", () => {
  const batch = buildPokemonTcgSecondSourceBatchV1({
    workItems: [{
      card_print_id: "00000000-0000-0000-0000-000000000003",
      gv_id: "GV-PK-COL-SL6",
      name: "Kyogre",
      set_code: "col1",
      provider_number: "SL6",
      number_plain: "6",
      proposed_sources: ["pokemontcg_io_reference"],
    }],
  });

  assert.equal(batch.items[0].pokemonapi_id, "col1-SL6");
  assert.equal(batch.items[0].provider_number, "SL6");
});
