export const TCGPLAYER_MARKET_HEALTH_POLICY_V1 =
  "TCGPLAYER_MARKET_HEALTH_POLICY_V1";

function cleanString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function finiteCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

export function evaluateTcgplayerCurrentSourceHealthV1(
  metrics,
  {
    now = new Date(),
    maxSourceAgeHours = 36,
  } = {},
) {
  const latestStatus = cleanString(metrics.latest_source_status);
  const latestMarker = cleanString(metrics.latest_source_marker);
  const completedStatus = cleanString(metrics.completed_source_status);
  const completedMarker = cleanString(metrics.completed_source_marker);
  const completedEvidencePresent =
    completedStatus === "completed" &&
    finiteCount(metrics.completed_source_price_row_count) > 0 &&
    finiteCount(metrics.completed_source_failed_count) === 0;
  const noChangeContinuity =
    latestStatus === "skipped_no_change" &&
    latestMarker !== null &&
    latestMarker === completedMarker &&
    completedEvidencePresent;
  const accepted =
    latestStatus === "completed" || noChangeContinuity;
  const checkedAt = metrics.latest_source_finished_at
    ? new Date(metrics.latest_source_finished_at)
    : null;
  const checkedAtValid =
    checkedAt instanceof Date && Number.isFinite(checkedAt.getTime());
  const sourceAgeHours = checkedAtValid
    ? (now.getTime() - checkedAt.getTime()) / 3_600_000
    : null;
  const findings = [];

  if (!accepted) findings.push("latest_current_source_sync_not_completed");
  if (
    sourceAgeHours === null ||
    sourceAgeHours < 0 ||
    sourceAgeHours > maxSourceAgeHours
  ) {
    findings.push("latest_current_source_sync_stale");
  }

  return {
    policy_version: TCGPLAYER_MARKET_HEALTH_POLICY_V1,
    accepted,
    continuity_mode: noChangeContinuity
      ? "verified_no_change"
      : latestStatus === "completed"
      ? "completed_sync"
      : "unverified",
    source_age_hours:
      sourceAgeHours === null ? null : Number(sourceAgeHours.toFixed(3)),
    effective_source_run_key: noChangeContinuity
      ? metrics.completed_source_run_key
      : metrics.latest_source_run_key,
    effective_source_status: noChangeContinuity
      ? completedStatus
      : latestStatus,
    effective_source_price_row_count: noChangeContinuity
      ? finiteCount(metrics.completed_source_price_row_count)
      : finiteCount(metrics.latest_source_price_row_count),
    findings,
  };
}
