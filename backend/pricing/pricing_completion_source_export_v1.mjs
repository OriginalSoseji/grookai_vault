import { createHash } from 'node:crypto';
import {
  normalizePricingCompletionSnapshotV1, pricingCompletionReasonRouteV1,
  PRICING_COMPLETION_INPUT_V1, PRICING_COMPLETION_LANES_V1,
} from './pricing_completion_intake_v1.mjs';

export const PRICING_COMPLETION_SOURCE_EXPORT_V1 = 'pricing-completion-source-export-v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const COUNTS = ['selected_count', 'eligible_count', 'snapshot_count', 'excluded_count', 'quarantined_count', 'delayed_count', 'suppressed_count'];
export const PRICING_COMPLETION_SOURCE_RUN_SQL_V1 = `
select run.id::text, run.run_key, run.source_sync_run_id::text,
       selected_publication.id::text as publication_set_id,
       run.selected_count, run.eligible_count, run.snapshot_count,
       run.excluded_count, run.quarantined_count, run.delayed_count,
       run.suppressed_count, run.completed_at,
       source.finished_at as source_finished_at, source.status as source_status,
       source.sync_mode, source.failed_count as source_failed_count
from public.market_price_pipeline_runs run
left join public.tcgcsv_source_sync_runs source on source.id = run.source_sync_run_id
left join public.market_price_publication_sets selected_publication on selected_publication.run_id = run.id
where run.run_mode = 'production' and run.state in ('published', 'verified')
  and run.reconciliation_state = 'reconciled'
  and ($1::uuid is null or run.id = $1::uuid)
order by run.completed_at desc nulls last, run.created_at desc, run.id desc limit 1`;

// Mirrors current_context in 20261001203000_jungle_edition_price_reader_integration_v1.sql.
// The Master RPC follows this pointer, not the latest/explicitly selected historical run.
export const PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1 = `
select current_state.run_id::text, current_state.publication_set_id::text
from public.market_price_current_publication current_state
join public.market_price_publication_sets publication_set
  on publication_set.id = current_state.publication_set_id
 and publication_set.run_id = current_state.run_id
 and publication_set.publication_state = 'published'
join public.market_price_pipeline_runs pipeline_run
  on pipeline_run.id = publication_set.run_id
 and pipeline_run.reconciliation_state = 'reconciled'
 and pipeline_run.state in ('published', 'verified')
where current_state.singleton`;

export const PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1 = `
select count(*)::integer as selected_count,
       count(*) filter (where eligible = true and decision = 'publish' and publication_lane = 'current')::integer as eligible_count,
       count(*) filter (where decision = 'publish')::integer as publish_count,
       count(*) filter (where decision = 'exclude')::integer as excluded_count,
       count(*) filter (where decision = 'quarantine')::integer as quarantined_count,
       count(*) filter (where decision = 'delay')::integer as delayed_count,
       count(*) filter (where decision = 'suppress_stale')::integer as suppressed_count,
       count(*) filter (where decision <> 'publish')::integer as unresolved_count,
       (select count(*)::integer from public.market_price_publication_snapshots
        where publication_set_id = $2::uuid and run_id = $1::uuid) as snapshot_count
from public.market_price_qualification_decisions where run_id = $1::uuid`;

export const PRICING_COMPLETION_SOURCE_ROWS_SQL_V1 = `
select decision.id::text as decision_id, decision.run_id::text,
       decision.decision, decision.reason_codes[1] as primary_reason,
       decision.source_observation_id::text, decision.source_product_id,
       decision.source_subtype_name, decision.currency, decision.source_row_hash,
       decision.source_artifact_hash, decision.source_price_row_identity,
       decision.source_sync_run_id::text, decision.card_print_id::text,
       decision.card_printing_id::text, decision.market_price,
       coalesce(observation.category_id, product.category_id,
                nullif(decision.evidence ->> 'category_id', '')::integer) as category_id,
       coalesce(observation.group_id, product.group_id) as group_id,
       product.name as source_product_name, source_group.name as source_group_name,
       decision.evidence ->> 'product_scope_result' as product_scope_result,
       observation.id is not null as source_observation_present,
       product.product_id is not null as source_product_present,
       observation.product_id as observed_product_id,
       observation.subtype_name as observed_subtype_name,
       observation.source_price_row_identity as observed_price_row_identity,
       observation.currency as observed_currency,
       observation.payload_hash as observed_payload_hash
from public.market_price_qualification_decisions decision
left join public.tcgcsv_source_price_daily_observations observation
  on observation.id = decision.source_observation_id
left join public.tcgcsv_source_products product
  on product.product_id = decision.source_product_id
left join public.tcgcsv_source_groups source_group
  on source_group.group_id = coalesce(observation.group_id, product.group_id)
where decision.run_id = $1::uuid and decision.decision <> 'publish'
order by decision.id limit $2::integer`;

function requireValue(ok, code) { if (!ok) throw new Error(`pricing-source-export:${code}`); }
function count(value) { requireValue(Number.isSafeInteger(value) && value >= 0, 'invalid_count'); return value; }
function text(value) { requireValue(typeof value === 'string' && value.length > 0 && value === value.trim(), 'missing_exact_text'); return value; }
function time(value) {
  const result = value instanceof Date ? value.toISOString() : text(value);
  requireValue(Number.isFinite(Date.parse(result)), 'invalid_time');
  return new Date(result).toISOString();
}
function id(value) {
  requireValue((Number.isSafeInteger(value) && value > 0) || (typeof value === 'string' && /^[1-9]\d*$/.test(value)), 'missing_source_dimension');
  return String(value);
}
function sha(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

/** Dedicated read-only connection config. Does not read process.env or initialize a client. */
export function pricingCompletionReadOnlyDatabaseConfigV1(connectionString, { ca, insecureTlsEnvironment = false } = {}) {
  requireValue(!insecureTlsEnvironment, 'insecure_tls_environment');
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('pricing-source-export:invalid_database_url'); }
  requireValue(['postgres:', 'postgresql:'].includes(url.protocol), 'invalid_database_protocol');
  requireValue(url.search === '' && url.hash === '', 'database_url_options_forbidden');
  requireValue(Boolean(url.hostname) && url.pathname.length > 1, 'database_target_missing');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (ca !== undefined) requireValue(typeof ca === 'string' && ca.includes('-----BEGIN CERTIFICATE-----'), 'invalid_ca');
  return {
    connectionString: url.href,
    ssl: local ? false : { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) },
    options: '-c default_transaction_read_only=on', application_name: 'pricing_completion_source_export_v1_readonly',
    connectionTimeoutMillis: 15000, statement_timeout: 120000, query_timeout: 125000,
  };
}

/** Fixed SQL only. Caller supplies a dedicated read-only client; no candidate-provided queries. */
export async function readPricingCompletionSourceSnapshotV1(client, { now, maxAgeMs = 86400000, expectedRunId = null, maxRows = 250000, readMasterSnapshot = null } = {}) {
  count(now);
  requireValue(Number.isSafeInteger(maxRows) && maxRows > 0 && maxRows <= 1000000, 'invalid_row_limit');
  requireValue(expectedRunId === null || UUID.test(expectedRunId), 'invalid_expected_run');
  requireValue(client && typeof client.query === 'function', 'client_required');
  requireValue(readMasterSnapshot === null || typeof readMasterSnapshot === 'function', 'invalid_master_reader');
  let begun = false;
  let rolledBack = false;
  try {
    await client.query('begin isolation level repeatable read read only'); begun = true;
    await client.query("set local lock_timeout = '3s'");
    const transaction = await client.query("select current_setting('transaction_read_only') as read_only, current_setting('transaction_isolation') as isolation");
    requireValue(transaction.rows[0]?.read_only === 'on' && transaction.rows[0]?.isolation === 'repeatable read', 'transaction_not_read_only_repeatable_read');
    const run = (await client.query(PRICING_COMPLETION_SOURCE_RUN_SQL_V1, [expectedRunId])).rows[0];
    requireValue(run && UUID.test(run.id) && UUID.test(run.source_sync_run_id), 'run_missing');
    requireValue(UUID.test(run.publication_set_id), 'selected_publication_set_missing');
    requireValue(expectedRunId === null || run.id === expectedRunId, 'run_mismatch');
    requireValue(run.source_status === 'completed' && run.sync_mode === 'current_full_sync' && run.source_failed_count === 0, 'source_run_not_reconciled');
    for (const key of COUNTS) count(run[key]);
    const observedAt = time(run.source_finished_at);
    const completedAt = time(run.completed_at);
    requireValue(Date.parse(observedAt) <= Date.parse(completedAt) && Date.parse(completedAt) <= now, 'run_time_mismatch');
    const counts = (await client.query(PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1, [run.id, run.publication_set_id])).rows[0];
    requireValue(counts, 'counts_missing');
    for (const key of ['selected_count', 'eligible_count', 'publish_count', 'excluded_count', 'quarantined_count', 'delayed_count', 'suppressed_count', 'unresolved_count', 'snapshot_count']) count(counts[key]);
    for (const key of COUNTS) requireValue(counts[key] === run[key], 'run_ledger_count_mismatch');
    requireValue(run.snapshot_count === counts.eligible_count && counts.publish_count === counts.eligible_count, 'published_count_mismatch');
    requireValue(counts.selected_count === counts.publish_count + counts.unresolved_count, 'decision_partition_mismatch');
    requireValue(counts.unresolved_count === counts.excluded_count + counts.quarantined_count + counts.delayed_count + counts.suppressed_count, 'unresolved_partition_mismatch');
    requireValue(counts.unresolved_count <= maxRows, 'row_limit_requires_larger_explicit_bound');
    const rows = (await client.query(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, [run.id, maxRows + 1])).rows;
    requireValue(rows.length === counts.unresolved_count && rows.length <= maxRows, 'exported_row_count_mismatch');
    const actualDecisions = { exclude: 0, quarantine: 0, delay: 0, suppress_stale: 0 };
    const byLane = Object.fromEntries(PRICING_COMPLETION_LANES_V1.map((lane) => [lane, 0]));
    const decisionIds = new Set();
    const observationIds = new Set();
    const observations = rows.map((row) => {
      requireValue(UUID.test(row.decision_id) && !decisionIds.has(row.decision_id), 'duplicate_or_invalid_decision'); decisionIds.add(row.decision_id);
      requireValue(UUID.test(row.source_observation_id) && !observationIds.has(row.source_observation_id), 'duplicate_or_invalid_observation'); observationIds.add(row.source_observation_id);
      requireValue(row.run_id === run.id && row.source_sync_run_id === run.source_sync_run_id, 'row_provenance_mismatch');
      requireValue(Object.hasOwn(actualDecisions, row.decision), 'unknown_decision'); actualDecisions[row.decision]++;
      const route = pricingCompletionReasonRouteV1(row.primary_reason);
      requireValue(Object.hasOwn(byLane, route.lane), 'invalid_source_lane'); byLane[route.lane]++;
      const category = id(row.category_id);
      const productId = id(row.source_product_id);
      requireValue(/^[A-Z]{3}$/.test(row.currency), 'currency_missing');
      if (row.source_observation_present) {
        requireValue(id(row.observed_product_id) === productId, 'source_observation_product_mismatch');
        requireValue(text(row.observed_subtype_name) === text(row.source_subtype_name), 'source_observation_subtype_mismatch');
        requireValue(text(row.observed_price_row_identity) === text(row.source_price_row_identity), 'source_observation_identity_mismatch');
        requireValue(row.observed_currency === row.currency, 'currency_evidence_mismatch');
      }
      return {
        identity: { kind: 'source', provider: 'tcgplayer', category, productId, subtype: text(row.source_subtype_name), currency: row.currency, condition: 'NOT_CONDITION_SPECIFIC' },
        reason: row.primary_reason, sourceRunId: run.id,
        scope: `tcgplayer/category/${category}/group/${row.group_id === null ? 'unknown' : id(row.group_id)}`,
        owner: route.owner, nextAction: route.nextAction,
        evidence: {
          sourceObservationId: row.source_observation_id, qualificationDecisionId: row.decision_id,
          sourceFinishedAt: observedAt,
          sourceSyncRunId: row.source_sync_run_id, sourceRowHash: row.source_row_hash,
          sourceArtifactHash: row.source_artifact_hash, sourcePriceRowIdentity: row.source_price_row_identity,
          observedPayloadHash: row.observed_payload_hash, sourceObservationPresent: row.source_observation_present,
          observedProductId: row.observed_product_id, observedSubtypeName: row.observed_subtype_name,
          observedPriceRowIdentity: row.observed_price_row_identity,
          sourceProductPresent: row.source_product_present, sourceProductName: row.source_product_name,
          sourceGroupName: row.source_group_name, productScopeResult: row.product_scope_result,
          sourceDecision: row.decision, candidateCardPrintId: row.card_print_id,
          candidateCardPrintingId: row.card_printing_id, sourceMarketPrice: row.market_price,
          priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false,
          conditionEvidence: 'Application TCGPlayer Market price scope is not condition-specific; no physical condition or NM price is asserted.',
        },
      };
    });
    for (const [decision, field] of Object.entries({ exclude: 'excluded_count', quarantine: 'quarantined_count', delay: 'delayed_count', suppress_stale: 'suppressed_count' })) requireValue(actualDecisions[decision] === counts[field], 'row_decision_partition_mismatch');
    const evidenceDigest = sha({ run, counts, rows });
    const snapshot = {
      schemaVersion: PRICING_COMPLETION_INPUT_V1, sourceRunId: run.id, observedAt,
      coverage: {
        sourceToMaster: { status: 'complete', sourceRunId: run.id, observedAt,
          evidenceRef: `pricing-run-decision-census:sha256:${evidenceDigest}`, expectedUnresolved: counts.unresolved_count,
          lanes: Object.fromEntries(PRICING_COMPLETION_LANES_V1.map((lane) => [lane, { status: 'complete', expectedUnresolved: byLane[lane] }])),
        },
        masterToPrice: { status: 'unknown' },
      }, observations,
    };
    let masterExport = null;
    let publicationBinding = null;
    if (readMasterSnapshot) {
      const pointerRows = (await client.query(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1)).rows;
      requireValue(pointerRows.length === 1, 'current_publication_context_missing_or_ambiguous');
      const pointer = pointerRows[0];
      requireValue(pointer.run_id === run.id && pointer.publication_set_id === run.publication_set_id, 'current_publication_context_mismatch');
      publicationBinding = { runId: run.id, publicationSetId: run.publication_set_id,
        evidenceDigest: sha({ selectedRunId: run.id, selectedPublicationSetId: run.publication_set_id, currentContext: pointer }) };
      // Only a fixed, reviewed module may provide this hook; no JSON/script/SQL configuration is evaluated.
      const capturedAt = new Date(now).toISOString();
      masterExport = await readMasterSnapshot(client, { sourceRunId: run.id, publicationBinding, capturedAt, sourceObservedAt: observedAt });
      requireValue(masterExport && Array.isArray(masterExport.observations) && masterExport.coverage?.masterToPrice, 'master_export_invalid');
      requireValue(masterExport.observations.every((row) => row.identity?.kind === 'master'), 'master_export_contains_source_rows');
      snapshot.observedAt = capturedAt;
      snapshot.publicationBinding = publicationBinding;
      snapshot.coverage.masterToPrice = masterExport.coverage.masterToPrice;
      snapshot.observations = [...snapshot.observations, ...masterExport.observations].map((row) => ({
        ...row, evidence: { ...row.evidence, publicationBinding },
      }));
    }
    const normalized = normalizePricingCompletionSnapshotV1(snapshot, { now, maxAgeMs });
    const rollback = await client.query('rollback');
    requireValue(rollback.command === 'ROLLBACK', 'rollback_not_acknowledged'); rolledBack = true;
    return { snapshot, normalized, masterExport, receipt: {
      version: PRICING_COMPLETION_SOURCE_EXPORT_V1, readOnly: true, rollbackAcknowledged: true,
      runId: run.id, sourceSyncRunId: run.source_sync_run_id, sourceFinishedAt: observedAt, publicationCompletedAt: completedAt,
      capturedAt: new Date(now).toISOString(), evidenceDigest, counts, laneCounts: byLane,
      scope: 'All non-publish qualification decisions in one reconciled published production pricing run; not all warehouse products or Master Index printings.',
      masterCoverage: masterExport?.coverage.masterToPrice.status ?? 'unknown',
      masterScope: masterExport?.scope ?? null,
      publicationBinding,
      priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false,
      missingConditionRows: normalized.summary.unknownIdentityDimensions, databaseWrites: 0,
    } };
  } finally {
    if (begun && !rolledBack) await client.query('rollback');
  }
}
