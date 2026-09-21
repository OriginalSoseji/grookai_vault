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
  for (const query of ['Charizard', 'Pikachu 58', 'sv1 25', 'art', 'N']) {
    assert.equal(isKnownArtistQuery(query), false, query);
  }
});

const fixtures = [
  { id: '1', gv_id: 'GV-PK-BASE1-1', artist: 'Ken Sugimori' },
  { id: '2', gv_id: 'GV-PK-JPN-BASE-1', artist: 'Ken Sugimori' },
  { id: '3', gv_id: 'GV-MTG-TEST-1', artist: 'Ken Sugimori' },
  { id: '4', gv_id: 'GV-PK-BASE1-2', artist: 'Mitsuhiro Arita' },
];

function fixtureClient({ failure = false } = {}) {
  const requests = [];
  const client = createClient('https://fixture.supabase.co', 'fixture-key', {
    auth: { persistSession: false },
    global: { fetch: async (url) => {
      const params = new URL(url).searchParams;
      requests.push(params);
      if (failure) return new Response(JSON.stringify({ message: 'Artist lookup unavailable' }), { status: 503 });
      // Exercise the actual Supabase request serialization and filter semantics.
      const artistFilter = params.get('artist');
      assert.ok(artistFilter.startsWith('in.('));
      const names = artistFilter.slice(4, -1).split(',').map((name) => name.replace(/^"|"$/g, ''));
      const data = fixtures.filter((row) => names.includes(row.artist) &&
        params.getAll('gv_id').every((filter) => {
          if (filter === 'like.GV-PK-%') return row.gv_id.startsWith('GV-PK-');
          if (filter === 'like.GV-PK-JPN-%') return row.gv_id.startsWith('GV-PK-JPN-');
          if (filter === 'not.like.GV-PK-JPN-%') return !row.gv_id.startsWith('GV-PK-JPN-');
          throw new Error(`Unexpected scope: ${filter}`);
        }));
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
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
