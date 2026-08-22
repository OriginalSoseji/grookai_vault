export const MTG_CATALOG_SUPERVISOR_VERSION = "MTG_CATALOG_SUPERVISOR_V1";

export const MTG_CATALOG_SUPERVISOR_ACTIVE_RUN_STATUSES = Object.freeze([
  "in_progress",
  "pending",
  "queued",
  "requested",
  "waiting",
]);

export const MTG_CATALOG_SUPERVISOR_FAILURE_CONCLUSIONS = Object.freeze([
  "action_required",
  "cancelled",
  "failure",
  "stale",
  "startup_failure",
  "timed_out",
]);

const EXPECTED_COUNT_FIELDS = Object.freeze([
  "sets",
  "card_prints",
  "card_print_identity",
  "card_printings",
  "external_mappings",
  "external_printing_mappings",
]);

function clean(value) {
  return String(value ?? "").trim();
}

function integer(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return parsed;
}

function expectedCounts(batch) {
  return {
    sets: 1,
    card_prints: integer(batch.candidate_count, `${batch.code}.candidate_count`),
    card_print_identity: integer(
      batch.candidate_count,
      `${batch.code}.candidate_count`,
    ),
    card_printings: integer(batch.card_printings, `${batch.code}.card_printings`),
    external_mappings: integer(
      batch.candidate_count,
      `${batch.code}.candidate_count`,
    ),
    external_printing_mappings: integer(
      batch.external_printing_mappings,
      `${batch.code}.external_printing_mappings`,
    ),
  };
}

function actualCounts(readback) {
  const source = readback ?? {};
  return Object.fromEntries(
    EXPECTED_COUNT_FIELDS.map((field) => [field, integer(source[field] ?? 0, field)]),
  );
}

export function classifyMtgCatalogSupervisorSetStateV1(batch, readback) {
  const expected = expectedCounts(batch);
  const actual = actualCounts(readback);
  const absent = EXPECTED_COUNT_FIELDS.every((field) => actual[field] === 0);
  const complete = EXPECTED_COUNT_FIELDS.every(
    (field) => actual[field] === expected[field],
  );
  return {
    code: clean(batch.code).toLowerCase(),
    execution_ordinal: integer(batch.execution_ordinal, "execution_ordinal"),
    source_set_id: clean(batch.source_set_id),
    state: complete ? "complete_exact_counts" : absent ? "absent" : "partial_or_drifted",
    expected,
    actual,
  };
}

export function activeMtgCatalogRunnerRunsV1(runs) {
  const activeStatuses = new Set(MTG_CATALOG_SUPERVISOR_ACTIVE_RUN_STATUSES);
  return (runs ?? []).filter((run) => activeStatuses.has(clean(run.status).toLowerCase()));
}

export function consecutiveMtgCatalogRunnerFailuresV1(runs) {
  const failureConclusions = new Set(MTG_CATALOG_SUPERVISOR_FAILURE_CONCLUSIONS);
  const terminal = [...(runs ?? [])]
    .filter((run) => clean(run.status).toLowerCase() === "completed")
    .sort((left, right) => {
      const leftTime = Date.parse(left.updated_at ?? left.created_at ?? 0) || 0;
      const rightTime = Date.parse(right.updated_at ?? right.created_at ?? 0) || 0;
      return rightTime - leftTime || Number(right.id ?? 0) - Number(left.id ?? 0);
    });
  let count = 0;
  for (const run of terminal) {
    const conclusion = clean(run.conclusion).toLowerCase();
    if (conclusion === "success") break;
    if (!failureConclusions.has(conclusion)) break;
    count += 1;
  }
  return count;
}

function validateExecutionOrder(executionOrder) {
  if (!Array.isArray(executionOrder) || executionOrder.length === 0) {
    throw new Error("Frozen MTG execution order is missing");
  }
  const codes = new Set();
  const sourceSetIds = new Set();
  for (const [index, batch] of executionOrder.entries()) {
    const code = clean(batch.code).toLowerCase();
    const sourceSetId = clean(batch.source_set_id);
    if (!code || !sourceSetId) throw new Error(`Execution row ${index} is missing identity`);
    if (codes.has(code)) throw new Error(`Duplicate MTG execution code: ${code}`);
    if (sourceSetIds.has(sourceSetId)) {
      throw new Error(`Duplicate MTG source_set_id: ${sourceSetId}`);
    }
    if (integer(batch.execution_ordinal, `${code}.execution_ordinal`) !== index) {
      throw new Error(`MTG execution order is not contiguous at ${code}`);
    }
    codes.add(code);
    sourceSetIds.add(sourceSetId);
  }
}

function readbackForCode(readbackByCode, code) {
  if (readbackByCode instanceof Map) return readbackByCode.get(code);
  return readbackByCode?.[code];
}

export function buildMtgCatalogSupervisorPlanV1({
  executionOrder,
  readbackByCode = null,
  releaseStatus = null,
  runnerRuns = [],
  targetCommitSha,
  expectedTargetCommitSha,
  asOf,
  maxSets = 35,
  maxConsecutiveFailures = 3,
}) {
  validateExecutionOrder(executionOrder);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(asOf))) {
    throw new Error("asOf must be YYYY-MM-DD");
  }
  const resolvedMaxSets = integer(maxSets, "maxSets");
  if (resolvedMaxSets < 1) throw new Error("maxSets must be at least 1");
  const resolvedFailureLimit = integer(
    maxConsecutiveFailures,
    "maxConsecutiveFailures",
  );
  if (resolvedFailureLimit < 1) {
    throw new Error("maxConsecutiveFailures must be at least 1");
  }
  if (!/^[0-9a-f]{40}$/.test(clean(expectedTargetCommitSha))) {
    throw new Error("Expected frozen runner commit is invalid");
  }
  if (clean(targetCommitSha) !== clean(expectedTargetCommitSha)) {
    throw new Error(
      `Frozen runner ref moved: expected ${expectedTargetCommitSha}, got ${targetCommitSha}`,
    );
  }

  const activeRuns = activeMtgCatalogRunnerRunsV1(runnerRuns);
  const consecutiveFailures = consecutiveMtgCatalogRunnerFailuresV1(runnerRuns);
  const common = {
    version: MTG_CATALOG_SUPERVISOR_VERSION,
    target_commit_sha: clean(targetCommitSha),
    as_of: clean(asOf),
    execution_set_count: executionOrder.length,
    active_run_count: activeRuns.length,
    active_runs: activeRuns.map((run) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion ?? null,
      html_url: run.html_url ?? null,
    })),
    consecutive_runner_failures: consecutiveFailures,
    max_consecutive_runner_failures: resolvedFailureLimit,
  };

  if (activeRuns.length > 0) {
    return {
      ...common,
      status: "writer_active_no_dispatch",
      dispatch: null,
      catalog: null,
    };
  }
  if (!["hidden", "signed_in"].includes(releaseStatus)) {
    throw new Error(
      `MTG release must be hidden or signed_in, got ${releaseStatus ?? "missing"}`,
    );
  }
  if (!readbackByCode) throw new Error("MTG catalog readback is required before dispatch");

  const eligible = executionOrder.filter(
    (batch) => !batch.released_at || clean(batch.released_at) <= clean(asOf),
  );
  const deferred = executionOrder.filter(
    (batch) => batch.released_at && clean(batch.released_at) > clean(asOf),
  );
  const states = eligible.map((batch) => {
    const code = clean(batch.code).toLowerCase();
    return classifyMtgCatalogSupervisorSetStateV1(
      batch,
      readbackForCode(readbackByCode, code),
    );
  });
  const partial = states.filter((row) => row.state === "partial_or_drifted");
  if (partial.length > 0) {
    const codes = partial.slice(0, 10).map((row) => row.code).join(", ");
    throw new Error(`Partial or drifted MTG set state blocks automation: ${codes}`);
  }
  const complete = states.filter((row) => row.state === "complete_exact_counts");
  const absent = states.filter((row) => row.state === "absent");
  const catalog = {
    release_status: releaseStatus,
    eligible_set_count: eligible.length,
    deferred_future_set_count: deferred.length,
    complete_exact_count: complete.length,
    absent_count: absent.length,
    partial_or_drifted_count: partial.length,
  };

  if (releaseStatus === "signed_in") {
    if (absent.length > 0) {
      throw new Error(
        `Signed-in MTG catalog has ${absent.length} absent eligible sets; automatic dispatch is forbidden`,
      );
    }
    return {
      ...common,
      status: "eligible_catalog_complete_signed_in_no_dispatch",
      catalog,
      dispatch: null,
    };
  }

  if (consecutiveFailures >= resolvedFailureLimit) {
    throw new Error(
      `MTG runner reached ${consecutiveFailures} consecutive failures; automatic dispatch stopped`,
    );
  }

  if (absent.length === 0) {
    return {
      ...common,
      status: "eligible_catalog_complete_no_dispatch",
      catalog,
      dispatch: null,
    };
  }

  const next = absent[0];
  const range = executionOrder.slice(
    next.execution_ordinal,
    next.execution_ordinal + resolvedMaxSets,
  );
  if (range.length === 0 || range[0].source_set_id !== next.source_set_id) {
    throw new Error("Unable to construct a contiguous MTG dispatch range");
  }
  return {
    ...common,
    status: "dispatch_ready",
    catalog,
    dispatch: {
      operation: "apply",
      start_index: next.execution_ordinal,
      max_sets: range.length,
      as_of: clean(asOf),
      first_incomplete_code: next.code,
      first_incomplete_source_set_id: next.source_set_id,
      selected_execution_ordinals: range.map((batch) => batch.execution_ordinal),
      selected_source_set_ids: range.map((batch) => batch.source_set_id),
      selected_codes: range.map((batch) => clean(batch.code).toLowerCase()),
      selected_total_staging_rows: range.reduce(
        (sum, batch) => sum + integer(batch.total_staging_rows, `${batch.code}.total_staging_rows`),
        0,
      ),
    },
  };
}
