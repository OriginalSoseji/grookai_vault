import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMtgSetPromotionPostRollbackV1 } from "../../scripts/audits/mtg_canonical_catalog_set_promotion_post_rollback_readback_v1.mjs";

function fixture(status = "promotion_writer_rollback_proof_passed") {
  const state = {
    foundation_migration_present: true,
    visibility_migration_present: true,
    visibility_table_present: true,
    release_status: "hidden",
    staging_batch_count: 1,
    staging_row_count: 3089,
    mtg_game_count: 1,
    selected_set_count: 0,
    selected_card_count: 0,
    selected_identity_count: 0,
    selected_printing_count: 0,
  };
  const plan = {
    promotion_plan_sha256: "a".repeat(64),
    writer_payload_fingerprint: "b".repeat(64),
    source_plan_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1",
    selected_set: { code: "msh" },
    staging_contract: { staged_row_count: 3089 },
  };
  const stage = {
    batch: [{
      payload_fingerprint_sha256: plan.writer_payload_fingerprint,
      plan_version: plan.source_plan_version,
      selected_set_code: "msh",
      status: "staged",
    }],
  };
  const hidden = {
    game_count: 0,
    set_count: 0,
    card_count: 0,
    identity_count: 0,
    printing_count: 0,
    legacy_search_count: 0,
    print_search_count: 0,
  };
  return {
    plan,
    rollbackSummary: {
      status,
      plan,
      database_proof: {
        before: state,
        after_rollback: state,
        authenticated_pokemon_before: 58768,
      },
    },
    state,
    stage,
    reconciliation: { findings: [] },
    collisions: {
      set_ids: 0,
      set_codes: 0,
      card_print_ids: 0,
      parent_gv_ids: 0,
      identity_ids: 0,
      identity_hashes: 0,
      printing_ids: 0,
      printing_gv_ids: 0,
      parent_mappings: 0,
      printing_mappings: 0,
    },
    clientVisibility: {
      anon: { ...hidden },
      authenticated: { ...hidden },
    },
    authenticatedPokemonCount: 58768,
  };
}

test("independent rollback readback accepts a writer dry-run artifact", () => {
  assert.deepEqual(evaluateMtgSetPromotionPostRollbackV1(fixture()), []);
});

test("independent rollback readback still accepts the earlier proof artifact", () => {
  const value = fixture("rollback_proof_passed");
  value.rollbackSummary.proof = value.rollbackSummary.database_proof;
  delete value.rollbackSummary.database_proof;
  assert.deepEqual(evaluateMtgSetPromotionPostRollbackV1(value), []);
});

test("independent rollback readback blocks post-rollback drift", () => {
  const value = fixture();
  value.rollbackSummary.database_proof.after_rollback = {
    ...value.state,
    selected_card_count: 1,
  };
  value.clientVisibility.authenticated.card_count = 1;
  assert.deepEqual(evaluateMtgSetPromotionPostRollbackV1(value), [
    "rollback_summary_after_state_mismatch",
    "authenticated_card_count_visible",
  ]);
});
