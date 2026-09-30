import test from 'node:test';
import assert from 'node:assert/strict';
import { isPokemonReferenceIdV1 } from '../../backend/pricing/pokemon_reference_id_v1.mjs';
import { fetchPokemonCardByIdViaCurl, fetchPokemonCardsPageViaCurl } from '../../backend/pricing/pokemon_reference_http_v1.mjs';
import { fetchPokemonReferenceCatalogV1 } from '../../backend/pricing/pokemon_reference_catalog_v1.mjs';
import { fetchPokemonReferenceBatchV1 } from '../../backend/pricing/pokemon_reference_batch_v1.mjs';

const specials = ['ex10-?', 'ex10-!'];
for (const id of specials) test(`provider special ID ${id} retains exact identity in encoded single-card request`, async () => {
  let requests = 0;
  const card = await fetchPokemonCardByIdViaCurl(id, { baseUrl: 'https://provider.example/v2', run: async (_cmd, args) => {
    requests++;
    const url = new URL(args.at(-1));
    assert.equal(url.search, ''); assert.equal(url.hash, '');
    assert.equal(decodeURIComponent(url.pathname), `/v2/cards/${id}`);
    return { stdout: JSON.stringify({ data: { id } }) + '\n200' };
  } });
  assert.equal(card.id, id); assert.equal(requests, 1);
});

test('real batch size admits exact Unown IDs through page transport and catalog selection', async () => {
  const cards = Array.from({ length: 3847 }, (_, n) => ({ id: n < 2 ? specials[n] : `fixture-${n}` }));
  let time = 0, requests = 0;
  const result = await fetchPokemonReferenceCatalogV1({ ids: cards.map(c => c.id), now: () => time,
    sleep: async ms => { time += ms; }, fetchPage: (page, options) => fetchPokemonCardsPageViaCurl(page, { ...options,
      run: async () => {
        requests++;
        const data = cards.slice((page - 1) * 250, page * 250);
        return { stdout: JSON.stringify({ data, page, pageSize: 250, count: data.length, totalCount: cards.length }) + '\n200' };
      } }),
  });
  assert.equal(result.complete, true); assert.equal(result.exact_match_count, 3847);
  assert.equal(result.catalog_scan_complete, true); assert.equal(requests, 16);
  for (const id of specials) assert.equal(result.cardsByExternalId[id].id, id);
});

test('fixture batch uses the same exact special-ID validation', async () => {
  const result = await fetchPokemonReferenceBatchV1({ ids: specials, fetchCard: async id => ({ id }) });
  assert.equal(result.complete, true); assert.equal(result.completed, 2);
  assert.deepEqual(Object.keys(result.cardsByExternalId), specials);
});

test('special IDs do not allow unrelated punctuation, query injection, coercion or path traversal', async () => {
  for (const id of [null, 15, {}, '', '../ex10-?', 'ex10-?x=1', 'ex10-!&x=1', 'ex10-%3F', 'ex10-#', 'other-?', ' ex10-?', 'ex10-? ', 'ex10-?\n']) {
    assert.equal(isPokemonReferenceIdV1(id), false);
    await assert.rejects(fetchPokemonReferenceCatalogV1({ ids: [id], fetchPage: () => assert.fail('invalid ID network call') }), /INVALID_BATCH/);
    await assert.rejects(fetchPokemonCardByIdViaCurl(id, { run: () => assert.fail('invalid ID network call') }), /INVALID_ID/);
  }
});

test('special requested ID still requires exact returned identity', async () => {
  await assert.rejects(fetchPokemonCardByIdViaCurl('ex10-?', { run: async () => ({ stdout: JSON.stringify({ data: { id: 'ex10-!' } }) + '\n200' }) }), /ID_MISMATCH/);
});
