import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMtgSetPromotionPostApplyReadbackV1 } from "../../scripts/audits/mtg_canonical_catalog_set_promotion_post_apply_readback_v1.mjs";
import { buildMtgCanonicalSetPromotionApprovalV1 } from "../../scripts/audits/mtg_canonical_catalog_set_promotion_writer_v1.mjs";

const rowCounts = {
  sets: 1,
  card_prints: 453,
  card_print_identity: 453,
  card_printings: 865,
  external_mappings: 453,
  external_printing_mappings: 864,
};

function fixture() {
  const plan = {
    selected_set: { code: "msh", name: "Marvel Super Heroes" },
    promotion_plan_sha256: "a".repeat(64),
    writer_payload_fingerprint: "b".repeat(64),
    staging_batch_id: "276cc9f7-0159-5df3-874c-73ea04e741a4",
    staging_rows_sha256: "c".repeat(64),
    promotion_rows_sha256: "d".repeat(64),
    mutation_contract_sha256: "e".repeat(64),
    row_counts: rowCounts,
    staging_contract: { staged_row_count: 3089 },
  };
  const repository = {
    governing_commit_sha: "f".repeat(40),
    governing_files_sha256: "1".repeat(64),
  };
  const approval = buildMtgCanonicalSetPromotionApprovalV1(plan, repository);
  const before = {
    mtg_set_count: 1,
    mtg_card_count: 417,
    mtg_identity_count: 417,
    mtg_printing_count: 807,
    mtg_parent_mapping_count: 417,
    mtg_printing_mapping_count: 807,
    dsk_set_count: 1,
    dsk_card_count: 417,
    dsk_identity_count: 417,
    dsk_printing_count: 807,
    pokemon_card_count: 58769,
  };
  const exact = Object.fromEntries(
    Object.entries(rowCounts).map(([name, count]) => [
      name,
      { planned_count: count, actual_count: count, exact_count: count },
    ]),
  );
  const hidden = {
    game_count: 0,
    set_count: 0,
    card_count: 0,
    identity_count: 0,
    printing_count: 0,
    legacy_search_count: 0,
    print_search_count: 0,
    pokemon_card_count: 0,
  };
  const applySummary = {
    status: "hidden_canonical_set_promotion_applied_and_read_back",
    plan,
    approval_sha256: approval.approval_sha256,
    required_approval_message: approval.required_approval_message,
    repository,
    database_proof: { before, authenticated_pokemon_before: 58768 },
    boundaries: {
      database_writes: true,
      migration_writes: false,
      release_control_writes: false,
      app_visibility_activation: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
      global_db_push: false,
    },
  };
  const readback = {
    transaction_read_only: true,
    state: {
      foundation_migration_present: true,
      visibility_migration_present: true,
      visibility_table_present: true,
      release_status: "hidden",
      mtg_set_count: 2,
      mtg_card_count: 870,
      mtg_identity_count: 870,
      mtg_printing_count: 1672,
      mtg_parent_mapping_count: 870,
      mtg_printing_mapping_count: 1671,
      selected_set_count: 1,
      selected_card_count: 453,
      selected_identity_count: 453,
      selected_printing_count: 865,
      selected_parent_mapping_count: 453,
      selected_printing_mapping_count: 864,
      dsk_set_count: 1,
      dsk_card_count: 417,
      dsk_identity_count: 417,
      dsk_printing_count: 807,
      pokemon_card_count: 58769,
    },
    exact,
    security: {
      release_table_rls: true,
      anon_release_select: false,
      authenticated_release_select: false,
      service_release_select: true,
      service_release_insert: true,
      service_release_update: true,
      restrictive_policy_count: 5,
      internal_search_anon_execute: false,
      internal_search_authenticated_execute: false,
      wrapper_search_anon_execute: true,
      wrapper_search_authenticated_execute: true,
    },
    source: {
      planned_count: 864,
      source_row_count: 864,
      positive_market_price_count: 864,
    },
    client_visibility: {
      anon: hidden,
      authenticated: { ...hidden, pokemon_card_count: 58768 },
    },
    authenticated_pokemon_count: 58768,
    image_pointers: {
      parent_image_url_count: 0,
      parent_image_alt_url_count: 0,
      parent_image_source_count: 0,
      printing_image_path_count: 0,
      printing_image_url_count: 0,
      printing_image_alt_url_count: 0,
    },
  };
  return {
    plan,
    repository,
    approval,
    applySummary,
    readback,
    stagingReconciliation: {
      findings: [],
      actual_hash_sha256: "c".repeat(64),
      row_count: 3089,
    },
  };
}

test("post-apply verifier accepts the exact hidden MSH state", () => {
  assert.deepEqual(evaluateMtgSetPromotionPostApplyReadbackV1(fixture()), []);
});

test("post-apply verifier blocks identity, UI, and image leakage", () => {
  const value = fixture();
  value.readback.state.selected_card_count = 452;
  value.readback.client_visibility.authenticated.card_count = 1;
  value.readback.image_pointers.printing_image_url_count = 1;
  assert.deepEqual(evaluateMtgSetPromotionPostApplyReadbackV1(value), [
    "selected_card_count_mismatch",
    "authenticated_card_count_mismatch",
    "printing_image_url_count_mismatch",
  ]);
});

test("post-apply verifier blocks approval and source drift", () => {
  const value = fixture();
  value.applySummary.approval_sha256 = "0".repeat(64);
  value.readback.source.positive_market_price_count = 863;
  value.stagingReconciliation.findings.push("staged_row_mismatch:card_print:test");
  assert.deepEqual(evaluateMtgSetPromotionPostApplyReadbackV1(value), [
    "staged_row_mismatch:card_print:test",
    "apply_approval_hash_mismatch",
    "source_positive_market_price_count_mismatch",
  ]);
});
