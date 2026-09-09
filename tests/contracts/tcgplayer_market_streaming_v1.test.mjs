import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createCandidateStreamReconcilerV1, readMarketLedgerBatchesV1, marketLedgerRowsV1 } from '../../backend/pricing/tcgplayer_market_streaming_v1.mjs';

const row = n => ({ source_observation_id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, source_sync_run_id: 'source', source_product_id: Math.floor(n / 2), source_subtype_name: 'Normal', candidate_payload: { n } });
test('stream reconciliation preserves exact counts and cross-page uniqueness', () => {
  const tracker = createCandidateStreamReconcilerV1('source', 3);
  tracker.accept([row(1), row(2)]); tracker.accept([row(3)]);
  assert.deepEqual(tracker.finish(), { count: 3, first_source_observation_id: row(1).source_observation_id, last_source_observation_id: row(3).source_observation_id });
  const duplicates = createCandidateStreamReconcilerV1('source', 3);
  duplicates.accept([row(1)]);
  assert.throws(() => duplicates.accept([row(1)]), /duplicate/);
  assert.throws(() => createCandidateStreamReconcilerV1('wrong', 1).accept([row(1)]), /source_sync/);
  assert.throws(() => createCandidateStreamReconcilerV1('source', 2).finish(), /candidate_count/);
  assert.throws(() => createCandidateStreamReconcilerV1('source', 0).accept([row(1)]), /exceeded/);
  assert.throws(() => createCandidateStreamReconcilerV1('source', 1).accept([{ source_sync_run_id: 'source' }]), /missing/);
  assert.equal(createCandidateStreamReconcilerV1('source', 0).finish().count, 0);
});

test('ledger pages use a run-bound composite cursor without offset or skipped ties', async () => {
  const fixture = [row(1), row(2), row(3), row(4), row(5)], calls = [];
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    assert.match(sql, /where run_id = \$1/);
    assert.doesNotMatch(sql, /offset/i);
    assert.equal(params[0], 'run');
    const start = params.length === 2 ? 0 : fixture.findIndex(r => r.source_observation_id === params[3]) + 1;
    return { rows: fixture.slice(start, start + params.at(-1)) };
  } };
  const actual = [];
  for await (const batch of readMarketLedgerBatchesV1(client, 'candidates', 'run', 2)) actual.push(...batch);
  assert.deepEqual(actual, fixture);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[1].params, ['run', row(2).source_product_id, 'Normal', row(2).source_observation_id, 2]);
  assert.match(calls[1].sql, /\(source_product_id, source_subtype_name, source_observation_id\) >/);
  const iterable = marketLedgerRowsV1(client, 'candidates', 'run');
  const first = [], second = [];
  for await (const r of iterable) first.push(r);
  for await (const r of iterable) second.push(r);
  assert.deepEqual(first, fixture); assert.deepEqual(second, fixture);
});

test('ledger iterator propagates failures and rejects invalid bounds, kinds and cursors', async () => {
  const consume = async iterator => { for await (const _ of iterator) {} };
  await assert.rejects(consume(readMarketLedgerBatchesV1({}, 'untrusted', 'run')), /configuration/);
  await assert.rejects(consume(readMarketLedgerBatchesV1({}, 'decisions', 'run', 10001)), /configuration/);
  await assert.rejects(consume(readMarketLedgerBatchesV1({ query: async () => { throw new Error('connection lost'); } }, 'decisions', 'run')), /connection lost/);
  await assert.rejects(consume(readMarketLedgerBatchesV1({ query: async () => ({ rows: [row(1)] }) }, 'candidates', 'run')), /cursor/);
  await assert.rejects(consume(readMarketLedgerBatchesV1({ query: async () => ({ rows: [row(1), row(2)] }) }, 'candidates', 'run', 1)), /exceeded/);
});

test('decision exports sort once per pass and close on success, early exit and failure', async () => {
  const fixture = [row(1), row(2), row(3)], calls = [];
  let offset = 0, failFetch = false;
  const client = { async query(sql, params) {
    calls.push(sql);
    if (sql.startsWith('declare')) {
      assert.match(sql, /no scroll cursor with hold/);
      assert.match(sql, /where run_id = \$1/);
      assert.deepEqual(params, ['run']); offset = 0;
      return { rows: [] };
    }
    if (sql.startsWith('fetch')) {
      if (failFetch) throw new Error('fetch failed');
      const limit = Number(sql.match(/fetch forward (\d+)/)[1]);
      const rows = fixture.slice(offset, offset + limit); offset += rows.length;
      return { rows };
    }
    assert.match(sql, /^close market_decisions_[a-f0-9]{32}$/);
    return { rows: [] };
  } };
  const iterable = marketLedgerRowsV1(client, 'decisions', 'run');
  for (let pass = 0; pass < 2; pass++) {
    const result = [];
    for await (const value of iterable) result.push(value);
    assert.deepEqual(result, fixture);
  }
  for await (const _ of readMarketLedgerBatchesV1(client, 'decisions', 'run', 1)) break;
  failFetch = true;
  await assert.rejects(async () => { for await (const _ of iterable) {} }, /fetch failed/);
  assert.equal(calls.filter(sql => sql.startsWith('declare')).length, 4);
  assert.equal(calls.filter(sql => sql.startsWith('close')).length, 4);
  assert.equal(new Set(calls.filter(sql => sql.startsWith('close'))).size, 4);
  assert.equal(calls.filter(sql => /order by/.test(sql)).length, 4);
});

test('durable stage, qualification and exports no longer accumulate whole ledgers', () => {
  const worker = readFileSync(new URL('../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs', import.meta.url), 'utf8');
  assert.match(worker, /onBatch: async rows => insertCandidates/);
  assert.match(worker, /for await \(const candidates of readMarketLedgerBatchesV1/);
  assert.match(worker, /decisions: marketLedgerRowsV1/);
  assert.match(worker, /const counts = await decisionSummary\(decisions\)/);
  assert.doesNotMatch(worker, /await stagedCandidates\(|decisionResult\.rows|const candidates = rows\.map/);
});

test('300000 candidate payloads reconcile under a 96 MiB heap without retaining payloads', () => {
  const moduleUrl = new URL('../../backend/pricing/tcgplayer_market_streaming_v1.mjs', import.meta.url).href;
  const script = `import {createCandidateStreamReconcilerV1} from ${JSON.stringify(moduleUrl)};
    const tracker=createCandidateStreamReconcilerV1('source',300000);
    for(let offset=0;offset<300000;offset+=1000) {
      const batch=Array.from({length:1000},(_,i)=>({source_observation_id:String(offset+i).padStart(36,'0'),source_sync_run_id:'source',payload:('visible-evidence-'+i).repeat(200)}));
      tracker.accept(batch);
    }
    if(tracker.finish().count!==300000) throw Error('count mismatch');`;
  const child = spawnSync(process.execPath, ['--max-old-space-size=96', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(child.status, 0, child.stderr || String(child.error));
});
