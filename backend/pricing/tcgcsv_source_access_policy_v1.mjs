export const TCGCSV_SOURCE_ACCESS_POLICY_V1 =
  "TCGCSV_SOURCE_ACCESS_POLICY_V1";

export const TCGCSV_MINIMUM_REQUEST_DELAY_MS_V1 = 250;
export const TCGCSV_CURRENT_SYNC_MINIMUM_INTERVAL_HOURS_V1 = 24;

function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateTcgcsvCurrentSyncAccessV1(
  previousAttempt,
  {
    now = new Date(),
    minimumIntervalHours = TCGCSV_CURRENT_SYNC_MINIMUM_INTERVAL_HOURS_V1,
  } = {},
) {
  const attemptedAt = timestamp(
    previousAttempt?.attempted_at
      ?? previousAttempt?.finished_at
      ?? previousAttempt?.started_at
      ?? previousAttempt?.created_at,
  );
  if (attemptedAt === null) {
    return {
      policy_version: TCGCSV_SOURCE_ACCESS_POLICY_V1,
      allowed: true,
      reason: "no_prior_network_attempt",
      wait_ms: 0,
      previous_attempt_at: null,
    };
  }

  const minimumIntervalMs = minimumIntervalHours * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now.getTime() - attemptedAt);
  const waitMs = Math.max(0, minimumIntervalMs - elapsedMs);
  return {
    policy_version: TCGCSV_SOURCE_ACCESS_POLICY_V1,
    allowed: waitMs === 0,
    reason: waitMs === 0
      ? "minimum_interval_elapsed"
      : "provider_daily_cadence_active",
    wait_ms: waitMs,
    previous_attempt_at: new Date(attemptedAt).toISOString(),
  };
}

export function assertTcgcsvRequestDelayV1(requestDelayMs) {
  if (
    !Number.isInteger(requestDelayMs)
    || requestDelayMs < TCGCSV_MINIMUM_REQUEST_DELAY_MS_V1
  ) {
    throw new Error(
      `TCGCSV request delay must be at least ${TCGCSV_MINIMUM_REQUEST_DELAY_MS_V1}ms`,
    );
  }
  return requestDelayMs;
}
