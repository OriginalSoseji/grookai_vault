export const MARKET_LISTING_ACQUISITION_TARGET_SELECTION_VERSION =
  "MEE_MARKET_LISTING_ACQUISITION_TARGET_SELECTION_V1";

export const DEFAULT_NEW_SET_WINDOW_DAYS = 365;

const COVERAGE_LANE_RANK = Object.freeze({
  new_release_unqueried: 0,
  unqueried: 1,
  new_release_refresh: 2,
  stale_refresh: 3,
});

function text(value) {
  return String(value ?? "").trim();
}

function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function isEnglishPokemonTarget(target) {
  const identityDomain = text(target?.set_identity_domain || target?.identity_domain).toLowerCase();
  return (
    text(target?.game).toLowerCase() === "pokemon" &&
    identityDomain.startsWith("pokemon_eng")
  );
}

function isRecentRelease(target, { asOf, newSetWindowDays }) {
  if (!isEnglishPokemonTarget(target)) return false;
  const releaseAt = timestamp(target?.release_date);
  if (releaseAt === null || releaseAt > asOf) return false;
  return asOf - releaseAt <= newSetWindowDays * 24 * 60 * 60 * 1000;
}

export function acquisitionCoverageLaneV1(target, {
  asOf = Date.now(),
  newSetWindowDays = DEFAULT_NEW_SET_WINDOW_DAYS,
} = {}) {
  const recent = isRecentRelease(target, { asOf: timestamp(asOf) ?? Date.now(), newSetWindowDays });
  const queried = timestamp(target?.last_queried_at) !== null;
  if (recent && !queried) return "new_release_unqueried";
  if (!queried) return "unqueried";
  if (recent) return "new_release_refresh";
  return "stale_refresh";
}

function existingPriorityRank(target) {
  const priority = text(target?.acquisition_priority).toLowerCase();
  if (priority === "priority_variant_special_finish") return 0;
  if (priority === "priority_variant_finish") return 1;
  const rarity = text(target?.rarity).toLowerCase();
  if (/illustration|secret|hyper|rainbow|gold|shiny|ultra|holo|double rare|ace spec/.test(rarity)) return 2;
  if (!rarity) return 4;
  if (rarity === "common" || rarity === "uncommon" || rarity === "rare") return 5;
  return 3;
}

function targetKey(target) {
  return text(target?.card_printing_id) || text(target?.card_print_id);
}

export function selectMarketListingAcquisitionTargetsV1({
  targets = [],
  limit,
  asOf = new Date().toISOString(),
  newSetWindowDays = DEFAULT_NEW_SET_WINDOW_DAYS,
} = {}) {
  if (!Array.isArray(targets)) throw new Error("[market-listing-target-selection] targets must be an array");
  const resolvedLimit = Number.parseInt(limit, 10);
  if (!Number.isFinite(resolvedLimit) || resolvedLimit <= 0) {
    throw new Error("[market-listing-target-selection] limit must be a positive integer");
  }
  const asOfTimestamp = timestamp(asOf);
  if (asOfTimestamp === null) throw new Error("[market-listing-target-selection] asOf must be a valid timestamp");

  const deduped = new Map();
  for (const target of targets) {
    if (!isEnglishPokemonTarget(target)) continue;
    const releaseAt = timestamp(target?.release_date);
    if (releaseAt !== null && releaseAt > asOfTimestamp) continue;
    const key = targetKey(target);
    if (!key || deduped.has(key)) continue;
    const coverageLane = acquisitionCoverageLaneV1(target, {
      asOf: asOfTimestamp,
      newSetWindowDays,
    });
    deduped.set(key, {
      ...target,
      coverage_lane: coverageLane,
      target_selection_version: MARKET_LISTING_ACQUISITION_TARGET_SELECTION_VERSION,
    });
  }

  return [...deduped.values()]
    .sort((left, right) => {
      const lane = COVERAGE_LANE_RANK[left.coverage_lane] - COVERAGE_LANE_RANK[right.coverage_lane];
      if (lane !== 0) return lane;

      if (left.coverage_lane === "new_release_unqueried" || left.coverage_lane === "unqueried") {
        const release = (timestamp(right.release_date) ?? 0) - (timestamp(left.release_date) ?? 0);
        if (release !== 0) return release;
      } else {
        const freshness = (timestamp(left.last_queried_at) ?? 0) - (timestamp(right.last_queried_at) ?? 0);
        if (freshness !== 0) return freshness;
      }

      const priority = existingPriorityRank(left) - existingPriorityRank(right);
      if (priority !== 0) return priority;
      return text(left.gv_id).localeCompare(text(right.gv_id))
        || text(left.finish_key).localeCompare(text(right.finish_key));
    })
    .slice(0, resolvedLimit);
}

export function coverageLaneCountsV1(targets = []) {
  const counts = {};
  for (const target of targets) {
    const lane = text(target?.coverage_lane) || "unclassified";
    counts[lane] = (counts[lane] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
