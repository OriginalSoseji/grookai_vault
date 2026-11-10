import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../../apps/web/package.json', import.meta.url)), ts = req('typescript');
const source = fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts', 'utf8');
const parsed = ts.createSourceFile('getExploreRows.ts', source, ts.ScriptTarget.Latest, true);
function functions(names, context = {}) {
  const text = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text))
    .map(n => n.getText(parsed)).join('\n') + `\nexport {${names.join(',')}};`;
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module, exports: module.exports, Map, Date, ...context });
  return module.exports;
}
const known = { id: 'known', gv_id: 'GV-MTG-SF-KNOWN', name: 'Known', number: '1', set_code: 'rolling',
  release_date: '2025-12-01', release_year: 2025, release_date_scope: 'individual_print', release_date_source: 'scryfall' };
const unknown = { ...known, id: 'unknown', name: 'Unknown', release_date: null, release_year: null, release_date_source: undefined };
const pokemon = { id: 'pokemon', gv_id: 'GV-PK-TEST-1', name: 'Pikachu', number: '1', set_code: 'rolling' };
const metadata = new Map([['rolling', { release_date: '2020-01-01', release_year: 2020 }]]);

test('year filtering uses the print date, preserves unknown and retains other games set-date behavior', () => {
  const { filterRowsByReleaseYear: filter } = functions(['filterRowsByReleaseYear']);
  assert.deepEqual(Array.from(filter([known, unknown, pokemon], metadata, 2025, 2025), r => r.id), ['known']);
  assert.deepEqual(Array.from(filter([known, unknown, pokemon], metadata, 2020, 2020), r => r.id), ['pokemon']);
  assert.equal(filter([known, unknown, pokemon], metadata).length, 3);
});
test('display and date sorting retain per-print dates and never substitute a set launch for an unknown print', async () => {
  const { buildExploreRows: build, sortRows: sort } = functions(['buildExploreRows', 'sortRows'], {
    extractTcgdexCardId: () => null, extractTcgdexSetId: () => null,
    resolveCardImageFieldsV1: async () => ({}), compareRowsByRelevance: (a, b) => a.id.localeCompare(b.id),
  });
  const rows = await build([known, unknown, pokemon], new Map(), metadata, new Map(), { skipChildDisplayImageFallbacks: true });
  assert.equal(rows[0].release_date, '2025-12-01'); assert.equal(rows[0].release_date_scope, 'individual_print');
  assert.equal(rows[1].release_date, undefined); assert.equal(rows[1].release_year, undefined);
  assert.equal(rows[2].release_date, '2020-01-01');
  assert.deepEqual(Array.from(sort(rows, {}, 'newest'), r => r.id), ['known', 'pokemon', 'unknown']);
  assert.deepEqual(Array.from(sort(rows, {}, 'oldest'), r => r.id), ['pokemon', 'known', 'unknown']);
});
test('complete Magic search filters individual dates before child enrichment and result paging', async () => {
  let enrichedIds;
  const { enrichCompleteSearchParents: enrich } = functions(['enrichCompleteSearchParents'], {
    withMtgPrintReleaseDates: async (_client, rows) => rows,
    uniqueValues: values => [...new Set(values)], fetchPublicSetMetadata: async () => metadata,
    applyLanguageScopeRows: rows => rows, applySmartStampParentFilter: rows => rows,
    filterSmartDiscoveryRowsByScope: async rows => rows,
    normalizeFinishKeys: values => values ?? [],
    fetchSmartDiscoveryChildRows: async (_options, rows, complete) => {
      assert.equal(complete, true); enrichedIds = Array.from(rows, r => r.id); return rows;
    }, buildResolverQuery: async () => ({}), normalizeQuery: value => value,
    buildExploreRows: async rows => rows, sortRows: rows => rows,
  });
  const rows = await enrich([known, unknown, pokemon], { gameScope: 'mtg', sortMode: 'newest',
    releaseYearMin: 2025, releaseYearMax: 2025, finishKeys: ['foil'] }, {});
  assert.deepEqual(enrichedIds, ['known']); assert.equal(rows.length, 1);
});
test('Magic date candidate narrowing uses per-print metadata rather than membership in an undated set', () => {
  const start = source.indexOf('export async function getExploreRowsForCombinedSearch(');
  const end = source.indexOf('async function enrichCompleteSearchParents(', start);
  const combined = source.slice(start, end);
  assert.match(combined, /gameScope === "mtg"[\s\S]*?fetchMtgPrintDateCandidates\(supabase/);
  assert.match(combined, /return enrichCompleteSearchParents\(datedParents as CardPrintLookupRow\[\], options, supabase\)/);
});
test('child printing hydration retains its own identity and finish alongside the parent print date', async () => {
  const child = { id: 'child', card_print_id: known.id, printing_gv_id: 'GV-MTG-CHILD', finish_key: 'foil',
    card_prints: { id: known.id, gv_id: known.gv_id, name: known.name, number: known.number, set_code: known.set_code } };
  const query = { select() { return query; }, order() { return query; }, range() { return query; }, in() { return query; },
    then(resolve) { resolve({ data: [child], error: null }); } };
  const { fetchSmartDiscoveryChildRows: children } = functions(['fetchSmartDiscoveryChildRows', 'mapSmartChildRowToCardPrintLookupRow', 'getParentFromSmartChild'], {
    createServerComponentClient: async () => ({ from: () => query }), normalizeFinishKeys: values => values ?? [],
    uniqueValues: values => [...new Set(values)], chunkArray: values => [values],
    applySmartDiscoveryImageQueryFilter: request => request,
    getPublicCardPrintingOptions: async () => [{ id: 'child' }],
    getCardPrintingFinishLabel: () => 'Foil',
  });
  const rows = await children({ finishKeys: ['foil'] }, [known], true);
  assert.equal(rows.length, 1); assert.equal(rows[0].release_date, '2025-12-01');
  assert.equal(rows[0].release_year, 2025); assert.equal(rows[0].finish_key, 'foil');
  assert.equal(rows[0].printing_gv_id, 'GV-MTG-CHILD'); assert.equal(rows[0].search_card_printing_id, 'child');
});
