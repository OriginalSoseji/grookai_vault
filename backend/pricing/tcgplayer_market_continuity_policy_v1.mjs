export const TCGPLAYER_MARKET_CONTINUITY_POLICY_V1 =
  "TCGPLAYER_MARKET_CONTINUITY_POLICY_V1";

const ACTIVE_RUN_STATES = new Set(["running", "qualified", "reconciled"]);

function ageHours(value, now) {
  const timestamp = new Date(value ?? "").getTime();
  if (!Number.isFinite(timestamp)) return null;
  return (now.getTime() - timestamp) / 3_600_000;
}

export function evaluateTcgplayerMarketContinuityV1(input, {
  now = new Date(),
  freshnessHours = 36,
  refreshAtHours = 26,
  failedRunRecoveryAtHours = 18,
  activeRunGraceHours = 6,
  expectedCommitSha = null,
} = {}) {
  const findings = [];
  const pointerPresent = input?.publication_set_id != null && input?.run_id != null;
  const snapshotCount = Number(input?.snapshot_count ?? 0);
  const sourceAgeHours = ageHours(input?.source_sync_finished_at, now);
  const latestRunAgeHours = ageHours(input?.latest_run_created_at, now);
  const latestRunState = String(input?.latest_run_state ?? "");
  const latestRunFailed = latestRunState === "failed";
  const recentRunInProgress =
    ACTIVE_RUN_STATES.has(latestRunState) &&
    latestRunAgeHours !== null &&
    latestRunAgeHours >= 0 &&
    latestRunAgeHours < activeRunGraceHours;

  if (!pointerPresent) findings.push("current_publication_pointer_missing");
  if (snapshotCount < 1) findings.push("current_publication_snapshots_missing");
  if (sourceAgeHours === null) findings.push("current_source_timestamp_missing");
  if (sourceAgeHours !== null && sourceAgeHours < -0.1) {
    findings.push("current_source_timestamp_in_future");
  }
  if (sourceAgeHours !== null && sourceAgeHours >= freshnessHours) {
    findings.push("current_publication_expired");
  } else if (sourceAgeHours !== null && sourceAgeHours >= refreshAtHours) {
    findings.push("current_publication_refresh_due");
  }
  if (latestRunFailed) findings.push("latest_production_run_failed");
  if (
    expectedCommitSha &&
    input?.latest_run_commit_sha &&
    input.latest_run_commit_sha !== expectedCommitSha
  ) {
    findings.push("production_runner_commit_drift");
  }
  if (recentRunInProgress) findings.push("production_refresh_in_progress");

  const missingOrExpired =
    !pointerPresent ||
    snapshotCount < 1 ||
    sourceAgeHours === null ||
    sourceAgeHours < -0.1 ||
    sourceAgeHours >= freshnessHours;
  const proactiveRefreshDue =
    sourceAgeHours !== null && sourceAgeHours >= refreshAtHours;
  const failedRecoveryDue =
    latestRunFailed &&
    sourceAgeHours !== null &&
    sourceAgeHours >= failedRunRecoveryAtHours;
  const refreshRequired =
    !recentRunInProgress &&
    (missingOrExpired || proactiveRefreshDue || failedRecoveryDue);

  return {
    policy_version: TCGPLAYER_MARKET_CONTINUITY_POLICY_V1,
    status: refreshRequired
      ? "refresh_required"
      : recentRunInProgress
        ? "refresh_in_progress"
        : "healthy",
    severity: missingOrExpired ? "critical" : refreshRequired ? "warning" : "ok",
    refresh_required: refreshRequired,
    source_age_hours:
      sourceAgeHours === null ? null : Number(sourceAgeHours.toFixed(3)),
    latest_run_age_hours:
      latestRunAgeHours === null ? null : Number(latestRunAgeHours.toFixed(3)),
    thresholds: {
      freshness_hours: freshnessHours,
      refresh_at_hours: refreshAtHours,
      failed_run_recovery_at_hours: failedRunRecoveryAtHours,
      active_run_grace_hours: activeRunGraceHours,
    },
    findings,
  };
}
