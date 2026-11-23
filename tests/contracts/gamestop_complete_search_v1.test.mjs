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
const { gameStopCandidateFilter, governedStampCandidateFilter } = compile(fs.readFileSync('apps/web/src/lib/search/stampCandidateFilter.ts', 'utf8'));
const { normalizeSearchText } = compile(fs.readFileSync('apps/web/src/lib/search/normalizeSearchText.ts', 'utf8'));
const source = fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts', 'utf8');
const parsedSource = ts.createSourceFile('getExploreRows.ts', source, ts.ScriptTarget.Latest, true);
// Execute the real edition-discovery/merge dependencies too. A newly added
// production helper must not turn this isolated-reader test into a ReferenceError.
const readerHelpers = new Set(['getExploreRowsForCombinedSearch',
  'fetchExplicitEditionParentRows', 'getExplicitEditionModifiers',
  'mergeCardPrintLookupRows', 'normalizeTextForMatch']);
const reader = parsedSource.statements
  .filter(node => ts.isFunctionDeclaration(node) && readerHelpers.has(node.name?.text))
  .map(node => node.getText(parsedSource)).join('\n');

test('complete governed name rows are reused; fractions and sparse contracts hydrate parents', async()=>{
 const row={id:'visible',gv_id:'GV-PK-T-001',name:'Pikachu',number:'7',rarity:'Common',artist:'Artist',
  image_url:'https://example.test/exact.png',image_alt_url:null,image_source:'catalog',image_path:null,
  representative_image_url:null,image_status:'exact',image_note:null,set_code:'anthology',printed_set_abbrev:null,
  external_ids:{tcgdex:'exact'},variant_key:'gamestop_stamp',printed_identity_modifier:null,variants:{holo:true}};
 for(const [textQuery,input,expectedReads] of [['Pika',[row],0],['Pika 7/1019',[row],1],['Pika',[{id:'visible'}],1]]) {
  let reads=0;const searchTimings={};
  const {getExploreRowsForCombinedSearch}=compile(reader,{
   normalizeSearchText,
   assertValueSortPricingEnabled(){},createServerComponentClient:async()=>({}),
   fetchCompleteNamedCardRows:async()=>input,
   fetchCardRowsByIds:async ids=>{reads++;assert.deepEqual(Array.from(ids),['visible']);return [{...row,printed_total:1019}];},
   enrichCompleteSearchParents:async rows=>rows,
  });
  const result=await getExploreRowsForCombinedSearch({textQuery,sortMode:'relevance',searchTimings});
  assert.equal(reads,expectedReads);assert.equal(result[0].variants.holo,true);assert.equal(result[0].image_status,'exact');
  assert.equal(result[0].printed_total,expectedReads?1019:undefined);
  assert.ok(searchTimings.name_pages>=0&&searchTimings.parent_read>=0);
  if(!expectedReads) assert.equal(result[0],row);
 }
});

test('only explicit GameStop intent activates the candidate filter', () => {
  for (const labels of [undefined, [], ['EB Games Stamp'], ['gamestop%,name.not.is.null']]) {
    assert.equal(gameStopCandidateFilter(labels), null);
  }
  for (const label of ['GameStop Stamp', 'gamestop', ' GAMESTOP STAMP ']) {
    assert.ok(gameStopCandidateFilter([label]));
  }
});

test('advertised stamp families retain ordinary, inverted, missing and legacy modifier candidates', () => {
  const wb = governedStampCandidateFilter(['WB Kids Stamp']);
  for (const key of ['wb_kids_stamp', 'inverted_wb_kids_stamp', 'missing_wb_kids_stamp']) {
    assert.ok(wb.includes(`variant_key.eq.${key}`));
  }
  assert.ok(wb.includes('printed_identity_modifier.eq.stamp:wb_kids_first_movie'));
  assert.ok(wb.includes('printed_identity_modifier.eq.recognized_error:missing_wb_kids_stamp'));
  assert.ok(governedStampCandidateFilter(['Build-A-Bear Workshop Stamp']).includes('variant_key.eq.build_a_bear_workshop_stamp'));
  const inverted = governedStampCandidateFilter(['Inverted WB Kids Stamp']);
  assert.ok(inverted.includes('variant_key.eq.inverted_wb_kids_stamp'));
  assert.ok(!inverted.includes('variant_key.eq.missing_wb_kids_stamp'));
  for (const labels of [undefined, [], ['EB Games Stamp'], ['WB Kids Stamp,name.not.is.null'], ['kids']]) {
    assert.equal(governedStampCandidateFilter(labels), null);
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
    assert.equal(table, 'v_card_prints_discovery_v1');
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
    normalizeSearchText,
    assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
    fetchCompleteNamedCardRows: async () => null, getSmartDiscoveryTextTokens: () => [],
    governedStampCandidateFilter,
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

test('WB and Build-A-Bear searches narrow every page and keep complete results for final filtering', async () => {
  for (const label of ['WB Kids Stamp', 'Build-A-Bear Workshop Stamp']) {
    const filter = governedStampCandidateFilter([label]);
    const candidates = Array.from({ length: 503 }, (_, n) => ({ id: `stamp-${String(n).padStart(4, '0')}` }));
    const calls = [];
    const db = { from(table) {
      assert.equal(table, 'v_card_prints_discovery_v1');
      const call = { after: null, filter: null }; calls.push(call);
      const q = { select() { return q; }, like() { return q; }, order() { return q; },
        limit() { return q; }, gt(_, value) { call.after = value; return q; },
        or(value) { call.filter = value; return q; },
        then(resolve) { assert.equal(call.filter, filter); resolve({ data: candidates.filter(row => !call.after || row.id > call.after).slice(0, 500), error: null }); },
      }; return q;
    } };
    const { getExploreRowsForCombinedSearch } = compile(reader, {
      normalizeSearchText, assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
      fetchCompleteNamedCardRows: async () => null, getSmartDiscoveryTextTokens: () => [],
      governedStampCandidateFilter, enrichCompleteSearchParents: async (rows, options) => {
        assert.equal(options.stampLabels[0], label); return rows;
      },
    });
    const result = await getExploreRowsForCombinedSearch({ textQuery: '', stampLabels: [label] });
    assert.equal(result.length, 503); assert.equal(calls.length, 2);
  }
});

test('cancelled stamp search aborts its active catalog request and never enriches partial results', async () => {
  const controller = new AbortController();
  let calls = 0, enriched = false, attached;
  const db = { from(table) {
    assert.equal(table, 'v_card_prints_discovery_v1'); calls++;
    const q = { select() { return q; }, like() { return q; }, order() { return q; }, limit() { return q; },
      or() { return q; }, abortSignal(signal) {
        attached = signal;
        return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
      } };
    return q;
  } };
  const { getExploreRowsForCombinedSearch } = compile(reader, {
    normalizeSearchText, assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
    fetchCompleteNamedCardRows: async () => null, getSmartDiscoveryTextTokens: () => [],
    governedStampCandidateFilter, enrichCompleteSearchParents: async () => { enriched = true; return []; },
  });
  const pending = getExploreRowsForCombinedSearch({ textQuery: '', stampLabels: ['WB Kids Stamp'], signal: controller.signal });
  while (!attached) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(attached, controller.signal); assert.equal(calls, 1); assert.equal(enriched, false);
});

test('cancellation after a full catalog page prevents later pages and enrichment', async () => {
  const controller = new AbortController(); let calls = 0, enriched = false;
  const db = { from() {
    calls++;
    const q = { select() { return q; }, like() { return q; }, order() { return q; }, limit() { return q; },
      or() { return q; }, abortSignal() {
        controller.abort();
        return Promise.resolve({ data: Array.from({ length: 500 }, (_, i) => ({ id: String(i) })), error: null });
      } };
    return q;
  } };
  const { getExploreRowsForCombinedSearch } = compile(reader, {
    normalizeSearchText, assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
    fetchCompleteNamedCardRows: async () => null, getSmartDiscoveryTextTokens: () => [],
    governedStampCandidateFilter, enrichCompleteSearchParents: async () => { enriched = true; return []; },
  });
  await assert.rejects(getExploreRowsForCombinedSearch({ textQuery: '', stampLabels: ['WB Kids Stamp'], signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1); assert.equal(enriched, false);
});

test('cancelled explicit-edition lookup aborts its active request', async () => {
  const controller = new AbortController(); let attached;
  const db = { from() {
    const q = { select() { return q; }, in() { return q; }, limit() { return q; }, abortSignal(signal) {
      attached = signal; return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    } }; return q;
  } };
  const { fetchExplicitEditionParentRows } = compile(`${reader}\nexport { fetchExplicitEditionParentRows };`, {
    normalizeSearchText, createServerComponentClient: async () => db, EXPLICIT_EDITION_DISCOVERY_LIMIT: 100,
  });
  const pending = fetchExplicitEditionParentRows(['First Edition'], controller.signal);
  while (!attached) await new Promise(resolve => setImmediate(resolve));
  controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(attached, controller.signal);
});

test('cancellation during set-metadata enrichment prevents later reads', async () => {
  const controller = new AbortController(); let laterReads = 0;
  const enrichSource = parsedSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'enrichCompleteSearchParents').getText(parsedSource);
  const { enrichCompleteSearchParents } = compile(`${enrichSource}\nexport { enrichCompleteSearchParents };`, {
    uniqueValues: values => values,
    fetchPublicSetMetadata: async () => { controller.abort(); return new Map(); },
    filterSmartDiscoveryRowsByScope: async () => { laterReads++; return []; },
  });
  await assert.rejects(enrichCompleteSearchParents([{ id: 'one', set_code: 'base' }], { signal: controller.signal }, {}), { name: 'AbortError' });
  assert.equal(laterReads, 0);
});

test('cancellation during parent hydration prevents later chunks', async () => {
  const controller = new AbortController(); let calls = 0;
  const db = { from() {
    calls++;
    const q = { select() { return q; }, in() { return q; }, abortSignal() {
      controller.abort(); return Promise.resolve({ data: [{ id: 'first' }], error: null });
    } }; return q;
  } };
  const hydrateSource = parsedSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fetchCardRowsByIds').getText(parsedSource);
  const { fetchCardRowsByIds } = compile(`${hydrateSource}\nexport { fetchCardRowsByIds };`, {
    uniqueValues: values => [...new Set(values)],
    chunkArray: (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size)),
    createServerComponentClient: async () => db,
  });
  await assert.rejects(fetchCardRowsByIds(Array.from({ length: 201 }, (_, i) => String(i)), controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('cameo discovery hydrates only confirmed IDs and preserves artist and other combined constraints', async () => {
  const scope = { cameoSubject: 'Gengar', cameoArtistNames: ['Ken Sugimori'], textQuery: '', sortMode: 'relevance',
    releaseYearMin: 1999, releaseYearMax: 2024, finishKeys: ['normal'], languageScope: 'en', exactSetCode: 'base5' };
  let ordinaryReads = 0;
  const calls = [];
  const parents = [{ id: 'one', gv_id: 'GV-PK-TR-76', artist: 'Ken Sugimori' },
    { id: 'two', gv_id: 'GV-PK-UNB-187', artist: 'Ryo Ueda' }];
  const db = { from(table) {
    assert.equal(table, 'v_card_prints_discovery_v1');
    const q = { select() { return q; }, in(column, ids) { assert.equal(column, 'gv_id'); calls.push(Array.from(ids)); return Promise.resolve({ data: parents, error: null }); } };
    return q;
  } };
  const { getExploreRowsForCombinedSearch } = compile(reader, {
    normalizeSearchText, assertValueSortPricingEnabled() {}, createServerComponentClient: async () => db,
    fetchCompleteNamedCardRows: async () => { ordinaryReads++; return null; },
    fetchConfirmedCameoGvIds: async (_, subject) => { assert.equal(subject, 'Gengar'); return parents.map(p => p.gv_id); },
    chunkArray: (values, size) => { assert.equal(size, 200); return [values]; },
    enrichCompleteSearchParents: async (rows, options) => { assert.equal(options, scope); return rows; },
  });
  const result = await getExploreRowsForCombinedSearch(scope);
  assert.equal(ordinaryReads, 0); assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(result.map(r => r.id)), ['one']);
});

test('confirmed cameo reader does not admit unrelated artwork for an unknown artist constraint', async()=>{
 const parents=[{id:'one',gv_id:'GV-PK-TR-76',artist:'Ken Sugimori'}];
 const db={from(){const q={select(){return q;},in(){return Promise.resolve({data:parents,error:null});}};return q;}};
 const {getExploreRowsForCombinedSearch}=compile(reader,{
  normalizeSearchText,assertValueSortPricingEnabled(){},createServerComponentClient:async()=>db,
  fetchConfirmedCameoGvIds:async()=>['GV-PK-TR-76'],chunkArray:values=>[values],
  enrichCompleteSearchParents:async rows=>rows,
 });
 const rows=await getExploreRowsForCombinedSearch({cameoSubject:'Gengar',cameoArtistNames:['Nobody']});
 assert.equal(rows.length,0);
});
