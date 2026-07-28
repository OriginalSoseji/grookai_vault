import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  nearestRankPercentileV1,
  summarizeTcgplayerMarketPerformanceV1,
  TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_performance_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_read_performance_v1.mjs",
  ),
  "utf8",
);

function testCase(overrides = {}) {
  return {
    case_id: "parent_detail_1",
    scope: "parent",
    requested_ids: ["card-1"],
    expected_row_count: 1,
    ...overrides,
  };
}

function measurements(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => ({
    case_id: "parent_detail_1",
    iteration: index + 1,
    duration_ms: 100 + index,
    http_status: 200,
    row_count: 1,
    response_bytes: 500,
    error: null,
    ...overrides,
  }));
}

test("nearest-rank percentile is deterministic", () => {
  assert.equal(nearestRankPercentileV1([5, 1, 4, 2, 3], 50), 3);
  assert.equal(nearestRankPercentileV1([5, 1, 4, 2, 3], 95), 5);
  assert.equal(nearestRankPercentileV1([], 95), null);
});

test("performance summary passes a clean case below target", () => {
  const result = summarizeTcgplayerMarketPerformanceV1(
    [testCase()],
    measurements(30),
    { targetP95Ms: 500 },
  );

  assert.equal(result.policy_version, TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1);
  assert.equal(result.status, "passed");
  assert.equal(result.request_error_count, 0);
  assert.equal(result.row_count_mismatch_count, 0);
  assert.equal(result.cases[0].latency_ms.p95, 128);
  assert.deepEqual(result.findings, []);
});

test("request errors fail the case", () => {
  const rows = measurements(10);
  rows[9] = {
    ...rows[9],
    http_status: 500,
    row_count: 0,
    error: { code: "500", message: "failed" },
  };
  const result = summarizeTcgplayerMarketPerformanceV1(
    [testCase()],
    rows,
  );

  assert.equal(result.status, "failed");
  assert.equal(result.request_error_count, 1);
  assert.deepEqual(result.cases[0].findings, ["request_errors"]);
});

test("row-count mismatches fail the case", () => {
  const result = summarizeTcgplayerMarketPerformanceV1(
    [testCase()],
    measurements(10, { row_count: 0 }),
  );

  assert.equal(result.status, "failed");
  assert.equal(result.row_count_mismatch_count, 10);
  assert.deepEqual(result.cases[0].findings, ["row_count_mismatch"]);
});

test("p95 above target fails the case", () => {
  const rows = measurements(20);
  rows[18].duration_ms = 600;
  rows[19].duration_ms = 700;
  const result = summarizeTcgplayerMarketPerformanceV1(
    [testCase()],
    rows,
    { targetP95Ms: 500 },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.cases[0].latency_ms.p95, 600);
  assert.deepEqual(result.cases[0].findings, ["p95_above_target"]);
});

test("duplicate performance case IDs fail reconciliation", () => {
  const result = summarizeTcgplayerMarketPerformanceV1(
    [testCase(), testCase()],
    measurements(10),
  );

  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("duplicate_case_id"));
});

test("performance audit is read-only and never persists credentials", () => {
  assert.match(AUDIT, /database_reads_only:\s*true/);
  assert.match(AUDIT, /database_writes:\s*false/);
  assert.match(AUDIT, /secrets_persisted:\s*false/);
  assert.match(AUDIT, /set local role authenticated/i);
  assert.match(AUDIT, /get_market_pricing_read_model_v1/);
  assert.doesNotMatch(AUDIT, /\b(insert|update|delete)\s+(?:into|from|public\.)/i);
  assert.match(AUDIT, /endpoint_host:\s*new URL\(env\.supabaseUrl\)\.host/);
  assert.doesNotMatch(AUDIT, /runPlan\.(?:key|secret|databaseUrl)/);
});
