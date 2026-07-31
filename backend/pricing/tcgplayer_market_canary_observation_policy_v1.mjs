export const TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V2 =
  "TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V2";

// Preserve the original export name for callers pinned to the V1 module path.
export const TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1 =
  TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V2;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SOURCE_TERMINAL_FAILURE_STATES = new Set([
  "failed",
  "partial_success",
  "aborted_request_ceiling",
]);
const SOURCE_COMPLETED_STATES = new Set([
  "completed",
  "skipped_no_change",
]);
const PUBLICATION_TERMINAL_FAILURE_STATES = new Set([
  "failed",
  "rolled_back",
]);

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

function reconciliationMismatches(run) {
  return Array.isArray(run?.reconciliation?.mismatches)
    ? run.reconciliation.mismatches
    : [];
}

function runIsExact(run, expectedCount) {
  return (
    integer(run?.selected_count) === expectedCount &&
    integer(run?.mapped_count) === expectedCount &&
    integer(run?.eligible_count) === expectedCount &&
    integer(run?.snapshot_count) === expectedCount &&
    integer(run?.delayed_count) === 0 &&
    integer(run?.suppressed_count) === 0 &&
    integer(run?.quarantined_count) === 0 &&
    integer(run?.excluded_count) === 0
  );
}

function runIsHealthy(run, { expectedCount, expectedCommitSha }) {
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
    runIsExact(run, expectedCount)
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

function scheduledKeys(slot) {
  const date = slot.slice(0, 10);
  const base = `TCGPLAYER-MARKET-SCHEDULE-CANARY-${date}`;
  return {
    source: `${base}-warehouse`,
    publication: `${base}-publication`,
  };
}

function runIdentity(run) {
  return run?.run_key || run?.id || null;
}

function indexUniqueRunsByKey(runs) {
  const byKey = new Map();
  const duplicateKeys = [];
  for (const run of runs) {
    const key = string(run?.run_key);
    if (!key) continue;
    if (byKey.has(key)) duplicateKeys.push(key);
    else byKey.set(key, run);
  }
  return { byKey, duplicateKeys };
}

function evaluateScheduleEvidence({
  slots,
  sourceRuns,
  publicationRuns,
  asOf,
  triggerToleranceMinutes,
  completionGraceMinutes,
  expectedCount,
  expectedCommitSha,
}) {
  const endMs = asOf.getTime();
  const triggerToleranceMs = triggerToleranceMinutes * MINUTE_MS;
  const completionGraceMs = completionGraceMinutes * MINUTE_MS;
  const sourceIndex = indexUniqueRunsByKey(sourceRuns);
  const publicationIndex = indexUniqueRunsByKey(publicationRuns);
  const expectedSourceKeys = new Set();
  const expectedPublicationKeys = new Set();
  const matched = [];
  const pending = [];
  const missing = [];
  const unhealthy = [];

  for (const slot of slots) {
    const slotMs = new Date(slot).getTime();
    const triggerDeadline = slotMs + triggerToleranceMs;
    let completionDeadline = slotMs + completionGraceMs;
    const keys = scheduledKeys(slot);
    expectedSourceKeys.add(keys.source);
    expectedPublicationKeys.add(keys.publication);

    const sourceRun = sourceIndex.byKey.get(keys.source) ?? null;
    const publicationRun =
      publicationIndex.byKey.get(keys.publication) ?? null;
    const sourceStartedMs = new Date(sourceRun?.started_at).getTime();
    const sourceOffsetMinutes = Number.isFinite(sourceStartedMs)
      ? Number(((sourceStartedMs - slotMs) / MINUTE_MS).toFixed(3))
      : null;

    if (!sourceRun) {
      if (endMs <= triggerDeadline) {
        pending.push({
          slot,
          state: "awaiting_source_trigger",
          source_run_key: keys.source,
          publication_run_key: keys.publication,
          trigger_deadline: new Date(triggerDeadline).toISOString(),
          completion_deadline: new Date(completionDeadline).toISOString(),
        });
      } else {
        missing.push({
          slot,
          reason: "source_trigger_missing",
          source_run_key: keys.source,
          publication_run_key: keys.publication,
          trigger_deadline: new Date(triggerDeadline).toISOString(),
        });
      }
      continue;
    }

    if (
      !Number.isFinite(sourceStartedMs) ||
      Math.abs(sourceStartedMs - slotMs) > triggerToleranceMs
    ) {
      unhealthy.push({
        slot,
        reason: "source_trigger_outside_tolerance",
        source_run_key: keys.source,
        source_status: sourceRun.status ?? null,
        source_started_at: sourceRun.started_at ?? null,
        source_offset_minutes: sourceOffsetMinutes,
      });
      continue;
    }
    completionDeadline = sourceStartedMs + completionGraceMs;

    if (string(sourceRun.git_commit_sha) !== expectedCommitSha) {
      unhealthy.push({
        slot,
        reason: "source_commit_mismatch",
        source_run_key: keys.source,
        source_status: sourceRun.status ?? null,
        source_started_at: sourceRun.started_at ?? null,
        source_offset_minutes: sourceOffsetMinutes,
      });
      continue;
    }

    if (SOURCE_TERMINAL_FAILURE_STATES.has(sourceRun.status)) {
      unhealthy.push({
        slot,
        reason: "source_run_failed",
        source_run_key: keys.source,
        source_status: sourceRun.status ?? null,
        source_started_at: sourceRun.started_at ?? null,
        source_offset_minutes: sourceOffsetMinutes,
      });
      continue;
    }

    if (!publicationRun) {
      if (endMs <= completionDeadline) {
        pending.push({
          slot,
          state: SOURCE_COMPLETED_STATES.has(sourceRun.status)
            ? "awaiting_publication"
            : "source_pipeline_in_progress",
          source_run_key: keys.source,
          source_status: sourceRun.status ?? null,
          source_started_at: sourceRun.started_at ?? null,
          source_offset_minutes: sourceOffsetMinutes,
          publication_run_key: keys.publication,
          completion_deadline: new Date(completionDeadline).toISOString(),
        });
      } else {
        missing.push({
          slot,
          reason: "publication_missing_after_completion_grace",
          source_run_key: keys.source,
          source_status: sourceRun.status ?? null,
          publication_run_key: keys.publication,
          completion_deadline: new Date(completionDeadline).toISOString(),
        });
      }
      continue;
    }

    if (string(publicationRun.git_commit_sha) !== expectedCommitSha) {
      unhealthy.push({
        slot,
        reason: "publication_commit_mismatch",
        source_run_key: keys.source,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_state: publicationRun.state ?? null,
      });
      continue;
    }

    if (PUBLICATION_TERMINAL_FAILURE_STATES.has(publicationRun.state)) {
      unhealthy.push({
        slot,
        reason: "publication_run_failed",
        source_run_key: keys.source,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_state: publicationRun.state ?? null,
      });
      continue;
    }

    if (
      runIsHealthy(publicationRun, {
        expectedCount,
        expectedCommitSha,
      })
    ) {
      matched.push({
        slot,
        source_run_key: keys.source,
        source_status: sourceRun.status ?? null,
        source_started_at: sourceRun.started_at ?? null,
        source_offset_minutes: sourceOffsetMinutes,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_started_at: publicationRun.started_at ?? null,
        publication_completed_at: publicationRun.completed_at ?? null,
      });
      continue;
    }

    if (publicationRun.state === "verified") {
      unhealthy.push({
        slot,
        reason: "publication_verified_but_not_healthy",
        source_run_key: keys.source,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_state: publicationRun.state,
      });
      continue;
    }

    if (endMs <= completionDeadline) {
      pending.push({
        slot,
        state: "publication_in_progress",
        source_run_key: keys.source,
        source_status: sourceRun.status ?? null,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_state: publicationRun.state ?? null,
        completion_deadline: new Date(completionDeadline).toISOString(),
      });
    } else {
      unhealthy.push({
        slot,
        reason: "publication_not_healthy_after_completion_grace",
        source_run_key: keys.source,
        publication_run_id: publicationRun.id ?? null,
        publication_run_key: keys.publication,
        publication_state: publicationRun.state ?? null,
        completion_deadline: new Date(completionDeadline).toISOString(),
      });
    }
  }

  const unmatchedSourceRuns = sourceRuns.filter(
    (run) => !expectedSourceKeys.has(string(run?.run_key)),
  );
  const unmatchedPublicationRuns = publicationRuns.filter(
    (run) => !expectedPublicationKeys.has(string(run?.run_key)),
  );

  return {
    matched,
    pending,
    missing,
    unhealthy,
    unmatchedSourceRuns,
    unmatchedPublicationRuns,
    duplicateSourceKeys: sourceIndex.duplicateKeys,
    duplicatePublicationKeys: publicationIndex.duplicateKeys,
  };
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
  expectedCommitSha,
  activationRun,
  scheduledSourceRuns = [],
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
  if (!Number.isInteger(expectedCount) || expectedCount < 1) {
    throw new Error("expectedCount must be a positive integer");
  }
  if (
    !Number.isFinite(scheduleToleranceMinutes) ||
    scheduleToleranceMinutes < 1
  ) {
    throw new Error("scheduleToleranceMinutes must be positive");
  }
  if (
    !Number.isFinite(scheduleCompletionGraceMinutes) ||
    scheduleCompletionGraceMinutes < scheduleToleranceMinutes
  ) {
    throw new Error(
      "scheduleCompletionGraceMinutes must be at least scheduleToleranceMinutes",
    );
  }

  const requiredEnd = new Date(start.getTime() + requiredHours * HOUR_MS);
  const observationHours = Math.max(
    0,
    (end.getTime() - start.getTime()) / HOUR_MS,
  );
  const elapsed = end >= requiredEnd;
  const slotsThrough = end < requiredEnd ? end : requiredEnd;
  const expectedSlots = expectedTcgplayerMarketScheduleSlotsV1({
    windowStart: start,
    through: slotsThrough,
    hourUtc: scheduleHourUtc,
    minuteUtc: scheduleMinuteUtc,
  });

  const sourceRuns = scheduledSourceRuns.filter((run) => {
    const startedAt = new Date(run?.started_at).getTime();
    return Number.isFinite(startedAt) && startedAt > start.getTime();
  });
  const publicationRuns = scheduledRuns.filter((run) => {
    const startedAt = new Date(run?.started_at).getTime();
    return Number.isFinite(startedAt) && startedAt > start.getTime();
  });
  const scheduleResult = evaluateScheduleEvidence({
    slots: expectedSlots,
    sourceRuns,
    publicationRuns,
    asOf: end,
    triggerToleranceMinutes: scheduleToleranceMinutes,
    completionGraceMinutes: scheduleCompletionGraceMinutes,
    expectedCount,
    expectedCommitSha: commitSha,
  });
  const findings = [];

  if (!activationRun) {
    findings.push("activation_run_missing");
  } else if (
    !runIsHealthy(activationRun, {
      expectedCount,
      expectedCommitSha: commitSha,
    })
  ) {
    findings.push("activation_run_not_exact_and_healthy");
  }

  if (scheduleResult.unhealthy.length) {
    findings.push("scheduled_run_not_exact_and_healthy");
  }
  if (scheduleResult.missing.length) {
    findings.push("expected_schedule_slot_missing");
  }
  if (
    scheduleResult.unmatchedSourceRuns.length ||
    scheduleResult.unmatchedPublicationRuns.length
  ) {
    findings.push("unexpected_extra_canary_run");
  }
  if (
    scheduleResult.duplicateSourceKeys.length ||
    scheduleResult.duplicatePublicationKeys.length
  ) {
    findings.push("duplicate_scheduled_run_key");
  }
  if (terminalAlerts.length) findings.push("terminal_operations_alert_in_window");

  if (integer(current.exact_price_count) !== expectedCount) {
    findings.push("current_exact_price_count_mismatch");
  }
  if (integer(current.positive_usd_count) !== expectedCount) {
    findings.push("current_positive_usd_count_mismatch");
  }
  if (integer(current.missing_provenance_count) !== 0) {
    findings.push("current_price_missing_provenance");
  }
  if (integer(current.stale_price_count) !== 0) {
    findings.push("stale_current_price_visible");
  }
  if (integer(current.broken_trace_count) !== 0) {
    findings.push("broken_source_to_publication_trace");
  }

  const healthyRuns = [activationRun, ...publicationRuns]
    .filter(Boolean)
    .filter((run) =>
      runIsHealthy(run, {
        expectedCount,
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
  if (
    latestHealthyRun &&
    string(current.current_publication_run_id) !== string(latestHealthyRun.id)
  ) {
    findings.push("current_publication_pointer_mismatch");
  }

  if (sourceHealth.status !== "healthy") {
    findings.push("current_source_health_not_healthy");
  }
  if (
    sourceHealth.source_continuity_mode !== "verified_no_change" &&
    sourceHealth.source_continuity_mode !== "completed_sync"
  ) {
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
  if (
    !rollback.service_execute_granted ||
    !rollback.prior_publication_available
  ) {
    findings.push("publication_rollback_not_available");
  }

  const status = findings.length
    ? "failed"
    : elapsed && scheduleResult.pending.length === 0
      ? "passed"
      : "observing";

  return {
    policy_version: TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V2,
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
      trigger_tolerance_minutes: scheduleToleranceMinutes,
      completion_grace_minutes: scheduleCompletionGraceMinutes,
      expected_slots: expectedSlots,
      matched_slots: scheduleResult.matched,
      pending_slots: scheduleResult.pending,
      missing_slots: scheduleResult.missing,
      unhealthy_slots: scheduleResult.unhealthy,
      unmatched_source_run_keys: scheduleResult.unmatchedSourceRuns.map(
        runIdentity,
      ),
      unmatched_publication_run_keys:
        scheduleResult.unmatchedPublicationRuns.map(runIdentity),
      duplicate_source_run_keys: scheduleResult.duplicateSourceKeys,
      duplicate_publication_run_keys:
        scheduleResult.duplicatePublicationKeys,
    },
    run_evidence: {
      expected_commit_sha: commitSha,
      expected_count: expectedCount,
      activation_run_key: activationRun?.run_key ?? null,
      scheduled_source_run_count: sourceRuns.length,
      scheduled_publication_run_count: publicationRuns.length,
      unhealthy_run_keys: scheduleResult.unhealthy.map(
        (entry) => entry.publication_run_key || entry.source_run_key,
      ),
    },
    terminal_alert_count: terminalAlerts.length,
    current,
    source_health: sourceHealth,
    access,
    rollback,
    findings,
  };
}
