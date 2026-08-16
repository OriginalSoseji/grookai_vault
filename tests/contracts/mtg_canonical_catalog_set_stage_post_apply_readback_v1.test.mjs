import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMtgSetStagePostApplyReadbackV1 } from "../../scripts/audits/mtg_canonical_catalog_set_stage_post_apply_readback_v1.mjs";

function fixture() {
  const payload = {
    writer_payload_fingerprint: "a".repeat(64),
    plan_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1",
    source_bulk_sha256: "b".repeat(64),
    selected_set: { code: "msh", name: "Marvel Super Heroes" },
    counts: { exact_market_lanes: 864, positive_market_lanes: 864 },
    boundaries: { database_writes: false },
  };
  const contract = {
    batch_id: "batch",
    staged_row_count: 3089,
    staged_rows_sha256: "c".repeat(64),
    mutation_contract_sha256: "d".repeat(64),
  };
  const zero = {
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
    payload,
    contract,
    applySummary: {
      status: "service_only_staging_applied_and_read_back",
      writer_payload_fingerprint: payload.writer_payload_fingerprint,
      contract,
    },
    reconciliation: {
      findings: [],
      actual_hash_sha256: contract.staged_rows_sha256,
      row_count: 3089,
    },
    production: {
      transaction_read_only: true,
      batch: [
        {
          id: contract.batch_id,
          payload_fingerprint_sha256: payload.writer_payload_fingerprint,
          plan_version: payload.plan_version,
          source_bulk_sha256: payload.source_bulk_sha256,
          selected_set_code: payload.selected_set.code,
          selected_set_name: payload.selected_set.name,
          status: "staged",
          row_counts: payload.counts,
          execution_boundaries: payload.boundaries,
        },
      ],
      totals: {
        batch_count: 2,
        row_count: 5955,
        dsk_batch_count: 1,
        dsk_row_count: 2866,
        msh_batch_count: 1,
        msh_row_count: 3089,
      },
      canonical: {
        release_status: "hidden",
        mtg_game_count: 1,
        mtg_set_count: 1,
        mtg_card_count: 417,
        mtg_identity_count: 417,
        mtg_printing_count: 807,
        msh_canonical_set_count: 0,
        msh_canonical_card_count: 0,
        pokemon_card_count: 58769,
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
      source: {
        planned_count: 864,
        source_row_count: 864,
        positive_market_price_count: 864,
      },
      client_visibility: {
        anon: zero,
        authenticated: { ...zero, pokemon_card_count: 58768 },
      },
    },
  };
}

test("independent readback accepts the exact hidden MSH staging state", () => {
  const value = fixture();
  assert.deepEqual(evaluateMtgSetStagePostApplyReadbackV1(value), []);
});

test("independent readback blocks canonical leakage and staged row drift", () => {
  const value = fixture();
  value.production.canonical.msh_canonical_card_count = 1;
  value.reconciliation.findings.push("staged_row_mismatch:card_print:test");
  assert.deepEqual(evaluateMtgSetStagePostApplyReadbackV1(value), [
    "staged_row_mismatch:card_print:test",
    "msh_canonical_card_count_mismatch",
  ]);
});

test("independent readback blocks client visibility and aggregate count drift", () => {
  const value = fixture();
  value.production.totals.row_count = 5954;
  value.production.client_visibility.authenticated.card_count = 1;
  assert.deepEqual(evaluateMtgSetStagePostApplyReadbackV1(value), [
    "total_staging_row_count_mismatch",
    "authenticated_card_count_mismatch",
  ]);
});
