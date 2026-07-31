export const TCGCSV_SOURCE_FETCH_RETRY_POLICY_V1 =
  "TCGCSV_SOURCE_FETCH_RETRY_POLICY_V1";

const RETRYABLE_CURL_EXIT_CODES = new Set([5, 6, 7, 18, 28, 35, 52, 55, 56, 92]);
const RETRYABLE_MESSAGE_PATTERNS = [
  /(?:returned error:|HTTP\/\S+\s+)\s*(?:408|425|429|5\d\d)\b/i,
  /connection reset/i,
  /connection refused/i,
  /connection terminated/i,
  /could not connect/i,
  /eai_again/i,
  /econnrefused/i,
  /econnreset/i,
  /enotfound/i,
  /network/i,
  /rate.?limit/i,
  /recv failure/i,
  /server closed/i,
  /socket hang up/i,
  /timed? ?out/i,
  /timeout/i,
];

export function isRetryableTcgcsvSourceFetchErrorV1(error) {
  const numericCode = Number(error?.code);
  if (
    Number.isInteger(numericCode) &&
    RETRYABLE_CURL_EXIT_CODES.has(numericCode)
  ) {
    return true;
  }
  const text = [error?.message, error?.stderr, error?.stdout]
    .filter(Boolean)
    .join("\n");
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function tcgcsvSourceRetryDelayMsV1({
  retryNumber,
  baseDelayMs,
  requestDelayMs = 0,
}) {
  const retry = Math.max(1, Number(retryNumber) || 1);
  const base = Math.max(1, Number(baseDelayMs) || 1);
  const requestDelay = Math.max(0, Number(requestDelayMs) || 0);
  return Math.max(requestDelay, Math.min(base * 2 ** (retry - 1), 10_000));
}
