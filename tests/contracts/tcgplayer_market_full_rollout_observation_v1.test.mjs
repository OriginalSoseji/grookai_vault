import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  evaluateTcgplayerMarketFullRolloutObservationV1,
  expectedTcgplayerMarketFullRolloutSlotsV1,
  TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_full_rollout_observation_policy_v1.mjs";

const START = "2026-08-01T09:00:00.000Z";
const COMMIT = "1234567890abcdef1234567890abcdef12345678";
const SCRIPT = fs.readFileSync(
  new URL(
    "../../scripts/audits/tcgplayer_market_full_rollout_observation_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

function productionRun({
  id,
  runKey,
  startedAt,
  completedAt,
  commit = COMMIT,
  policy = "TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_2",
} = {}) {
  const counts = {
    selected_count: 45082,
    mapped_count: 33394,
    eligible_count: 31527,
    snapshot_count: 31527,
    delayed_count: 0,
    suppressed_count: 0,
    quarantined_count: 11423,
    excluded_count: 2132,
  };
  return {
    id,
    run_key: runKey,
    run_mode: "production",
    state: "verified",
    reconciliation_state: "reconciled",
    policy_version: policy,
    ...counts,
    required_phase_count: 5,
    succeeded_phase_count: 5,
    git_commit_sha: commit,
    started_at: startedAt,
    completed_at: completedAt,
    failed_at: null,
    error: null,
    reconciliation: {
      ...counts,
      decision_count: counts.selected_count,
      traced_snapshot_count: counts.snapshot_count,
      mismatches: [],
    },
  };
}

const activationRun = productionRun({
  id: "activation",
  runKey: "TCGPLAYER-MARKET-FULL-ACTIVATION-publication",
  startedAt: "2026-08-01T08:50:00.000Z",
  completedAt: START,
});

function scheduledRun(day) {
  return productionRun({
    id: `run-${day}`,
    runKey: `TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-${String(day).padStart(2, "0")}-publication`,
    startedAt: `2026-08-${String(day).padStart(2, "0")}T08:15:03.000Z`,
    completedAt: `2026-08-${String(day).padStart(2, "0")}T08:20:00.000Z`,
  });
}

function coverage(overrides = {}) {
  return {
    policy_version: "TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2",
    producing_commit_sha: COMMIT,
    status: "passed",
    coverage_status: "passed",
    current_publication_scope_status: "passed",
    coverage_percent: 95.247,
    counts: { unclassified_gap_rows: 0 },
    ...overrides,
  };
}

function performance(overrides = {}) {
  return {
    policy_version: "TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1",
    producing_commit_sha: COMMIT,
    status: "passed",
    target_p95_ms: 500,
    request_error_count: 0,
    row_count_mismatch_count: 0,
    cases: [
      {
        case_id: "parent_detail_1",
        status: "passed",
        error_count: 0,
        row_count_mismatch_count: 0,
        latency_ms: { p95: 100 },
      },
    ],
    ...overrides,
  };
}

function current(runId = "activation") {
  return {
    exact_price_count: 31527,
    positive_usd_count: 31527,
    missing_provenance_count: 0,
    stale_price_count: 0,
    broken_trace_count: 0,
    invalid_exact_policy_count: 0,
    current_publication_run_id: runId,
  };
}

function baseInput(overrides = {}) {
  return {
    windowStart: START,
    asOf: "2026-08-01T10:00:00.000Z",
    expectedCommitSha: COMMIT,
    activationRun,
    scheduledRuns: [],
    terminalAlerts: [],
    current: current(),
    sourceHealth: {
      status: "healthy",
      source_continuity_mode: "verified_no_change",
      source_age_hours: 1,
    },
    access: {
      authenticated_execute_granted: true,
      authenticated_read_count: 1,
      anonymous_execute_granted: false,
      anonymous_runtime_denied: true,
    },
    rollback: {
      service_execute_granted: true,
      prior_publication_available: true,
    },
    coverage: coverage(),
    performance: performance(),
    ...overrides,
  };
}

test("the full rollout schedule is exactly seven daily slots after activation", () => {
  assert.deepEqual(
    expectedTcgplayerMarketFullRolloutSlotsV1({
      windowStart: START,
      requiredCycles: 7,
    }),
    [
      "2026-08-02T08:15:00.000Z",
      "2026-08-03T08:15:00.000Z",
      "2026-08-04T08:15:00.000Z",
      "2026-08-05T08:15:00.000Z",
      "2026-08-06T08:15:00.000Z",
      "2026-08-07T08:15:00.000Z",
      "2026-08-08T08:15:00.000Z",
    ],
  );
});

test("a healthy activation remains observing before seven scheduled cycles", () => {
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(baseInput());
  assert.equal(
    result.policy_version,
    TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1,
  );
  assert.equal(result.status, "observing");
  assert.deepEqual(result.findings, []);
});

test("one full activation plus seven healthy production cycles passes", () => {
  const runs = [2, 3, 4, 5, 6, 7, 8].map(scheduledRun);
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(
    baseInput({
      asOf: "2026-08-08T08:30:00.000Z",
      scheduledRuns: runs,
      current: current("run-8"),
    }),
  );
  assert.equal(result.status, "passed");
  assert.equal(result.window.completed_cycles, 7);
  assert.deepEqual(result.findings, []);
});

test("a due missing cycle fails after its schedule tolerance", () => {
  const runs = [2, 3, 4, 5, 6, 7].map(scheduledRun);
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(
    baseInput({
      asOf: "2026-08-08T10:00:00.000Z",
      scheduledRuns: runs,
      current: current("run-7"),
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("expected_schedule_slot_missing"));
});

test("wrong commit, unhealthy reconciliation, and pointer drift fail", () => {
  const run = scheduledRun(2);
  run.git_commit_sha = "abcdef1234567890abcdef1234567890abcdef12";
  run.reconciliation.mismatches = ["snapshot_trace_count"];
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(
    baseInput({
      asOf: "2026-08-02T10:00:00.000Z",
      scheduledRuns: [run],
      current: current("wrong-pointer"),
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("scheduled_run_not_full_and_healthy"));
  assert.ok(result.findings.includes("current_publication_pointer_mismatch"));
});

test("current lineage, source, access, rollback, and alerts fail closed", () => {
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(
    baseInput({
      terminalAlerts: [{ notification_id: "alert" }],
      current: {
        ...current(),
        stale_price_count: 1,
        broken_trace_count: 1,
        invalid_exact_policy_count: 1,
      },
      sourceHealth: {
        status: "critical",
        source_continuity_mode: "unproven",
        source_age_hours: 40,
      },
      access: {
        authenticated_execute_granted: false,
        authenticated_read_count: 0,
        anonymous_execute_granted: true,
        anonymous_runtime_denied: false,
      },
      rollback: {
        service_execute_granted: false,
        prior_publication_available: false,
      },
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("terminal_operations_alert_in_window"));
  assert.ok(result.findings.includes("stale_current_price_visible"));
  assert.ok(result.findings.includes("broken_source_to_publication_trace"));
  assert.ok(result.findings.includes("invalid_exact_publication_policy_row"));
  assert.ok(result.findings.includes("current_source_health_not_healthy"));
  assert.ok(result.findings.includes("authenticated_pricing_execute_missing"));
  assert.ok(result.findings.includes("publication_rollback_not_available"));
});

test("coverage and performance evidence must be clean and same-commit", () => {
  const result = evaluateTcgplayerMarketFullRolloutObservationV1(
    baseInput({
      coverage: coverage({
        coverage_percent: 94.9,
        producing_commit_sha:
          "abcdef1234567890abcdef1234567890abcdef12",
      }),
      performance: performance({
        status: "failed",
        request_error_count: 1,
        cases: [
          {
            status: "failed",
            error_count: 1,
            row_count_mismatch_count: 0,
            latency_ms: { p95: 501 },
          },
        ],
      }),
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("fresh_v1_2_coverage_gate_not_passed"));
  assert.ok(result.findings.includes("coverage_producing_commit_mismatch"));
  assert.ok(result.findings.includes("fresh_read_performance_gate_not_passed"));
});

test("the observer is read-only and preserves governed evidence artifacts", () => {
  assert.match(SCRIPT, /begin read only|database_reads_only:\s*true/i);
  assert.match(SCRIPT, /coverage_summary_input\.json/);
  assert.match(SCRIPT, /performance_summary_input\.json/);
  assert.match(SCRIPT, /artifact_hashes\.json/);
  assert.match(SCRIPT, /--require-pass/);
  assert.doesNotMatch(
    SCRIPT,
    /\b(insert\s+into|update\s+public\.|delete\s+from|grant\s+execute)\b/i,
  );
});
