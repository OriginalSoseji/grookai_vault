export const TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1 =
  "TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function instant(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid timestamp`);
  }
  return date;
}

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function string(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timestamp(value) {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function expectedSourceRunKey(publicationRunKey) {
  const runKey = string(publicationRunKey);
  return runKey.endsWith("-publication")
    ? `${runKey.slice(0, -"-publication".length)}-warehouse`
    : "";
}

function linkedSourceIsHealthy(run, expectedCommitSha) {
  const sourceStartedAt = timestamp(run?.schedule_source_started_at);
  const sourceFinishedAt = timestamp(run?.schedule_source_finished_at);
  const publicationStartedAt = timestamp(run?.started_at);
  const publicationCompletedAt = timestamp(run?.completed_at);

  return (
    string(run?.source_sync_run_id) !== "" &&
    string(run?.source_sync_run_id) === string(run?.schedule_source_run_id) &&
    string(run?.schedule_source_run_key) ===
      expectedSourceRunKey(run?.run_key) &&
    run?.schedule_source_status === "completed" &&
    integer(run?.schedule_source_failed_count) === 0 &&
    !run?.schedule_source_error &&
    string(run?.schedule_source_commit_sha) === expectedCommitSha &&
    sourceStartedAt !== null &&
    sourceFinishedAt !== null &&
    publicationStartedAt !== null &&
    publicationCompletedAt !== null &&
    sourceStartedAt <= sourceFinishedAt &&
    sourceFinishedAt <= publicationStartedAt &&
    publicationStartedAt <= publicationCompletedAt
  );
}

function reconciliationMismatches(run) {
  return Array.isArray(run?.reconciliation?.mismatches)
    ? run.reconciliation.mismatches
    : [];
}

function canaryResolvedCount(run, expectedCount, maxSourceMissingCount) {
  const reconciliation = run?.reconciliation;
  const resolvedCount = integer(reconciliation?.canary_resolved_count);
  const missingCount = integer(reconciliation?.canary_source_missing_count);
  if (
    integer(reconciliation?.canary_expected_count) !== expectedCount ||
    resolvedCount === null ||
    missingCount === null ||
    missingCount < 0 ||
    missingCount > maxSourceMissingCount ||
    resolvedCount + missingCount !== expectedCount ||
    reconciliation?.canary_source_coverage_reconciled !== true
  ) {
    return null;
  }
  return resolvedCount;
}

function runIsExact(run, expectedCount, maxSourceMissingCount) {
  const resolvedCount = canaryResolvedCount(
    run,
    expectedCount,
    maxSourceMissingCount,
  );
  return (
    resolvedCount !== null &&
    integer(run?.selected_count) === resolvedCount &&
    integer(run?.mapped_count) === resolvedCount &&
    integer(run?.eligible_count) === resolvedCount &&
    integer(run?.snapshot_count) === resolvedCount &&
    integer(run?.delayed_count) === 0 &&
    integer(run?.suppressed_count) === 0 &&
    integer(run?.quarantined_count) === 0 &&
    integer(run?.excluded_count) === 0
  );
}

function runIsHealthy(
  run,
  { expectedCount, maxSourceMissingCount, expectedCommitSha },
) {
  return (
    run?.run_mode === "canary" &&
    run?.state === "verified" &&
    run?.reconciliation_state === "reconciled" &&
    string(run?.git_commit_sha) === expectedCommitSha &&
    integer(run?.required_phase_count) ===
      integer(run?.succeeded_phase_count) &&
    !run?.failed_at &&
    !run?.error &&
    reconciliationMismatches(run).length === 0 &&
    linkedSourceIsHealthy(run, expectedCommitSha) &&
    runIsExact(run, expectedCount, maxSourceMissingCount)
  );
}

export function expectedTcgplayerMarketScheduleSlotsV1({
  windowStart,
  through,
  hourUtc = 8,
  minuteUtc = 15,
}) {
  const start = instant(windowStart, "windowStart");
  const end = instant(through, "through");
  if (end < start) return [];

  const cursor = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      hourUtc,
      minuteUtc,
      0,
      0,
    ),
  );
  if (cursor <= start) cursor.setUTCDate(cursor.getUTCDate() + 1);

  const slots = [];
  while (cursor <= end) {
    slots.push(cursor.toISOString());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
}

function matchRunsToSlots({
  slots,
  runs,
  scheduleToleranceMinutes,
  scheduleCompletionGraceMinutes,
}) {
  const toleranceMs = scheduleToleranceMinutes * MINUTE_MS;
  const completionGraceMs = scheduleCompletionGraceMinutes * MINUTE_MS;
  const available = [...runs];
  const matches = [];
  const missing = [];

  for (const slot of slots) {
    const slotMs = new Date(slot).getTime();
    const slotDate = slot.slice(0, 10);
    const publicationRunKey =
      `TCGPLAYER-MARKET-SCHEDULE-CANARY-${slotDate}-publication`;
    const sourceRunKey =
      `TCGPLAYER-MARKET-SCHEDULE-CANARY-${slotDate}-warehouse`;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < available.length; index += 1) {
      const run = available[index];
      const sourceStartedMs = timestamp(run?.schedule_source_started_at);
      const publicationCompletedMs = timestamp(run?.completed_at);
      const distance = Math.abs(sourceStartedMs - slotMs);
      if (
        string(run?.run_key) === publicationRunKey &&
        string(run?.schedule_source_run_key) === sourceRunKey &&
        sourceStartedMs !== null &&
        publicationCompletedMs !== null &&
        distance <= toleranceMs &&
        publicationCompletedMs <= slotMs + completionGraceMs &&
        distance < bestDistance
      ) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
    if (bestIndex === -1) {
      missing.push(slot);
      continue;
    }
    const [run] = available.splice(bestIndex, 1);
    matches.push({
      slot,
      source_run_id: run.schedule_source_run_id,
      source_run_key: run.schedule_source_run_key,
      source_started_at: run.schedule_source_started_at,
      source_finished_at: run.schedule_source_finished_at,
      publication_run_id: run.id,
      publication_run_key: run.run_key,
      publication_started_at: run.started_at,
      publication_completed_at: run.completed_at,
      offset_minutes: Number((bestDistance / MINUTE_MS).toFixed(3)),
      source_offset_minutes: Number(
        (
          (timestamp(run.schedule_source_started_at) - slotMs) /
          MINUTE_MS
        ).toFixed(3),
      ),
      completion_offset_minutes: Number(
        ((timestamp(run.completed_at) - slotMs) / MINUTE_MS).toFixed(3),
      ),
    });
  }

  return { matches, missing, unmatchedRuns: available };
}

export function evaluateTcgplayerMarketCanaryObservationV1({
  windowStart,
  asOf,
  requiredHours = 72,
  scheduleHourUtc = 8,
  scheduleMinuteUtc = 15,
  scheduleToleranceMinutes = 90,
  scheduleCompletionGraceMinutes = 480,
  expectedCount = 100,
  maxSourceMissingCount = 0,
  expectedCommitSha,
  activationRun,
  scheduledRuns = [],
  terminalAlerts = [],
  current = {},
  sourceHealth = {},
  access = {},
  rollback = {},
}) {
  const start = instant(windowStart, "windowStart");
  const end = instant(asOf, "asOf");
  const commitSha = string(expectedCommitSha);
  if (!commitSha) throw new Error("expectedCommitSha is required");
  if (!Number.isFinite(requiredHours) || requiredHours <= 0) {
    throw new Error("requiredHours must be positive");
  }
  if (
    !Number.isFinite(scheduleCompletionGraceMinutes) ||
    scheduleCompletionGraceMinutes <= 0
  ) {
    throw new Error("scheduleCompletionGraceMinutes must be positive");
  }
  if (!Number.isInteger(expectedCount) || expectedCount < 1) {
    throw new Error("expectedCount must be a positive integer");
  }
  if (
    !Number.isInteger(maxSourceMissingCount) ||
    maxSourceMissingCount < 0 ||
    maxSourceMissingCount >= expectedCount
  ) {
    throw new Error(
      "maxSourceMissingCount must be a non-negative integer below expectedCount",
    );
  }

  const requiredEnd = new Date(start.getTime() + requiredHours * HOUR_MS);
  const observationHours = Math.max(0, (end.getTime() - start.getTime()) / HOUR_MS);
  const elapsed = end >= requiredEnd;
  const slotsThrough = end < requiredEnd ? end : requiredEnd;
  const expectedSlots = expectedTcgplayerMarketScheduleSlotsV1({
    windowStart: start,
    through: slotsThrough,
    hourUtc: scheduleHourUtc,
    minuteUtc: scheduleMinuteUtc,
  });

  const runs = scheduledRuns.filter((run) => {
    const startedAt = timestamp(run?.schedule_source_started_at);
    return Number.isFinite(startedAt) && startedAt > start.getTime();
  });
  const slotResult = matchRunsToSlots({
    slots: expectedSlots,
    runs,
    scheduleToleranceMinutes,
    scheduleCompletionGraceMinutes,
  });
  const findings = [];

  if (!activationRun) {
    findings.push("activation_run_missing");
  } else if (
    !runIsHealthy(activationRun, {
      expectedCount,
      maxSourceMissingCount,
      expectedCommitSha: commitSha,
    })
  ) {
    findings.push("activation_run_not_exact_and_healthy");
  }

  const unhealthyRuns = runs
    .filter(
      (run) =>
        !runIsHealthy(run, {
          expectedCount,
          maxSourceMissingCount,
          expectedCommitSha: commitSha,
        }),
    )
    .map((run) => run.run_key || run.id);
  if (unhealthyRuns.length) findings.push("scheduled_run_not_exact_and_healthy");
  if (slotResult.missing.length) findings.push("expected_schedule_slot_missing");
  if (slotResult.unmatchedRuns.length) {
    findings.push("unexpected_extra_canary_run");
  }
  if (terminalAlerts.length) findings.push("terminal_operations_alert_in_window");

  if (integer(current.missing_provenance_count) !== 0) {
    findings.push("current_price_missing_provenance");
  }
  if (integer(current.stale_price_count) !== 0) {
    findings.push("stale_current_price_visible");
  }
  if (integer(current.broken_trace_count) !== 0) {
    findings.push("broken_source_to_publication_trace");
  }

  const healthyRuns = [activationRun, ...runs].filter(Boolean).filter((run) =>
    runIsHealthy(run, {
      expectedCount,
      maxSourceMissingCount,
      expectedCommitSha: commitSha,
    }),
  );
  const latestHealthyRun = healthyRuns
    .slice()
    .sort(
      (left, right) =>
        new Date(right.completed_at).getTime() -
        new Date(left.completed_at).getTime(),
    )[0];
  const latestResolvedCount = latestHealthyRun
    ? canaryResolvedCount(
        latestHealthyRun,
        expectedCount,
        maxSourceMissingCount,
      )
    : null;
  if (
    latestResolvedCount !== null &&
    integer(current.exact_price_count) !== latestResolvedCount
  ) {
    findings.push("current_exact_price_count_mismatch");
  }
  if (
    latestResolvedCount !== null &&
    integer(current.positive_usd_count) !== latestResolvedCount
  ) {
    findings.push("current_positive_usd_count_mismatch");
  }
  if (
    latestHealthyRun &&
    string(current.current_publication_run_id) !== string(latestHealthyRun.id)
  ) {
    findings.push("current_publication_pointer_mismatch");
  }

  if (sourceHealth.status !== "healthy") {
    findings.push("current_source_health_not_healthy");
  }
  if (sourceHealth.source_continuity_mode !== "verified_no_change" &&
      sourceHealth.source_continuity_mode !== "completed_sync") {
    findings.push("current_source_continuity_unproven");
  }
  if (
    !Number.isFinite(Number(sourceHealth.source_age_hours)) ||
    Number(sourceHealth.source_age_hours) > 36
  ) {
    findings.push("current_source_evidence_stale");
  }

  if (!access.authenticated_execute_granted) {
    findings.push("authenticated_pricing_execute_missing");
  }
  if (integer(access.authenticated_read_count) < 1) {
    findings.push("authenticated_pricing_runtime_read_empty");
  }
  if (access.anonymous_execute_granted) {
    findings.push("anonymous_pricing_execute_unexpectedly_granted");
  }
  if (!access.anonymous_runtime_denied) {
    findings.push("anonymous_pricing_runtime_read_not_denied");
  }
  if (!rollback.service_execute_granted || !rollback.prior_publication_available) {
    findings.push("publication_rollback_not_available");
  }

  const status = findings.length
    ? "failed"
    : elapsed
      ? "passed"
      : "observing";

  return {
    policy_version: TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1,
    status,
    window: {
      started_at: start.toISOString(),
      required_end_at: requiredEnd.toISOString(),
      as_of: end.toISOString(),
      required_hours: requiredHours,
      observed_hours: Number(observationHours.toFixed(3)),
      elapsed,
    },
    schedule: {
      hour_utc: scheduleHourUtc,
      minute_utc: scheduleMinuteUtc,
      tolerance_minutes: scheduleToleranceMinutes,
      completion_grace_minutes: scheduleCompletionGraceMinutes,
      expected_slots: expectedSlots,
      matched_slots: slotResult.matches,
      missing_slots: slotResult.missing,
      unmatched_run_keys: slotResult.unmatchedRuns.map(
        (run) => run.run_key || run.id,
      ),
    },
    run_evidence: {
      expected_commit_sha: commitSha,
      expected_count: expectedCount,
      max_source_missing_count: maxSourceMissingCount,
      latest_resolved_count: latestResolvedCount,
      activation_run_key: activationRun?.run_key ?? null,
      scheduled_run_count: runs.length,
      unhealthy_run_keys: unhealthyRuns,
    },
    terminal_alert_count: terminalAlerts.length,
    current,
    source_health: sourceHealth,
    access,
    rollback,
    findings,
  };
}
