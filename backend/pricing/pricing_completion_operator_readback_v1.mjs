/** Offline validation of separately captured, digest-pinned operator evidence.
 * Hashes establish exact bytes, not operator authenticity. The caller must pin
 * the SQL and result hashes from the reviewed operator capture independently.
 * No database connection, credentials, environment, subprocess or file access.
 * The strict replay below exercises the existing source validator, not a DB.
 */
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import {
  readPricingCompletionSourceSnapshotV1,
  PRICING_COMPLETION_SOURCE_RUN_SQL_V1,
  PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1,
  PRICING_COMPLETION_SOURCE_ROWS_SQL_V1,
} from './pricing_completion_source_export_v1.mjs';

export const PRICING_COMPLETION_OPERATOR_READBACK_V1 = 'PRICING_COMPLETION_OPERATOR_READBACK_V1';
export const PRICING_COMPLETION_OPERATOR_CA_SHA256_V1 = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const PROJECT = 'ycdxbpibncqcchqiihfz';
const SHA = /^[a-f0-9]{64}$/;
const MAX_ROWS = 250000;
const TOP_FIELDS = ['version', 'projectRef', 'verifiedTls', 'readOnly', 'rollbackAcknowledged', 'sqlSha256', 'caSha256',
  'capturedAt', 'sourceRunId', 'publicationSetId', 'scope', 'masterCoverage', 'databaseWrites', 'records'];
const ENV_FIELDS = ['kind', 'read_only', 'isolation', 'database', 'captured_at', 'server_version', 'cards', 'sets', 'traits', 'migrations', 'latest_migration'];
const OPERATOR_SCOPE = 'All non-publish decisions in the exact frozen current pricing run only; no Master census or all-warehouse completeness claim.';
export const PRICING_COMPLETION_OPERATOR_SCOPE_V2 = 'All non-publish decisions in the current published pricing run, bound inside one read-only repeatable-read transaction; TCGPLAYER_MARKET USD quotes, not physical-condition pricing. No Master census or all-warehouse completeness claim.';
const KINDS = ['environment', 'source_run', 'source_counts', 'source_rows', 'current_publication'];
const BEGIN = 'begin isolation level repeatable read read only';
const GUARD = "select current_setting('transaction_read_only') as read_only, current_setting('transaction_isolation') as isolation";
function requireValue(ok, code) { if (!ok) throw new Error(`pricing_operator_readback:${code}`); }
function fields(value, names, code) {
  requireValue(value && Object.getPrototypeOf(value) === Object.prototype, `${code}_object_required`);
  requireValue(Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)), `${code}_exact_fields_required`);
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function count(value, minimum, code) { requireValue(Number.isSafeInteger(value) && value >= minimum, code); }
function text(value, code) { requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200, code); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

export async function normalizePricingCompletionOperatorReadbackV1({ readbackBytes, expectedReadbackSha256,
  expectedSqlSha256, now, maxCaptureAgeMs = 86400000 } = {}) {
  requireValue(Buffer.isBuffer(readbackBytes) || readbackBytes instanceof Uint8Array, 'original_utf8_bytes_required');
  requireValue(readbackBytes.byteLength > 0 && readbackBytes.byteLength <= 256 * 1024 * 1024, 'readback_size_invalid');
  requireValue(SHA.test(expectedReadbackSha256 ?? '') && SHA.test(expectedSqlSha256 ?? ''), 'external_hashes_required');
  count(now, 0, 'explicit_now_required'); count(maxCaptureAgeMs, 1, 'capture_age_limit_invalid');
  requireValue(maxCaptureAgeMs <= 86400000, 'capture_age_limit_exceeds_one_day');
  requireValue(sha(readbackBytes) === expectedReadbackSha256, 'readback_hash_mismatch');
  let input;
  try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readbackBytes)); }
  catch { throw new Error('pricing_operator_readback:invalid_utf8_or_json'); }
  fields(input, TOP_FIELDS, 'envelope');
  const recurringSnapshot = input.version === 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2';
  requireValue(recurringSnapshot || input.version === 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V1', 'operator_version_mismatch');
  requireValue(input.projectRef === PROJECT, 'project_mismatch');
  requireValue(input.verifiedTls === true && input.readOnly === true, 'transport_claims_not_readonly_verified_tls');
  requireValue(input.rollbackAcknowledged === true && input.databaseWrites === 0, 'operator_rollback_or_write_claim_mismatch');
  requireValue(input.scope === (recurringSnapshot ? PRICING_COMPLETION_OPERATOR_SCOPE_V2 : OPERATOR_SCOPE)
    && input.masterCoverage === 'unknown', 'operator_scope_mismatch');
  requireValue(input.sqlSha256 === expectedSqlSha256, 'sql_hash_mismatch');
  requireValue(input.caSha256 === PRICING_COMPLETION_OPERATOR_CA_SHA256_V1, 'pinned_ca_mismatch');
  requireValue(typeof input.capturedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|\+00:00)$/.test(input.capturedAt), 'capture_timestamp_invalid');
  const capturedAtMs = Date.parse(input.capturedAt);
  requireValue(Number.isFinite(capturedAtMs) && capturedAtMs <= now && now - capturedAtMs <= maxCaptureAgeMs, 'capture_stale_or_future');
  const kinds = recurringSnapshot ? [...KINDS, 'transaction_end'] : KINDS;
  requireValue(Array.isArray(input.records) && input.records.length === kinds.length, 'exact_version_records_required');
  const records = new Map();
  for (const record of input.records) {
    requireValue(record && kinds.includes(record.kind) && !records.has(record.kind), 'unknown_or_duplicate_record');
    fields(record, record.kind === 'environment' ? ENV_FIELDS : record.kind === 'transaction_end'
      ? ['kind', 'status', 'read_only_after', 'isolation_after'] : ['kind', 'rows'], 'record');
    if (!['environment', 'transaction_end'].includes(record.kind)) requireValue(Array.isArray(record.rows), 'record_rows_required');
    records.set(record.kind, record);
  }
  requireValue(kinds.every(kind => records.has(kind)), 'missing_record');
  if (recurringSnapshot) {
    requireValue(input.records.every((record, i) => record.kind === kinds[i]), 'operator_record_order_mismatch');
    const terminal = records.get('transaction_end');
    requireValue(terminal.status === 'ROLLBACK' && terminal.read_only_after === 'on'
      && terminal.isolation_after === 'read committed', 'operator_terminal_mismatch');
  }
  const environment = records.get('environment');
  requireValue(environment.read_only === 'on' && environment.isolation === 'repeatable read', 'transaction_guard_mismatch');
  requireValue(environment.database === 'postgres', 'database_mismatch');
  text(environment.server_version, 'server_version_required');
  const transactionCapturedAt = Date.parse(environment.captured_at);
  requireValue(typeof environment.captured_at === 'string' && Number.isFinite(transactionCapturedAt)
    && transactionCapturedAt <= capturedAtMs && capturedAtMs - transactionCapturedAt <= maxCaptureAgeMs,
  'transaction_capture_timestamp_invalid');
  count(environment.cards, 40000, 'canonical_cards_below_maturity');
  count(environment.sets, 150, 'canonical_sets_below_maturity');
  count(environment.traits, 5000, 'canonical_traits_below_maturity');
  count(environment.migrations, 444, 'migration_inventory_below_operator_baseline');
  requireValue(typeof environment.latest_migration === 'string' && /^\d{14}$/.test(environment.latest_migration), 'latest_migration_invalid');
  for (const kind of ['source_run', 'source_counts', 'current_publication']) requireValue(records.get(kind).rows.length === 1, `${kind}_single_row_required`);
  requireValue(records.get('source_rows').rows.length <= MAX_ROWS, 'source_row_bound_exceeded');
  if (recurringSnapshot) requireValue(records.get('source_rows').rows.every(row => row?.currency === 'USD'), 'v2_quote_currency_mismatch');
  const run = records.get('source_run').rows[0];
  const pointer = records.get('current_publication').rows[0];
  fields(pointer, ['run_id', 'publication_set_id', 'publication_state', 'state', 'reconciliation_state'], 'current_publication');
  requireValue(run && pointer.run_id === run.id && pointer.publication_set_id === run.publication_set_id
    && input.sourceRunId === run.id && input.publicationSetId === run.publication_set_id, 'current_publication_context_mismatch');
  requireValue(run.run_mode === 'production' && ['published', 'verified'].includes(run.state)
    && run.reconciliation_state === 'reconciled' && run.publication_state === 'published', 'source_run_not_current_production');
  requireValue(['published', 'verified'].includes(pointer.state) && pointer.publication_state === 'published'
    && pointer.reconciliation_state === 'reconciled', 'current_pointer_state_mismatch');
  requireValue(Date.parse(run.completed_at) <= transactionCapturedAt && Date.parse(run.source_finished_at) <= transactionCapturedAt, 'source_postdates_operator_capture');
  if (recurringSnapshot) requireValue(Date.parse(run.source_finished_at) <= Date.parse(run.completed_at)
    && capturedAtMs - Date.parse(run.source_finished_at) <= 86400000, 'v2_source_not_fresh_at_capture');

  const expected = [
    [BEGIN, undefined, { command: 'BEGIN', rows: [] }],
    ["set local lock_timeout = '3s'", undefined, { command: 'SET', rows: [] }],
    [GUARD, undefined, { rows: [{ read_only: environment.read_only, isolation: environment.isolation }] }],
    [PRICING_COMPLETION_SOURCE_RUN_SQL_V1, [run.id], { rows: records.get('source_run').rows }],
    [PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1, [run.id, run.publication_set_id], { rows: records.get('source_counts').rows }],
    [PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, [run.id, MAX_ROWS + 1], { rows: records.get('source_rows').rows }],
    ['rollback', undefined, { command: 'ROLLBACK', rows: [] }],
  ];
  let cursor = 0;
  const replay = { async query(sql, values) {
    // Validation exceptions trigger cleanup rollback in the reused normalizer.
    // This consumes no evidence and is never asserted as a remote transaction.
    if (sql === 'rollback' && cursor !== expected.length - 1) return { command: 'ROLLBACK', rows: [] };
    const step = expected[cursor];
    requireValue(step && step[0] === sql && same(step[1], values), 'unexpected_query_or_parameters');
    cursor++;
    return step[2];
  } };
  const result = await readPricingCompletionSourceSnapshotV1(replay, { now, expectedRunId: run.id, maxRows: MAX_ROWS });
  requireValue(cursor === expected.length, 'incomplete_query_replay');
  const { rollbackAcknowledged: ignoredReplayRollback, ...sourceReceipt } = result.receipt;
  void ignoredReplayRollback;
  return { snapshot: result.snapshot, normalized: result.normalized, receipt: {
    ...sourceReceipt, version: PRICING_COMPLETION_OPERATOR_READBACK_V1,
    sourceValidatorVersion: result.receipt.version, transport: 'fixed_operator_readback',
    liveDatabaseAccess: false, queryReplayCompleted: true, databaseWrites: 0,
    remoteRollbackVerifiedByAdapter: false,
    operatorCapturedAt: input.capturedAt, validatedAt: new Date(now).toISOString(),
    readbackSha256: expectedReadbackSha256, sqlSha256: expectedSqlSha256, caSha256: input.caSha256,
    projectRef: input.projectRef, operatorVerifiedTlsClaim: true, operatorReadOnlyClaim: true,
    operatorRollbackAcknowledgedClaim: true, operatorScope: input.scope,
    operatorExportVersion: input.version, operatorTerminalRecordValidated: recurringSnapshot,
    environment, currentPublication: pointer, masterCoverage: 'unknown',
    authenticityBoundary: 'Externally pinned operator-capture bytes; no live transport, server identity or remote rollback was independently authenticated by this offline adapter.',
  } };
}
