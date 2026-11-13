import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketContinuityV1,
} from "../../backend/pricing/tcgplayer_market_continuity_policy_v1.mjs";
import {
  acquireTcgcsvCurrentSourceLockV1,
  releaseTcgcsvCurrentSourceLockV1,
  TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1,
} from "../../backend/pricing/tcgcsv_current_source_lock_v1.mjs";
import {
  classifyMarketPipelineFailureV1,
} from "../../backend/pricing/tcgplayer_market_operations_policy_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLICATION_WORKER = fs.readFileSync(path.join(ROOT, "scripts", "workers", "tcgplayer_market_publication_worker_v1.mjs"), "utf8");
const WAREHOUSE_WORKER = fs.readFileSync(path.join(ROOT, "scripts", "workers", "tcgcsv_full_source_warehouse_worker_v1.mjs"), "utf8");
const WORKFLOW = fs.readFileSync(path.join(ROOT, ".github", "workflows", "tcgplayer-market-continuity-watchdog.yml"), "utf8");

const NOW = new Date("2026-11-13T14:00:00.000Z");

function evidence(overrides = {}) {
  return {
    publication_set_id: "10000000-0000-4000-8000-000000000001",
    run_id: "10000000-0000-4000-8000-000000000002",
    snapshot_count: 177_000,
    source_sync_finished_at: "2026-11-12T18:00:00.000Z",
    latest_run_state: "verified",
    latest_run_created_at: "2026-11-13T10:00:00.000Z",
    latest_run_commit_sha: "new-commit",
    ...overrides,
  };
}

test("continuity remains healthy with a fresh live publication", () => {
  const result = evaluateTcgplayerMarketContinuityV1(evidence(), {
    now: NOW,
    expectedCommitSha: "new-commit",
  });
  assert.equal(result.status, "healthy");
  assert.equal(result.refresh_required, false);
  assert.deepEqual(result.findings, []);
});

test("continuity refreshes before the 36-hour reader cutoff", () => {
  const result = evaluateTcgplayerMarketContinuityV1(evidence({
    source_sync_finished_at: "2026-11-12T11:00:00.000Z",
  }), { now: NOW });
  assert.equal(result.status, "refresh_required");
  assert.equal(result.severity, "warning");
  assert.ok(result.findings.includes("current_publication_refresh_due"));
});

test("a failed scheduled run triggers early recovery and records commit drift", () => {
  const result = evaluateTcgplayerMarketContinuityV1(evidence({
    source_sync_finished_at: "2026-11-12T18:00:00.000Z",
    latest_run_state: "failed",
    latest_run_commit_sha: "stale-commit",
  }), {
    now: NOW,
    failedRunRecoveryAtHours: 18,
    expectedCommitSha: "new-commit",
  });
  assert.equal(result.refresh_required, true);
  assert.ok(result.findings.includes("latest_production_run_failed"));
  assert.ok(result.findings.includes("production_runner_commit_drift"));
});

test("an active replacement gets a bounded grace window instead of overlap", () => {
  const result = evaluateTcgplayerMarketContinuityV1(evidence({
    source_sync_finished_at: "2026-11-11T12:00:00.000Z",
    latest_run_state: "running",
    latest_run_created_at: "2026-11-13T12:00:00.000Z",
  }), { now: NOW });
  assert.equal(result.status, "refresh_in_progress");
  assert.equal(result.refresh_required, false);
  assert.ok(result.findings.includes("production_refresh_in_progress"));
});

test("missing or expired publication is a critical recovery", () => {
  for (const sample of [
    evidence({ publication_set_id: null, run_id: null, snapshot_count: 0 }),
    evidence({ source_sync_finished_at: "2026-11-11T00:00:00.000Z" }),
  ]) {
    const result = evaluateTcgplayerMarketContinuityV1(sample, { now: NOW });
    assert.equal(result.refresh_required, true);
    assert.equal(result.severity, "critical");
  }
});

test("warehouse ingestion and publication share one source-generation lock", () => {
  assert.equal(TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1, "grookai:tcgcsv:current:v1");
  assert.match(WAREHOUSE_WORKER, /TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1/);
  assert.match(PUBLICATION_WORKER, /acquireTcgcsvCurrentSourceLockV1/);
  assert.match(PUBLICATION_WORKER, /releaseTcgcsvCurrentSourceLockV1/);
});

test("source-generation lock fails closed and is retryable", async () => {
  const calls = [];
  const deniedClient = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: [{ acquired: false }] };
    },
  };
  await assert.rejects(
    acquireTcgcsvCurrentSourceLockV1(deniedClient),
    /TCGCSV_CURRENT_SOURCE_LOCKED/,
  );
  assert.deepEqual(calls[0].values, [TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1]);
  assert.equal(
    classifyMarketPipelineFailureV1({
      failedPhase: "publication",
      errorText: "[TCGCSV_CURRENT_SOURCE_LOCKED] current source is changing",
    }).retryable,
    true,
  );

  const releaseCalls = [];
  await releaseTcgcsvCurrentSourceLockV1({
    async query(sql, values) {
      releaseCalls.push({ sql, values });
      return { rows: [] };
    },
  });
  assert.match(releaseCalls[0].sql, /pg_advisory_unlock/);
  assert.deepEqual(releaseCalls[0].values, [TCGCSV_CURRENT_SOURCE_LOCK_NAME_V1]);
});

test("watchdog runs before expiry and uses the governed production runner", () => {
  assert.match(WORKFLOW, /cron: "47 \*\/2 \* \* \*"/);
  assert.match(WORKFLOW, /--refresh-at-hours=26/);
  assert.match(WORKFLOW, /steps\.continuity\.outputs\.refresh_required == 'true'/);
  assert.match(WORKFLOW, /tcgplayer_market_scheduled_runner_v1\.mjs/);
  assert.match(WORKFLOW, /TCGPLAYER_MARKET_SCHEDULE_MODE: production/);
  assert.match(WORKFLOW, /TCGPLAYER_MARKET_REPLACEMENT_VERIFIED: "1"/);
  assert.match(WORKFLOW, /github_continuity_failure/);
});
