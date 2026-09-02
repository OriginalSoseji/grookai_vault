import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePricingTrustSampleV1 } from "../../backend/pricing/pricing_trust_spot_check_policy_v1.mjs";

function fixture() {
  const identity = {
    card_print_id: "card-1",
    card_printing_id: "printing-1",
    printing_gv_id: "GV-PK-TEST-001-HOLO",
    finish_key: "holo",
  };
  const read_model = {
    pricing_scope: "card_printing",
    card_print_id: "card-1",
    card_printing_id: "printing-1",
    printing_gv_id: "GV-PK-TEST-001-HOLO",
    status: "available",
    currency: "USD",
    market_close: "12.34",
    source_name: "tcgplayer",
    source_label: "TCGPlayer Market",
    freshness: "fresh",
    provenance_id: "provenance-1",
  };
  const trace = {
    provenance_id: "provenance-1",
    publication_set_id: "publication-1",
    run_id: "run-1",
    qualification_decision_id: "decision-1",
    source_observation_id: "observation-1",
    source_sync_run_id: "sync-1",
    source_artifact_id: "artifact-1",
    source_artifact_hash: "artifact-hash",
    source_price_row_identity: "row-1",
    source_row_hash: "row-hash",
    source_mapping_id: "mapping-1",
    variant_assignment_id: "assignment-1",
    source_product_id: 123,
    source_subtype_name: "Holofoil",
    card_print_id: "card-1",
    card_printing_id: "printing-1",
    printing_gv_id: "GV-PK-TEST-001-HOLO",
    market_price: "12.34",
    publication_lane: "current",
    language_result: "english",
    finish_result: "exact_child_finish",
    source_integrity_result: "passed",
    duplicate_product_result: "unique",
    freshness_result: "fresh",
    policy_version: "TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3",
  };
  const source_observation = {
    id: "observation-1",
    source_price_row_identity: "row-1",
    product_id: 123,
    subtype_name: "Holofoil",
    market_price: "12.34",
    currency: "USD",
    payload_hash: "row-hash",
  };
  return { identity, read_model, trace, source_observation };
}

test("an exact English TCGPlayer price reconciles through warehouse evidence", () => {
  assert.deepEqual(evaluatePricingTrustSampleV1(fixture()), []);
});

test("a source market mismatch is rejected", () => {
  const sample = fixture();
  sample.source_observation.market_price = "9.99";
  assert.ok(evaluatePricingTrustSampleV1(sample).includes("source_market_close_mismatch"));
});

test("non-English or inferred-finish evidence is rejected", () => {
  const sample = fixture();
  sample.trace.language_result = "japanese";
  sample.trace.finish_result = "inferred";
  assert.ok(evaluatePricingTrustSampleV1(sample).includes("trace_language_not_english"));
  assert.ok(evaluatePricingTrustSampleV1(sample).includes("trace_finish_not_exact"));
});
