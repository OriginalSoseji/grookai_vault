import { createHash } from 'node:crypto';

export const PRICING_COMPLETION_INPUT_V1 = 'pricing-completion-input-v1';
export const PRICING_COMPLETION_LANES_V1 = Object.freeze([
  'identity_mapping', 'catalog_evidence', 'exact_printing', 'source_price',
  'finish_assignment', 'variant_support',
]);

const REASONS = Object.freeze({
  missing_active_source_mapping: ['identity_mapping', 'tcgplayer-identity-mapping-repair-v1', 'Verify exact source-to-card identity and prepare a bounded mapping repair.'],
  missing_mapping_method: ['identity_mapping', 'tcgplayer-identity-mapping-repair-v1', 'Repair mapping provenance with independent identity evidence.'],
  missing_printed_number_evidence: ['catalog_evidence', 'catalog-printing-evidence-repair-v1', 'Acquire and verify printed card-number evidence.'],
  missing_canonical_printing_identity: ['exact_printing', 'exact-printing-repair-v1', 'Verify and bind the exact canonical printing.'],
  missing_positive_market_price: ['source_price', 'market-price-source-recovery-v1', 'Recover a verified positive source price; retain unresolved if none exists.'],
  cosmos_assignment_required: ['finish_assignment', 'printing-finish-assignment-repair-v1', 'Verify the exact Cosmos finish assignment.'],
  cosmos_exact_finish_required: ['finish_assignment', 'printing-finish-assignment-repair-v1', 'Bind the verified exact Cosmos finish.'],
  special_variant_v1_1: ['variant_support', 'special-variant-pricing-expansion-v1', 'Qualify the exact variant without treating unsupported as resolved.'],
  edition_bound_pricing_authority_required: ['variant_support', 'tcgplayer-edition-authority-review-v1', 'Review exact edition-bound identity and pricing authority; retain the hold until independently verified, without inferring bindings or publishing prices.'],
  unsupported_product_kind: ['variant_support', 'tcgplayer-product-scope-review-v1', 'Verify whether the source product is a single card printing; keep sealed, accessory, and ambiguous products outside card-price publication.'],
  missing_published_price: ['master_price', 'master-index-pricing-recovery-v1', 'Find an exact provider price, publish through the guarded executor, and verify the application read path.'],
});
const UNKNOWN_CURRENCY = 'XXX';
const UNKNOWN_CONDITION = 'UNKNOWN';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function fail(message) { throw new Error(`pricing-completion-input: ${message}`); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}
function string(value, label) {
  if (typeof value !== 'string' || !value.length || value !== value.trim()) fail(`${label} must be a nonempty exact string`);
  return value;
}
function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a nonnegative safe integer`);
  return value;
}
function identifier(value, label) {
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  return string(value, label);
}
function array(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
function digest(value) { return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex'); }
function timestamp(value, label) {
  string(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${label} must be an ISO timestamp`);
  if (new Date(value).toISOString() !== (value.includes('.') ? value : value.replace('Z', '.000Z'))) fail(`${label} must be a valid ISO timestamp`);
  return Date.parse(value);
}
function freshness(observedAt, now, maxAgeMs) {
  const time = timestamp(observedAt, 'observedAt');
  if (time > now) fail('snapshot is dated in the future');
  return now - time > maxAgeMs ? 'stale' : 'fresh';
}
function settings(options) {
  const now = options.now;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  count(now, 'now');
  count(maxAgeMs, 'maxAgeMs');
  if (maxAgeMs === 0) fail('maxAgeMs must be positive');
  return { now, maxAgeMs };
}
function reasonInfo(reason) {
  if (!Object.hasOwn(REASONS, reason)) fail(`unknown primary reason ${reason}`);
  return REASONS[reason];
}
export function pricingCompletionReasonRouteV1(reason) {
  const [lane, owner, nextAction] = reasonInfo(reason);
  return { lane, owner, nextAction };
}
function normalizeIdentity(input) {
  object(input, 'identity');
  const kind = input.kind;
  const fields = kind === 'source' ? ['provider', 'category', 'productId', 'subtype', 'currency', 'condition']
    : kind === 'master' ? ['printingId', 'currency', 'condition'] : fail('unknown identity kind');
  if (Object.keys(input).some((key) => !['kind', ...fields].includes(key))) fail('identity contains unsupported dimensions; encode exact printing in printingId or exact source product/subtype');
  const result = { kind };
  for (const field of fields) result[field] = string(input[field], `identity.${field}`);
  if (!/^[A-Z]{3}$/.test(result.currency)) fail('currency must be an uppercase three-letter code');
  return result;
}

/** Stable source/printing identity excludes volatile observation IDs and source runs. */
export function pricingCompletionIntakeKeyV1(identity) {
  return digest(normalizeIdentity(identity));
}

function normalizeObservation(row, snapshot) {
  object(row, 'observation');
  const identity = normalizeIdentity(row.identity);
  const [lane, owner, nextAction] = reasonInfo(row.reason);
  if ((identity.kind === 'master') !== (lane === 'master_price')) fail('primary reason does not match identity direction');
  if (row.sourceRunId !== snapshot.sourceRunId) fail('observation source run differs from snapshot');
  const suppliedEvidence = object(row.evidence, 'evidence');
  if (identity.condition === 'NOT_CONDITION_SPECIFIC'
      && (suppliedEvidence.priceBasis !== 'TCGPLAYER_MARKET' || suppliedEvidence.physicalConditionVerified !== false)) {
    fail('market quote scope requires explicit basis and no physical condition claim');
  }
  const verifiedDimensions = identity.currency !== UNKNOWN_CURRENCY && identity.condition !== UNKNOWN_CONDITION;
  const priorityMetadata = row.priorityMetadata ?? { owned: null, retailer: null, evidenceRef: null };
  object(priorityMetadata, 'priorityMetadata');
  if (priorityMetadata.owned !== null && typeof priorityMetadata.owned !== 'boolean') fail('owned must be boolean or explicitly unknown');
  if (priorityMetadata.retailer !== null) string(priorityMetadata.retailer, 'retailer');
  if (priorityMetadata.owned !== null || priorityMetadata.retailer !== null) string(priorityMetadata.evidenceRef, 'priority evidenceRef');
  const priority = (priorityMetadata.owned === true ? 80 : 0) + (priorityMetadata.retailer ? 20 : 0);
  const evidence = {
    ...suppliedEvidence, observedAt: snapshot.observedAt,
    sourceRunId: snapshot.sourceRunId, snapshotContentDigest: snapshot.contentDigest,
    identityDimensionsVerified: verifiedDimensions,
    priorityMetadata,
  };
  if (Buffer.byteLength(JSON.stringify(evidence)) > 128 * 1024) fail('observation evidence exceeds 128 KiB');
  const normalized = {
    identity, reason: row.reason, evidence, sourceRunId: row.sourceRunId,
    scope: string(row.scope, 'scope'), priority,
    owner: row.owner ? string(row.owner, 'owner') : owner,
    nextAction: verifiedDimensions ? (row.nextAction ? string(row.nextAction, 'nextAction') : nextAction)
      : `Enrich missing currency/condition from a bound source export before repair. ${nextAction}`,
  };
  return { ...normalized, versionDigest: digest(normalized) };
}

/** Validate typed two-direction evidence. Coverage means enumeration, never repair success. */
export function normalizePricingCompletionSnapshotV1(input, options = {}) {
  object(input, 'snapshot');
  const { now, maxAgeMs } = settings(options);
  if (input.schemaVersion !== PRICING_COMPLETION_INPUT_V1) fail('unsupported schemaVersion');
  const sourceRunId = string(input.sourceRunId, 'sourceRunId');
  const observedAt = string(input.observedAt, 'observedAt');
  const age = freshness(observedAt, now, maxAgeMs);
  const contentDigest = digest(input);
  const observations = array(input.observations, 'observations').map((row) => normalizeObservation(row, { sourceRunId, observedAt, contentDigest }));
  const seen = new Set();
  for (const row of observations) {
    const key = pricingCompletionIntakeKeyV1(row.identity);
    if (seen.has(key)) fail('duplicate stable identity in snapshot');
    seen.add(key);
  }
  const coverage = object(input.coverage, 'coverage');
  const source = object(coverage.sourceToMaster, 'sourceToMaster coverage');
  const master = object(coverage.masterToPrice, 'masterToPrice coverage');
  function directionCoverage(direction, rows, laneNames) {
    if (!['complete', 'partial', 'unknown'].includes(direction.status)) fail('invalid coverage status');
    if (direction.status === 'unknown') {
      if (rows.length) fail('unknown coverage cannot include observations');
      return { status: 'unknown', freshness: 'unknown', observedAt: null, expectedUnresolved: null, importedUnresolved: 0 };
    }
    const directionTime = string(direction.observedAt, 'coverage.observedAt');
    if (direction.sourceRunId !== sourceRunId) fail('coverage source run differs from snapshot');
    const directionFreshness = freshness(directionTime, now, maxAgeMs);
    if (Date.parse(directionTime) > Date.parse(observedAt)) fail('coverage observation is newer than snapshot');
    string(direction.evidenceRef, 'coverage.evidenceRef');
    const expectedUnresolved = count(direction.expectedUnresolved, 'coverage.expectedUnresolved');
    if (rows.length > expectedUnresolved || (direction.status === 'complete' && rows.length !== expectedUnresolved)) fail('coverage unresolved count mismatch');
    let lanes;
    if (laneNames) {
      object(direction.lanes, 'coverage.lanes');
      if (Object.keys(direction.lanes).some((lane) => !laneNames.includes(lane))) fail('unknown coverage lane');
      lanes = {};
      for (const lane of laneNames) {
        const entry = direction.lanes[lane];
        if (!entry) {
          if (direction.status === 'complete') fail('complete coverage is missing a lane');
          if (rows.some((row) => reasonInfo(row.reason)[0] === lane)) fail('missing coverage lane has rows');
          lanes[lane] = { status: 'unknown', expectedUnresolved: null, importedUnresolved: 0 };
          continue;
        }
        object(entry, 'lane');
        if (!['complete', 'partial', 'unknown'].includes(entry.status)) fail('invalid lane status');
        const actual = rows.filter((row) => reasonInfo(row.reason)[0] === lane).length;
        const expected = entry.expectedUnresolved === null && entry.status === 'unknown' ? null : count(entry.expectedUnresolved, 'lane.expectedUnresolved');
        if (entry.status === 'unknown' && actual !== 0) fail('unknown lane has rows');
        if (expected !== null && actual > expected) fail('lane imported count exceeds expected');
        if (entry.status === 'complete' && actual !== expected) fail('complete lane count mismatch');
        if (direction.status === 'complete' && entry.status !== 'complete') fail('complete direction has partial lane');
        lanes[lane] = { status: entry.status, expectedUnresolved: expected, importedUnresolved: actual };
      }
      const entries = Object.values(lanes);
      if (entries.every((entry) => entry.expectedUnresolved !== null) && entries.reduce((sum, entry) => sum + entry.expectedUnresolved, 0) !== expectedUnresolved) fail('lane totals do not reconcile');
    }
    return { status: direction.status, freshness: directionFreshness, sourceRunId, observedAt: directionTime, evidenceRef: direction.evidenceRef, expectedUnresolved, importedUnresolved: rows.length, ...(lanes ? { lanes } : {}) };
  }
  const normalizedCoverage = {
    sourceToMaster: directionCoverage(source, observations.filter((row) => row.identity.kind === 'source'), PRICING_COMPLETION_LANES_V1),
    masterToPrice: directionCoverage(master, observations.filter((row) => row.identity.kind === 'master')),
  };
  const coverageComplete = Object.values(normalizedCoverage).every((direction) => direction.status === 'complete' && direction.freshness === 'fresh');
  const complete = coverageComplete && age === 'fresh' && observations.length === 0;
  return {
    schemaVersion: PRICING_COMPLETION_INPUT_V1, snapshotId: contentDigest, sourceRunId, observedAt, contentDigest,
    freshness: age, coverage: normalizedCoverage, observations,
    summary: {
      complete, status: complete ? 'complete' : age === 'stale' ? 'stale' : coverageComplete ? 'incomplete' : 'partial',
      importedUnresolved: observations.length,
      sourceReportedUnresolved: normalizedCoverage.sourceToMaster.expectedUnresolved,
      masterReportedUnresolved: normalizedCoverage.masterToPrice.expectedUnresolved,
      unknownIdentityDimensions: observations.filter((row) => !row.evidence.identityDimensionsVerified).length,
      unsupportedUnresolved: observations.filter((row) => row.reason === 'special_variant_v1_1' || row.evidence.productScopeResult === 'unsupported_product_kind').length,
      actualProductionRepairs: 0,
    },
  };
}

/** Import the existing read-only report and JSONL, bound together by its retained hash manifest. */
export function importPricingBacklogV1({ reportText, identityGapsText, artifactHashes, dimensionEvidence = null }, options = {}) {
  if (typeof reportText !== 'string' || typeof identityGapsText !== 'string') fail('reportText and identityGapsText must preserve original UTF-8 bytes');
  object(artifactHashes, 'artifactHashes');
  if (digest(reportText) !== artifactHashes['summary.json'] || digest(identityGapsText) !== artifactHashes['identity_mapping_gaps.jsonl']) fail('artifact digest mismatch');
  const report = JSON.parse(reportText);
  object(report, 'report');
  if (report.policy_version !== 'TCGPLAYER_PRICING_BACKLOG_POLICY_V1' || !['complete', 'incomplete'].includes(report.status)) fail('invalid legacy report policy or status');
  if (array(report.findings, 'findings').length) fail('legacy report has unresolved validation findings');
  object(report.counts, 'counts');
  const requiredCounts = ['selected', 'eligible', 'snapshots', 'published', 'non_published', 'excluded', 'quarantined', 'delayed', 'suppressed', 'primary_reason_rows'];
  for (const key of requiredCounts) count(report.counts[key], `counts.${key}`);
  const c = report.counts;
  if (c.selected !== c.published + c.non_published || c.eligible !== c.snapshots || c.published !== c.snapshots
    || c.selected !== c.eligible + c.excluded + c.quarantined + c.delayed + c.suppressed || c.non_published !== c.primary_reason_rows) fail('legacy counts do not reconcile');
  if ((report.status === 'complete') !== (c.non_published === 0)) fail('legacy status disagrees with backlog count');
  const expectedByLane = Object.fromEntries(PRICING_COMPLETION_LANES_V1.map((lane) => [lane, 0]));
  const expectedReasons = new Map();
  for (const row of array(report.primary_reasons, 'primary_reasons')) {
    const [lane] = reasonInfo(row.primary_reason);
    if (lane === 'master_price' || row.lane_id !== lane) fail('primary reason lane mismatch');
    const n = count(row.count, 'primary reason count');
    const key = `${row.primary_reason}:${string(row.decision, 'decision')}`;
    if (expectedReasons.has(key)) fail('duplicate primary reason partition');
    expectedReasons.set(key, n);
    expectedByLane[lane] += n;
  }
  if (Object.values(expectedByLane).reduce((a, b) => a + b, 0) !== c.non_published) fail('primary reasons do not partition backlog');
  const reportedLanes = new Set();
  for (const lane of array(report.lanes, 'lanes')) {
    if (!Object.hasOwn(expectedByLane, lane.lane_id) || reportedLanes.has(lane.lane_id)) fail('unknown or duplicate legacy lane');
    reportedLanes.add(lane.lane_id);
    if (count(lane.backlog_count, 'lane backlog_count') !== expectedByLane[lane.lane_id]) fail('legacy lane count mismatch');
  }
  for (const [lane, expected] of Object.entries(expectedByLane)) if (expected && !reportedLanes.has(lane)) fail('legacy report missing populated lane');
  let currency = UNKNOWN_CURRENCY;
  let condition = UNKNOWN_CONDITION;
  if (dimensionEvidence !== null) {
    object(dimensionEvidence, 'dimensionEvidence');
    currency = string(dimensionEvidence.currency, 'dimensionEvidence.currency');
    condition = string(dimensionEvidence.condition, 'dimensionEvidence.condition');
    string(dimensionEvidence.evidenceRef, 'dimensionEvidence.evidenceRef');
    if (dimensionEvidence.sourceRunId !== report.run.id) fail('dimension evidence source run mismatch');
    if (dimensionEvidence.identityGapsDigest !== artifactHashes['identity_mapping_gaps.jsonl']) fail('dimension evidence digest mismatch');
  }
  const sourceRunId = string(report.run?.id, 'run.id');
  const observedAt = string(report.run?.completed_at, 'run.completed_at');
  const rows = identityGapsText.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
  const actualReasons = new Map();
  const observationIds = new Set();
  const observations = rows.map((row) => {
    object(row, 'identity gap');
    string(row.source_observation_id, 'source_observation_id');
    if (observationIds.has(row.source_observation_id)) fail('duplicate source observation ID');
    observationIds.add(row.source_observation_id);
    if (reasonInfo(row.primary_gap_reason)[0] !== 'identity_mapping') fail('identity export includes another lane');
    const reasonKey = `${row.primary_gap_reason}:${string(row.decision, 'decision')}`;
    actualReasons.set(reasonKey, (actualReasons.get(reasonKey) ?? 0) + 1);
    const category = identifier(row.source_category_id, 'source_category_id');
    const productId = identifier(row.source_product_id, 'source_product_id');
    const group = identifier(row.source_group_id, 'source_group_id');
    return {
      identity: { kind: 'source', provider: 'tcgplayer', category, productId, subtype: string(row.source_subtype_name, 'source_subtype_name'), currency, condition },
      reason: row.primary_gap_reason, sourceRunId,
      scope: `tcgplayer/category/${category}/group/${group}`,
      owner: string(row.agent_key, 'agent_key'),
      evidence: {
        sourceObservationId: string(row.source_observation_id, 'source_observation_id'),
        sourceProductName: row.source_product_name ?? null,
        sourceGroupId: group, sourceGroupName: row.source_group_name ?? null,
        sourceCategoryName: row.source_category_name ?? null,
        productScopeResult: row.product_scope_result ?? null,
        sourceDecision: row.decision,
        reportDigest: artifactHashes['summary.json'],
        identityGapsDigest: artifactHashes['identity_mapping_gaps.jsonl'],
        dimensionEvidence,
      },
    };
  });
  if (rows.length !== expectedByLane.identity_mapping) fail('identity row count differs from matching report');
  for (const [key, n] of actualReasons) if (expectedReasons.get(key) !== n) fail('identity reason partition mismatch');
  for (const [key, n] of expectedReasons) if (reasonInfo(key.split(':')[0])[0] === 'identity_mapping' && (actualReasons.get(key) ?? 0) !== n) fail('identity reason rows missing');
  const result = normalizePricingCompletionSnapshotV1({
    schemaVersion: PRICING_COMPLETION_INPUT_V1, sourceRunId, observedAt,
    coverage: {
      sourceToMaster: {
        status: 'partial', sourceRunId, observedAt, evidenceRef: `sha256:${artifactHashes['summary.json']}`,
        expectedUnresolved: c.non_published,
        lanes: Object.fromEntries(PRICING_COMPLETION_LANES_V1.map((lane) => [lane, { status: lane === 'identity_mapping' ? 'complete' : 'unknown', expectedUnresolved: expectedByLane[lane] }])),
      },
      masterToPrice: { status: 'unknown' },
    },
    observations,
  }, options);
  return { ...result, legacyReport: { counts: report.counts, generatedAt: report.generated_at ?? null, artifactDigests: { report: artifactHashes['summary.json'], identityGaps: artifactHashes['identity_mapping_gaps.jsonl'] } } };
}
