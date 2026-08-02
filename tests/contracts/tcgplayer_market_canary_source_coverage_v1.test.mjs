import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveTcgplayerMarketCanarySourceCoverageV1,
  TCGPLAYER_MARKET_CANARY_SOURCE_COVERAGE_V1,
} from "../../backend/pricing/tcgplayer_market_canary_source_coverage_v1.mjs";

const SOURCE_RUN = {
  id: "source-run-1",
  observed_on: "2026-08-02",
};

function printing(ordinal, overrides = {}) {
  return {
    ordinal,
    card_print_id: `card-${ordinal}`,
    card_printing_id: `printing-${ordinal}`,
    gv_id: `GV-${ordinal}`,
    printing_gv_id: `GV-${ordinal}-HOLO`,
    source_product_id: 1000 + ordinal,
    source_subtype_name: "Holofoil",
    expected_finish: "holo",
    ...overrides,
  };
}

function candidate(expected, overrides = {}) {
  return {
    source_observation_id: `observation-${expected.ordinal}`,
    source_sync_run_id: SOURCE_RUN.id,
    source_price_row_identity: `price-${expected.ordinal}`,
    source_product_id: expected.source_product_id,
    source_subtype_name: expected.source_subtype_name,
    card_print_id: expected.card_print_id,
    card_printing_id: expected.card_printing_id,
    gv_id: expected.gv_id,
    printing_gv_id: expected.printing_gv_id,
    finish_key: expected.expected_finish,
    ...overrides,
  };
}

function rawSource(expected, overrides = {}) {
  return {
    source_observation_id: `observation-${expected.ordinal}`,
    source_sync_run_id: SOURCE_RUN.id,
    source_price_row_identity: `price-${expected.ordinal}`,
    source_product_id: expected.source_product_id,
    source_subtype_name: expected.source_subtype_name,
    ...overrides,
  };
}

function definition(printings) {
  return { expected_count: printings.length, printings };
}

test("all exact canary identities resolve with traceable coverage", () => {
  const printings = [printing(1), printing(2), printing(3)];
  const result = resolveTcgplayerMarketCanarySourceCoverageV1({
    canaryDefinition: definition(printings),
    candidateRows: printings.map(candidate),
    currentSourceRows: printings.map(rawSource),
    sourceRun: SOURCE_RUN,
  });

  assert.equal(result.rows.length, 3);
  assert.equal(
    result.coverage.policy_version,
    TCGPLAYER_MARKET_CANARY_SOURCE_COVERAGE_V1,
  );
  assert.equal(result.coverage.expected_count, 3);
  assert.equal(result.coverage.resolved_count, 3);
  assert.equal(result.coverage.source_missing_count, 0);
  assert.equal(result.coverage.reconciled, true);
  assert.deepEqual(
    result.coverage.outcomes.map((outcome) => outcome.outcome),
    ["resolved", "resolved", "resolved"],
  );
});

test("an exact identity absent from the current source run is source_missing", () => {
  const printings = [printing(1), printing(2), printing(3)];
  const result = resolveTcgplayerMarketCanarySourceCoverageV1({
    canaryDefinition: definition(printings),
    candidateRows: printings.slice(0, 2).map(candidate),
    currentSourceRows: printings.slice(0, 2).map(rawSource),
    sourceRun: SOURCE_RUN,
  });

  assert.equal(result.rows.length, 2);
  assert.equal(result.coverage.resolved_count, 2);
  assert.equal(result.coverage.source_missing_count, 1);
  assert.equal(result.coverage.outcomes[2].outcome, "source_missing");
  assert.equal(result.coverage.outcomes[2].source_observation_id, null);
  assert.equal(
    result.coverage.outcomes[2].reason,
    "exact_product_and_subtype_absent_from_current_source_run",
  );
});

test("a current source row that disappears from the candidate view is mapping drift", () => {
  const expected = printing(1);
  assert.throws(
    () =>
      resolveTcgplayerMarketCanarySourceCoverageV1({
        canaryDefinition: definition([expected]),
        candidateRows: [],
        currentSourceRows: [rawSource(expected)],
        sourceRun: SOURCE_RUN,
      }),
    /exists in the current source run but resolved 0 candidate rows/,
  );
});

test("duplicate candidate and raw identities fail closed", () => {
  const expected = printing(1);
  const exactCandidate = candidate(expected);
  const exactRaw = rawSource(expected);
  assert.throws(
    () =>
      resolveTcgplayerMarketCanarySourceCoverageV1({
        canaryDefinition: definition([expected]),
        candidateRows: [exactCandidate, { ...exactCandidate }],
        currentSourceRows: [exactRaw],
        sourceRun: SOURCE_RUN,
      }),
    /resolved 2 candidate rows/,
  );
  assert.throws(
    () =>
      resolveTcgplayerMarketCanarySourceCoverageV1({
        canaryDefinition: definition([expected]),
        candidateRows: [exactCandidate],
        currentSourceRows: [exactRaw, { ...exactRaw }],
        sourceRun: SOURCE_RUN,
      }),
    /resolved 2 rows/,
  );
});

test("canonical identity or finish drift remains fatal", () => {
  const expected = printing(1);
  assert.throws(
    () =>
      resolveTcgplayerMarketCanarySourceCoverageV1({
        canaryDefinition: definition([expected]),
        candidateRows: [candidate(expected, { finish_key: "normal" })],
        currentSourceRows: [rawSource(expected)],
        sourceRun: SOURCE_RUN,
      }),
    /finish_key=normal expected=holo/,
  );
});

test("an available alternate subtype is evidence, not a substitute", () => {
  const expected = printing(1);
  const alternate = rawSource(expected, {
    source_observation_id: "normal-observation",
    source_price_row_identity: "normal-price",
    source_subtype_name: "Normal",
  });
  const result = resolveTcgplayerMarketCanarySourceCoverageV1({
    canaryDefinition: definition([expected]),
    candidateRows: [],
    currentSourceRows: [alternate],
    sourceRun: SOURCE_RUN,
  });

  assert.equal(result.rows.length, 0);
  assert.equal(result.coverage.outcomes[0].outcome, "source_missing");
  assert.deepEqual(
    result.coverage.outcomes[0].available_source_identities.map(
      (identity) => identity.source_subtype_name,
    ),
    ["Normal"],
  );
});

test("candidate provenance must match the frozen current source run", () => {
  const expected = printing(1);
  assert.throws(
    () =>
      resolveTcgplayerMarketCanarySourceCoverageV1({
        canaryDefinition: definition([expected]),
        candidateRows: [
          candidate(expected, { source_observation_id: "wrong-observation" }),
        ],
        currentSourceRows: [rawSource(expected)],
        sourceRun: SOURCE_RUN,
      }),
    /candidate\/raw source provenance drifted/,
  );
});
