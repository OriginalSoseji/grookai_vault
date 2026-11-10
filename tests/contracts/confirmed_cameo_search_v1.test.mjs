import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript'), module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/lib/search/confirmedCameoSearch.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { fetchConfirmedCameoGvIds: read } = module.exports;
function client({ species = [{ national_dex_number: 94 }], rows = [], rpcError = null } = {}) {
  const calls = [], filters = [];
  return { calls, filters, from(table) {
    assert.equal(table, 'pokemon_species', 'raw imported associations cannot be read as confirmed evidence');
    const q = { select() { return q; }, eq(key, value) { assert.equal(key, 'active'); assert.equal(value, true); return q; },
      or(value) { filters.push(value); return q; }, limit(n) { assert.equal(n, 3); return Promise.resolve({ data: species, error: null }); } };
    return q;
  }, async rpc(name, args) {
    assert.equal(name, 'get_public_card_cameos_v2'); assert.equal(args.p_pokemon_ndex, '94');
    calls.push(args.p_offset); return { data: rows.slice(args.p_offset, args.p_offset + 100), error: rpcError };
  } };
}
test('only confirmed projection IDs are used, including explicit character representations', async () => {
  const c = client({ rows: [{ gv_id: 'GV-PK-A-1', appearance_role: 'scene_subject' },
    { gv_id: 'GV-PK-B-2', appearance_role: 'character_representation' }] });
  assert.deepEqual(Array.from(await read(c, 'Gengar')), ['GV-PK-A-1', 'GV-PK-B-2']);
  assert.ok(c.filters[0].includes('slug.eq."gengar"'));
});
test('all confirmed pages are consumed before downstream filtering; duplicate card appearances share one parent', async () => {
  const rows = Array.from({ length: 203 }, (_, n) => ({ gv_id: `GV-PK-TEST-${n}`, appearance_role: 'scene_subject' }));
  rows[202].gv_id = rows[0].gv_id;
  const c = client({ rows }); assert.equal((await read(c, 'Gengar')).length, 202);
  assert.deepEqual(c.calls, [0, 100, 200]);
});
test('unknown, ambiguous or unsafe subjects never fall back to imported associations', async () => {
  const unknown = client({ species: [] }); assert.equal((await read(unknown, 'Unknownmon')).length, 0); assert.equal(unknown.calls.length, 0);
  const ambiguous = client({ species: [{ national_dex_number: 94 }, { national_dex_number: 93 }] });
  await assert.rejects(read(ambiguous, 'Gengar'), /unambiguous/); assert.equal(ambiguous.calls.length, 0);
  const unsafe = client(); assert.equal((await read(unsafe, 'Gengar%,active.eq.false')).length, 0); assert.equal(unsafe.filters.length, 0);
});
test('RPC failures, unknown roles and the projection paging ceiling fail closed', async () => {
  await assert.rejects(read(client({ rpcError: { message: 'denied' } }), 'Gengar'), /denied/);
  await assert.rejects(read(client({ rows: [{ gv_id: 'GV-PK-A-1', appearance_role: 'unreviewed' }] }), 'Gengar'), /Invalid confirmed/);
  const rows = Array.from({ length: 1100 }, (_, n) => ({ gv_id: `GV-PK-TEST-${n}`, appearance_role: 'scene_subject' }));
  await assert.rejects(read(client({ rows }), 'Gengar'), /verified completely/);
});
