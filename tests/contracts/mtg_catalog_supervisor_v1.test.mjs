import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  activeMtgCatalogRunnerRunsV1,
  buildMtgCatalogSupervisorPlanV1,
  classifyMtgCatalogSupervisorSetStateV1,
  consecutiveMtgCatalogRunnerFailuresV1,
} from "../../backend/pricing/mtg_catalog_supervisor_v1.mjs";

const TARGET_SHA = "7e9f2bb92f56335a6a352f655e12000b344a63a4";
const WORKFLOW = fs.readFileSync(
  new URL("../../.github/workflows/mtg-catalog-supervisor.yml", import.meta.url),
  "utf8",
);
const ENTRYPOINT = fs.readFileSync(
  new URL("../../scripts/audits/mtg_catalog_supervisor_v1.mjs", import.meta.url),
  "utf8",
);

function batch(index, overrides = {}) {
  return {
    execution_ordinal: index,
    source_set_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    code: `set${index}`,
    candidate_count: 10 + index,
    card_printings: 20 + index,
    external_printing_mappings: 18 + index,
    total_staging_rows: 100 + index,
    released_at: "2026-01-01",
    ...overrides,
  };
}

function exact(row) {
  return {
    sets: 1,
    card_prints: row.candidate_count,
    card_print_identity: row.candidate_count,
    card_printings: row.card_printings,
    external_mappings: row.candidate_count,
    external_printing_mappings: row.external_printing_mappings,
  };
}

function plan(overrides = {}) {
  const executionOrder = overrides.executionOrder ?? [batch(0), batch(1), batch(2)];
  return buildMtgCatalogSupervisorPlanV1({
    executionOrder,
    readbackByCode: Object.fromEntries(
      executionOrder.map((row) => [row.code, exact(row)]),
    ),
    releaseStatus: "hidden",
    runnerRuns: [],
    targetCommitSha: TARGET_SHA,
    expectedTargetCommitSha: TARGET_SHA,
    asOf: "2026-08-16",
    maxSets: 35,
    maxConsecutiveFailures: 3,
    ...overrides,
  });
}

test("exact and absent set states are distinguished from partial state", () => {
  const row = batch(0);
  assert.equal(
    classifyMtgCatalogSupervisorSetStateV1(row, exact(row)).state,
    "complete_exact_counts",
  );
  assert.equal(classifyMtgCatalogSupervisorSetStateV1(row, null).state, "absent");
  assert.equal(
    classifyMtgCatalogSupervisorSetStateV1(row, { ...exact(row), card_printings: 1 })
      .state,
    "partial_or_drifted",
  );
});

test("active or queued runner prevents another dispatch without a database readback", () => {
  const runnerRuns = [
    { id: 1, status: "in_progress", conclusion: null },
    { id: 2, status: "queued", conclusion: null },
  ];
  assert.equal(activeMtgCatalogRunnerRunsV1(runnerRuns).length, 2);
  const result = plan({ readbackByCode: null, releaseStatus: null, runnerRuns });
  assert.equal(result.status, "writer_active_no_dispatch");
  assert.equal(result.active_run_count, 2);
  assert.equal(result.dispatch, null);
});

test("supervisor resumes at the first incomplete exact execution ordinal", () => {
  const executionOrder = [batch(0), batch(1), batch(2), batch(3)];
  const result = plan({
    executionOrder,
    readbackByCode: {
      set0: exact(executionOrder[0]),
      set1: exact(executionOrder[1]),
      set3: exact(executionOrder[3]),
    },
    maxSets: 2,
  });
  assert.equal(result.status, "dispatch_ready");
  assert.equal(result.dispatch.start_index, 2);
  assert.equal(result.dispatch.max_sets, 2);
  assert.deepEqual(result.dispatch.selected_codes, ["set2", "set3"]);
});

test("future sets are deferred rather than forcing an invented completion", () => {
  const future = batch(1, { released_at: "2027-01-01" });
  const executionOrder = [batch(0), future];
  const result = plan({
    executionOrder,
    readbackByCode: { set0: exact(executionOrder[0]) },
  });
  assert.equal(result.status, "eligible_catalog_complete_no_dispatch");
  assert.equal(result.catalog.eligible_set_count, 1);
  assert.equal(result.catalog.deferred_future_set_count, 1);
});

test("partial catalog state fails closed before dispatch", () => {
  const executionOrder = [batch(0)];
  assert.throws(
    () =>
      plan({
        executionOrder,
        readbackByCode: { set0: { ...exact(executionOrder[0]), card_prints: 9 } },
      }),
    /Partial or drifted MTG set state/,
  );
});

test("release visibility and frozen producer commit are hard stops", () => {
  assert.throws(() => plan({ releaseStatus: "signed_in" }), /must remain hidden/);
  assert.throws(
    () => plan({ targetCommitSha: "a".repeat(40) }),
    /Frozen runner ref moved/,
  );
});

test("two failed runs retry from database truth but the third stops automation", () => {
  const failures = [0, 1, 2].map((index) => ({
    id: 100 - index,
    status: "completed",
    conclusion: "failure",
    updated_at: `2026-08-19T0${3 - index}:00:00Z`,
  }));
  assert.equal(consecutiveMtgCatalogRunnerFailuresV1(failures.slice(0, 2)), 2);
  assert.equal(plan({ runnerRuns: failures.slice(0, 2) }).status, "eligible_catalog_complete_no_dispatch");
  assert.throws(
    () => plan({ runnerRuns: failures }),
    /reached 3 consecutive failures/,
  );
});

test("a successful run resets the consecutive failure counter", () => {
  const runs = [
    { id: 3, status: "completed", conclusion: "failure", updated_at: "2026-08-19T03:00:00Z" },
    { id: 2, status: "completed", conclusion: "success", updated_at: "2026-08-19T02:00:00Z" },
    { id: 1, status: "completed", conclusion: "failure", updated_at: "2026-08-19T01:00:00Z" },
  ];
  assert.equal(consecutiveMtgCatalogRunnerFailuresV1(runs), 1);
});

test("workflow is GitHub-native, serialized, least-privilege, and frozen", () => {
  assert.match(WORKFLOW, /schedule:/);
  assert.match(WORKFLOW, /workflow_run:/);
  assert.match(WORKFLOW, /MTG Hidden Catalog Runner/);
  assert.match(WORKFLOW, /actions: write/);
  assert.match(WORKFLOW, /contents: read/);
  assert.match(WORKFLOW, /group: mtg-catalog-supervisor-v1/);
  assert.match(WORKFLOW, /cancel-in-progress: false/);
  assert.match(WORKFLOW, /--dispatch/);
  assert.match(WORKFLOW, new RegExp(TARGET_SHA));
  assert.match(WORKFLOW, /--max-sets=35/);
  assert.match(WORKFLOW, /--max-consecutive-failures=3/);
  assert.match(WORKFLOW, /SUPERVISOR_OUT_DIR=\"\$RUNNER_TEMP\//);
  assert.doesNotMatch(WORKFLOW, /SUPERVISOR_OUT_DIR:.*runner\.temp/);
});

test("entrypoint is read-only and writes the plan before dispatch", () => {
  assert.match(ENTRYPOINT, /execFileSync\("gh"/);
  assert.match(ENTRYPOINT, /workflow-id is outside the frozen supervisor authority/);
  assert.match(ENTRYPOINT, /runner-ref is outside the frozen supervisor authority/);
  assert.match(ENTRYPOINT, /frozen ceiling of 35/);
  assert.match(ENTRYPOINT, /begin transaction read only/);
  assert.match(ENTRYPOINT, /run_plan\.json/);
  assert.match(ENTRYPOINT, /artifact_hashes\.json/);
  assert.match(ENTRYPOINT, /dispatchRunner/);
  assert.match(ENTRYPOINT, /verifyDispatchedRunnerAppears/);
  assert.ok(
    ENTRYPOINT.indexOf('"run_plan.json"') < ENTRYPOINT.indexOf("await dispatchRunner"),
  );
  assert.doesNotMatch(ENTRYPOINT, /\b(insert|update|delete|truncate)\s+(into\s+|from\s+)?public\./i);
  assert.doesNotMatch(ENTRYPOINT, /catalog_game_release_controls[\s\S]{0,120}\b(update|insert|delete)\b/i);
});
