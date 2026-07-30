import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  evaluateTcgplayerMarketCanaryObservationV1,
  expectedTcgplayerMarketScheduleSlotsV1,
  TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_canary_observation_policy_v1.mjs";
import {
  buildTcgplayerMarketCanaryFailureArtifactsV1,
  buildTcgplayerMarketCanaryRunPlanV1,
  writeTcgplayerMarketCanaryArtifactsV1,
} from "../../scripts/audits/tcgplayer_market_canary_observation_v1.mjs";

const WINDOW_START = "2026-07-28T08:40:15.793Z";
const COMMIT = "c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d";
const OBSERVER_SOURCE = await fs.readFile(
  new URL(
    "../../scripts/audits/tcgplayer_market_canary_observation_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

function exactRun({
  id,
  runKey,
  startedAt,
  completedAt,
  commit = COMMIT,
} = {}) {
  return {
    id,
    run_key: runKey,
    run_mode: "canary",
    state: "verified",
    reconciliation_state: "reconciled",
    selected_count: 100,
    mapped_count: 100,
    eligible_count: 100,
    snapshot_count: 100,
    delayed_count: 0,
    suppressed_count: 0,
    quarantined_count: 0,
    excluded_count: 0,
    required_phase_count: 5,
    succeeded_phase_count: 5,
    git_commit_sha: commit,
    started_at: startedAt,
    completed_at: completedAt,
    failed_at: null,
    error: null,
    reconciliation: { mismatches: [] },
  };
}

const activationRun = exactRun({
  id: "activation",
  runKey: "TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-28-REPAIR1-publication",
  startedAt: "2026-07-28T08:39:53.963Z",
  completedAt: WINDOW_START,
});

function scheduledRun(day) {
  return exactRun({
    id: `run-${day}`,
    runKey: `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-${day}-publication`,
    startedAt: `2026-07-${day}T08:15:03.000Z`,
    completedAt: `2026-07-${day}T08:16:10.000Z`,
  });
}

function baseInput(overrides = {}) {
  return {
    windowStart: WINDOW_START,
    asOf: "2026-07-28T08:57:00.000Z",
    expectedCommitSha: COMMIT,
    activationRun,
    scheduledRuns: [],
    terminalAlerts: [],
    current: {
      exact_price_count: 100,
      positive_usd_count: 100,
      missing_provenance_count: 0,
      stale_price_count: 0,
      broken_trace_count: 0,
      current_publication_run_id: "activation",
    },
    sourceHealth: {
      status: "healthy",
      source_continuity_mode: "verified_no_change",
      source_age_hours: 0.25,
    },
    access: {
      authenticated_execute_granted: true,
      authenticated_read_count: 99,
      anonymous_execute_granted: false,
      anonymous_runtime_denied: true,
    },
    rollback: {
      service_execute_granted: true,
      prior_publication_available: true,
    },
    ...overrides,
  };
}

test("schedule slots are deterministic and begin after activation", () => {
  assert.deepEqual(
    expectedTcgplayerMarketScheduleSlotsV1({
      windowStart: WINDOW_START,
      through: "2026-07-31T08:40:15.793Z",
    }),
    [
      "2026-07-29T08:15:00.000Z",
      "2026-07-30T08:15:00.000Z",
      "2026-07-31T08:15:00.000Z",
    ],
  );
});

test("a healthy incomplete window remains observing", () => {
  const result = evaluateTcgplayerMarketCanaryObservationV1(baseInput());
  assert.equal(
    result.policy_version,
    TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1,
  );
  assert.equal(result.status, "observing");
  assert.equal(result.window.elapsed, false);
  assert.deepEqual(result.findings, []);
});

test("the exact three scheduled slots pass after 72 hours", () => {
  const runs = [scheduledRun("29"), scheduledRun("30"), scheduledRun("31")];
  const result = evaluateTcgplayerMarketCanaryObservationV1(
    baseInput({
      asOf: "2026-07-31T08:40:15.793Z",
      scheduledRuns: runs,
      current: {
        ...baseInput().current,
        current_publication_run_id: "run-31",
      },
    }),
  );
  assert.equal(result.status, "passed");
  assert.equal(result.window.elapsed, true);
  assert.equal(result.schedule.matched_slots.length, 3);
  assert.deepEqual(result.findings, []);
});

test("a missing elapsed schedule slot fails the gate", () => {
  const runs = [scheduledRun("29"), scheduledRun("31")];
  const result = evaluateTcgplayerMarketCanaryObservationV1(
    baseInput({
      asOf: "2026-07-31T08:40:15.793Z",
      scheduledRuns: runs,
      current: {
        ...baseInput().current,
        current_publication_run_id: "run-31",
      },
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("expected_schedule_slot_missing"));
});

test("terminal alerts and wrong producing commits fail the gate", () => {
  const badRun = scheduledRun("29");
  badRun.git_commit_sha = "wrong-sha";
  const result = evaluateTcgplayerMarketCanaryObservationV1(
    baseInput({
      asOf: "2026-07-29T09:00:00.000Z",
      scheduledRuns: [badRun],
      terminalAlerts: [{ notification_id: "alert-1" }],
      current: {
        ...baseInput().current,
        current_publication_run_id: "run-29",
      },
    }),
  );
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("scheduled_run_not_exact_and_healthy"));
  assert.ok(result.findings.includes("terminal_operations_alert_in_window"));
});

test("stale prices, broken access, and unavailable rollback fail closed", () => {
  const result = evaluateTcgplayerMarketCanaryObservationV1(
    baseInput({
      current: {
        ...baseInput().current,
        stale_price_count: 1,
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
  assert.ok(result.findings.includes("stale_current_price_visible"));
  assert.ok(result.findings.includes("authenticated_pricing_execute_missing"));
  assert.ok(
    result.findings.includes("anonymous_pricing_execute_unexpectedly_granted"),
  );
  assert.ok(result.findings.includes("publication_rollback_not_available"));
});

test("observer proves the request-scoped shared client RPC without ranked discovery", () => {
  assert.match(
    OBSERVER_SOURCE,
    /array_agg\(\s*card_printing_id\s*order by card_printing_id\s*\) as current_printing_ids/i,
  );
  assert.match(
    OBSERVER_SOURCE,
    /get_market_pricing_read_model_v1\(\s*'\{\}'::uuid\[\],\s*\$1::uuid\[\]\s*\)/i,
  );
  assert.match(
    OBSERVER_SOURCE,
    /where pricing_scope = 'card_printing'\s+and status = 'available'/i,
  );
  assert.doesNotMatch(
    OBSERVER_SOURCE,
    /get_top_market_pricing_v1/i,
  );
  assert.match(
    OBSERVER_SOURCE,
    /from pointer\s+join public\.market_price_publication_snapshots snapshot\s+on snapshot\.run_id = pointer\.run_id/i,
  );
  assert.match(
    OBSERVER_SOURCE,
    /decision\.run_id = pointer\.run_id/i,
  );
  assert.doesNotMatch(
    OBSERVER_SOURCE,
    /broken_trace as \(\s*select count\(\*\)::integer as broken_trace_count\s*from public\.market_price_publication_snapshots snapshot/i,
  );
});

test("observer query failures preserve a run plan, summary, failure, and hashes", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "market-canary-observer-failure-"),
  );
  try {
    const runPlan = buildTcgplayerMarketCanaryRunPlanV1(
      {
        windowStart: WINDOW_START,
        activationRunId: "activation",
        expectedCommitSha: COMMIT,
        requiredHours: 72,
        expectedCount: 100,
        scheduleToleranceMinutes: 90,
      },
      "2026-07-30T14:34:51.000Z",
    );
    let hashes = await writeTcgplayerMarketCanaryArtifactsV1(root, {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
    });
    const error = Object.assign(
      new Error("canceling statement due to statement timeout"),
      { code: "57014" },
    );
    hashes = await writeTcgplayerMarketCanaryArtifactsV1(
      root,
      buildTcgplayerMarketCanaryFailureArtifactsV1({
        runPlan,
        stage: "authenticated_governed_read",
        error,
        failedAt: "2026-07-30T14:34:51.000Z",
      }),
      hashes,
    );

    const summary = JSON.parse(
      await fs.readFile(path.join(root, "summary.json"), "utf8"),
    );
    const failure = JSON.parse(
      await fs.readFile(path.join(root, "failure.json"), "utf8"),
    );
    const storedHashes = JSON.parse(
      await fs.readFile(path.join(root, "artifact_hashes.json"), "utf8"),
    );

    assert.equal(summary.status, "observer_error");
    assert.equal(summary.stage, "authenticated_governed_read");
    assert.equal(summary.error.code, "57014");
    assert.deepEqual(summary, failure);
    assert.deepEqual(storedHashes, hashes);
    assert.deepEqual(Object.keys(storedHashes).sort(), [
      "REPORT.md",
      "failure.json",
      "run_plan.json",
      "summary.json",
    ]);
    assert.equal(runPlan.boundaries.database_reads_only, true);
    assert.equal(runPlan.boundaries.database_writes, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
