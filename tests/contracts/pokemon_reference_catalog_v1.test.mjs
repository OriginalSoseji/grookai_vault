import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPokemonReferenceCatalogV1 } from '../../backend/pricing/pokemon_reference_catalog_v1.mjs';
import { fetchPokemonCardsPageViaCurl } from '../../backend/pricing/pokemon_reference_http_v1.mjs';
const cards = Array.from({ length: 501 }, (_, n) => ({ id: `card-${String(n).padStart(4, '0')}`, name: `Card ${n}` }));
const page = n => ({ data: cards.slice((n - 1) * 250, n * 250), page: n, pageSize: 250,
  count: Math.min(250, 501 - (n - 1) * 250), totalCount: 501 });
function fixture(alter = payload => payload) {
  let time = 0; const calls = [], rows = [];
  return { calls, rows, options: { ids: ['card-0000', 'card-0250', 'card-0500', 'missing-1'], now: () => time,
    sleep: async ms => { time += ms; }, onResult: row => rows.push(row),
    fetchPage: async (n, { beforeAttempt }) => { await beforeAttempt(); calls.push(n); return alter(page(n)); } } };
}
test('full bounded catalog scan uses three requests for 501 rows and selects only exact requested IDs', async () => {
  const f = fixture(), result = await fetchPokemonReferenceCatalogV1(f.options);
  assert.deepEqual(f.calls, [1, 2, 3]); assert.equal(result.complete, true); assert.equal(result.attempts, 3);
  assert.equal(f.rows.length, 3); assert.equal(result.catalog_count, 501);
  assert.deepEqual(Object.keys(result.cardsByExternalId), ['card-0000', 'card-0250', 'card-0500']);
});
for (const [name, alter] of [
  ['changed total', p => p.page === 2 ? { ...p, totalCount: 502 } : p],
  ['duplicate across pages', p => p.page === 2 ? { ...p, data: [cards[0], ...p.data.slice(1)] } : p],
  ['truncated page', p => p.page === 2 ? { ...p, data: p.data.slice(0, 10), count: 10 } : p],
  ['wrong page', p => ({ ...p, page: 99 })],
  ['oversized catalog', p => ({ ...p, totalCount: 50001 })],
]) test(`${name} cannot produce complete evidence`, async () => {
  const f = fixture(alter), result = await fetchPokemonReferenceCatalogV1(f.options);
  assert.equal(result.complete, false); assert.ok(f.calls.length <= 2);
});
test('page HTTP failure stops all further pages and retains earlier responses', async () => {
  const f = fixture(); const fetchPage = f.options.fetchPage;
  f.options.fetchPage = async (n, opts) => {
    if (n === 2) throw Object.assign(new Error('page unavailable'), { code: 'POKEMON_REFERENCE_HTTP_404', http_status: 404 });
    return fetchPage(n, opts);
  };
  const result = await fetchPokemonReferenceCatalogV1(f.options);
  assert.equal(result.complete, false); assert.equal(result.pages_received, 1);
  assert.equal(result.errors.length, 1); assert.equal(f.rows.length, 2);
});
test('page transport retries transient errors and preserves exact page request metadata', async () => {
  let requests = 0; const urls = [];
  const payload = await fetchPokemonCardsPageViaCurl(1, { sleep: async () => {},
    run: async (_cmd, args) => { urls.push(new URL(args.at(-1))); requests++;
      return { stdout: requests === 1 ? 'upstream\n502' : JSON.stringify(page(1)) + '\n200' }; } });
  assert.equal(payload.count, 250); assert.equal(requests, 2);
  assert.equal(urls[0].searchParams.get('pageSize'), '250'); assert.equal(urls[0].searchParams.get('orderBy'), 'id');
  assert.equal(urls[0].searchParams.has('q'), false);
});
test('transport rejects a silently truncated successful page', async () => {
  const payload = { ...page(1), data: cards.slice(0, 10), count: 10 };
  await assert.rejects(fetchPokemonCardsPageViaCurl(1, { run: async () => ({ stdout: JSON.stringify(payload) + '\n200' }) }), { code: 'POKEMON_REFERENCE_INVALID_PAGE' });
});
test('no mapped IDs needs no catalog requests', async () => {
  const result = await fetchPokemonReferenceCatalogV1({ ids: [], fetchPage: () => assert.fail() });
  assert.equal(result.complete, true); assert.equal(result.attempts, 0);
});
test('all requested IDs found permits early completion without claiming a complete catalog scan', async () => {
  const f = fixture(); f.options.ids = ['card-0000'];
  const result = await fetchPokemonReferenceCatalogV1(f.options);
  assert.deepEqual(f.calls, [1]); assert.equal(result.complete, true);
  assert.equal(result.all_requested_ids_found, true); assert.equal(result.catalog_scan_complete, false);
});
