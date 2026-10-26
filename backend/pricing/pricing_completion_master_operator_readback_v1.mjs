/** Offline, digest-pinned evidence only. No DB, credentials, environment, files,
 * subprocess or live server authentication. Caller pins reviewed capture hashes.
 * Master and source exports are separate transactions and are never coalesced.
 */
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { buildPricingCompletionMasterGapExportV1 } from './pricing_completion_master_gap_export_v1.mjs';
import { normalizePricingCompletionSnapshotV1 } from './pricing_completion_intake_v1.mjs';

export const PRICING_COMPLETION_MASTER_OPERATOR_READBACK_V1 = 'PRICING_COMPLETION_MASTER_OPERATOR_READBACK_V1';
const CA = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOP = ['version','projectRef','verifiedTls','readOnly','rollbackAcknowledged','capturedAt','sqlSha256','caSha256',
  'sourceRunId','publicationSetId','sourceSyncRunId','scope','sourceCoverage','physicalConditionVerified','databaseWrites',
  'inventoryComplete','readbackComplete','batchSize','invalidParentRoutes','appRpcSha256','records'];
const ENV = ['kind','read_only','isolation','database','captured_at','server_version','cards','sets','traits','migrations','latest_migration'];
const POINTER = ['run_id','publication_set_id','publication_state','state','reconciliation_state','run_mode','source_sync_run_id',
  'completed_at','selected_count','snapshot_count','source_finished_at','source_status','sync_mode','source_failed_count'];
const FIXED = ['environment','rpc_definition','current_publication_before','master_counts','parents','printings','current_publication_after','transaction_end'];
const SCOPE = { games: ['pokemon'], currency: 'USD', priceBasis: 'TCGPLAYER_MARKET', condition: 'NOT_CONDITION_SPECIFIC' };
function need(ok, code) { if (!ok) throw new Error(`pricing_master_operator_readback:${code}`); }
function exact(value, names, code) {
  need(value && Object.getPrototypeOf(value) === Object.prototype, `${code}_object_required`);
  need(Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)), `${code}_exact_fields_required`);
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
function equal(a, b) { return canonical(a) === canonical(b); }
function count(v, min, code) { need(Number.isSafeInteger(v) && v >= min, code); }
function timestamp(value, code) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|\+00:00)$/.test(value), code);
  const canonicalMs = value.replace(/(?:Z|\+00:00)$/, '').replace(/\.(\d+)$/, (_, f) => '.' + f.padEnd(3, '0').slice(0, 3));
  const expected = canonicalMs.includes('.') ? canonicalMs + 'Z' : canonicalMs + '.000Z';
  const ms = Date.parse(expected);
  need(Number.isFinite(ms) && new Date(ms).toISOString() === expected, code);
  return ms;
}
function rows(record, min, max, code) {
  exact(record, ['kind','rows'], code); need(Array.isArray(record.rows) && record.rows.length >= min && record.rows.length <= max, `${code}_row_bound`);
  return record.rows;
}

export function normalizePricingCompletionMasterOperatorReadbackV1({ readbackBytes, expectedReadbackSha256,
  expectedSqlSha256, expectedRpcSha256, now, maxCaptureAgeMs = 86400000 } = {}) {
  need(Buffer.isBuffer(readbackBytes) || readbackBytes instanceof Uint8Array, 'original_bytes_required');
  need(readbackBytes.byteLength > 0 && readbackBytes.byteLength <= 256 * 1024 * 1024, 'size_invalid');
  need([expectedReadbackSha256, expectedSqlSha256, expectedRpcSha256].every(v => typeof v === 'string' && SHA.test(v)), 'external_hashes_required');
  count(now, 0, 'explicit_now_required'); count(maxCaptureAgeMs, 1, 'capture_age_invalid');
  need(maxCaptureAgeMs <= 86400000, 'capture_age_exceeds_one_day');
  need(sha(readbackBytes) === expectedReadbackSha256, 'readback_hash_mismatch');
  let input;
  try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readbackBytes)); }
  catch { throw new Error('pricing_master_operator_readback:invalid_utf8_or_json'); }
  exact(input, TOP, 'envelope');
  need(input.version === 'FIXED_OPERATOR_POKEMON_MASTER_CENSUS_V1', 'version_mismatch');
  need(input.projectRef === 'ycdxbpibncqcchqiihfz' && input.caSha256 === CA, 'project_or_ca_mismatch');
  need(input.sqlSha256 === expectedSqlSha256 && input.appRpcSha256 === expectedRpcSha256, 'sql_or_rpc_pin_mismatch');
  need(input.verifiedTls === true && input.readOnly === true && input.rollbackAcknowledged === true && input.databaseWrites === 0, 'transport_or_write_claim');
  need(equal(input.scope, SCOPE) && input.sourceCoverage === 'unknown' && input.physicalConditionVerified === false, 'scope_mismatch');
  need(input.inventoryComplete === true && input.readbackComplete === true && input.batchSize === 500, 'census_claim_mismatch');
  need(input.invalidParentRoutes === 0, 'invalid_parent_routes');
  for (const key of ['sourceRunId','publicationSetId','sourceSyncRunId']) need(UUID.test(input[key] ?? ''), 'publication_identity_invalid');
  const captured = timestamp(input.capturedAt, 'capture_timestamp_invalid');
  need(captured <= now && now - captured <= maxCaptureAgeMs, 'capture_stale_or_future');
  need(Array.isArray(input.records) && input.records.length >= FIXED.length && input.records.length <= FIXED.length + 300, 'records_bound');
  need(equal(input.records.filter(r => r?.kind !== 'rpc_batch').map(r => r?.kind), FIXED), 'fixed_records_order_or_count');
  const fixed = new Map(input.records.filter(r => r.kind !== 'rpc_batch').map(r => [r.kind, r]));
  const batches = input.records.filter(r => r.kind === 'rpc_batch');
  need(equal(input.records.map(r => r.kind), [...FIXED.slice(0, 6), ...batches.map(() => 'rpc_batch'), ...FIXED.slice(6)]), 'batch_records_position');
  const env = fixed.get('environment'); exact(env, ENV, 'environment');
  need(env.read_only === 'on' && env.isolation === 'repeatable read' && env.database === 'postgres', 'transaction_guard');
  need(typeof env.server_version === 'string' && env.server_version.length > 0, 'server_version_required');
  count(env.cards, 40000, 'cards_maturity'); count(env.sets, 150, 'sets_maturity'); count(env.traits, 5000, 'traits_maturity'); count(env.migrations, 444, 'migration_maturity');
  need(typeof env.latest_migration === 'string' && /^\d{14}$/.test(env.latest_migration), 'migration_version');
  const transactionTime = timestamp(env.captured_at, 'transaction_time_invalid');
  need(transactionTime <= captured && now - transactionTime <= maxCaptureAgeMs, 'transaction_stale_or_future');
  const rpc = fixed.get('rpc_definition'); exact(rpc, ['kind','signature','definition_sha256','definition'], 'rpc_definition');
  need(rpc.signature === 'public.get_market_pricing_read_model_v1(uuid[],uuid[])' && typeof rpc.definition === 'string'
    && rpc.definition.length > 0 && rpc.definition.length <= 1024 * 1024
    && rpc.definition_sha256 === expectedRpcSha256 && sha(rpc.definition) === expectedRpcSha256, 'rpc_definition_mismatch');
  const before = rows(fixed.get('current_publication_before'), 1, 1, 'pointer_before')[0];
  const after = rows(fixed.get('current_publication_after'), 1, 1, 'pointer_after')[0];
  exact(before, POINTER, 'pointer'); exact(after, POINTER, 'pointer'); need(equal(before, after), 'publication_changed');
  need(before.run_id === input.sourceRunId && before.publication_set_id === input.publicationSetId
    && before.source_sync_run_id === input.sourceSyncRunId, 'publication_binding');
  need(before.run_mode === 'production' && ['published','verified'].includes(before.state) && before.publication_state === 'published'
    && before.reconciliation_state === 'reconciled' && before.source_status === 'completed' && before.sync_mode === 'current_full_sync'
    && before.source_failed_count === 0, 'publication_state');
  count(before.selected_count, 1, 'selected_count'); count(before.snapshot_count, 0, 'snapshot_count');
  need(before.snapshot_count <= before.selected_count, 'publication_counts');
  need(timestamp(before.source_finished_at, 'source_timestamp') <= timestamp(before.completed_at, 'publication_timestamp')
    && timestamp(before.completed_at, 'publication_timestamp') <= transactionTime, 'publication_time_binding');
  const terminal = fixed.get('transaction_end'); exact(terminal, ['kind','status','read_only_after','isolation_after'], 'terminal');
  need(terminal.status === 'ROLLBACK' && terminal.read_only_after === 'on' && terminal.isolation_after === 'read committed', 'terminal_claim');
  const counts = rows(fixed.get('master_counts'), 1, 1, 'counts')[0];
  exact(counts, ['parents_count','printings_count','parents_without_printings_count','invalid_parent_routes_count'], 'counts');
  for (const value of Object.values(counts)) count(value, 0, 'invalid_census_count');
  need(counts.invalid_parent_routes_count === 0, 'invalid_parent_routes');
  const parents = rows(fixed.get('parents'), 1, 100000, 'parents');
  const printings = rows(fixed.get('printings'), 0, 150000, 'printings');
  need(parents.length === counts.parents_count && printings.length === counts.printings_count && parents.length <= env.cards, 'census_count_mismatch');
  const ids = printings.map(p => p.id).sort();
  need(ids.every(id => typeof id === 'string' && UUID.test(id)) && new Set(ids).size === ids.length, 'printing_ids_invalid');
  need(batches.length === Math.ceil(ids.length / 500), 'batch_count_mismatch');
  const prices = [];
  for (const [index, batch] of batches.entries()) {
    exact(batch, ['kind','batchIndex','requestedPrintingIds','sourceRunId','publicationSetId','rows'], 'batch');
    const requested = ids.slice(index * 500, (index + 1) * 500);
    need(batch.batchIndex === index && equal(batch.requestedPrintingIds, requested), 'batch_exact_request_mismatch');
    need(batch.sourceRunId === input.sourceRunId && batch.publicationSetId === input.publicationSetId, 'batch_publication_binding');
    need(Array.isArray(batch.rows) && batch.rows.length === requested.length
      && equal(batch.rows.map(r => r?.card_printing_id).sort(), requested), 'batch_exact_readback_mismatch');
    for (const row of batch.rows) {
      const price = { ...row };
      // Invalid/missing price timestamps stay unusable gaps. Valid PG microseconds
      // are normalized to the millisecond precision consumed by the app adapter.
      for (const field of ['observed_at','published_at']) {
        try { price[field] = new Date(timestamp(price[field], 'price_timestamp')).toISOString(); }
        catch { /* The master builder records the failed timestamp explicitly. */ }
      }
      prices.push(price);
    }
  }
  const observedAt = new Date(transactionTime).toISOString();
  const scope = { ...SCOPE, sourceRunId: input.sourceRunId, observedAt, evidenceRef: `sha256:${expectedReadbackSha256}`, batchSize: 500 };
  const master = buildPricingCompletionMasterGapExportV1({ scope, inventoryComplete: true, readbackComplete: true, parents, printings, prices });
  need(master.parentsWithoutPrintings.length === counts.parents_without_printings_count, 'parents_without_printings_count_mismatch');
  const snapshot = { schemaVersion: 'pricing-completion-input-v1', sourceRunId: input.sourceRunId, observedAt,
    coverage: { sourceToMaster: { status: 'unknown' }, ...master.coverage }, observations: master.observations };
  const normalized = normalizePricingCompletionSnapshotV1(snapshot, { now, maxAgeMs: maxCaptureAgeMs });
  return { snapshot, normalized, master, receipt: {
    version: PRICING_COMPLETION_MASTER_OPERATOR_READBACK_V1, transport: 'fixed_operator_readback', liveDatabaseAccess: false,
    databaseWrites: 0, sourceCoverage: 'unknown', sourceRunId: input.sourceRunId, publicationSetId: input.publicationSetId,
    sourceSyncRunId: input.sourceSyncRunId, transactionObservedAt: observedAt, operatorCapturedAt: input.capturedAt,
    validatedAt: new Date(now).toISOString(), projectRef: input.projectRef, caSha256: CA,
    readbackSha256: expectedReadbackSha256, sqlSha256: expectedSqlSha256, appRpcSha256: expectedRpcSha256,
    operatorVerifiedTlsClaim: true, operatorReadOnlyClaim: true, operatorRollbackAcknowledgedClaim: true,
    remoteRollbackVerifiedByAdapter: false, environment: env, currentPublication: before,
    exactReadModel: rpc.signature, exactReadbackBatches: batches.length, coverage: master.coverage, summary: master.summary,
    scope: master.scope, queueResolutionAllowed: false,
    authenticityBoundary: 'Externally pinned operator-capture bytes; no live transport, server identity or remote rollback was independently authenticated by this offline adapter.',
    transactionBoundary: 'This Master census is a separate transaction from source backlog captures. Source coverage remains unknown; absence never resolves existing queue work.',
  } };
}
