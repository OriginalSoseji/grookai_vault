import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMtgSetStagePreflightV1 } from "../../scripts/audits/mtg_canonical_catalog_set_stage_preflight_v1.mjs";

function fixture() {
  const zeroVisibility = {
    game_count: 0,
    set_count: 0,
    card_count: 0,
    identity_count: 0,
    printing_count: 0,
    legacy_search_count: 0,
    print_search_count: 0,
    pokemon_card_count: 0,
  };
  return {
    payload: { counts: { exact_market_lanes: 864, positive_market_lanes: 864 } },
    contract: { staged_row_count: 3089 },
    production: {
      transaction_read_only: true,
      schema: {
        staging_migration_present: true,
        foundation_migration_present: true,
        visibility_migration_present: true,
        release_status: "hidden",
        batch_table_present: true,
        row_table_present: true,
        mtg_game_count: 1,
        mtg_set_count: 1,
        mtg_card_count: 417,
        pokemon_card_count: 58769,
      },
      canonical_collisions: { ids: 0 },
      staging_collisions: { batch_id: 0, payload: 0, ids: 0 },
      source: {
        planned_count: 864,
        source_row_count: 864,
        positive_market_price_count: 864,
      },
      client_visibility: {
        anon: zeroVisibility,
        authenticated: { ...zeroVisibility, pokemon_card_count: 58768 },
      },
      staging_security: {
        batch_rls_enabled: true,
        row_rls_enabled: true,
        anon_batch_select: false,
        authenticated_batch_select: false,
        anon_row_select: false,
        authenticated_row_select: false,
        service_batch_select: true,
        service_batch_insert: true,
        service_row_select: true,
        service_row_insert: true,
      },
    },
  };
}

test("next-set preflight passes only the hidden collision-free service state", () => {
  const value = fixture();
  assert.deepEqual(
    evaluateMtgSetStagePreflightV1(value.payload, value.contract, value.production),
    [],
  );
});

test("next-set preflight blocks canonical and staged identity collisions", () => {
  const value = fixture();
  value.production.canonical_collisions.identity_hashes = 1;
  value.production.staging_collisions.printing_mappings = 1;
  assert.deepEqual(
    evaluateMtgSetStagePreflightV1(value.payload, value.contract, value.production),
    ["canonical_identity_hashes_collision", "staging_printing_mappings_collision"],
  );
});

test("next-set preflight blocks client visibility and stale pricing evidence", () => {
  const value = fixture();
  value.production.client_visibility.authenticated.card_count = 1;
  value.production.source.positive_market_price_count = 863;
  assert.deepEqual(
    evaluateMtgSetStagePreflightV1(value.payload, value.contract, value.production),
    ["positive_market_price_count_mismatch", "authenticated_card_count_visible"],
  );
});
