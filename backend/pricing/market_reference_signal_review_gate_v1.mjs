export const MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION = "MEE_09C_REFERENCE_SIGNAL_REVIEW_GATE_V1";

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function ratio(high, low) {
  if (high === null || high === undefined || low === null || low === undefined || Number(low) <= 0) return null;
  return Math.round((Number(high) / Number(low)) * 100) / 100;
}

function varianceBand(priceRatio) {
  if (priceRatio === null) return "unknown_variance";
  if (priceRatio >= 20) return "extreme_variance";
  if (priceRatio >= 10) return "high_variance";
  if (priceRatio >= 4) return "moderate_variance";
  return "bounded_variance";
}

function isSpecialLane(signal) {
  const text = [
    signal.gv_id,
    signal.card_print_id,
    ...(signal.sources ?? []),
  ].filter(Boolean).join(" ").toLowerCase();

  return [
    /shadowless/,
    /1st[-_\s]?edition/,
    /1999[-_\s]?2000/,
    /\bmcd\b/,
    /mcdonald/,
    /\btk[-_]/,
    /trainer[-_\s]?kit/,
    /world[-_\s]?championship/,
    /\bwc\d{2,4}\b/,
    /staff/,
    /prerelease/,
  ].some((pattern) => pattern.test(text));
}

function reviewFlags(signal) {
  const priceRatio = ratio(signal.reference_high, signal.reference_low);
  const flags = [];
  const band = varianceBand(priceRatio);
  if (band !== "bounded_variance") flags.push(band);
  if (signal.source_count < 2) flags.push("single_source_only");
  if (signal.eligible_evidence_count < 3) flags.push("thin_evidence");
  if ((signal.currency_excluded_evidence_count ?? 0) > 0) flags.push("non_usd_evidence_excluded");
  if ((signal.quarantined_evidence_count ?? 0) > 0) flags.push("quarantined_context_present");
  if (isSpecialLane(signal)) flags.push("special_lane_review_required");
  if (signal.publishable === true) flags.push("publishable_leak");
  return { flags, priceRatio, varianceBand: band };
}

function reviewStatus(signal, flags) {
  if (flags.includes("publishable_leak")) return "blocked_publishable_leak";
  if (flags.includes("special_lane_review_required")) return "blocked_special_lane_review";
  if (flags.includes("extreme_variance") || flags.includes("high_variance")) return "review_required_high_variance";
  if (flags.includes("single_source_only")) return "review_required_single_source";
  if (flags.includes("moderate_variance") || flags.includes("non_usd_evidence_excluded") || flags.includes("quarantined_context_present")) {
    return "review_required_context";
  }
  if (signal.source_count >= 2) return "review_ready_multi_source";
  return "review_required_single_source";
}

export function buildMarketReferenceSignalReviewGateV1({
  signals = [],
} = {}) {
  const reviewedSignals = signals.map((signal) => {
    const { flags, priceRatio, varianceBand: signalVarianceBand } = reviewFlags(signal);
    return {
      card_print_id: signal.card_print_id,
      gv_id: signal.gv_id,
      review_gate_version: MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION,
      review_status: reviewStatus(signal, flags),
      publishable: false,
      source_count: signal.source_count,
      eligible_evidence_count: signal.eligible_evidence_count,
      quarantined_evidence_count: signal.quarantined_evidence_count,
      currency_excluded_evidence_count: signal.currency_excluded_evidence_count,
      reference_low: signal.reference_low,
      reference_median: signal.reference_median,
      reference_high: signal.reference_high,
      price_ratio: priceRatio,
      variance_band: signalVarianceBand,
      flags,
    };
  });

  return {
    review_gate_version: MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION,
    reviewed_signals: reviewedSignals,
    summary: {
      reviewed_signal_count: reviewedSignals.length,
      publishable_count: reviewedSignals.filter((row) => row.publishable === true).length,
      status_counts: countBy(reviewedSignals, (row) => row.review_status),
      variance_band_counts: countBy(reviewedSignals, (row) => row.variance_band),
      flag_counts: countBy(reviewedSignals.flatMap((row) => row.flags), (flag) => flag),
      review_ready_count: reviewedSignals.filter((row) => row.review_status.startsWith("review_ready")).length,
      review_required_count: reviewedSignals.filter((row) => row.review_status.startsWith("review_required")).length,
      blocked_count: reviewedSignals.filter((row) => row.review_status.startsWith("blocked")).length,
    },
  };
}
