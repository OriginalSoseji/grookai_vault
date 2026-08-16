import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSealedCanarySelectionPlanV1,
  buildSealedCanarySourcePayloadV1,
  SEALED_CANARY_SOURCE_PRODUCT_IDS_V1,
  SEALED_CANARY_TABLES_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_no_publication_canary_v1.mjs";

const rows = [
  [96138, 1, 1515, "Magic: The Gathering", "Dragons of Tarkir",
    "Dragons of Tarkir - Booster Box Case (6 boxes)"],
  [496072, 1, 23165, "Magic: The Gathering", "Universes Beyond: Doctor Who",
    "Universes Beyond: Doctor Who - Timey-Wimey Commander Deck"],
  [502983, 68, 23243, "One Piece Card Game", "Ultra Deck: The Three Captains",
    "Ultra Deck: The Three Captains Display"],
  [521160, 68, 23333, "One Piece Card Game", "Extra Booster: Memorial Collection",
    "Memorial Collection - Booster Pack"],
  [561689, 68, 23462, "One Piece Card Game", "Two Legends",
    "Double Pack Set Volume 5"],
  [591147, 3, 2374, "Pokemon", "Miscellaneous Cards & Products",
    "Triple Whammy Tin [Slaking]"],
  [637680, 1, 2576, "Magic: The Gathering", "Secret Lair Drop Series",
    "Secret Lair Drop: Summer Superdrop 2025 - The English FINAL FANTASY Bundle"],
  [643132, 85, 24324, "Pokemon Japan", "SVM: Generations Start Decks",
    "Generations Start Deck - Pikachu ex & Snorlax ex"],
  [644352, 3, 24380, "Pokemon", "ME01: Mega Evolution",
    "Mega Evolution Booster Pack"],
  [683774, 85, 24653, "Pokemon Japan", "M4: Ninja Spinner",
    "Ninja Spinner Booster Box"],
].map(([product_id, category_id, group_id, category_name, group_name, name]) => ({
  product_id,
  category_id,
  group_id,
  category_name,
  group_name,
  name,
  clean_name: name,
  source_url: `https://example.invalid/${product_id}`,
  presale_info: { isPresale: false, releasedOn: null },
  extended_data: [],
}));

function schemaState() {
  return {
    transaction_read_only: "on",
    transaction_closed_before_artifacts: true,
    migration_ledger_present: true,
    active_release_pointer_count: 0,
    row_counts: Object.fromEntries(SEALED_CANARY_TABLES_V1.map((table) => [table, 0])),
  };
}

test("selection is ten exact unique source products", () => {
  assert.equal(SEALED_CANARY_SOURCE_PRODUCT_IDS_V1.length, 10);
  assert.equal(new Set(SEALED_CANARY_SOURCE_PRODUCT_IDS_V1).size, 10);
});

test("clean source and empty schema produce one review packet plan", () => {
  const first = buildSealedCanarySelectionPlanV1({ rows, schemaState: schemaState() });
  const second = buildSealedCanarySelectionPlanV1({
    rows: structuredClone(rows),
    schemaState: schemaState(),
  });
  assert.equal(first.status, "candidate_selection_frozen_review_required");
  assert.deepEqual(first.findings, []);
  assert.equal(first.candidates.length, 10);
  assert.equal(first.plan_sha256, second.plan_sha256);
  assert.equal(first.boundaries.database_writes, false);
  assert.equal(first.boundaries.canonical_rows_constructed, false);
});

test("source payload hashing is deterministic and evidence-sensitive", () => {
  const first = buildSealedCanarySourcePayloadV1(rows[0]);
  const second = buildSealedCanarySourcePayloadV1(structuredClone(rows[0]));
  assert.equal(first.source_payload_sha256, second.source_payload_sha256);
  const changed = buildSealedCanarySourcePayloadV1({ ...rows[0], name: "Changed" });
  assert.notEqual(first.source_payload_sha256, changed.source_payload_sha256);
});

test("missing source identity or existing sealed rows block the plan", () => {
  const state = schemaState();
  state.row_counts.sealed_product_candidates = 1;
  const result = buildSealedCanarySelectionPlanV1({ rows: rows.slice(1), schemaState: state });
  assert.ok(result.findings.includes("selected_source_product_inventory_mismatch"));
  assert.ok(result.findings.includes("sealed_table_not_empty:sealed_product_candidates"));
  assert.equal(result.status, "blocked");
});
