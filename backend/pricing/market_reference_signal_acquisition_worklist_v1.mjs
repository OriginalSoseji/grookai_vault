export const MARKET_REFERENCE_SIGNAL_ACQUISITION_WORKLIST_VERSION = "MEE_09H_SINGLE_SOURCE_ACQUISITION_WORKLIST_V1";

const FREE_REFERENCE_SOURCES = [
  "tcgcsv_reference",
  "pokemontcg_io_reference",
  "justtcg_reference",
];

const MARKET_EVIDENCE_SOURCES = [
  "ebay_active",
  "ebay_sold_candidate",
  "ebay_user_export",
];

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function existingSources(rollup) {
  return Array.isArray(rollup.source_summary?.sources)
    ? rollup.source_summary.sources.filter(Boolean).sort()
    : [];
}

function missingFreeReferenceSources(rollup) {
  const existing = new Set(existingSources(rollup));
  return FREE_REFERENCE_SOURCES.filter((source) => !existing.has(source));
}

function isSpecialLane(rollup) {
  return rollup.review_status === "blocked_special_lane_review"
    || (rollup.review_flags ?? []).includes("special_lane_review_required");
}

function priorityScore(rollup) {
  let score = 0;
  if (rollup.review_status === "review_required_single_source") score += 1000;
  if (rollup.review_status === "review_required_high_variance") score += 650;
  if (rollup.review_status === "blocked_special_lane_review") score += 500;
  if (rollup.variance_band === "extreme_variance") score += 300;
  if (rollup.variance_band === "high_variance") score += 200;
  if ((rollup.review_flags ?? []).includes("thin_evidence")) score += 150;
  score += Math.min(asNumber(rollup.reference_median), 1000) / 2;
  score += Math.min(asNumber(rollup.price_ratio), 100);
  return Math.round(score * 100) / 100;
}

function reasons(rollup) {
  const output = [];
  if (rollup.source_count === 1) output.push("single_source_reference_signal");
  if (rollup.review_status === "review_required_single_source") output.push("first_wave_single_source_status");
  if (rollup.review_status === "review_required_high_variance") output.push("high_variance_requires_source_corroboration");
  if (isSpecialLane(rollup)) output.push("special_lane_requires_exact_variant_evidence");
  if ((rollup.review_flags ?? []).includes("thin_evidence")) output.push("thin_evidence");
  if ((rollup.review_flags ?? []).includes("quarantined_context_present")) output.push("quarantined_context_present");
  return output;
}

function acquisitionSources(rollup) {
  const sources = [];
  const missingFree = missingFreeReferenceSources(rollup);
  sources.push(...missingFree.slice(0, 2));

  if (isSpecialLane(rollup)) {
    sources.push("ebay_active", "manual_review_candidate");
  } else if (rollup.review_status === "review_required_high_variance" || asNumber(rollup.reference_median) >= 100) {
    sources.push("ebay_active", "ebay_sold_candidate");
  } else {
    sources.push("tcgplayer_reference_candidate");
  }

  return [...new Set(sources)].filter((source) => !existingSources(rollup).includes(source));
}

function cardIdentity(cardPrintsById, rollup) {
  const card = cardPrintsById.get(rollup.card_print_id) ?? {};
  return {
    card_print_id: rollup.card_print_id,
    gv_id: rollup.gv_id ?? card.gv_id,
    name: card.name ?? null,
    set_code: card.set_code ?? card.printed_set_abbrev ?? null,
    provider_number: card.number ?? card.number_plain ?? null,
    number_plain: card.number_plain ?? card.number ?? null,
    rarity: card.rarity ?? null,
  };
}

export function buildMarketReferenceSignalAcquisitionWorklistV1({
  rollups = [],
  cardPrints = [],
  firstWaveLimit = 570,
} = {}) {
  const cardPrintsById = new Map(cardPrints.map((row) => [row.id, row]));
  const singleSourceRollups = rollups.filter((row) => row.source_count === 1);
  const workItems = singleSourceRollups.map((rollup) => ({
    ...cardIdentity(cardPrintsById, rollup),
    review_status: rollup.review_status,
    variance_band: rollup.variance_band,
    reference_low: rollup.reference_low,
    reference_median: rollup.reference_median,
    reference_high: rollup.reference_high,
    price_ratio: rollup.price_ratio,
    existing_sources: existingSources(rollup),
    proposed_sources: acquisitionSources(rollup),
    priority_score: priorityScore(rollup),
    reasons: reasons(rollup),
    can_publish_price_directly: false,
  })).sort((left, right) => {
    if (right.priority_score !== left.priority_score) return right.priority_score - left.priority_score;
    return (left.gv_id ?? "").localeCompare(right.gv_id ?? "");
  });

  const firstWave = workItems
    .filter((row) => row.review_status === "review_required_single_source")
    .slice(0, firstWaveLimit);
  const highVariance = workItems.filter((row) => row.review_status === "review_required_high_variance");
  const specialLane = workItems.filter((row) => row.review_status === "blocked_special_lane_review");

  return {
    worklist_version: MARKET_REFERENCE_SIGNAL_ACQUISITION_WORKLIST_VERSION,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    summary: {
      total_rollups: rollups.length,
      single_source_rollups: singleSourceRollups.length,
      first_wave_review_required_single_source: firstWave.length,
      high_variance_single_source: highVariance.length,
      special_lane_single_source: specialLane.length,
      proposed_source_counts: countBy(workItems.flatMap((row) => row.proposed_sources), (source) => source),
      existing_source_counts: countBy(workItems.flatMap((row) => row.existing_sources), (source) => source),
      review_status_counts: countBy(workItems, (row) => row.review_status),
    },
    first_wave: firstWave,
    high_variance_queue: highVariance,
    special_lane_queue: specialLane,
    all_single_source: workItems,
  };
}
