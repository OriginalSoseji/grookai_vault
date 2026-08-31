export const TCGCSV_CACHED_SOURCE_CONTINUITY_V1 =
  "TCGCSV_CACHED_SOURCE_CONTINUITY_V1";

function finiteCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function evaluateTcgcsvCachedSourceContinuityV1(
  sourceRun,
  { now = new Date(), maxAgeHours = 36 } = {},
) {
  const finishedAt = sourceRun?.finished_at ? new Date(sourceRun.finished_at) : null;
  const finishedAtValid = finishedAt && Number.isFinite(finishedAt.getTime());
  const ageHours = finishedAtValid
    ? (now.getTime() - finishedAt.getTime()) / 3_600_000
    : null;
  const findings = [];
  if (!sourceRun) findings.push("completed_cached_source_missing");
  if (sourceRun && sourceRun.status !== "completed") {
    findings.push("cached_source_not_completed");
  }
  if (sourceRun && finiteCount(sourceRun.failed_count) !== 0) {
    findings.push("cached_source_contains_failures");
  }
  if (sourceRun && finiteCount(sourceRun.price_row_count) < 1) {
    findings.push("cached_source_has_no_price_evidence");
  }
  if (ageHours === null || ageHours < 0 || ageHours > maxAgeHours) {
    findings.push("cached_source_outside_freshness_window");
  }

  return {
    policy_version: TCGCSV_CACHED_SOURCE_CONTINUITY_V1,
    accepted: findings.length === 0,
    continuity_mode: findings.length === 0
      ? "degraded_cached_source"
      : "blocked_stale_or_missing_source",
    source_run_key: sourceRun?.run_key ?? null,
    source_marker: sourceRun?.source_marker ?? null,
    source_finished_at: sourceRun?.finished_at ?? null,
    source_age_hours: ageHours === null ? null : Number(ageHours.toFixed(3)),
    source_price_row_count: finiteCount(sourceRun?.price_row_count),
    max_source_age_hours: maxAgeHours,
    findings,
  };
}
