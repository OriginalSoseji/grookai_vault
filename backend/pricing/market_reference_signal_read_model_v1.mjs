export const MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION = "MEE_09B_INTERNAL_REFERENCE_SIGNAL_READ_MODEL_V1";

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 100) / 100;
}

function median(values) {
  const sorted = values
    .map(asNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function signalBand({ sourceCount, eligibleEvidenceCount }) {
  if (sourceCount >= 2 && eligibleEvidenceCount >= 3) return "multi_source_reference_candidate";
  if (sourceCount >= 1 && eligibleEvidenceCount >= 2) return "single_source_reference_candidate";
  return "thin_reference_candidate";
}

export function buildMarketReferenceSignalReadModelV1({
  candidates = [],
  normalizedEvidence = [],
  currency = "USD",
} = {}) {
  const candidateById = new Map(candidates.map((row) => [row.id, row]));
  const rowsByCard = new Map();
  const quarantinedByCard = new Map();
  const currencyExcludedByCard = new Map();
  let currencyExcludedEvidenceCount = 0;

  for (const row of normalizedEvidence) {
    const cardPrintId = row.card_print_id;
    if (!cardPrintId) continue;
    if (row.model_eligible === true && row.model_disposition === "reference_model_candidate") {
      if (row.normalized_currency !== currency) {
        currencyExcludedByCard.set(cardPrintId, (currencyExcludedByCard.get(cardPrintId) ?? 0) + 1);
        currencyExcludedEvidenceCount += 1;
        continue;
      }
      if (!rowsByCard.has(cardPrintId)) rowsByCard.set(cardPrintId, []);
      rowsByCard.get(cardPrintId).push(row);
    } else {
      quarantinedByCard.set(cardPrintId, (quarantinedByCard.get(cardPrintId) ?? 0) + 1);
    }
  }

  const signals = [...rowsByCard.entries()].map(([cardPrintId, rows]) => {
    const prices = rows.map((row) => asNumber(row.normalized_price)).filter((value) => value !== null);
    const sources = [...new Set(rows.map((row) => row.source).filter(Boolean))].sort();
    const candidateRows = rows
      .map((row) => candidateById.get(row.candidate_id))
      .filter(Boolean);
    const gvId = candidateRows.find((row) => row.gv_id)?.gv_id ?? rows.find((row) => row.normalized_payload?.gv_id)?.normalized_payload?.gv_id ?? null;
    const currencies = [...new Set(rows.map((row) => row.normalized_currency).filter(Boolean))].sort();

    return {
      card_print_id: cardPrintId,
      gv_id: gvId,
      read_model_version: MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION,
      lane: "internal_reference_signal_candidate",
      publishable: false,
      source_count: sources.length,
      sources,
      eligible_evidence_count: rows.length,
      quarantined_evidence_count: quarantinedByCard.get(cardPrintId) ?? 0,
      currency_excluded_evidence_count: currencyExcludedByCard.get(cardPrintId) ?? 0,
      currency: currencies.length === 1 ? currencies[0] : null,
      reference_low: prices.length ? roundCurrency(Math.min(...prices)) : null,
      reference_median: roundCurrency(median(prices)),
      reference_high: prices.length ? roundCurrency(Math.max(...prices)) : null,
      signal_band: signalBand({ sourceCount: sources.length, eligibleEvidenceCount: rows.length }),
      source_metric_counts: countBy(rows, (row) => row.metric_key ?? "unknown_metric"),
      source_counts: countBy(rows, (row) => row.source),
    };
  });

  signals.sort((left, right) => {
    if ((left.gv_id ?? "") !== (right.gv_id ?? "")) return (left.gv_id ?? "").localeCompare(right.gv_id ?? "");
    return left.card_print_id.localeCompare(right.card_print_id);
  });

  return {
    read_model_version: MARKET_REFERENCE_SIGNAL_READ_MODEL_VERSION,
    signals,
    summary: {
      signal_count: signals.length,
      publishable_count: signals.filter((row) => row.publishable === true).length,
      multi_source_signal_count: signals.filter((row) => row.source_count >= 2).length,
      single_source_signal_count: signals.filter((row) => row.source_count === 1).length,
      currency_filter: currency,
      currency_excluded_evidence_count: currencyExcludedEvidenceCount,
      signal_band_counts: countBy(signals, (row) => row.signal_band),
      currency_counts: countBy(signals, (row) => row.currency ?? "mixed_or_missing"),
    },
  };
}
