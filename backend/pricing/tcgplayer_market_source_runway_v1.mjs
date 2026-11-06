export const TCGPLAYER_MARKET_MINIMUM_SOURCE_RUNWAY_HOURS_V1 = 4;

export function evaluateTcgplayerMarketSourceRunwayV1(sourceRun, {
  now = new Date(),
  freshnessHours,
  minimumRunwayHours = TCGPLAYER_MARKET_MINIMUM_SOURCE_RUNWAY_HOURS_V1,
} = {}) {
  const evaluatedAt = now instanceof Date ? now : new Date(now);
  const finishedAt = new Date(sourceRun?.finished_at ?? "");
  if (!Number.isFinite(evaluatedAt.getTime()) ||
      !Number.isFinite(finishedAt.getTime())) {
    throw new Error("source_freshness_runway_invalid_timestamp");
  }
  if (!Number.isFinite(freshnessHours) || freshnessHours <= 0 ||
      !Number.isFinite(minimumRunwayHours) || minimumRunwayHours <= 0 ||
      minimumRunwayHours >= freshnessHours) {
    throw new Error("source_freshness_runway_invalid_policy");
  }

  const sourceAgeHours = (evaluatedAt.getTime() - finishedAt.getTime()) / 3_600_000;
  const remainingHours = freshnessHours - sourceAgeHours;
  return {
    evaluated_at: evaluatedAt.toISOString(),
    source_finished_at: finishedAt.toISOString(),
    source_age_hours: sourceAgeHours,
    freshness_hours: freshnessHours,
    minimum_runway_hours: minimumRunwayHours,
    remaining_hours: remainingHours,
    valid: sourceAgeHours >= 0 && remainingHours >= minimumRunwayHours,
  };
}

export function assertTcgplayerMarketSourceRunwayV1(sourceRun, options) {
  const result = evaluateTcgplayerMarketSourceRunwayV1(sourceRun, options);
  if (!result.valid) {
    throw new Error(
      `source_freshness_runway_insufficient source_age_hours=${result.source_age_hours.toFixed(3)} ` +
      `remaining_hours=${result.remaining_hours.toFixed(3)} ` +
      `minimum_runway_hours=${result.minimum_runway_hours}; rerun current warehouse sync`,
    );
  }
  return result;
}
