export const MARKET_REFERENCE_SIGNAL_ROLLUP_READBACK_VERSION = "MEE_09G_REFERENCE_SIGNAL_ROLLUP_READBACK_V1";
export const EXPECTED_INTERNAL_ROLLUP_VERSION = "MEE_09F_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_V1";

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sample(rows, limit) {
  return rows.slice(0, limit).map((row) => ({
    gv_id: row.gv_id,
    card_print_id: row.card_print_id,
    review_status: row.review_status,
    variance_band: row.variance_band,
    source_count: row.source_count,
    eligible_evidence_count: row.eligible_evidence_count,
    reference_low: row.reference_low,
    reference_median: row.reference_median,
    reference_high: row.reference_high,
    price_ratio: row.price_ratio,
    review_flags: row.review_flags ?? [],
  }));
}

function byHighestRatio(rows) {
  return [...rows].sort((left, right) => (Number(right.price_ratio) || 0) - (Number(left.price_ratio) || 0));
}

function byMedianDesc(rows) {
  return [...rows].sort((left, right) => (Number(right.reference_median) || 0) - (Number(left.reference_median) || 0));
}

export function buildMarketReferenceSignalRollupReadbackV1({
  rollups = [],
  sampleLimit = 20,
  expectedRollupVersion = EXPECTED_INTERNAL_ROLLUP_VERSION,
} = {}) {
  const findings = [];
  const publishableRows = rollups.filter((row) => row.publishable === true);
  const appVisibleRows = rollups.filter((row) => row.app_visible === true);
  const marketTruthRows = rollups.filter((row) => row.market_truth === true);
  const notNeedsReviewRows = rollups.filter((row) => row.needs_review !== true);
  const unexpectedVersionRows = rollups.filter((row) => row.rollup_version !== expectedRollupVersion);
  const nonUsdRows = rollups.filter((row) => row.currency !== "USD");

  if (publishableRows.length > 0) findings.push("publishable_rollup_rows_detected");
  if (appVisibleRows.length > 0) findings.push("app_visible_rollup_rows_detected");
  if (marketTruthRows.length > 0) findings.push("market_truth_rollup_rows_detected");
  if (notNeedsReviewRows.length > 0) findings.push("needs_review_false_rows_detected");
  if (unexpectedVersionRows.length > 0) findings.push("unexpected_rollup_version_detected");
  if (nonUsdRows.length > 0) findings.push("non_usd_rollup_rows_detected");

  const highVarianceRows = rollups.filter((row) => row.review_status === "review_required_high_variance");
  const singleSourceRows = rollups.filter((row) => row.review_status === "review_required_single_source");
  const contextRows = rollups.filter((row) => row.review_status === "review_required_context");
  const specialLaneRows = rollups.filter((row) => row.review_status === "blocked_special_lane_review");

  return {
    readback_version: MARKET_REFERENCE_SIGNAL_ROLLUP_READBACK_VERSION,
    expected_rollup_version: expectedRollupVersion,
    total_rows: rollups.length,
    internal_lock_counts: {
      needs_review_true: rollups.filter((row) => row.needs_review === true).length,
      publishable_true: publishableRows.length,
      app_visible_true: appVisibleRows.length,
      market_truth_true: marketTruthRows.length,
      non_usd_rows: nonUsdRows.length,
      unexpected_rollup_version_rows: unexpectedVersionRows.length,
    },
    status_counts: countBy(rollups, (row) => row.review_status),
    variance_band_counts: countBy(rollups, (row) => row.variance_band),
    flag_counts: countBy(rollups.flatMap((row) => row.review_flags ?? []), (flag) => flag),
    currency_counts: countBy(rollups, (row) => row.currency),
    source_count_counts: countBy(rollups, (row) => String(row.source_count ?? 0)),
    review_queue: {
      high_variance: {
        count: highVarianceRows.length,
        priority: "review price spread and source metric compatibility before trusting",
        samples: sample(byHighestRatio(highVarianceRows), sampleLimit),
      },
      single_source: {
        count: singleSourceRows.length,
        priority: "acquire a second independent source or keep internal-only",
        samples: sample(byMedianDesc(singleSourceRows), sampleLimit),
      },
      context_required: {
        count: contextRows.length,
        priority: "inspect non-USD exclusions, quarantined context, and moderate variance",
        samples: sample(byHighestRatio(contextRows), sampleLimit),
      },
      special_lane_blocked: {
        count: specialLaneRows.length,
        priority: "never auto-publish without lane-aware exact variant evidence",
        samples: sample(byMedianDesc(specialLaneRows), sampleLimit),
      },
    },
    findings,
    ready: findings.length === 0,
  };
}
