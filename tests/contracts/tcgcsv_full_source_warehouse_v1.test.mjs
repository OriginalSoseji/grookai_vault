import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyTcgcsvSourceFetchErrorV1,
  isTcgcsvSourceBlockedErrorV1,
  isRetryableTcgcsvSourceFetchErrorV1,
  tcgcsvSourceRetryDelayMsV1,
} from "../../backend/pricing/tcgcsv_source_fetch_retry_policy_v1.mjs";
import {
  evaluateTcgcsvSourceRunResumeV1,
  TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
} from "../../backend/pricing/tcgcsv_source_run_resume_policy_v1.mjs";
import { evaluateTcgcsvCachedSourceContinuityV1 } from "../../backend/pricing/tcgcsv_cached_source_continuity_v1.mjs";
import {
  assertTcgcsvRequestDelayV1,
  evaluateTcgcsvCurrentSyncAccessV1,
  TCGCSV_MINIMUM_REQUEST_DELAY_MS_V1,
} from "../../backend/pricing/tcgcsv_source_access_policy_v1.mjs";

const migration = readFileSync(
  "supabase/migrations/20260715110000_tcgcsv_full_source_warehouse_v1.sql",
  "utf8",
);
const worker = readFileSync("scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs", "utf8");
const contract = readFileSync("docs/contracts/TCGCSV_FULL_SOURCE_WAREHOUSE_V1.md", "utf8");

test("TCGCSV full warehouse is service-role-only", () => {
  for (const table of [
    "tcgcsv_source_sync_runs",
    "tcgcsv_source_artifacts",
    "tcgcsv_source_categories",
    "tcgcsv_source_groups",
    "tcgcsv_source_products",
    "tcgcsv_source_group_fetch_status",
    "tcgcsv_source_price_daily_observations",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated;`));
    assert.match(migration, new RegExp(`on public\\.${table} for all to service_role`));
  }
});

test("TCGCSV full warehouse does not grant public app-facing reads", () => {
  assert.doesNotMatch(migration, /grant\s+select\s+on\s+public\.tcgcsv_source_\w+\s+to\s+(anon|authenticated)/i);
  assert.match(migration, /revoke all on public\.v_tcgcsv_source_sync_latest_status from public, anon, authenticated;/);
});

test("TCGCSV worker defaults to dry-run and records no public pricing boundary", () => {
  assert.match(worker, /apply:\s*false/);
  assert.match(worker, /public_pricing_writes:\s*false/);
  assert.match(worker, /identity_writes:\s*false/);
  assert.match(worker, /vault_writes:\s*false/);
  assert.match(worker, /app_visible_pricing:\s*false/);
});

test("TCGCSV current access is daily and request pacing cannot be lowered", () => {
  const previous = { attempted_at: "2026-08-30T12:00:00.000Z" };
  assert.equal(evaluateTcgcsvCurrentSyncAccessV1(previous, {
    now: new Date("2026-08-31T11:59:59.000Z"),
  }).allowed, false);
  assert.equal(evaluateTcgcsvCurrentSyncAccessV1(previous, {
    now: new Date("2026-08-31T12:00:00.000Z"),
  }).allowed, true);
  assert.equal(TCGCSV_MINIMUM_REQUEST_DELAY_MS_V1, 250);
  assert.equal(assertTcgcsvRequestDelayV1(250), 250);
  assert.throws(() => assertTcgcsvRequestDelayV1(249), /at least 250ms/);
  assert.match(worker, /skipped_provider_cooldown/);
  assert.match(worker, /recordCurrentFailure/);
});

test("TCGCSV worker retries transient source fetches and fails closed on partial ingestion", () => {
  assert.match(worker, /DEFAULT_REQUEST_RETRIES = 3/);
  assert.match(worker, /TCGCSV_REQUEST_RETRIES/);
  assert.match(worker, /"--fail-with-body"/);
  assert.match(worker, /transient fetch failure retry=/);
  assert.match(
    worker,
    /\["partial_success", "failed", "aborted_request_ceiling"\]\.includes\(result\.run\.status\)/,
  );
  assert.match(worker, /process\.exitCode = 1/);
});

test("TCGCSV worker resumes an identical successful run key without mutating it", () => {
  const expected = {
    sync_mode: "current_full_sync",
    git_commit_sha: "abc123",
    worker_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_WORKER_V1",
    parser_version: "TCGCSV_FULL_SOURCE_PARSER_V1",
    schema_contract_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_V1",
  };
  const decision = evaluateTcgcsvSourceRunResumeV1(
    {
      ...expected,
      status: "completed",
      failed_count: 0,
    },
    expected,
  );

  assert.equal(decision.action, "resume_terminal");
  assert.equal(
    decision.policy_version,
    TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
  );
  assert.match(worker, /resumed_existing_terminal_run:\s*true/);
  assert.match(
    worker,
    /where not \(\s*tcgcsv_source_sync_runs\.status in \('completed', 'skipped_no_change'\)/,
  );
  assert.match(worker, /refusing to overwrite successful terminal source run/);
});

test("TCGCSV worker rejects successful run-key reuse with changed provenance", () => {
  const expected = {
    sync_mode: "current_full_sync",
    git_commit_sha: "new-sha",
    worker_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_WORKER_V1",
    parser_version: "TCGCSV_FULL_SOURCE_PARSER_V1",
    schema_contract_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_V1",
  };
  const decision = evaluateTcgcsvSourceRunResumeV1(
    {
      ...expected,
      git_commit_sha: "old-sha",
      status: "completed",
      failed_count: 0,
    },
    expected,
  );

  assert.equal(decision.action, "reject");
  assert.deepEqual(decision.mismatches, [
    {
      field: "git_commit_sha",
      existing: "old-sha",
      expected: "new-sha",
    },
  ]);
});

test("TCGCSV worker may retry a nonterminal or failed run with matching provenance", () => {
  const expected = {
    sync_mode: "current_full_sync",
    git_commit_sha: "abc123",
    worker_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_WORKER_V1",
    parser_version: "TCGCSV_FULL_SOURCE_PARSER_V1",
    schema_contract_version: "TCGCSV_FULL_SOURCE_WAREHOUSE_V1",
  };
  const decision = evaluateTcgcsvSourceRunResumeV1(
    {
      ...expected,
      status: "partial_success",
      failed_count: 1,
    },
    expected,
  );

  assert.equal(decision.action, "retry");
});

test("TCGCSV source retry policy retries transport failures but not permanent HTTP errors", () => {
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 35,
      message: "curl: (35) Recv failure: Connection reset by peer",
    }),
    true,
  );
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 22,
      message: "The requested URL returned error: 429",
    }),
    true,
  );
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 22,
      message: "The requested URL returned error: 404",
    }),
    false,
  );
  assert.equal(
    tcgcsvSourceRetryDelayMsV1({
      retryNumber: 1,
      baseDelayMs: 1000,
      requestDelayMs: 100,
    }),
    1000,
  );
  assert.equal(
    tcgcsvSourceRetryDelayMsV1({
      retryNumber: 8,
      baseDelayMs: 1000,
      requestDelayMs: 100,
    }),
    10_000,
  );
});

test("TCGCSV source block opens the circuit and does not retry", () => {
  const error = {
    code: 22,
    message: "The requested URL returned error: 403",
    stderr: "Your application has been flagged for overuse and has been blocked.",
  };
  assert.equal(isTcgcsvSourceBlockedErrorV1(error), true);
  assert.equal(isRetryableTcgcsvSourceFetchErrorV1(error), false);
  assert.deepEqual(classifyTcgcsvSourceFetchErrorV1(error), {
    classification: "source_blocked",
    retryable: false,
    circuit_break: true,
  });
});

test("a transport failure mentioning a URL segment named 403 does not open the source circuit", () => {
  const error = {
    code: 28,
    message: "curl request timed out for https://tcgcsv.com/tcgplayer/403/groups",
  };
  assert.equal(isTcgcsvSourceBlockedErrorV1(error), false);
  assert.equal(isRetryableTcgcsvSourceFetchErrorV1(error), true);
  assert.match(worker, /rethrowTcgcsvSourceBlock\(error\);/);
});

test("fresh completed TCGCSV evidence permits explicit degraded cache continuity", () => {
  const decision = evaluateTcgcsvCachedSourceContinuityV1({
    run_key: "source-1",
    status: "completed",
    source_marker: "2026-08-30",
    finished_at: "2026-08-30T12:00:00.000Z",
    price_row_count: 100,
    failed_count: 0,
  }, {
    now: new Date("2026-08-31T12:00:00.000Z"),
    maxAgeHours: 36,
  });
  assert.equal(decision.accepted, true);
  assert.equal(decision.continuity_mode, "degraded_cached_source");
  assert.equal(decision.source_age_hours, 24);
});

test("stale TCGCSV evidence fails closed during a source block", () => {
  const decision = evaluateTcgcsvCachedSourceContinuityV1({
    run_key: "source-old",
    status: "completed",
    finished_at: "2026-08-28T12:00:00.000Z",
    price_row_count: 100,
    failed_count: 0,
  }, {
    now: new Date("2026-08-31T12:00:00.000Z"),
    maxAgeHours: 36,
  });
  assert.equal(decision.accepted, false);
  assert.ok(decision.findings.includes("cached_source_outside_freshness_window"));
});

test("TCGCSV contract preserves source-only and historical archive rules", () => {
  assert.match(contract, /not Grookai product truth and is not Grookai Value/);
  assert.match(contract, /2024-02-08/);
  assert.match(contract, /historical_price_only/);
  assert.match(contract, /source_price_row_identity = tcgplayer:<productId>:<normalized subTypeName>/);
});
