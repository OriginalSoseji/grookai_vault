import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  normalizePricingCompletionOperatorReadbackV1, PRICING_COMPLETION_OPERATOR_CA_SHA256_V1,
  PRICING_COMPLETION_OPERATOR_SCOPE_V2,
} from '../../backend/pricing/pricing_completion_operator_readback_v1.mjs';
import { runPricingCompletionOperatorReadbackCliV1 } from '../../scripts/audits/pricing_completion_operator_readback_v1.mjs';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');
const SQL_HASH = 'd'.repeat(64);
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  return {
    version: 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V1',
    projectRef: 'ycdxbpibncqcchqiihfz', verifiedTls: true, readOnly: true, rollbackAcknowledged: true,
    sqlSha256: SQL_HASH, caSha256: PRICING_COMPLETION_OPERATOR_CA_SHA256_V1,
    capturedAt: new Date(NOW - 1000).toISOString(),
    sourceRunId: ID(1), publicationSetId: ID(3), masterCoverage: 'unknown', databaseWrites: 0,
    scope: 'All non-publish decisions in the exact frozen current pricing run only; no Master census or all-warehouse completeness claim.',
    records: [
      { kind: 'environment', read_only: 'on', isolation: 'repeatable read', database: 'postgres',
        captured_at: new Date(NOW - 2000).toISOString(),
        server_version: '17.6', cards: 171036, sets: 3400, traits: 32903, migrations: 444, latest_migration: '20261012010000' },
      { kind: 'source_run', rows: [{ id: ID(1), run_key: 'operator-fixture', source_sync_run_id: ID(2), publication_set_id: ID(3),
        run_mode: 'production', state: 'verified', reconciliation_state: 'reconciled', publication_state: 'published',
        selected_count: 2, eligible_count: 1, snapshot_count: 1, excluded_count: 0, quarantined_count: 1, delayed_count: 0, suppressed_count: 0,
        source_finished_at: new Date(NOW - 10000).toISOString(), completed_at: new Date(NOW - 5000).toISOString(),
        source_status: 'completed', sync_mode: 'current_full_sync', source_failed_count: 0 }] },
      { kind: 'source_counts', rows: [{ selected_count: 2, eligible_count: 1, publish_count: 1, snapshot_count: 1,
        excluded_count: 0, quarantined_count: 1, delayed_count: 0, suppressed_count: 0, unresolved_count: 1 }] },
      { kind: 'source_rows', rows: [{ decision_id: ID(4), run_id: ID(1), decision: 'quarantine', primary_reason: 'missing_active_source_mapping',
        source_observation_id: ID(5), source_product_id: 123, source_subtype_name: 'Holofoil', currency: 'USD',
        source_row_hash: 'a'.repeat(64), source_artifact_hash: 'b'.repeat(64), source_price_row_identity: '123-Holofoil',
        source_sync_run_id: ID(2), card_print_id: null, card_printing_id: null, market_price: '4.20',
        category_id: 3, group_id: 42, source_product_name: 'Fixture', source_group_name: 'Fixture Group', product_scope_result: 'in_scope',
        source_observation_present: true, source_product_present: true, observed_product_id: 123,
        observed_subtype_name: 'Holofoil', observed_price_row_identity: '123-Holofoil', observed_currency: 'USD', observed_payload_hash: 'a'.repeat(64) }] },
      { kind: 'current_publication', rows: [{ run_id: ID(1), publication_set_id: ID(3),
        publication_state: 'published', state: 'verified', reconciliation_state: 'reconciled' }] },
    ],
  };
}
function record(input, kind) { return input.records.find(row => row.kind === kind); }
function fixtureV2() {
  const input = fixture(); input.version = 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2';
  input.scope = PRICING_COMPLETION_OPERATOR_SCOPE_V2;
  input.records.push({ kind: 'transaction_end', status: 'ROLLBACK', read_only_after: 'on', isolation_after: 'read committed' });
  return input;
}
function options(input = fixture()) {
  const readbackBytes = Buffer.from(JSON.stringify(input));
  return { readbackBytes, expectedReadbackSha256: sha(readbackBytes), expectedSqlSha256: SQL_HASH, now: NOW };
}
function cliFixture(t, input = fixture()) {
  const root = mkdtempSync(join(tmpdir(), 'pricing-operator-readback-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const inputDirectory = join(root, 'input'); mkdirSync(inputDirectory);
  const inputPath = join(inputDirectory, 'operator.json');
  const bound = options(input); writeFileSync(inputPath, bound.readbackBytes);
  const output = join(root, 'output');
  return { root, inputPath, output, bound, args: [`--input=${inputPath}`,
    `--expected-file-sha256=${bound.expectedReadbackSha256}`, `--expected-sql-sha256=${SQL_HASH}`, `--out-dir=${output}`] };
}

test('fixed operator readback reuses source checks without claiming a live connection or remote rollback', async () => {
  const result = await normalizePricingCompletionOperatorReadbackV1(options());
  assert.equal(result.snapshot.observations.length, 1);
  assert.equal(result.normalized.summary.complete, false);
  assert.equal(result.snapshot.coverage.masterToPrice.status, 'unknown');
  assert.equal(result.snapshot.observations[0].identity.condition, 'NOT_CONDITION_SPECIFIC');
  assert.equal(result.receipt.transport, 'fixed_operator_readback');
  assert.equal(result.receipt.liveDatabaseAccess, false);
  assert.equal(result.receipt.queryReplayCompleted, true);
  assert.equal(result.receipt.remoteRollbackVerifiedByAdapter, false);
  assert.equal(result.receipt.rollbackAcknowledged, undefined);
  assert.equal(result.receipt.databaseWrites, 0);
  assert.equal(result.receipt.environment.cards, 171036);
  assert.equal(result.receipt.currentPublication.run_id, result.snapshot.sourceRunId);
  assert.equal(result.receipt.readbackSha256, options().expectedReadbackSha256);
});

test('current-pointer V2 export retains terminal evidence and independent byte/SQL pins', async () => {
  const result = await normalizePricingCompletionOperatorReadbackV1(options(fixtureV2()));
  assert.equal(result.snapshot.observations.length, 1);
  assert.equal(result.receipt.operatorExportVersion, 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2');
  assert.equal(result.receipt.operatorTerminalRecordValidated, true);
  assert.equal(result.receipt.remoteRollbackVerifiedByAdapter, false);
});

test('V2 rejects missing, invalid or reordered terminal evidence and stale source at capture', async () => {
  const mutations = [
    x => x.records.pop(),
    x => { record(x, 'transaction_end').status = 'COMMIT'; },
    x => { record(x, 'transaction_end').read_only_after = 'off'; },
    x => { record(x, 'transaction_end').isolation_after = 'repeatable read'; },
    x => { record(x, 'transaction_end').extra = true; },
    x => x.records.reverse(),
    x => { record(x, 'source_run').rows[0].source_finished_at = new Date(NOW - 3 * 86400000).toISOString(); },
    x => { record(x, 'source_run').rows[0].source_finished_at = new Date(NOW - 4000).toISOString(); },
    x => { record(x, 'source_rows').rows[0].currency = 'EUR'; },
    x => { x.scope = fixture().scope; },
  ];
  for (const mutate of mutations) {
    const input = fixtureV2(); mutate(input);
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
  const input = fixtureV2(); input.version = 'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V1';
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
});

test('externally pinned bytes and SQL hash cannot be replaced by embedded claims', async () => {
  const bound = options();
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...bound, expectedReadbackSha256: '0'.repeat(64) }), /readback_hash_mismatch/);
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...bound, expectedSqlSha256: '0'.repeat(64) }), /sql_hash_mismatch/);
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...bound, expectedSqlSha256: undefined }), /external_hashes_required/);
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...bound, readbackBytes: bound.readbackBytes.toString() }), /original_utf8_bytes_required/);
  const bytes = Buffer.from([0xff, 0xfe, 0x7b]);
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...bound, readbackBytes: bytes, expectedReadbackSha256: sha(bytes) }), /invalid_utf8_or_json/);
});

test('wrong project, CA, TLS and read-only claims reject even if file hash matches', async () => {
  for (const [field, value] of [
    ['projectRef', 'another-project'], ['caSha256', '0'.repeat(64)], ['verifiedTls', false], ['readOnly', false],
    ['rollbackAcknowledged', false], ['databaseWrites', 1], ['masterCoverage', 'complete'], ['sourceRunId', ID(99)],
  ]) {
    const input = fixture(); input[field] = value;
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
});

test('exact five known records reject omissions, duplicates, unknown fields and multiple singleton rows', async () => {
  const changes = [
    input => input.records.pop(),
    input => input.records.push({ kind: 'master_rows', rows: [] }),
    input => { input.records[4] = input.records[1]; },
    input => { input.command = 'untrusted'; },
    input => { record(input, 'source_rows').query = 'untrusted'; },
    input => { record(input, 'source_run').rows.push(record(input, 'source_run').rows[0]); },
    input => { record(input, 'current_publication').rows = []; },
  ];
  for (const change of changes) {
    const input = fixture(); change(input);
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
});

test('environment maturity and stable read-only transaction are mandatory', async () => {
  for (const [field, value] of [
    ['read_only', 'off'], ['isolation', 'read committed'], ['database', 'test'],
    ['cards', 39999], ['sets', 149], ['traits', 4999], ['migrations', 443],
    ['cards', '171036'], ['latest_migration', 'unknown'], ['server_version', ''],
  ]) {
    const input = fixture(); record(input, 'environment')[field] = value;
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
});

test('capture freshness, future timestamps and source-after-capture evidence fail closed', async () => {
  for (const capturedAt of [new Date(NOW + 1).toISOString(), new Date(NOW - 86400001).toISOString(), 'yesterday']) {
    const input = fixture(); input.capturedAt = capturedAt;
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
  const input = fixture(); record(input, 'source_run').rows[0].completed_at = new Date(NOW).toISOString();
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)), /source_postdates_operator_capture/);
  await assert.rejects(normalizePricingCompletionOperatorReadbackV1({ ...options(), maxCaptureAgeMs: 86400001 }), /capture_age_limit_exceeds/);
});

test('fresh capture never launders an old source run into fresh coverage', async () => {
  const input = fixture(); record(input, 'source_run').rows[0].source_finished_at = new Date(NOW - 3 * 86400000).toISOString();
  const result = await normalizePricingCompletionOperatorReadbackV1(options(input));
  assert.equal(result.normalized.freshness, 'stale');
  assert.equal(result.normalized.summary.complete, false);
});

test('selected source run must be exactly the current publication run and set', async () => {
  for (const field of ['run_id', 'publication_set_id']) {
    const input = fixture(); record(input, 'current_publication').rows[0][field] = ID(99);
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)), /current_publication_context_mismatch/);
  }
});

test('published reconciled production states are required on both run and active pointer', async () => {
  for (const [kind, field, value] of [
    ['source_run', 'run_mode', 'shadow'], ['source_run', 'state', 'staging'],
    ['source_run', 'reconciliation_state', 'mismatch'], ['source_run', 'publication_state', 'rolled_back'],
    ['current_publication', 'state', 'failed'], ['current_publication', 'publication_state', 'superseded'],
    ['current_publication', 'reconciliation_state', 'pending'],
  ]) {
    const input = fixture(); record(input, kind).rows[0][field] = value;
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
});

test('existing source validator rejects ledger/count and source identity discrepancies', async () => {
  for (const mutate of [
    input => { record(input, 'source_counts').rows[0].snapshot_count = 0; },
    input => { record(input, 'source_rows').rows = []; },
    input => { record(input, 'source_rows').rows[0].observed_product_id = 999; },
    input => { record(input, 'source_rows').rows[0].primary_reason = 'new_unknown_reason'; },
  ]) {
    const input = fixture(); mutate(input);
    await assert.rejects(normalizePricingCompletionOperatorReadbackV1(options(input)));
  }
});

test('CLI emits exclusive bound snapshot/receipt and writes a usable manifest last', async t => {
  const f = cliFixture(t);
  const report = await runPricingCompletionOperatorReadbackCliV1(f.args, NOW);
  assert.equal(report.sourceRows, 1);
  assert.equal(report.liveDatabaseAccess, false);
  const manifest = JSON.parse(readFileSync(join(f.output, 'input_manifest.json'), 'utf8'));
  assert.equal(manifest.schema_version, 'PRICING_COMPLETION_SNAPSHOT_FILES_V1');
  assert.equal(manifest.snapshot.sha256, sha(readFileSync(join(f.output, 'snapshot.json'))));
  const receipt = JSON.parse(readFileSync(join(f.output, 'receipt.json'), 'utf8'));
  assert.equal(receipt.transport, 'fixed_operator_readback');
  await assert.rejects(runPricingCompletionOperatorReadbackCliV1(f.args, NOW), /output_directory_must_be_new/);
});

test('CLI refuses mismatched files, overlapping paths and unrecognized execution flags without output', async t => {
  for (const change of [
    f => f.args.map(arg => arg.startsWith('--expected-file-sha256=') ? `--expected-file-sha256=${'0'.repeat(64)}` : arg),
    f => [...f.args, '--apply=true'],
    f => [...f.args, '--input=duplicate.json'],
    f => f.args.map(arg => arg.startsWith('--out-dir=') ? `--out-dir=${join(f.root, 'input', 'nested-output')}` : arg),
    f => f.args.map(arg => arg.startsWith('--input=') ? '--input=relative.json' : arg),
  ]) {
    const f = cliFixture(t);
    await assert.rejects(runPricingCompletionOperatorReadbackCliV1(change(f), NOW));
    assert.equal(existsSync(f.output), false);
    assert.equal(existsSync(join(f.root, 'input', 'nested-output')), false);
  }
});
