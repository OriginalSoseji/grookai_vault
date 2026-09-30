import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { fetchPokemonReferenceBatchV1 } from '../../backend/pricing/pokemon_reference_batch_v1.mjs';
import { fetchPokemonCardByIdViaCurl } from '../../backend/pricing/pokemon_reference_http_v1.mjs';

function clock() { let time = 0; return { now: () => time, sleep: async ms => { time += ms; }, advance: ms => { time += ms; } }; }
const ids = Array.from({ length: 12 }, (_, n) => `base1-${n + 1}`);
test('two bounded workers persist every exact result and count retry request starts', async () => {
  const timer = clock(); let active = 0, peak = 0; const rows = [];
  const result = await fetchPokemonReferenceBatchV1({ ids, authenticated: true, ...timer,
    onResult: row => rows.push(row), fetchCard: async (id, { beforeAttempt }) => {
      await beforeAttempt(); active++; peak = Math.max(peak, active);
      await setImmediate(); await beforeAttempt(); active--; return { id };
    } });
  assert.equal(peak, 2); assert.equal(result.complete, true);
  assert.equal(result.attempts, 24); assert.equal(rows.length, 12);
  assert.deepEqual(Object.keys(result.cardsByExternalId).sort(), [...ids].sort());
});
test('budget stops new attempts, drains workers and retains completed progress', async () => {
  const timer = clock(); const rows = [];
  const result = await fetchPokemonReferenceBatchV1({ ids, authenticated: true, budgetMs: 100_000, ...timer,
    onResult: row => rows.push(row), fetchCard: async (id, { beforeAttempt }) => {
      await beforeAttempt(); timer.advance(30_000); return { id };
    } });
  assert.equal(result.complete, false); assert.equal(result.stop_reason, 'POKEMON_REFERENCE_BATCH_BUDGET');
  assert.ok(result.attempts < ids.length); assert.equal(rows.length, result.completed);
  assert.ok(Object.keys(result.cardsByExternalId).length > 0);
});
test('rate limit stops the batch without retrying or classifying it as missing', async () => {
  let calls = 0;
  const result = await fetchPokemonReferenceBatchV1({ ids, ...clock(), fetchCard: (id, opts) =>
    fetchPokemonCardByIdViaCurl(id, { ...opts, run: async () => { calls++; return { stdout: 'limited\n429' }; } }) });
  assert.equal(calls, 1); assert.equal(result.complete, false);
  assert.equal(result.stop_reason, 'POKEMON_REFERENCE_HTTP_429');
  assert.equal(result.errors[0].http_status, 429);
});
test('provider outage is bounded and errors never retain child process secrets', async () => {
  const rows = [];
  const result = await fetchPokemonReferenceBatchV1({ ids, authenticated: true, ...clock(), onResult: row => rows.push(row),
    fetchCard: async (id, { beforeAttempt }) => { await beforeAttempt(); throw new Error('X-Api-Key: secret-test-value'); } });
  assert.equal(result.complete, false); assert.equal(result.stop_reason, 'POKEMON_REFERENCE_PROVIDER_FAILURE_LIMIT');
  assert.ok(result.attempts <= 6); assert.ok(!JSON.stringify(rows).includes('secret-test-value'));
});
test('one exhausted transport failure blocks completion even when later cards succeed', async () => {
  const result = await fetchPokemonReferenceBatchV1({ ids, ...clock(), fetchCard: async (id, { beforeAttempt }) => {
    await beforeAttempt(); if (id === ids[0]) throw new Error('transport failed'); return { id };
  } });
  assert.equal(result.completed, ids.length); assert.equal(result.complete, false); assert.equal(result.failures, 1);
});
test('404 and null remain explicit missing coverage without blocking other results', async () => {
  const result = await fetchPokemonReferenceBatchV1({ ids: ids.slice(0, 3), ...clock(), fetchCard: async (id, { beforeAttempt }) => {
    await beforeAttempt(); if (id === ids[0]) throw Object.assign(new Error('missing'), { code: 'POKEMON_REFERENCE_HTTP_404', http_status: 404, attempts: 1 });
    return id === ids[1] ? null : { id };
  } });
  assert.equal(result.complete, true); assert.equal(result.errors.length, 1);
  assert.equal(Object.keys(result.cardsByExternalId).length, 1);
});
test('anonymous requests including retries respect spacing and a conservative request ceiling', async () => {
  const timer = clock(), starts = [];
  const many = Array.from({ length: 1000 }, (_, n) => `base1-${n}`);
  const result = await fetchPokemonReferenceBatchV1({ ids: many, ...timer, fetchCard: async (id, { beforeAttempt }) => {
    await beforeAttempt(); starts.push(timer.now()); return { id };
  } });
  assert.equal(result.concurrency, 1); assert.equal(result.attempts, 900);
  assert.equal(result.stop_reason, 'POKEMON_REFERENCE_REQUEST_CEILING');
  assert.ok(starts.slice(1).every((t, i) => t - starts[i] >= 2100));
});
test('progress persistence failure drains work and rejects instead of returning success', async () => {
  let active = 0;
  await assert.rejects(fetchPokemonReferenceBatchV1({ ids, authenticated: true, ...clock(),
    fetchCard: async (id, { beforeAttempt }) => { await beforeAttempt(); active++; await setImmediate(); active--; return { id }; },
    onResult: () => { throw new Error('disk full'); } }), /disk full/);
  assert.equal(active, 0);
});
test('mismatched provider identity cannot enter successful evidence', async () => {
  const result = await fetchPokemonReferenceBatchV1({ ids: [ids[0]], ...clock(), fetchCard: async () => ({ id: 'wrong' }) });
  assert.equal(result.complete, false); assert.deepEqual(result.cardsByExternalId, {});
});
test('invalid, duplicate or oversized batches are rejected before provider calls', async () => {
  for (const invalid of [['../bad'], ['a', 'a'], Array.from({ length: 5001 }, (_, n) => `a${n}`)]) {
    await assert.rejects(fetchPokemonReferenceBatchV1({ ids: invalid, fetchCard: () => assert.fail('provider called') }), /INVALID_BATCH/);
  }
});
