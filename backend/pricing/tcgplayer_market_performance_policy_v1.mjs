export const TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1 =
  "TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1";
export const TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1 = 500;

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function nearestRankPercentileV1(values, percentile) {
  const usable = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!usable.length) return null;
  const rank = Math.max(
    1,
    Math.min(usable.length, Math.ceil((percentile / 100) * usable.length)),
  );
  return Number(usable[rank - 1].toFixed(3));
}

export function summarizeTcgplayerMarketPerformanceCaseV1(
  testCase,
  measurements,
  { targetP95Ms = TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1 } = {},
) {
  const durations = measurements
    .filter((measurement) => !measurement.error)
    .map((measurement) => measurement.duration_ms);
  const errors = measurements.filter((measurement) => measurement.error);
  const rowCountMismatches = measurements.filter(
    (measurement) =>
      !measurement.error &&
      Number(measurement.row_count) !== Number(testCase.expected_row_count),
  );
  const p95Ms = nearestRankPercentileV1(durations, 95);
  const findings = [];
  if (!measurements.length) findings.push("no_measurements");
  if (errors.length) findings.push("request_errors");
  if (rowCountMismatches.length) findings.push("row_count_mismatch");
  if (p95Ms === null || p95Ms > targetP95Ms) {
    findings.push("p95_above_target");
  }

  return {
    case_id: testCase.case_id,
    scope: testCase.scope,
    requested_id_count: testCase.requested_ids.length,
    expected_row_count: testCase.expected_row_count,
    measurement_count: measurements.length,
    success_count: measurements.length - errors.length,
    error_count: errors.length,
    row_count_mismatch_count: rowCountMismatches.length,
    response_bytes: {
      min:
        measurements.length > 0
          ? Math.min(...measurements.map((row) => row.response_bytes ?? 0))
          : null,
      max:
        measurements.length > 0
          ? Math.max(...measurements.map((row) => row.response_bytes ?? 0))
          : null,
    },
    latency_ms: {
      min: durations.length
        ? Number(Math.min(...durations).toFixed(3))
        : null,
      p50: nearestRankPercentileV1(durations, 50),
      p95: p95Ms,
      p99: nearestRankPercentileV1(durations, 99),
      max: durations.length
        ? Number(Math.max(...durations).toFixed(3))
        : null,
    },
    target_p95_ms: targetP95Ms,
    status: findings.length ? "failed" : "passed",
    findings,
  };
}

export function summarizeTcgplayerMarketPerformanceV1(
  testCases,
  measurements,
  options = {},
) {
  const cases = testCases.map((testCase) =>
    summarizeTcgplayerMarketPerformanceCaseV1(
      testCase,
      measurements.filter(
        (measurement) => measurement.case_id === testCase.case_id,
      ),
      options,
    ),
  );
  const findings = [];
  if (new Set(testCases.map((testCase) => testCase.case_id)).size !== testCases.length) {
    findings.push("duplicate_case_id");
  }
  if (cases.some((testCase) => testCase.status !== "passed")) {
    findings.push("one_or_more_cases_failed");
  }

  return {
    policy_version: TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1,
    target_p95_ms:
      options.targetP95Ms ?? TCGPLAYER_MARKET_READ_P95_TARGET_MS_V1,
    status: findings.length ? "failed" : "passed",
    case_count: cases.length,
    measurement_count: measurements.length,
    request_error_count: cases.reduce(
      (total, testCase) => total + testCase.error_count,
      0,
    ),
    row_count_mismatch_count: cases.reduce(
      (total, testCase) => total + testCase.row_count_mismatch_count,
      0,
    ),
    cases,
    findings,
  };
}
