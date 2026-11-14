export const TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_POLICY_V1 =
  "TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_POLICY_V1";

function count(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function evaluateTcgplayerMarketActiveAskRefreshV1(readback) {
  const rowCount = count(readback?.row_count, "row_count");
  const invalidRowCount = count(
    readback?.invalid_row_count,
    "invalid_row_count",
  );
  const staleRowCount = count(readback?.stale_row_count, "stale_row_count");
  const blockingFindings = [
    ...(invalidRowCount > 0 ? ["invalid_active_ask_cache_rows"] : []),
    ...(staleRowCount > 0 ? ["stale_active_ask_cache_rows"] : []),
  ];
  const warningFindings = [
    ...(rowCount === 0 ? ["empty_active_ask_cache"] : []),
  ];
  return Object.freeze({
    policy_version: TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_POLICY_V1,
    status:
      blockingFindings.length > 0
        ? "failed"
        : warningFindings.length > 0
          ? "passed_with_warning"
          : "passed",
    blocking_findings: Object.freeze(blockingFindings),
    warning_findings: Object.freeze(warningFindings),
    findings: Object.freeze([...blockingFindings, ...warningFindings]),
  });
}
