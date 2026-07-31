import assert from "node:assert/strict";
import test from "node:test";

import {
  validateCurrentMarketTrace,
  validateMarketTraceCompleteness,
} from "../../backend/pricing/tcgplayer_market_provenance_policy_v1.mjs";

const identity = {
  card_printing_id: "printing-1",
  printing_gv_id: "GV-PK-TEST-1-HOLO",
};
const trace = {
  card_printing_id: identity.card_printing_id,
  printing_gv_id: identity.printing_gv_id,
  provenance_id: "provenance-1",
  market_price: 12.34,
  publication_set_id: "publication-set-1",
  run_id: "run-1",
  qualification_decision_id: "decision-1",
  source_observation_id: "observation-1",
  source_sync_run_id: "source-run-1",
  source_artifact_id: "artifact-1",
  source_artifact_hash: "artifact-hash",
  source_price_row_identity: "source-row-1",
  source_row_hash: "source-row-hash",
  source_mapping_id: 1,
  variant_assignment_id: "assignment-1",
  policy_version: "policy-1",
};

test("historical trace validation does not depend on the current read model", () => {
  assert.deepEqual(validateMarketTraceCompleteness(identity, trace), []);
});

test("current trace validation reconciles identity, provenance, and market close", () => {
  const readModel = {
    pricing_scope: "card_printing",
    card_printing_id: identity.card_printing_id,
    printing_gv_id: identity.printing_gv_id,
    status: "available",
    provenance_id: trace.provenance_id,
    market_close: trace.market_price,
  };
  assert.deepEqual(
    validateCurrentMarketTrace(identity, readModel, trace),
    [],
  );

  const mismatch = validateCurrentMarketTrace(
    identity,
    { ...readModel, market_close: 9.99 },
    trace,
  );
  assert.deepEqual(mismatch, ["trace_market_close_mismatch"]);
});

test("trace validation rejects incomplete provenance lineage", () => {
  const incomplete = { ...trace, source_artifact_hash: null };
  assert.deepEqual(validateMarketTraceCompleteness(identity, incomplete), [
    "trace_missing_source_artifact_hash",
  ]);
});
