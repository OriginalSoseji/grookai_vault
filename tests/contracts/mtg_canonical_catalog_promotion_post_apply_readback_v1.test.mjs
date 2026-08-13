import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMtgCanonicalPostApplyReadbackV1 } from "../../scripts/audits/mtg_canonical_catalog_promotion_post_apply_readback_v1.mjs";

const rowCounts = {
  sets: 1,
  card_prints: 417,
  card_print_identity: 417,
  card_printings: 807,
  external_mappings: 417,
  external_printing_mappings: 807,
};

function fixture() {
  const plan = {
    writer_payload_fingerprint: "a".repeat(64),
    foundation_migration_sha256: "b".repeat(64),
    visibility_migration_sha256: "c".repeat(64),
    mutation_contract_sha256: "d".repeat(64),
    promotion_rows_sha256: "e".repeat(64),
    promotion_plan_sha256: "f".repeat(64),
    staging_rows_sha256: "1".repeat(64),
    row_counts: rowCounts,
  };
  const exact = Object.fromEntries(
    Object.entries(rowCounts).map(([name, count]) => [
      name,
      { planned_count: count, actual_count: count, exact_count: count },
    ]),
  );
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
    plan,
    applySummary: {
      status: "hidden_canonical_promotion_applied_and_read_back",
      plan,
      database_proof: {
        durable: {
          service: { pokemon_card_count: 58769 },
          client_visibility: { authenticated: { pokemon_card_count: 58768 } },
        },
      },
    },
    readback: {
      ledger: [
        { version: "20260813185000", name: "mtg_canonical_import_staging_v1" },
        { version: "20260813190000", name: "mtg_canonical_catalog_foundation_v1" },
        { version: "20260813200000", name: "mtg_catalog_app_visibility_boundary_v1" },
      ],
      transaction_read_only: true,
      state: {
        foundation_migration_present: true,
        visibility_migration_present: true,
        visibility_table_present: true,
        staging_batch_count: 1,
        staging_row_count: 2866,
        mtg_game_count: 1,
        mtg_set_count: 1,
        mtg_card_count: 417,
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
      service: {
        release_status: "hidden",
        mtg_game_count: 1,
        mtg_set_count: 1,
        mtg_card_count: 417,
        mtg_identity_count: 417,
        mtg_printing_count: 807,
        parent_mapping_count: 417,
        printing_mapping_count: 807,
        pokemon_card_count: 58769,
      },
      client_visibility: {
        anon: zeroVisibility,
        authenticated: { ...zeroVisibility, pokemon_card_count: 58768 },
      },
      image_pointers: {
        parent_image_url_count: 0,
        parent_image_alt_url_count: 0,
        parent_image_source_count: 0,
        printing_image_path_count: 0,
        printing_image_url_count: 0,
        printing_image_alt_url_count: 0,
      },
      source: {
        planned_count: 807,
        source_row_count: 807,
        positive_market_price_count: 807,
      },
    },
    stagingReconciliation: {
      findings: [],
      actual_hash_sha256: "1".repeat(64),
      row_count: 2866,
    },
  };
}

test("independent readback accepts only the exact hidden durable DSK state", () => {
  assert.deepEqual(evaluateMtgCanonicalPostApplyReadbackV1(fixture()), []);
});

test("independent readback blocks client leakage and image pointer mutation", () => {
  const value = fixture();
  value.readback.client_visibility.authenticated.card_count = 1;
  value.readback.image_pointers.printing_image_url_count = 1;
  assert.deepEqual(evaluateMtgCanonicalPostApplyReadbackV1(value), [
    "authenticated_card_count_mismatch",
    "printing_image_url_count_mismatch",
  ]);
});

test("independent readback blocks canonical drift and stale source lanes", () => {
  const value = fixture();
  value.readback.exact.card_prints.exact_count = 416;
  value.readback.source.positive_market_price_count = 806;
  value.stagingReconciliation.findings.push("staged_row_mismatch:card_print:test");
  assert.deepEqual(evaluateMtgCanonicalPostApplyReadbackV1(value), [
    "staged_row_mismatch:card_print:test",
    "card_prints_exact_count_mismatch",
    "source_positive_market_price_count_mismatch",
  ]);
});
