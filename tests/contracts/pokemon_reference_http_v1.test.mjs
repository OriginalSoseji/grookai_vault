import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPokemonCardByIdViaCurl as fetchCard, pokemonReferenceFailureV1 } from '../../backend/pricing/pokemon_reference_http_v1.mjs';

const card = { id: 'base1-15', name: 'Venusaur', tcgplayer: { prices: { holofoil: { market: 99.5 } } } };
const response = (body, status = 200) => ({ stdout: `${typeof body === 'string' ? body : JSON.stringify(body)}\n${status}` });
function fixture(sequence) {
  const calls = [], waits = [];
  return { calls, waits, options: { baseUrl: 'https://provider.example/v2', apiKey: 'fixture-secret', platform: 'linux',
    run: async (...args) => { calls.push(args); const value = sequence[calls.length - 1]; if (value instanceof Error) throw value; assert.ok(value, 'Unexpected extra request'); return value; },
    sleep: async ms => { waits.push(ms); } } };
}

test('actual incident shape: HTML/text 502 retries before parsing and recovers exact evidence', async () => {
  const f = fixture([response('error code: 502', 502), response({ data: card })]);
  assert.deepEqual(await fetchCard(card.id, f.options), card);
  assert.equal(f.calls.length, 2); assert.deepEqual(f.waits, [750]);
  const [command, args, options] = f.calls[0];
  assert.equal(command, 'curl'); assert.equal(args[0], '--disable');
  assert.ok(args.includes('\n%{http_code}')); assert.ok(!args.includes('--location'));
  assert.equal(args.at(-1), 'https://provider.example/v2/cards/base1-15');
  assert.equal(options.timeout, 80000); assert.equal(options.maxBuffer, 8388608);
});

test('transient failures stop after three requests and retain terminal status', async () => {
  const f = fixture([response('upstream', 503), response('upstream', 502), response('upstream', 504)]);
  await assert.rejects(fetchCard(card.id, f.options), error => {
    assert.deepEqual(pokemonReferenceFailureV1(error), { error: 'POKEMON_REFERENCE_HTTP_504', code: 'POKEMON_REFERENCE_HTTP_504', http_status: 504, attempts: 3 });
    return true;
  });
  assert.equal(f.calls.length, 3); assert.deepEqual(f.waits, [750, 1500]);
});

for (const status of [301, 401, 403, 404, 429]) test(`HTTP ${status} stays explicit and is not retried`, async () => {
  const f = fixture([response({ error: 'not a card', data: card }, status)]);
  await assert.rejects(fetchCard(card.id, f.options), { code: `POKEMON_REFERENCE_HTTP_${status}`, attempts: 1 });
  assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
});

test('malformed 200 is retried and is never treated as missing evidence', async () => {
  const f = fixture([response('<html>proxy</html>'), response({ data: card })]);
  assert.deepEqual(await fetchCard(card.id, f.options), card); assert.equal(f.calls.length, 2);
});

test('persistent malformed JSON fails with a sanitized bounded result', async () => {
  const f = fixture(Array.from({ length: 3 }, () => response('fixture-secret raw upstream body')));
  await assert.rejects(fetchCard(card.id, f.options), { code: 'POKEMON_REFERENCE_INVALID_JSON', attempts: 3 });
});

test('transport timeout retries, but child command and API key never enter diagnostics', async () => {
  const privateError = Object.assign(new Error('curl --header X-Api-Key: fixture-secret'), { code: 28, stderr: 'fixture-secret' });
  const f = fixture([privateError, privateError, privateError]);
  await assert.rejects(fetchCard(card.id, f.options), error => {
    assert.equal(error.attempts, 3); assert.doesNotMatch(JSON.stringify(error) + error.message, /fixture-secret|X-Api-Key/); return true;
  });
});

test('certificate failure does not disable validation or retry', async () => {
  const f = fixture([Object.assign(new Error('certificate rejected'), { code: 60 })]);
  await assert.rejects(fetchCard(card.id, f.options), { code: 'POKEMON_REFERENCE_TRANSPORT_FAILED', attempts: 1 });
  assert.ok(!f.calls[0][1].includes('--insecure')); assert.deepEqual(f.waits, []);
});

for (const data of [{ id: 'different' }, [], 'wrong']) test(`wrong card payload is rejected: ${JSON.stringify(data)}`, async () => {
  const f = fixture([response({ data })]);
  await assert.rejects(fetchCard(card.id, f.options), { code: 'POKEMON_REFERENCE_ID_MISMATCH', attempts: 1 });
});

test('missing HTTP status cannot silently pass as successful JSON', async () => {
  const f = fixture([{ stdout: JSON.stringify({ data: card }) }]);
  await assert.rejects(fetchCard(card.id, f.options), { code: 'POKEMON_REFERENCE_STATUS_MISSING' });
});

test('explicit null remains missing, while a missing data envelope is invalid', async () => {
  const f = fixture([response({ data: null })]); assert.equal(await fetchCard(card.id, f.options), null);
  const bad = fixture([response({ error: 'upstream failure' })]);
  await assert.rejects(fetchCard(card.id, bad.options), { code: 'POKEMON_REFERENCE_INVALID_PAYLOAD' });
});

test('invalid endpoint and identifier cannot dispatch a request', async () => {
  const f = fixture([]);
  for (const baseUrl of ['http://provider.example/v2', 'https://secret@provider.example/v2', 'https://provider.example/v2?q=x'])
    await assert.rejects(fetchCard(card.id, { ...f.options, baseUrl }), { code: 'POKEMON_REFERENCE_INVALID_ENDPOINT' });
  await assert.rejects(fetchCard('../card', f.options), { code: 'POKEMON_REFERENCE_INVALID_ID' });
  assert.equal(f.calls.length, 0);
});

test('legacy fetch errors are sanitized before artifact persistence', () => {
  const value = pokemonReferenceFailureV1(Object.assign(new Error('fixture-secret'), { cause: { message: 'fixture-secret' } }));
  assert.equal(value.code, 'POKEMON_REFERENCE_FETCH_FAILED'); assert.doesNotMatch(JSON.stringify(value), /fixture-secret/);
});
