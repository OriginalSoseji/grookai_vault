import { MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION } from "./market_reference_signal_read_model_v1.mjs";
import { MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION } from "./market_reference_signal_review_gate_v1.mjs";

export const MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION = "MEE_09F_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_V1";
export const MARKET_REFERENCE_SIGNAL_ROLLUP_LANE = "internal_reference_signal";

function byCardPrintId(rows = []) {
  return new Map(rows.map((row) => [row.card_print_id, row]));
}

export function buildMarketReferenceSignalRollupRowsV1({
  signals = [],
  reviewedSignals = [],
  rollupVersion = MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION,
} = {}) {
  const signalByCardPrintId = byCardPrintId(signals);

  return reviewedSignals.map((review) => {
    const signal = signalByCardPrintId.get(review.card_print_id);
    if (!signal) {
      throw new Error(`[market-reference-signal-rollups] missing signal for ${review.card_print_id}`);
    }

    return {
      card_print_id: review.card_print_id,
      gv_id: review.gv_id ?? signal.gv_id ?? null,
      rollup_version: rollupVersion,
      read_model_version: MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION,
      review_gate_version: MARKET_REFERENCE_SIGNAL_REVIEW_GATE_VERSION,
      rollup_lane: MARKET_REFERENCE_SIGNAL_ROLLUP_LANE,
      review_status: review.review_status,
      currency: signal.currency ?? "USD",
      reference_low: review.reference_low,
      reference_median: review.reference_median,
      reference_high: review.reference_high,
      source_count: review.source_count,
      eligible_evidence_count: review.eligible_evidence_count,
      quarantined_evidence_count: review.quarantined_evidence_count,
      currency_excluded_evidence_count: review.currency_excluded_evidence_count,
      price_ratio: review.price_ratio,
      variance_band: review.variance_band,
      review_flags: review.flags ?? [],
      source_summary: {
        sources: signal.sources ?? [],
        source_counts: signal.source_counts ?? {},
        source_metric_counts: signal.source_metric_counts ?? {},
        signal_band: signal.signal_band,
      },
      signal_payload: {
        signal,
        review,
      },
      needs_review: true,
      publishable: false,
      app_visible: false,
      market_truth: false,
    };
  }).sort((left, right) => {
    if ((left.gv_id ?? "") !== (right.gv_id ?? "")) return (left.gv_id ?? "").localeCompare(right.gv_id ?? "");
    return left.card_print_id.localeCompare(right.card_print_id);
  });
}
