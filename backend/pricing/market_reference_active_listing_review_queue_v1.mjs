export const MARKET_REFERENCE_ACTIVE_LISTING_REVIEW_QUEUE_VERSION = "MEE_10E_ACTIVE_LISTING_REVIEW_QUEUE_V1";
export const EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT = 15;

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 100) / 100;
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

function priceStats(rows) {
  const prices = rows.map((row) => asNumber(row.raw_price)).filter((value) => value !== null);
  if (!prices.length) return { min: null, max: null, average: null };
  return {
    min: roundCurrency(Math.min(...prices)),
    max: roundCurrency(Math.max(...prices)),
    average: roundCurrency(prices.reduce((sum, value) => sum + value, 0) / prices.length),
  };
}

function reviewFlags(row) {
  const flags = new Set(row.exclusion_flags ?? []);
  flags.add("active_listing_unverified");
  flags.add("sold_comp_missing");
  flags.add("manual_review_required");
  const condition = String(row.condition_hint ?? "").trim().toLowerCase();
  if (condition === "graded" || /\b(psa|bgs|cgc|sgc|tag)\b/.test(condition)) flags.add("graded_listing_context");
  if (row.currency !== "USD") flags.add("non_usd_listing");
  if (asNumber(row.raw_price) === null) flags.add("missing_raw_price");
  if (!row.source_url) flags.add("missing_source_url");
  return [...flags].sort();
}

export function buildMarketReferenceActiveListingReviewQueueV1({
  candidates = [],
} = {}) {
  const reviewItems = candidates.map((row) => ({
    candidate_id: row.id ?? null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    queue_version: MARKET_REFERENCE_ACTIVE_LISTING_REVIEW_QUEUE_VERSION,
    source: row.source,
    source_type: row.source_type,
    source_url: row.source_url ?? null,
    raw_title: row.raw_title ?? null,
    raw_price: asNumber(row.raw_price),
    currency: row.currency ?? null,
    condition_hint: row.condition_hint ?? null,
    finish_hint: row.finish_hint ?? null,
    observed_at: row.observed_at ?? null,
    match_confidence_hint: row.match_confidence_hint ?? "unreviewed",
    needs_review: row.needs_review === true,
    can_publish_price_directly: row.can_publish_price_directly === true,
    review_status: "review_required_active_listing",
    review_flags: reviewFlags(row),
  })).sort((left, right) => {
    if ((left.gv_id ?? "") !== (right.gv_id ?? "")) return (left.gv_id ?? "").localeCompare(right.gv_id ?? "");
    return (left.raw_title ?? "").localeCompare(right.raw_title ?? "");
  });

  const findings = [];
  if (reviewItems.length !== EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT) findings.push("active_listing_candidate_count_mismatch");
  if (reviewItems.some((row) => row.source !== "ebay_active")) findings.push("unexpected_source_detected");
  if (reviewItems.some((row) => row.source_type !== "active_listing")) findings.push("unexpected_source_type_detected");
  if (reviewItems.some((row) => row.needs_review !== true)) findings.push("review_gate_missing");
  if (reviewItems.some((row) => row.can_publish_price_directly !== false)) findings.push("direct_publish_candidate_detected");

  return {
    queue_version: MARKET_REFERENCE_ACTIVE_LISTING_REVIEW_QUEUE_VERSION,
    review_items: reviewItems,
    summary: {
      candidate_count: reviewItems.length,
      unique_card_count: new Set(reviewItems.map((row) => row.card_print_id)).size,
      publishable_count: reviewItems.filter((row) => row.can_publish_price_directly === true).length,
      needs_review_count: reviewItems.filter((row) => row.needs_review === true).length,
      source_counts: countBy(reviewItems, (row) => row.source),
      source_type_counts: countBy(reviewItems, (row) => row.source_type),
      currency_counts: countBy(reviewItems, (row) => row.currency ?? "missing"),
      condition_counts: countBy(reviewItems, (row) => row.condition_hint ?? "missing"),
      review_flag_counts: countBy(reviewItems.flatMap((row) => row.review_flags), (flag) => flag),
      price_stats: priceStats(reviewItems),
    },
    findings,
    ready: findings.length === 0,
  };
}
