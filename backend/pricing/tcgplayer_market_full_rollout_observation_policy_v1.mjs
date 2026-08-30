import {
  TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
  TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1,
} from "./tcgplayer_market_coverage_policy_v1.mjs";
import {
  TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1,
  TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1,
} from "./tcgplayer_market_performance_policy_v1.mjs";
import {
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
} from "./tcgplayer_market_publication_policy_v1.mjs";

export const TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1 =
  "TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1_1";

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

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function string(value) {
  return typeof value === "string" ? value.trim() : "";
}

function reconciliationMismatches(run) {
  return Array.isArray(run?.reconciliation?.mismatches)
    ? run.reconciliation.mismatches
    : [];
}

function runCountsReconcile(run) {
  const selected = integer(run?.selected_count);
  const mapped = integer(run?.mapped_count);
  const eligible = integer(run?.eligible_count);
  const snapshot = integer(run?.snapshot_count);
  const delayed = integer(run?.delayed_count);
  const suppressed = integer(run?.suppressed_count);
  const quarantined = integer(run?.quarantined_count);
  const excluded = integer(run?.excluded_count);
  const reconciliation = run?.reconciliation ?? {};

  if (
    selected === null ||
    selected < 1 ||
    mapped === null ||
    mapped < eligible ||
    mapped > selected ||
    eligible === null ||
    eligible < 1 ||
    snapshot !== eligible ||
    delayed === null ||
    suppressed === null ||
    quarantined === null ||
    excluded === null ||
    selected !== eligible + delayed + suppressed + quarantined + excluded
  ) {
    return false;
  }

  const expectedReconciliation = {
    selected_count: selected,
    mapped_count: mapped,
    eligible_count: eligible,
    snapshot_count: snapshot,
    delayed_count: delayed,
    suppressed_count: suppressed,
    quarantined_count: quarantined,
    excluded_count: excluded,
    decision_count: selected,
    traced_snapshot_count: snapshot,
  };
  return Object.entries(expectedReconciliation).every(
    ([key, value]) => integer(reconciliation[key]) === value,
  );
}

function runIsHealthy(run, expectedCommitSha) {
  return (
    run?.run_mode === "production" &&
    run?.state === "verified" &&
    run?.reconciliation_state === "reconciled" &&
    string(run?.git_commit_sha) === expectedCommitSha &&
    string(run?.policy_version) === TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3 &&
    integer(run?.required_phase_count) > 0 &&
    integer(run?.required_phase_count) ===
      integer(run?.succeeded_phase_count) &&
    !run?.failed_at &&
    !run?.error &&
    reconciliationMismatches(run).length === 0 &&
    runCountsReconcile(run)
  );
}

export function expectedTcgplayerMarketFullRolloutSlotsV1({
  windowStart,
  requiredCycles = 7,
  hourUtc = 8,
  minuteUtc = 15,
}) {
  const start = instant(windowStart, "windowStart");
  if (!Number.isInteger(requiredCycles) || requiredCycles < 1) {
    throw new Error("requiredCycles must be a positive integer");
  }
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
  while (slots.length < requiredCycles) {
    slots.push(cursor.toISOString());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
}

function matchRunsToSlots({ slots, runs, scheduleToleranceMinutes }) {
  const toleranceMs = scheduleToleranceMinutes * MINUTE_MS;
  const available = [...runs];
  const matches = [];

  for (const slot of slots) {
    const slotMs = new Date(slot).getTime();
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < available.length; index += 1) {
      const startedMs = new Date(available[index]?.started_at).getTime();
      const distance = Math.abs(startedMs - slotMs);
      if (
        Number.isFinite(startedMs) &&
        distance <= toleranceMs &&
        distance < bestDistance
      ) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
    if (bestIndex === -1) continue;
    const [run] = available.splice(bestIndex, 1);
    matches.push({
      slot,
      run_id: run.id,
      run_key: run.run_key,
      started_at: run.started_at,
      completed_at: run.completed_at,
      offset_minutes: Number((bestDistance / MINUTE_MS).toFixed(3)),
    });
  }
  return { matches, unmatchedRuns: available };
}

function evaluateCoverage(coverage, findings) {
  if (
    coverage?.policy_version !== TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2 ||
    coverage?.status !== "passed" ||
    coverage?.coverage_status !== "passed" ||
    coverage?.current_publication_scope_status !== "passed" ||
    number(coverage?.coverage_percent) <
      TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1 ||
    integer(coverage?.counts?.unclassified_gap_rows) !== 0 ||
    !/^[a-f0-9]{40}$/.test(string(coverage?.producing_commit_sha))
  ) {
    findings.push("fresh_v1_2_coverage_gate_not_passed");
  }
}

function evaluatePerformance(performance, findings) {
  const cases = Array.isArray(performance?.cases) ? performance.cases : [];
  const targetP95Ms = number(performance?.target_p95_ms);
  const casesPass =
    cases.length > 0 &&
    cases.every(
      (item) =>
        item?.status === "passed" &&
        integer(item?.error_count) === 0 &&
        integer(item?.row_count_mismatch_count) === 0 &&
        number(item?.latency_ms?.p95) !== null &&
        number(item?.latency_ms?.p95) <=
          TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1,
    );
  if (
    performance?.policy_version !== TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1 ||
    performance?.status !== "passed" ||
    targetP95Ms === null ||
    targetP95Ms > TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1 ||
    integer(performance?.request_error_count) !== 0 ||
    integer(performance?.row_count_mismatch_count) !== 0 ||
    !/^[a-f0-9]{40}$/.test(string(performance?.producing_commit_sha)) ||
    !casesPass
  ) {
    findings.push("fresh_read_performance_gate_not_passed");
  }
}

export function evaluateTcgplayerMarketFullRolloutObservationV1({
  windowStart,
  asOf,
  requiredCycles = 7,
  scheduleHourUtc = 8,
  scheduleMinuteUtc = 15,
  scheduleToleranceMinutes = 90,
  expectedCommitSha,
  expectedCoverageCommitSha = expectedCommitSha,
  expectedPerformanceCommitSha = expectedCommitSha,
  activationRun,
  scheduledRuns = [],
  terminalAlerts = [],
  current = {},
  sourceHealth = {},
  access = {},
  rollback = {},
  coverage = {},
  performance = {},
}) {
  const start = instant(windowStart, "windowStart");
  const end = instant(asOf, "asOf");
  const commitSha = string(expectedCommitSha).toLowerCase();
  const coverageCommitSha = string(expectedCoverageCommitSha).toLowerCase();
  const performanceCommitSha = string(
    expectedPerformanceCommitSha,
  ).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(commitSha)) {
    throw new Error("expectedCommitSha must be a full lowercase commit SHA");
  }
  if (!/^[a-f0-9]{40}$/.test(coverageCommitSha)) {
    throw new Error(
      "expectedCoverageCommitSha must be a full lowercase commit SHA",
    );
  }
  if (!/^[a-f0-9]{40}$/.test(performanceCommitSha)) {
    throw new Error(
      "expectedPerformanceCommitSha must be a full lowercase commit SHA",
    );
  }
  if (
    !Number.isFinite(scheduleToleranceMinutes) ||
    scheduleToleranceMinutes < 1
  ) {
    throw new Error("scheduleToleranceMinutes must be positive");
  }

  const expectedSlots = expectedTcgplayerMarketFullRolloutSlotsV1({
    windowStart: start,
    requiredCycles,
    hourUtc: scheduleHourUtc,
    minuteUtc: scheduleMinuteUtc,
  });
  const gateEnd = new Date(
    new Date(expectedSlots.at(-1)).getTime() +
      scheduleToleranceMinutes * MINUTE_MS,
  );
  const evidenceEnd = end < gateEnd ? end : gateEnd;
  const runs = scheduledRuns.filter((run) => {
    const startedAt = new Date(run?.started_at).getTime();
    return (
      Number.isFinite(startedAt) &&
      startedAt > start.getTime() &&
      startedAt <= evidenceEnd.getTime()
    );
  });
  const slotResult = matchRunsToSlots({
    slots: expectedSlots,
    runs,
    scheduleToleranceMinutes,
  });
  const matchedSlotSet = new Set(
    slotResult.matches.map((match) => match.slot),
  );
  const dueSlots = expectedSlots.filter(
    (slot) =>
      new Date(slot).getTime() +
        scheduleToleranceMinutes * MINUTE_MS <=
      end.getTime(),
  );
  const missingDueSlots = dueSlots.filter(
    (slot) => !matchedSlotSet.has(slot),
  );
  const findings = [];

  if (!activationRun) {
    findings.push("activation_run_missing");
  } else if (!runIsHealthy(activationRun, commitSha)) {
    findings.push("activation_run_not_full_and_healthy");
  }

  const unhealthyRuns = runs
    .filter((run) => !runIsHealthy(run, commitSha))
    .map((run) => run.run_key || run.id);
  if (unhealthyRuns.length) {
    findings.push("scheduled_run_not_full_and_healthy");
  }
  if (missingDueSlots.length) {
    findings.push("expected_schedule_slot_missing");
  }
  if (slotResult.unmatchedRuns.length) {
    findings.push("unexpected_extra_production_run");
  }
  if (terminalAlerts.length) {
    findings.push("terminal_operations_alert_in_window");
  }

  const healthyRuns = [activationRun, ...runs]
    .filter(Boolean)
    .filter((run) => runIsHealthy(run, commitSha));
  const latestHealthyRun = healthyRuns
    .slice()
    .sort(
      (left, right) =>
        new Date(right.completed_at).getTime() -
        new Date(left.completed_at).getTime(),
    )[0];
  const expectedCurrentCount = integer(latestHealthyRun?.snapshot_count);
  if (
    expectedCurrentCount === null ||
    integer(current.exact_price_count) !== expectedCurrentCount
  ) {
    findings.push("current_exact_price_count_mismatch");
  }
  if (integer(current.positive_usd_count) !== expectedCurrentCount) {
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
  if (integer(current.invalid_exact_policy_count) !== 0) {
    findings.push("invalid_exact_publication_policy_row");
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
  if (
    sourceHealth.source_continuity_mode !== "verified_no_change" &&
    sourceHealth.source_continuity_mode !== "completed_sync"
  ) {
    findings.push("current_source_continuity_unproven");
  }
  if (
    number(sourceHealth.source_age_hours) === null ||
    number(sourceHealth.source_age_hours) > 36
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

  evaluateCoverage(coverage, findings);
  evaluatePerformance(performance, findings);
  if (
    string(coverage?.producing_commit_sha) &&
    string(coverage?.producing_commit_sha) !== coverageCommitSha
  ) {
    findings.push("coverage_producing_commit_mismatch");
  }
  if (
    string(performance?.producing_commit_sha) &&
    string(performance?.producing_commit_sha) !== performanceCommitSha
  ) {
    findings.push("performance_producing_commit_mismatch");
  }

  const complete =
    slotResult.matches.length === requiredCycles &&
    missingDueSlots.length === 0;
  const status = findings.length ? "failed" : complete ? "passed" : "observing";

  return {
    policy_version:
      TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1,
    status,
    window: {
      started_at: start.toISOString(),
      required_end_at: gateEnd.toISOString(),
      evidence_end_at: evidenceEnd.toISOString(),
      as_of: end.toISOString(),
      required_cycles: requiredCycles,
      completed_cycles: slotResult.matches.length,
      complete,
    },
    schedule: {
      hour_utc: scheduleHourUtc,
      minute_utc: scheduleMinuteUtc,
      tolerance_minutes: scheduleToleranceMinutes,
      expected_slots: expectedSlots,
      due_slots: dueSlots,
      matched_slots: slotResult.matches,
      missing_due_slots: missingDueSlots,
      unmatched_run_keys: slotResult.unmatchedRuns.map(
        (run) => run.run_key || run.id,
      ),
    },
    run_evidence: {
      expected_commit_sha: commitSha,
      expected_coverage_commit_sha: coverageCommitSha,
      expected_performance_commit_sha: performanceCommitSha,
      expected_policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
      activation_run_key: activationRun?.run_key ?? null,
      scheduled_run_count: runs.length,
      unhealthy_run_keys: unhealthyRuns,
      latest_healthy_run_id: latestHealthyRun?.id ?? null,
      latest_healthy_snapshot_count: expectedCurrentCount,
    },
    terminal_alert_count: terminalAlerts.length,
    current,
    source_health: sourceHealth,
    access,
    rollback,
    coverage: {
      policy_version: coverage?.policy_version ?? null,
      status: coverage?.status ?? null,
      coverage_status: coverage?.coverage_status ?? null,
      current_publication_scope_status:
        coverage?.current_publication_scope_status ?? null,
      coverage_percent: number(coverage?.coverage_percent),
      unclassified_gap_rows: integer(
        coverage?.counts?.unclassified_gap_rows,
      ),
    },
    performance: {
      policy_version: performance?.policy_version ?? null,
      status: performance?.status ?? null,
      target_p95_ms: number(performance?.target_p95_ms),
      case_count: Array.isArray(performance?.cases)
        ? performance.cases.length
        : 0,
      request_error_count: integer(performance?.request_error_count),
      row_count_mismatch_count: integer(
        performance?.row_count_mismatch_count,
      ),
    },
    findings: [...new Set(findings)],
  };
}
