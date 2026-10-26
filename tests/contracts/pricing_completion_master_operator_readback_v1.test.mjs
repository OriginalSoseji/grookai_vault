import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizePricingCompletionMasterOperatorReadbackV1 } from '../../backend/pricing/pricing_completion_master_operator_readback_v1.mjs';
import { runPricingCompletionMasterOperatorReadbackCliV1 } from '../../scripts/audits/pricing_completion_master_operator_readback_v1.mjs';
import { openPricingCompletionQueueV1 } from '../../backend/pricing/pricing_completion_queue_v1.mjs';

const NOW = Date.parse('2026-10-13T12:00:00.000Z');
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sha = b => createHash('sha256').update(b).digest('hex');
const RPC = 'Retained synthetic fixed RPC definition for offline contract tests only.\n';
const SQL_HASH = sha('reviewed fixed census SQL fixture');
function rec(input, kind) { return input.records.find(r => r.kind === kind); }
function fixture(printingCount = 1) {
  const parent = { id: ID(1), gv_id: 'GV-PK-BASE-001', name: 'Card', set_id: ID(3), set_code: 'base', game: 'pokemon', set_game: 'pokemon' };
  const printings = Array.from({ length: printingCount }, (_, n) => ({ id: ID(100 + n), card_print_id: parent.id, printing_gv_id: `GV-PK-BASE-001-${n}`, finish_key: `finish-${n}` }));
  const prices = printings.map(p => ({ pricing_scope: 'card_printing', card_print_id: parent.id, card_printing_id: p.id,
    gv_id: parent.gv_id, printing_gv_id: p.printing_gv_id, finish_key: p.finish_key, status: 'available', currency: 'USD',
    market_close: '10.25', freshness: 'fresh', source_name: 'tcgplayer', observed_at: '2026-10-13T10:00:00.123456+00:00',
    published_at: '2026-10-13T10:01:00+00:00', provenance_id: ID(4), is_from_price: false, eligible_printing_count: 1 }));
  const pointer = { run_id: ID(5), publication_set_id: ID(6), source_sync_run_id: ID(7), publication_state: 'published',
    state: 'verified', reconciliation_state: 'reconciled', run_mode: 'production', completed_at: '2026-10-13T10:01:00+00:00',
    selected_count: 100, snapshot_count: 99, source_finished_at: '2026-10-13T10:00:00+00:00',
    source_status: 'completed', sync_mode: 'current_full_sync', source_failed_count: 0 };
  const batches = [];
  for (let n = 0; n < printingCount; n += 500) batches.push({ kind: 'rpc_batch', batchIndex: n / 500,
    requestedPrintingIds: printings.slice(n, n + 500).map(p => p.id), rows: prices.slice(n, n + 500), sourceRunId: ID(5), publicationSetId: ID(6) });
  return { version: 'FIXED_OPERATOR_POKEMON_MASTER_CENSUS_V1', projectRef: 'ycdxbpibncqcchqiihfz',
    verifiedTls: true, readOnly: true, rollbackAcknowledged: true, capturedAt: '2026-10-13T11:59:30.000Z', sqlSha256: SQL_HASH,
    caSha256: '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7', appRpcSha256: sha(RPC),
    sourceRunId: ID(5), publicationSetId: ID(6), sourceSyncRunId: ID(7),
    scope: { games: ['pokemon'], currency: 'USD', priceBasis: 'TCGPLAYER_MARKET', condition: 'NOT_CONDITION_SPECIFIC' },
    sourceCoverage: 'unknown', physicalConditionVerified: false, databaseWrites: 0, inventoryComplete: true, readbackComplete: true,
    batchSize: 500, invalidParentRoutes: 0, records: [
      { kind: 'environment', read_only: 'on', isolation: 'repeatable read', database: 'postgres', captured_at: '2026-10-13T11:59:00.123456+00:00',
        server_version: '17.6', cards: 171036, sets: 946, traits: 78905, migrations: 444, latest_migration: '20261009000100' },
      { kind: 'rpc_definition', signature: 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', definition_sha256: sha(RPC), definition: RPC },
      { kind: 'current_publication_before', rows: [{ ...pointer }] },
      { kind: 'master_counts', rows: [{ parents_count: 1, printings_count: printingCount, parents_without_printings_count: printingCount ? 0 : 1, invalid_parent_routes_count: 0 }] },
      { kind: 'parents', rows: [parent] }, { kind: 'printings', rows: printings }, ...batches,
      { kind: 'current_publication_after', rows: [{ ...pointer }] },
      { kind: 'transaction_end', status: 'ROLLBACK', read_only_after: 'on', isolation_after: 'read committed' },
    ] };
}
function options(input = fixture()) {
  const readbackBytes = Buffer.from(JSON.stringify(input));
  return { readbackBytes, expectedReadbackSha256: sha(readbackBytes), expectedSqlSha256: SQL_HASH, expectedRpcSha256: sha(RPC), now: NOW };
}
function unavailable(input) {
  Object.assign(rec(input, 'rpc_batch').rows[0], { status: 'unavailable', currency: null, market_close: null, freshness: 'unavailable',
    source_name: null, observed_at: null, published_at: null, provenance_id: null, eligible_printing_count: 0 });
  return input;
}
function cliFixture(t, input = fixture()) {
  const root = mkdtempSync(join(tmpdir(), 'master-operator-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'input')); const file = join(root, 'input', 'readback.json');
  const opt = options(input); writeFileSync(file, opt.readbackBytes); const output = join(root, 'output');
  return { root, output, args: [`--input=${file}`, `--out-dir=${output}`, `--expected-file-sha256=${opt.expectedReadbackSha256}`,
    `--expected-sql-sha256=${SQL_HASH}`, `--expected-rpc-sha256=${sha(RPC)}`] };
}

test('standalone Master readback validates exact batches and PG timestamps without claiming source coverage', () => {
  const result = normalizePricingCompletionMasterOperatorReadbackV1(options(fixture(501)));
  assert.equal(result.master.summary.freshPriced, 501);
  assert.equal(result.master.usablePrices[0].observedAt, '2026-10-13T10:00:00.123Z');
  assert.equal(result.receipt.exactReadbackBatches, 2);
  assert.equal(result.receipt.transport, 'fixed_operator_readback');
  assert.equal(result.receipt.liveDatabaseAccess, false);
  assert.equal(result.receipt.remoteRollbackVerifiedByAdapter, false);
  assert.equal(result.receipt.queueResolutionAllowed, false);
  assert.equal(result.snapshot.coverage.sourceToMaster.status, 'unknown');
  assert.equal(result.normalized.summary.complete, false);
  assert.equal(result.master.summary.completionScope, 'pokemon/USD/TCGPLAYER_MARKET');
});
test('hidden/unavailable exact RPC rows remain gaps, never dropped or assigned synthetic prices', () => {
  const result = normalizePricingCompletionMasterOperatorReadbackV1(options(unavailable(fixture())));
  assert.equal(result.snapshot.observations.length, 1);
  const row = result.snapshot.observations[0];
  assert.equal(row.identity.printingId, ID(100));
  assert.equal(row.identity.condition, 'NOT_CONDITION_SPECIFIC');
  assert.equal(row.evidence.readback.status, 'unavailable');
  assert.equal(row.evidence.physicalConditionVerified, false);
  assert.ok(row.evidence.failures.includes('read_model_unavailable'));
});
test('parents with no printing survive as unresolved coverage, without invented printing IDs', () => {
  const result = normalizePricingCompletionMasterOperatorReadbackV1(options(fixture(0)));
  assert.equal(result.master.parentsWithoutPrintings.length, 1);
  assert.equal(result.master.parentsWithoutPrintings[0].printingId, null);
  assert.equal(result.snapshot.observations.length, 0);
  assert.equal(result.snapshot.coverage.masterToPrice.status, 'partial');
  assert.equal(result.normalized.summary.masterReportedUnresolved, 1);
  assert.equal(result.master.summary.completionAllowed, false);
});
test('external result, SQL, RPC and CA pins are mandatory and independent', () => {
  for (const field of ['expectedReadbackSha256','expectedSqlSha256','expectedRpcSha256']) {
    assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1({ ...options(), [field]: '0'.repeat(64) }));
    assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1({ ...options(), [field]: undefined }));
  }
  for (const mutate of [x => { x.caSha256 = '0'.repeat(64); }, x => { x.projectRef = 'other'; },
    x => { rec(x, 'rpc_definition').definition += 'changed'; }, x => { rec(x, 'rpc_definition').signature = 'other'; }]) {
    const input = fixture(); mutate(input); assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1(options(input)));
  }
});
test('incomplete, unknown, reordered, duplicate records and writes fail closed', () => {
  for (const mutate of [x => { x.databaseWrites = 1; }, x => { x.rollbackAcknowledged = false; }, x => { x.readOnly = false; },
    x => { x.inventoryComplete = false; }, x => { x.readbackComplete = false; }, x => { x.extra = true; },
    x => { x.records.pop(); }, x => { x.records.push(x.records[0]); }, x => { x.records.reverse(); },
    x => { rec(x, 'transaction_end').isolation_after = 'repeatable read'; }, x => { rec(x, 'environment').cards = 100; },
    x => { rec(x, 'environment').isolation = 'read committed'; }, x => { x.sourceCoverage = 'complete'; },
    x => { x.scope.condition = 'NM'; }, x => { x.physicalConditionVerified = true; }]) {
    const input = fixture(); mutate(input); assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1(options(input)));
  }
});
test('capture and transaction timestamps must be fresh, ordered and valid calendar dates', () => {
  for (const mutate of [x => { x.capturedAt = new Date(NOW + 1).toISOString(); }, x => { x.capturedAt = '2026-10-11T12:00:00.000Z'; },
    x => { rec(x, 'environment').captured_at = '2026-10-12T11:59:59.000Z'; },
    x => { rec(x, 'environment').captured_at = '2026-02-30T11:59:00.000Z'; },
    x => { rec(x, 'environment').captured_at = '2026-10-13T11:59:31.000Z'; }]) {
    const input = fixture(); mutate(input); assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1(options(input)));
  }
});
test('publication pointers, source basis and every batch are bound to one current transaction', () => {
  for (const mutate of [x => { rec(x, 'current_publication_after').rows[0].run_id = ID(9); },
    x => { x.sourceSyncRunId = ID(9); }, x => { rec(x, 'rpc_batch').publicationSetId = ID(9); },
    x => { for (const k of ['current_publication_before','current_publication_after']) rec(x, k).rows[0].run_mode = 'shadow'; },
    x => { for (const k of ['current_publication_before','current_publication_after']) rec(x, k).rows[0].source_status = 'running'; },
    x => { for (const k of ['current_publication_before','current_publication_after']) rec(x, k).rows[0].completed_at = '2026-10-13T12:01:00.000Z'; }]) {
    const input = fixture(); mutate(input); assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1(options(input)));
  }
});
test('counts and exact RPC ID partitions cannot silently omit or duplicate a canonical printing', () => {
  for (const mutate of [x => { rec(x, 'master_counts').rows[0].printings_count++; },
    x => { rec(x, 'master_counts').rows[0].parents_without_printings_count++; },
    x => { rec(x, 'rpc_batch').requestedPrintingIds.pop(); }, x => { rec(x, 'rpc_batch').rows.pop(); },
    x => { rec(x, 'rpc_batch').rows[0].card_printing_id = ID(99999); },
    x => { rec(x, 'rpc_batch').batchIndex = 1; }, x => { x.batchSize = 1000; },
    x => { const batches = x.records.filter(r => r.kind === 'rpc_batch'); batches[0].rows.push(...batches[1].rows); batches[0].requestedPrintingIds.push(...batches[1].requestedPrintingIds); },
    x => { rec(x, 'parents').rows[0].set_game = 'other'; },
    x => { rec(x, 'rpc_batch').rows[0].printing_gv_id = 'mismatched'; },
    x => { rec(x, 'rpc_batch').rows[0].is_from_price = true; },
    x => { x.invalidParentRoutes = 1; }]) {
    const input = fixture(501); mutate(input); assert.throws(() => normalizePricingCompletionMasterOperatorReadbackV1(options(input)));
  }
});
test('fresh capture does not rehabilitate stale or invalid underlying price timestamps', () => {
  for (const observed_at of ['2026-10-11T11:59:00+00:00', '2026-02-30T10:00:00+00:00', '2026-10-13T12:00:01+00:00']) {
    const input = fixture(); rec(input, 'rpc_batch').rows[0].observed_at = observed_at;
    const result = normalizePricingCompletionMasterOperatorReadbackV1(options(input));
    assert.equal(result.master.summary.freshPriced, 0); assert.equal(result.snapshot.observations.length, 1);
  }
});
test('standalone Master intake preserves previously queued source work and never closes absent work', t => {
  const root = mkdtempSync(join(tmpdir(), 'master-queue-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const queue = openPricingCompletionQueueV1({ directory: join(root, 'queue') });
  queue.ingest([{ identity: { kind: 'source', provider: 'tcgplayer', category: '3', productId: '10', subtype: 'Normal', currency: 'USD', condition: 'NOT_CONDITION_SPECIFIC' },
    reason: 'missing_active_source_mapping', sourceRunId: ID(5), scope: 'tcgplayer/category/3', evidence: { priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false } }], { now: NOW });
  const master = normalizePricingCompletionMasterOperatorReadbackV1(options(unavailable(fixture())));
  queue.ingest(master.normalized.observations, { now: NOW });
  const allPriced = normalizePricingCompletionMasterOperatorReadbackV1(options(fixture()));
  queue.ingest(allPriced.normalized.observations, { now: NOW });
  const items = queue.snapshot().items;
  assert.equal(items.length, 2);
  assert.equal(items.filter(x => x.identity.kind === 'source').length, 1);
  assert.ok(items.every(x => x.state !== 'resolved'));
});
test('CLI emits separate Master manifest plus parent gaps and coverage artifact', async t => {
  const f = cliFixture(t, fixture(0)); const result = await runPricingCompletionMasterOperatorReadbackCliV1(f.args, NOW);
  assert.equal(result.sourceCoverage, 'unknown');
  const manifest = JSON.parse(readFileSync(join(f.output, 'input_manifest.json'), 'utf8'));
  assert.equal(manifest.snapshot.sha256, sha(readFileSync(join(f.output, 'snapshot.json'))));
  const coverage = JSON.parse(readFileSync(join(f.output, 'master_coverage.json'), 'utf8'));
  assert.equal(coverage.parentsWithoutPrintings.length, 1);
  const hashes = JSON.parse(readFileSync(join(f.output, 'artifact_hashes.json'), 'utf8'));
  assert.equal(hashes['master_coverage.json'], sha(readFileSync(join(f.output, 'master_coverage.json'))));
  await assert.rejects(runPricingCompletionMasterOperatorReadbackCliV1(f.args, NOW), /output_directory_must_be_new/);
});
test('CLI hash mismatch, overlap and production flags produce no accepted output', async t => {
  for (const change of [f => [...f.args, '--apply=true'], f => f.args.filter(a => !a.startsWith('--expected-rpc-sha256=')),
    f => f.args.map(a => a.startsWith('--expected-file-sha256=') ? `--expected-file-sha256=${'0'.repeat(64)}` : a),
    f => f.args.map(a => a.startsWith('--out-dir=') ? `--out-dir=${join(f.root, 'input', 'nested')}` : a)]) {
    const f = cliFixture(t); await assert.rejects(runPricingCompletionMasterOperatorReadbackCliV1(change(f), NOW));
    assert.equal(existsSync(f.output), false); assert.equal(existsSync(join(f.root, 'input', 'nested')), false);
  }
});
