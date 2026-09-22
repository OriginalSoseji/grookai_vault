import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync('apps/web/src/lib/search/artistSearch.ts', 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, { module, exports: module.exports, require: () => JSON.parse(
  readFileSync('apps/web/src/lib/search/pokemonArtistNames.json', 'utf8'),
) });
const { resolveArtistNames, fetchPokemonArtistRows, isKnownArtistQuery } = module.exports;

test('known artist names and surnames bypass card-name scanning', () => {
  for (const query of ['Ken Sugimori', 'ken sugimori', 'Sugimori', 'Mitsuhiro Arita']) {
    assert.equal(isKnownArtistQuery(query), true);
  }
  for (const query of ['Charizard', 'Pikachu', 'pikachu', 'Pikachu 58', 'sv1 25', 'art', 'N']) {
    assert.equal(isKnownArtistQuery(query), false, query);
  }
});

const fixtures = [
  { id: '1', gv_id: 'GV-PK-BASE1-1', artist: 'Ken Sugimori' },
  { id: '2', gv_id: 'GV-PK-JPN-BASE-1', artist: 'Ken Sugimori' },
  { id: '3', gv_id: 'GV-MTG-TEST-1', artist: 'Ken Sugimori' },
  { id: '4', gv_id: 'GV-PK-BASE1-2', artist: 'Mitsuhiro Arita' },
];

function fixtureClient({ failure = false, records = fixtures, failPage = -1 } = {}) {
  const requests = [];
  const client = createClient('https://fixture.supabase.co', 'fixture-key', {
    auth: { persistSession: false },
    global: { fetch: async (url) => {
      const params = new URL(url).searchParams;
      requests.push(params);
      if (failure || (failPage > 0 && requests.length >= failPage)) return new Response(JSON.stringify({ message: 'Artist lookup unavailable' }), { status: 503 });
      // Exercise the actual Supabase request serialization and filter semantics.
      const artistFilter = params.get('artist');
      assert.ok(artistFilter.startsWith('in.('));
      const names = artistFilter.slice(4, -1).split(',').map((name) => name.replace(/^"|"$/g, ''));
      const data = records.filter((row) => names.includes(row.artist) &&
        params.getAll('gv_id').every((filter) => {
          if (filter === 'like.GV-PK-%') return row.gv_id.startsWith('GV-PK-');
          if (filter === 'like.GV-PK-JPN-%') return row.gv_id.startsWith('GV-PK-JPN-');
          if (filter === 'not.like.GV-PK-JPN-%') return !row.gv_id.startsWith('GV-PK-JPN-');
          throw new Error(`Unexpected scope: ${filter}`);
        })).filter((row) => !params.get('id') || row.id > params.get('id').slice(3));
      if (params.get('order')) data.sort((a, b) => a.id.localeCompare(b.id));
      return new Response(JSON.stringify(data.slice(0, Number(params.get('limit') ?? 1000))), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { client, requests };
}

test('explicit artist searches ignore capitalization and exclude other games', async () => {
  const { client, requests } = fixtureClient();
  const rows = await fetchPokemonArtistRows(client, 'id,gv_id,artist', 'ken sugimori', { exact: true });
  assert.deepEqual(rows.map((row) => row.id), ['1', '2']);
  assert.equal(requests[0].get('limit'), '250');
  assert.equal(requests[0].get('order'), null);
});

test('plain full names and surnames find artist cards', async () => {
  for (const name of ['Ken Sugimori', 'sugimori', '  Ken   Sugimori  ']) {
    const { client } = fixtureClient();
    const rows = await fetchPokemonArtistRows(client, 'id,gv_id,artist', name);
    assert.deepEqual(rows.map((row) => row.id), ['1', '2']);
  }
});

test('artist search applies language scope before limiting results', async () => {
  for (const [languageScope, expectedId] of [['en', '1'], ['ja', '2']]) {
    const { client } = fixtureClient();
    const rows = await fetchPokemonArtistRows(client, 'id,gv_id,artist', 'Sugimori', { languageScope });
    assert.deepEqual(rows.map((row) => row.id), [expectedId]);
  }
});

test('wildcards are literal, and empty or one-character input cannot browse the catalog', async () => {
  assert.deepEqual(Array.from(resolveArtistNames('A_B%*\\', true)), ['A_B%*\\']);
  assert.deepEqual(Array.from(resolveArtistNames('New Artist Saitō', false)), ['New Artist Saitō']);
  const { client, requests } = fixtureClient();
  for (const input of ['', '  ', '%', 'A']) {
    assert.equal((await fetchPokemonArtistRows(client, 'id', input)).length, 0);
  }
  assert.equal(requests.length, 0);
});

test('unknown artists return no cards, while query failures remain visible', async () => {
  const { client } = fixtureClient();
  assert.equal((await fetchPokemonArtistRows(client, 'id', 'Unknown Artist')).length, 0);
  await assert.rejects(
    fetchPokemonArtistRows(fixtureClient({ failure: true }).client, 'id', 'Ken Sugimori'),
    /Artist lookup unavailable/,
  );
});

test('complete artist search crosses both the 250-candidate and 1000-row API limits without duplicates', async () => {
  const records = Array.from({ length: 1234 }, (_, index) => ({
    id: String(index).padStart(6, '0'), gv_id: `GV-PK-TEST-${index}`, artist: 'Yuka Morii',
  }));
  const { client, requests } = fixtureClient({ records: records.toReversed() });
  const rows = await fetchPokemonArtistRows(client, 'id,gv_id,artist', 'yuka morii', { complete: true, languageScope: 'en' });
  assert.deepEqual(Array.from(rows, (row) => row.id), records.map((row) => row.id));
  assert.equal(requests.length, 3);
  assert.ok(requests.every((p) => p.get('order') === 'id.asc' && p.getAll('gv_id').includes('not.like.GV-PK-JPN-%')));
  assert.equal(requests[1].get('id'), 'gt.000499');
  assert.equal(requests[2].get('id'), 'gt.000999');
});

test('a later catalog-page failure does not publish a partial artist collection', async () => {
  const records = Array.from({ length: 501 }, (_, index) => ({
    id: String(index).padStart(6, '0'), gv_id: `GV-PK-TEST-${index}`, artist: 'Yuka Morii',
  }));
  await assert.rejects(fetchPokemonArtistRows(fixtureClient({ records, failPage: 2 }).client,
    'id,gv_id,artist', 'Yuka Morii', { complete: true }), /Artist lookup unavailable/);
});

test('artist response paging reaches all 195 cards and legacy clients receive the complete set', () => {
  const paginationModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync('apps/web/src/lib/search/artistSearchPagination.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: paginationModule, exports: paginationModule.exports });
  const { paginateArtistResults } = paginationModule.exports;
  const rows = Array.from({ length: 195 }, (_, id) => ({ id }));
  const seen = [];
  let offset = 0;
  do {
    const page = paginateArtistResults(rows, offset, 48, true);
    assert.equal(page.pagination.total_count, 195);
    seen.push(...page.rows);
    offset = page.pagination.next_offset;
    assert.equal(page.pagination.has_more, offset !== null);
  } while (offset !== null);
  assert.deepEqual(seen, rows);
  assert.equal(new Set(seen.map((row) => row.id)).size, 195);
  assert.equal(paginateArtistResults(rows, 0, 32, false).rows.length, 195);
  assert.equal(paginateArtistResults(rows, 195, 48, true).pagination.next_offset, null);
});
