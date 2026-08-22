export const TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1 = 10_000;

export function buildTcgplayerCandidateProductPagesV1(
  productIds,
  pageSize = TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1,
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('candidate product page size must be a positive integer');
  }
  const normalized = [...new Set((productIds ?? []).map(Number))]
    .filter(Number.isSafeInteger)
    .sort((left, right) => left - right);
  const pages = [];
  for (let index = 0; index < normalized.length; index += pageSize) {
    pages.push(normalized.slice(index, index + pageSize));
  }
  return pages;
}

export function inspectTcgplayerCandidateRowsV1({
  rows,
  expectedSourceSyncRunId,
  expectedCount,
}) {
  const findings = [];
  if (rows.length !== expectedCount) {
    findings.push(`candidate_count:${rows.length}/${expectedCount}`);
  }
  const observationIds = rows.map((row) => String(row.source_observation_id));
  if (new Set(observationIds).size !== observationIds.length) {
    findings.push('duplicate_source_observation_id');
  }
  if (rows.some((row) => row.source_sync_run_id !== expectedSourceSyncRunId)) {
    findings.push('source_sync_run_mismatch');
  }
  return { valid: findings.length === 0, findings };
}
