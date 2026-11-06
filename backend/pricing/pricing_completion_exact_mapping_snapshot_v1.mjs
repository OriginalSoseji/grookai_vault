import { createHash } from 'node:crypto';

export const PRICING_COMPLETION_EXACT_MAPPING_SNAPSHOT_V1 =
  'PRICING_COMPLETION_EXACT_MAPPING_SNAPSHOT_V1';
export const PRICING_COMPLETION_PROJECT_REF_V1 = 'ycdxbpibncqcchqiihfz';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_SOURCES = 100_000;
const MAX_TARGETS = 250_000;
const SHA256 = /^[a-f0-9]{64}$/;

function need(value, code) {
  if (!value) throw new Error(`exact_mapping_snapshot:${code}`);
}

function integer(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function unique(rows, key, code) {
  need(Array.isArray(rows), `${code}_rows_required`);
  const result = new Map();
  for (const row of rows) {
    const value = row?.[key];
    need(value !== null && value !== undefined && !result.has(value), `${code}_duplicate`);
    result.set(value, row);
  }
  return result;
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function containsCredentialKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsCredentialKey);
  return Object.entries(value).some(([key, child]) =>
    /(?:password|secret|service_role|connection_string|database_url)/i.test(key)
      || containsCredentialKey(child));
}

export function assertPricingCompletionSnapshotTargetV1(connectionString, env = process.env) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('snapshot_insecure_tls_environment');
  }
  let parsed;
  try { parsed = new URL(connectionString); } catch { throw new Error('snapshot_database_url_invalid'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)
    || parsed.pathname !== '/postgres'
    || parsed.password.length === 0) {
    throw new Error('snapshot_database_target_invalid');
  }
  const direct = parsed.hostname === `db.${PRICING_COMPLETION_PROJECT_REF_V1}.supabase.co`
    && parsed.username === 'postgres';
  const pooler = parsed.hostname.endsWith('.pooler.supabase.com')
    && parsed.username === `postgres.${PRICING_COMPLETION_PROJECT_REF_V1}`;
  if (!direct && !pooler) throw new Error('snapshot_database_target_invalid');
  for (const key of parsed.searchParams.keys()) {
    if (key !== 'sslmode') throw new Error('snapshot_database_option_forbidden');
  }
  if (parsed.searchParams.has('sslmode')
    && !['require', 'verify-full'].includes(parsed.searchParams.get('sslmode'))) {
    throw new Error('snapshot_database_option_forbidden');
  }
  return parsed;
}

export function pricingCompletionSnapshotClientTargetV1(connectionString, env = process.env) {
  const parsed = assertPricingCompletionSnapshotTargetV1(connectionString, env);
  parsed.searchParams.delete('sslmode');
  return {
    connectionString: parsed.href,
    hostname: parsed.hostname,
  };
}

export function assertCredentialFreeExactMappingPlannerEnvironmentV1(env = process.env) {
  const forbidden = Object.entries(env).filter(([key, value]) =>
    value && /(?:SUPABASE|DATABASE|POSTGRES|PGHOST|PGUSER|PGPASSWORD|PGDATABASE|PGPORT|PGOPTIONS|SECRET_KEY|SERVICE_ROLE)/i.test(key));
  if (forbidden.length > 0) {
    throw new Error('credential_free_planner_environment_required');
  }
}

export function sha256PricingCompletionSnapshotInputV1(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildPricingCompletionExactMappingSnapshotV1({
  capturedAt,
  sourceSyncRunId,
  coverageGapsSha256,
  databaseTarget,
  sourceRun,
  sources,
  directTargetsByProduct,
  consensusByGroup,
  authorities,
  setTargets,
}) {
  return {
    schema_version: PRICING_COMPLETION_EXACT_MAPPING_SNAPSHOT_V1,
    captured_at: capturedAt,
    source_sync_run_id: sourceSyncRunId,
    coverage_gaps_sha256: coverageGapsSha256,
    database_target: databaseTarget,
    source_run: sourceRun,
    sources,
    direct_targets_by_product: [...directTargetsByProduct.entries()]
      .map(([source_product_id, targets]) => ({ source_product_id, targets }))
      .sort((left, right) => left.source_product_id - right.source_product_id),
    group_consensus: [...consensusByGroup.entries()]
      .map(([source_group_id, row]) => ({ source_group_id, row }))
      .sort((left, right) => left.source_group_id - right.source_group_id),
    authorities: [...authorities.entries()]
      .map(([source_group_id, row]) => ({ source_group_id, row }))
      .sort((left, right) => left.source_group_id - right.source_group_id),
    set_targets: setTargets,
    counts: {
      sources: sources.length,
      direct_target_groups: directTargetsByProduct.size,
      direct_targets: [...directTargetsByProduct.values()]
        .reduce((sum, rows) => sum + rows.length, 0),
      group_consensus: consensusByGroup.size,
      authorities: authorities.size,
      set_targets: setTargets.length,
    },
    boundaries: {
      capture_database_reads_only: true,
      offline_planner_database_access: false,
      database_writes: false,
      mapping_writes: false,
      publication_writes: false,
      customer_state_writes: false,
    },
  };
}

export function validatePricingCompletionExactMappingSnapshotV1({
  snapshot,
  expectedSourceSyncRunId,
  expectedCoverageGapsSha256,
  expectedSourceProductIds,
  now = Date.now(),
}) {
  need(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot), 'object_required');
  need(snapshot.schema_version === PRICING_COMPLETION_EXACT_MAPPING_SNAPSHOT_V1, 'version_invalid');
  need(snapshot.source_sync_run_id === expectedSourceSyncRunId, 'source_run_mismatch');
  need(SHA256.test(expectedCoverageGapsSha256)
    && snapshot.coverage_gaps_sha256 === expectedCoverageGapsSha256, 'coverage_hash_mismatch');
  const captured = Date.parse(snapshot.captured_at);
  need(Number.isFinite(captured) && captured <= now + 60_000 && now - captured <= MAX_AGE_MS,
    'capture_stale_or_future');
  need(snapshot.database_target?.kind === 'production_operator_snapshot'
    && snapshot.database_target.verified_tls === true
    && snapshot.database_target.transaction_read_only === true
    && snapshot.database_target.isolation === 'repeatable read', 'database_boundary_invalid');
  need(snapshot.source_run?.id === expectedSourceSyncRunId
    && snapshot.source_run.sync_mode === 'current_full_sync'
    && snapshot.source_run.status === 'completed'
    && Number(snapshot.source_run.failed_count) === 0, 'source_run_invalid');
  need(snapshot.boundaries?.capture_database_reads_only === true
    && snapshot.boundaries?.offline_planner_database_access === false
    && snapshot.boundaries?.database_writes === false
    && snapshot.boundaries?.mapping_writes === false
    && snapshot.boundaries?.publication_writes === false
    && snapshot.boundaries?.customer_state_writes === false, 'write_boundary_invalid');
  need(snapshot.counts && Object.values(snapshot.counts).every(integer), 'counts_invalid');
  need(snapshot.counts.sources > 0 && snapshot.counts.sources <= MAX_SOURCES, 'source_count_invalid');
  need(snapshot.counts.set_targets <= MAX_TARGETS, 'target_count_invalid');
  const sources = unique(snapshot.sources, 'source_product_id', 'source');
  const direct = unique(snapshot.direct_targets_by_product, 'source_product_id', 'direct_target_group');
  const consensus = unique(snapshot.group_consensus, 'source_group_id', 'group_consensus');
  const authorities = unique(snapshot.authorities, 'source_group_id', 'authority');
  need(Array.isArray(snapshot.set_targets), 'set_targets_required');
  const expectedProducts = new Set(expectedSourceProductIds);
  need(expectedProducts.size === expectedSourceProductIds.length
    && sameSet(expectedProducts, new Set(sources.keys())), 'source_product_census_mismatch');
  const sourceGroups = new Set([...sources.values()].map((row) => Number(row.source_group_id)));
  need([...direct.keys()].every((id) => sources.has(id)), 'direct_target_outside_scope');
  need([...consensus.keys()].every((id) => sourceGroups.has(Number(id))), 'consensus_outside_scope');
  need([...authorities.keys()].every((id) => sourceGroups.has(Number(id))), 'authority_outside_scope');
  const directTargetCount = [...direct.values()].reduce((sum, entry) => {
    need(Array.isArray(entry.targets), 'direct_targets_required');
    return sum + entry.targets.length;
  }, 0);
  need(snapshot.counts.sources === sources.size
    && snapshot.counts.direct_target_groups === direct.size
    && snapshot.counts.direct_targets === directTargetCount
    && snapshot.counts.group_consensus === consensus.size
    && snapshot.counts.authorities === authorities.size
    && snapshot.counts.set_targets === snapshot.set_targets.length, 'count_mismatch');
  const serialized = JSON.stringify(snapshot);
  need(!containsCredentialKey(snapshot) && !/(?:postgres(?:ql)?:\/\/)/i.test(serialized),
    'credential_material_forbidden');
  return {
    sourceRun: snapshot.source_run,
    sources: [...sources.values()].sort((a, b) => a.source_product_id - b.source_product_id),
    directTargetsByProduct: new Map([...direct].map(([id, entry]) => [Number(id), entry.targets])),
    consensusByGroup: new Map([...consensus].map(([id, entry]) => [Number(id), entry.row])),
    authorities: new Map([...authorities].map(([id, entry]) => [Number(id), entry.row])),
    setTargets: snapshot.set_targets,
    databaseTarget: snapshot.database_target,
    snapshotReceipt: {
      schema_version: snapshot.schema_version,
      captured_at: snapshot.captured_at,
      coverage_gaps_sha256: snapshot.coverage_gaps_sha256,
      credential_free_offline_plan: true,
    },
  };
}
