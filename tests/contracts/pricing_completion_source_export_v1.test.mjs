import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readPricingCompletionSourceSnapshotV1, pricingCompletionReadOnlyDatabaseConfigV1,
  PRICING_COMPLETION_SOURCE_RUN_SQL_V1, PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1,
  PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1,
} from '../../backend/pricing/pricing_completion_source_export_v1.mjs';

const RUN = '00000000-0000-4000-8000-000000000001';
const SYNC = '00000000-0000-4000-8000-000000000002';
const PUBLICATION = '00000000-0000-4000-8000-000000000003';
const NOW = Date.parse('2026-10-13T13:00:00.000Z');
const reasons = ['missing_active_source_mapping', 'missing_printed_number_evidence', 'missing_canonical_printing_identity', 'missing_positive_market_price', 'cosmos_assignment_required', 'special_variant_v1_1'];
function fixture() {
  const run = { id: RUN, run_key: 'fixture', source_sync_run_id: SYNC, publication_set_id: PUBLICATION,
    selected_count: 9, eligible_count: 3, snapshot_count: 3,
    excluded_count: 0, quarantined_count: 6, delayed_count: 0, suppressed_count: 0,
    completed_at: '2026-10-13T12:30:00.000Z', source_finished_at: '2026-10-13T12:00:00.000Z',
    source_status: 'completed', sync_mode: 'current_full_sync', source_failed_count: 0 };
  const counts = { selected_count: 9, eligible_count: 3, publish_count: 3, snapshot_count: 3,
    excluded_count: 0, quarantined_count: 6, delayed_count: 0, suppressed_count: 0, unresolved_count: 6 };
  const rows = reasons.map((reason, index) => ({
    decision_id: `00000000-0000-4000-8000-0000000001${String(index).padStart(2, '0')}`,
    run_id: RUN, decision: 'quarantine', primary_reason: reason,
    source_observation_id: `00000000-0000-4000-8000-0000000002${String(index).padStart(2, '0')}`,
    source_product_id: 100 + index, source_subtype_name: 'Holofoil', currency: 'USD',
    source_row_hash: 'a'.repeat(64), source_artifact_hash: 'b'.repeat(64),
    source_price_row_identity: `product-${index}-Holofoil`, source_sync_run_id: SYNC,
    card_print_id: null, card_printing_id: null, market_price: '2.50', category_id: 3,
    group_id: 10, source_product_name: `fixture-${index}`, source_group_name: 'fixture-set',
    product_scope_result: index === 5 ? 'special_variant_v1_1' : 'in_scope',
    observed_product_id: 100 + index, observed_subtype_name: 'Holofoil', observed_price_row_identity: `product-${index}-Holofoil`,
    source_observation_present: true, source_product_present: true, observed_currency: 'USD', observed_payload_hash: 'a'.repeat(64),
  }));
  return { run, counts, rows };
}
function clientFor(data = fixture(), extras = {}) {
  const calls = [];
  return { calls, async query(sql, values) {
    calls.push({ sql, values });
    if (sql === PRICING_COMPLETION_SOURCE_RUN_SQL_V1) return { rows: data.run ? [data.run] : [] };
    if (sql === PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1) return { rows: [data.counts] };
    if (sql === PRICING_COMPLETION_SOURCE_ROWS_SQL_V1) return { rows: data.rows };
    if (sql === PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1) return { rows: extras.pointerRows ?? [{ run_id: RUN, publication_set_id: PUBLICATION }] };
    if (sql.startsWith('select current_setting')) return { rows: [{ read_only: extras.readOnly ?? 'on', isolation: extras.isolation ?? 'repeatable read' }] };
    if (sql === 'rollback') return { command: extras.rollbackCommand ?? 'ROLLBACK' };
    return { command: 'BEGIN', rows: [] };
  } };
}

test('exports all six source lanes with complete decision census but Master remains unknown', async () => {
  const client = clientFor();
  const result = await readPricingCompletionSourceSnapshotV1(client, { now: NOW });
  assert.equal(result.snapshot.observations.length, 6);
  assert.equal(result.snapshot.coverage.sourceToMaster.status, 'complete');
  assert.equal(Object.keys(result.receipt.laneCounts).length, 6);
  assert.ok(Object.values(result.receipt.laneCounts).every((count) => count === 1));
  assert.equal(result.snapshot.coverage.masterToPrice.status, 'unknown');
  assert.equal(result.normalized.summary.complete, false);
  assert.equal(result.normalized.summary.unknownIdentityDimensions, 0);
  assert.ok(result.snapshot.observations.every((row) => row.identity.condition === 'NOT_CONDITION_SPECIFIC'));
  assert.ok(result.snapshot.observations.every((row) => row.evidence.priceBasis === 'TCGPLAYER_MARKET' && row.evidence.physicalConditionVerified === false));
  assert.equal(result.receipt.priceBasis, 'TCGPLAYER_MARKET');
  assert.equal(result.receipt.physicalConditionVerified, false);
  assert.equal(result.receipt.missingConditionRows, 0);
  assert.equal(result.receipt.databaseWrites, 0);
  assert.equal(client.calls[0].sql, 'begin isolation level repeatable read read only');
  assert.equal(client.calls.at(-1).sql, 'rollback');
  assert.deepEqual(client.calls.find((call) => call.sql === PRICING_COMPLETION_SOURCE_ROWS_SQL_V1).values, [RUN, 250001]);
  assert.deepEqual(client.calls.find((call) => call.sql === PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1).values, [RUN, PUBLICATION]);
});

test('query enumerates every non-publish reason with preserving left joins and bound inputs', () => {
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /decision\.decision <> 'publish'/);
  assert.doesNotMatch(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /reason_codes\[1\] = any/);
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /left join public\.tcgcsv_source_price_daily_observations/);
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /limit \$2::integer/);
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /observation\.product_id as observed_product_id/);
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /observation\.subtype_name as observed_subtype_name/);
  assert.match(PRICING_COMPLETION_SOURCE_ROWS_SQL_V1, /observation\.source_price_row_identity as observed_price_row_identity/);
  assert.match(PRICING_COMPLETION_SOURCE_RUN_SQL_V1, /\$1::uuid/);
});

test('snapshot reconciliation is constrained by both the bound publication set and run', async () => {
  assert.match(PRICING_COMPLETION_SOURCE_RUN_SQL_V1, /selected_publication\.run_id = run\.id/);
  assert.match(PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1, /where publication_set_id = \$2::uuid and run_id = \$1::uuid/);
  const data = fixture(); data.run.publication_set_id = null;
  const client = clientFor(data);
  await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW }), /selected_publication_set_missing/);
  assert.ok(!client.calls.some((call) => call.sql === PRICING_COMPLETION_SOURCE_COUNTS_SQL_V1));
  assert.equal(client.calls.at(-1).sql, 'rollback');
});

test('fresh export time cannot make stale source evidence current', async () => {
  const data = fixture(); data.run.source_finished_at = '2026-10-10T12:00:00.000Z';
  const result = await readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW });
  assert.equal(result.normalized.freshness, 'stale');
  assert.equal(result.normalized.summary.complete, false);
});

test('count mismatch and missing exported rows fail closed and roll back', async () => {
  for (const mutate of [
    (data) => { data.run.selected_count++; },
    (data) => { data.rows.pop(); },
    (data) => { data.counts.snapshot_count--; },
    (data) => { data.counts.quarantined_count = '6'; },
  ]) {
    const data = fixture(); mutate(data); const client = clientFor(data);
    await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW }));
    assert.equal(client.calls.at(-1).sql, 'rollback');
  }
});

test('unknown reason, duplicate observations and changed identity currency reject whole snapshot', async () => {
  for (const mutate of [
    (data) => { data.rows[0].primary_reason = 'unrecognized_reason'; },
    (data) => { data.rows[1].source_observation_id = data.rows[0].source_observation_id; },
    (data) => { data.rows[0].observed_currency = 'EUR'; },
    (data) => { data.rows[0].source_sync_run_id = RUN; },
  ]) {
    const data = fixture(); mutate(data);
    await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW }));
  }
});

test('source metadata absence is preserved if stable dimensions exist, never silently dropped', async () => {
  const data = fixture(); data.rows[0].source_product_present = false; data.rows[0].source_product_name = null;
  data.rows[0].source_observation_present = false; data.rows[0].observed_currency = null;
  const result = await readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW });
  assert.equal(result.normalized.observations.length, 6);
  assert.equal(result.normalized.observations[0].evidence.sourceProductPresent, false);
  data.rows[0].category_id = null;
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW }), /missing_source_dimension/);
});

test('a present observation must match the decision product, exact subtype and source row identity', async () => {
  for (const [field, value, error] of [
    ['observed_product_id', 999, /source_observation_product_mismatch/],
    ['observed_subtype_name', 'Reverse Holofoil', /source_observation_subtype_mismatch/],
    ['observed_price_row_identity', 'another-product-Holofoil', /source_observation_identity_mismatch/],
  ]) {
    const data = fixture(); data.rows[0][field] = value;
    const client = clientFor(data);
    await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW }), error);
    assert.equal(client.calls.at(-1).sql, 'rollback');
  }
});

test('bad transaction mode, unfinished sync and unacknowledged rollback cannot yield accepted output', async () => {
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(fixture(), { readOnly: 'off' }), { now: NOW }), /transaction_not_read_only/);
  const data = fixture(); data.run.source_failed_count = 1;
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW }), /source_run_not_reconciled/);
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(fixture(), { rollbackCommand: 'UNKNOWN' }), { now: NOW }), /rollback_not_acknowledged/);
});

test('row bound rejects truncation before requesting rows; expected run is parameterized', async () => {
  const client = clientFor();
  await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW, maxRows: 5 }), /row_limit/);
  assert.ok(!client.calls.some((call) => call.sql === PRICING_COMPLETION_SOURCE_ROWS_SQL_V1));
  const exact = clientFor();
  await readPricingCompletionSourceSnapshotV1(exact, { now: NOW, expectedRunId: RUN });
  assert.deepEqual(exact.calls.find((call) => call.sql === PRICING_COMPLETION_SOURCE_RUN_SQL_V1).values, [RUN]);
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(), { now: NOW, expectedRunId: "x'; drop table x" }), /invalid_expected_run/);
});

test('zero source backlog still cannot establish Master completeness', async () => {
  const data = fixture(); data.rows = []; data.run.selected_count = 3; data.run.quarantined_count = 0;
  data.counts.selected_count = 3; data.counts.quarantined_count = 0; data.counts.unresolved_count = 0;
  const result = await readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW });
  assert.equal(result.normalized.summary.complete, false);
  assert.equal(result.normalized.summary.masterReportedUnresolved, null);
});

test('remote database configuration requires certificate verification and no URL option override', () => {
  const result = pricingCompletionReadOnlyDatabaseConfigV1('postgresql://fixture:fixture@example.invalid/test');
  assert.equal(result.ssl.rejectUnauthorized, true);
  assert.equal(result.ssl.servername, 'example.invalid');
  assert.equal(result.options, '-c default_transaction_read_only=on');
  for (const url of ['postgresql://example.invalid/test?sslmode=disable', 'https://example.invalid/test', 'not a url']) assert.throws(() => pricingCompletionReadOnlyDatabaseConfigV1(url));
  assert.throws(() => pricingCompletionReadOnlyDatabaseConfigV1('postgresql://example.invalid/test', { insecureTlsEnvironment: true }), /insecure_tls_environment/);
});

test('master census joins the same transaction before rollback and preserves older source freshness', async () => {
  const data = fixture(); data.run.source_finished_at = '2026-10-10T12:00:00.000Z';
  const client = clientFor(data); let called = false;
  const result = await readPricingCompletionSourceSnapshotV1(client, { now: NOW,
    readMasterSnapshot: async (sameClient, metadata) => {
      assert.equal(sameClient, client);
      assert.ok(!client.calls.some((call) => call.sql === 'rollback'));
      assert.equal(metadata.sourceRunId, RUN); called = true;
      assert.equal(metadata.publicationBinding.runId, RUN);
      assert.equal(metadata.publicationBinding.publicationSetId, PUBLICATION);
      return { scope: { games: ['pokemon'], currency: 'USD' }, observations: [],
        coverage: { masterToPrice: { status: 'partial', sourceRunId: RUN, observedAt: metadata.capturedAt,
          evidenceRef: 'fixture-pokemon-master', expectedUnresolved: 1 } },
        parentsWithoutPrintings: [{ parentId: 'fixture-parent-without-child' }] };
    },
  });
  assert.equal(called, true);
  assert.equal(result.snapshot.observedAt, new Date(NOW).toISOString());
  assert.equal(result.normalized.coverage.sourceToMaster.freshness, 'stale');
  assert.equal(result.normalized.coverage.masterToPrice.freshness, 'fresh');
  assert.equal(result.normalized.summary.complete, false);
  assert.equal(result.receipt.masterCoverage, 'partial');
  assert.deepEqual(result.receipt.publicationBinding, result.snapshot.publicationBinding);
  assert.equal(result.receipt.publicationBinding.publicationSetId, PUBLICATION);
  assert.equal(result.normalized.observations[0].evidence.publicationBinding.runId, RUN);
  assert.equal(result.masterExport.parentsWithoutPrintings.length, 1);
  assert.equal(client.calls.at(-1).sql, 'rollback');
});

test('master read failure rolls back source capture and yields no accepted snapshot', async () => {
  const client = clientFor();
  await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW,
    readMasterSnapshot: async () => { throw new Error('fixture-master-read-failed'); },
  }), /fixture-master-read-failed/);
  assert.equal(client.calls.at(-1).sql, 'rollback');
});

test('combined capture rejects a current pointer for another run or publication set before Master RPC', async () => {
  for (const pointer of [
    { run_id: SYNC, publication_set_id: PUBLICATION },
    { run_id: RUN, publication_set_id: SYNC },
  ]) {
    const client = clientFor(fixture(), { pointerRows: [pointer] }); let called = false;
    await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW, expectedRunId: RUN,
      readMasterSnapshot: async () => { called = true; },
    }), /current_publication_context_mismatch/);
    assert.equal(called, false);
    assert.equal(client.calls.at(-1).sql, 'rollback');
  }
});

test('combined capture rejects absent/ambiguous valid current context or missing selected publication set', async () => {
  for (const pointerRows of [[], [{ run_id: RUN, publication_set_id: PUBLICATION }, { run_id: RUN, publication_set_id: PUBLICATION }]]) {
    const client = clientFor(fixture(), { pointerRows });
    await assert.rejects(readPricingCompletionSourceSnapshotV1(client, { now: NOW, readMasterSnapshot: async () => {} }), /current_publication_context_missing_or_ambiguous/);
    assert.equal(client.calls.at(-1).sql, 'rollback');
  }
  const data = fixture(); data.run.publication_set_id = null;
  await assert.rejects(readPricingCompletionSourceSnapshotV1(clientFor(data), { now: NOW, readMasterSnapshot: async () => {} }), /selected_publication_set_missing/);
});

test('current publication guard matches application current-context state and relation joins', () => {
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /publication_set\.id = current_state\.publication_set_id/);
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /publication_set\.run_id = current_state\.run_id/);
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /publication_set\.publication_state = 'published'/);
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /pipeline_run\.reconciliation_state = 'reconciled'/);
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /pipeline_run\.state in \('published', 'verified'\)/);
  assert.match(PRICING_COMPLETION_CURRENT_PUBLICATION_SQL_V1, /where current_state\.singleton/);
});
