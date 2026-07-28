export const TCGPLAYER_MARKET_OPERATIONS_POLICY_V1 =
  "TCGPLAYER_MARKET_OPERATIONS_POLICY_V1";

const NON_RETRYABLE_PATTERNS = [
  /reconciliation.*mismatch/i,
  /source-to-publication trace/i,
  /resume refused/i,
  /requires a clean tracked working tree/i,
  /current_publication_pointer_mismatch/i,
  /eligible_snapshot_reconciliation_mismatch/i,
  /snapshot_trace_reconciliation_mismatch/i,
  /unsupported.*mode/i,
  /invalid.*run plan/i,
  /canonical.*ambigu/i,
];

const RETRYABLE_PATTERNS = [
  /\b429\b/,
  /\b5\d\d\b/,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /eai_again/i,
  /socket hang up/i,
  /network/i,
  /timed? ?out/i,
  /timeout/i,
  /connection terminated/i,
  /could not connect/i,
  /server closed the connection/i,
  /rate.?limit/i,
];

export function classifyMarketPipelineFailureV1({
  failedPhase = null,
  errorText = "",
} = {}) {
  const text = String(errorText ?? "");
  if (NON_RETRYABLE_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      classification: "non_retryable_invariant_failure",
      retryable: false,
    };
  }
  if (failedPhase === "health") {
    return {
      classification: "non_retryable_health_gate_failure",
      retryable: false,
    };
  }
  if (
    failedPhase === "warehouse_current_sync" ||
    RETRYABLE_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    return {
      classification: "retryable_source_or_transport_failure",
      retryable: true,
    };
  }
  if (failedPhase === "publication") {
    return {
      classification: "non_retryable_publication_failure",
      retryable: false,
    };
  }
  return {
    classification: "non_retryable_unclassified_failure",
    retryable: false,
  };
}

export function retryDelayMsV1(delaysSeconds, completedAttemptCount) {
  const delays = Array.isArray(delaysSeconds) ? delaysSeconds : [];
  if (!delays.length || completedAttemptCount < 1) return 0;
  const index = Math.min(completedAttemptCount - 1, delays.length - 1);
  return Math.max(0, Number(delays[index]) || 0) * 1000;
}

export function parseRetryDelaysV1(value) {
  const delays = String(value ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part >= 0);
  if (!delays.length) {
    throw new Error("retry delays must contain at least one non-negative number");
  }
  return delays;
}
