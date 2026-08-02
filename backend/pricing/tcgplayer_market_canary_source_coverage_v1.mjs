import {
  tcgplayerMarketCanarySourceKeyV1,
} from "./tcgplayer_market_canary_definition_v1.mjs";

export const TCGPLAYER_MARKET_CANARY_SOURCE_COVERAGE_V1 =
  "TCGPLAYER_MARKET_CANARY_SOURCE_COVERAGE_V1";

function rawSourceKey(value) {
  return [Number(value.source_product_id), value.source_subtype_name].join(":");
}

function indexRows(rows, keyFor) {
  const index = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const matches = index.get(key) ?? [];
    matches.push(row);
    index.set(key, matches);
  }
  return index;
}

function availableSourceIdentities(rawRows, sourceProductId) {
  return rawRows
    .filter((row) => Number(row.source_product_id) === Number(sourceProductId))
    .map((row) => ({
      source_observation_id: row.source_observation_id ?? null,
      source_price_row_identity: row.source_price_row_identity ?? null,
      source_product_id: Number(row.source_product_id),
      source_subtype_name: row.source_subtype_name,
    }))
    .sort((left, right) =>
      String(left.source_subtype_name).localeCompare(
        String(right.source_subtype_name),
      ),
    );
}

function assertResolvedIdentity(printing, row, key) {
  const mismatches = [
    ["card_print_id", printing.card_print_id],
    ["gv_id", printing.gv_id],
    ["printing_gv_id", printing.printing_gv_id],
    ["finish_key", printing.expected_finish],
  ].filter(([field, expected]) => row[field] !== expected);
  if (mismatches.length) {
    throw new Error(
      `canary identity ${key} drifted: ${mismatches
        .map(
          ([field, expected]) =>
            `${field}=${row[field]} expected=${expected}`,
        )
        .join(",")}`,
    );
  }
}

export function resolveTcgplayerMarketCanarySourceCoverageV1({
  canaryDefinition,
  candidateRows,
  currentSourceRows,
  sourceRun,
}) {
  if (!canaryDefinition || !Array.isArray(canaryDefinition.printings)) {
    throw new Error("canaryDefinition.printings is required");
  }
  if (!Array.isArray(candidateRows)) {
    throw new Error("candidateRows must be an array");
  }
  if (!Array.isArray(currentSourceRows)) {
    throw new Error("currentSourceRows must be an array");
  }
  if (!sourceRun?.id || !sourceRun?.observed_on) {
    throw new Error("sourceRun id and observed_on are required");
  }

  const candidatesByKey = indexRows(
    candidateRows,
    tcgplayerMarketCanarySourceKeyV1,
  );
  const sourceRowsByKey = indexRows(currentSourceRows, rawSourceKey);
  const resolvedRows = [];
  const outcomes = [];

  for (const printing of canaryDefinition.printings) {
    const candidateKey = tcgplayerMarketCanarySourceKeyV1(printing);
    const expectedRawKey = rawSourceKey(printing);
    const candidates = candidatesByKey.get(candidateKey) ?? [];
    const sourceRows = sourceRowsByKey.get(expectedRawKey) ?? [];
    const baseOutcome = {
      ordinal: printing.ordinal,
      card_print_id: printing.card_print_id,
      card_printing_id: printing.card_printing_id,
      gv_id: printing.gv_id,
      printing_gv_id: printing.printing_gv_id,
      source_product_id: Number(printing.source_product_id),
      source_subtype_name: printing.source_subtype_name,
      expected_finish: printing.expected_finish,
      source_sync_run_id: sourceRun.id,
      source_observed_on: sourceRun.observed_on,
      candidate_count: candidates.length,
      current_source_row_count: sourceRows.length,
      available_source_identities: availableSourceIdentities(
        currentSourceRows,
        printing.source_product_id,
      ),
    };

    if (candidates.length > 1) {
      throw new Error(
        `canary source identity ${candidateKey} resolved ${candidates.length} candidate rows`,
      );
    }
    if (sourceRows.length > 1) {
      throw new Error(
        `canary raw source identity ${expectedRawKey} resolved ${sourceRows.length} rows`,
      );
    }

    if (candidates.length === 0) {
      if (sourceRows.length === 1) {
        throw new Error(
          `canary source identity ${candidateKey} exists in the current source run but resolved 0 candidate rows`,
        );
      }
      outcomes.push({
        ...baseOutcome,
        outcome: "source_missing",
        source_observation_id: null,
        reason: "exact_product_and_subtype_absent_from_current_source_run",
      });
      continue;
    }

    if (sourceRows.length !== 1) {
      throw new Error(
        `canary source identity ${candidateKey} resolved a candidate without exactly one current raw source row`,
      );
    }

    const row = candidates[0];
    const rawRow = sourceRows[0];
    if (
      row.source_observation_id !== rawRow.source_observation_id ||
      row.source_sync_run_id !== sourceRun.id
    ) {
      throw new Error(
        `canary source identity ${candidateKey} candidate/raw source provenance drifted`,
      );
    }
    assertResolvedIdentity(printing, row, candidateKey);
    resolvedRows.push(row);
    outcomes.push({
      ...baseOutcome,
      outcome: "resolved",
      source_observation_id: row.source_observation_id,
      source_price_row_identity: row.source_price_row_identity,
      reason: null,
    });
  }

  const sourceMissingCount = outcomes.filter(
    (outcome) => outcome.outcome === "source_missing",
  ).length;
  const coverage = {
    policy_version: TCGPLAYER_MARKET_CANARY_SOURCE_COVERAGE_V1,
    expected_count: canaryDefinition.expected_count,
    resolved_count: resolvedRows.length,
    source_missing_count: sourceMissingCount,
    reconciled:
      outcomes.length === canaryDefinition.expected_count &&
      resolvedRows.length + sourceMissingCount === canaryDefinition.expected_count,
    outcomes,
  };
  if (!coverage.reconciled) {
    throw new Error(
      `canary source coverage mismatch expected=${coverage.expected_count} resolved=${coverage.resolved_count} source_missing=${coverage.source_missing_count} outcomes=${outcomes.length}`,
    );
  }

  return { rows: resolvedRows, coverage };
}
