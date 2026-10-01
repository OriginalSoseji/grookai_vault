import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
function compile(source, context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module, exports: module.exports, ...context });
  return module.exports;
}
const { gameStopCandidateFilter } = compile(fs.readFileSync('apps/web/src/lib/search/stampCandidateFilter.ts', 'utf8'));
const source = fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts', 'utf8');
const reader = source.slice(source.indexOf('export async function getExploreRowsForCombinedSearch('),
  source.indexOf('\nasync function enrichCompleteSearchParents('));

test('only explicit GameStop intent activates the candidate filter', () => {
  for (const labels of [undefined, [], ['EB Games Stamp'], ['gamestop%,name.not.is.null']]) {
    assert.equal(gameStopCandidateFilter(labels), null);
  }
  for (const label of ['GameStop Stamp', 'gamestop', ' GAMESTOP STAMP ']) {
    assert.ok(gameStopCandidateFilter([label]));
  }
});

test('stamp-only combined search narrows every page using either canonical stamp field', async () => {
  const all = [
    ...Array.from({ length: 1500 }, (_, i) => ({ id: `base-${i}`, variant_key: '', variants: {} })),
    ...Array.from({ length: 502 }, (_, i) => ({ id: `stamp-${String(i).padStart(4, '0')}`, variant_key: 'gamestop_stamp', variants: {} })),
    { id: 'stamp-legacy', variant_key: '', printed_identity_modifier: 'gamestop_stamp', variants: {} },
    { id: 'stamp-unrelated', variant_key: 'eb_games_stamp', variants: {} },
  ];
  const calls = [];
  const db = { from(table) {
    assert.equal(table, 'card_prints');
    const call = { after: null, or: null }; calls.push(call);
    const query = {
      select() { return query; }, like() { return query; }, order() { return query; },
      limit() { return query; }, gt(_, value) { call.after = value; return query; },
      or(value) { call.or = value; return query; },
      then(resolve) {
        assert.equal(call.or, gameStopCandidateFilter(['GameStop Stamp']));
        const filtered = all.filter(r => r.variant_key === 'gamestop_stamp' || r.printed_identity_modifier === 'gamestop_stamp');
        resolve({ data: filtered.filter(r => !call.after || r.id > call.after).slice(0, 500), error: null });
      },
    }; return query;
  } };
  const { getExploreRowsForCombinedSearch } = compile(reader, {
    assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
    fetchCompleteNamedCardRows: async () => null, getSmartDiscoveryTextTokens: () => [],
    gameStopCandidateFilter,
    enrichCompleteSearchParents: async (rows, options) => {
      assert.equal(options.stampLabels[0], 'GameStop Stamp');
      assert.equal(rows.length, 503, 'all candidate pages reach final filtering');
      return rows;
    },
  });
  const rows = await getExploreRowsForCombinedSearch({ stampLabels: ['GameStop Stamp'], textQuery: '' });
  assert.equal(calls.length, 2);
  assert.equal(rows.length, 503);
  assert.ok(rows.some(r => r.id === 'stamp-legacy'));
  assert.ok(!rows.some(r => r.id === 'stamp-unrelated'));
});
