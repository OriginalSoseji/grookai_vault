import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const web = path.resolve('apps/web/src');
const fixture = Array.from({ length: 195 }, (_, index) => ({
  id: String(index), gv_id: `GV-PK-${index === 194 ? 'JPN-' : ''}TEST-${index}`,
  name: `Card ${index}`, artist: 'Yuka Morii', number: String(index),
}));

function loadRoute({ fail = false, fastSearchTimeout = false, softTimeout = false, stallCombined = false, stallProvisional = false, provisionalError = null, captureProvisional = () => {}, sets = [], catalogFail = false, capture = () => {}, captureCollector = () => {}, collectorRows = fixture, captureRanked = () => {}, rankedRows, exactCardName, exactCardNames = [], partialCardNames = {}, rows = fixture } = {}) {
  const cache = new Map();
  const mocks = {
    'server-only': {},
    '@/lib/playables/getPokemonPlayables': { getPokemonPlayables: async () => null },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/explore/getExploreRows': {
      getExploreRowsForCombinedSearch: async (options) => {
        capture(options);
        if (stallCombined) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
        return rows;
      },
      getExploreRowsForSmartFilterDiscovery: async (options) => { capture(options); return rows; },
      getExploreRowsForArtistSearch: async (artist, options) => {
        capture({ ...options, artist });
        if (fail) throw new Error('canceling statement due to statement timeout');
        return rows;
      },
      getExploreRowsForLanguageScopedTextSearch: async (...args) => {
        if (fastSearchTimeout) throw new Error('canceling statement due to statement timeout');
        if (softTimeout) return new Promise(() => {});
        captureCollector(args);
        return collectorRows;
      },
    },
    '@/lib/provisional/getPublicProvisionalCards': { getPublicProvisionalCards: async (input) => {
      captureProvisional(input);
      if (stallProvisional) return new Promise((_, reject) => input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true }));
      if (provisionalError) throw new Error(provisionalError);
      return [];
    } },
    '@/lib/provisional/getPromotionTransitionState': {
      getPromotionTransitionStateForCanonicalCards: async () => new Map(),
      applyPromotionTransitionsToCanonicalRows: (rows) => rows,
      suppressPromotedProvisionalRows: (rows) => rows,
    },
    '@/lib/resolver/resolveQuery': rankedRows ? { resolveQueryWithMeta: async (...args) => {
      captureRanked(args);
      return { rows: rankedRows, meta: { resolverState: 'DIRECT_MATCH', topScore: null,
        candidateCount: rankedRows.length, autoResolved: false,
        intentSummary: { expectedSetCodes: [], nameTokens: [] }, structuredEvidenceFlags: null } };
    } } : {},
    '@/lib/pricing/getPublicPricingByCardIds': { PublicPricingSortUnavailableError: class extends Error {} },
    '@/lib/supabase/server': {
      createServerComponentClient: async () => ({
        rpc: async (_name, args) => {
          if (_name === 'get_search_set_catalog_v1') return {data:{complete:true,sets},error:catalogFail?{message:'offline'}:null};
          if (exactCardName) assert.equal(args.q, exactCardName);
          return {data: exactCardName ? [{name:exactCardName}] : partialCardNames[args.q] ? [{name:partialCardNames[args.q]}] : exactCardNames.includes(args.q) ? [{name:args.q}] : []};
        },
        from: (table) => {
          assert.equal(table, 'sets');
          return { select: () => ({ eq: () => ({ order: () => ({ range: async () => ({ data: sets, error: catalogFail ? { message: "offline" } : null }) }) }) }) };
        },
      }),
    },
    '@/lib/vault/getOwnedCountsByCardPrintIds': {},
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, process, console, Error, performance, AbortController, AbortSignal,
      setTimeout: (callback, delay) => setTimeout(callback, (softTimeout && delay === 4200) || (stallCombined && delay === 12000) || (stallProvisional && delay === 1200) ? 1 : delay), clearTimeout, require: (id) => {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        if (id.startsWith('@/') || id.startsWith('.')) {
          let target = id.startsWith('@/') ? path.join(web, id.slice(2)) : path.resolve(path.dirname(file), id);
          if (!path.extname(target) || !fs.existsSync(target)) target += '.ts';
          return load(target);
        }
        return require(id);
      },
    }, { filename: file });
    return module.exports;
  }
  const get = load(path.join(web, 'app/api/resolver/search/route.ts')).GET;
  return request => get({headers:new Headers(),...request});
}

test('provisional lookup timeout aborts its request without losing canonical results', async () => {
  let signal;
  const response = await loadRoute({ stallProvisional: true, captureProvisional: input => { signal = input.signal; } })({
    nextUrl: new URL('https://fixture?q=Pikachu&limit=5'),
  });
  assert.equal(response.status, 200);
  assert.equal(signal.aborted, true);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.ok(body.rows.length > 0);
  assert.equal(body.provisional.length, 0);
  assert.equal(body.provisional_status, 'unavailable');
});

test('failed provisional lookup preserves canonical rows and cannot be shared-cached', async () => {
  const response = await loadRoute({ provisionalError: 'upstream unavailable' })({
    nextUrl: new URL('https://fixture?q=Pikachu&limit=5'),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.rows.length > 0);
  assert.equal(body.provisional_status, 'unavailable');
  assert.equal(body.provisional.length, 0);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('successful empty provisional lookup remains cacheable and distinct from unavailable', async () => {
  const response = await loadRoute()({ nextUrl: new URL('https://fixture?q=Pikachu&limit=5') });
  const body = await response.json();
  assert.equal(body.provisional_status, 'available');
  assert.equal(body.provisional.length, 0);
  assert.match(response.headers.get('cache-control'), /^public/);
});

test('provisional security errors do not become successful partial results', async () => {
  const response = await loadRoute({ provisionalError: 'SECURITY: test violation' })({
    nextUrl: new URL('https://fixture?q=Pikachu&limit=5'),
  });
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).ok, false);
});

test('caller cancellation reaches the optional provisional lookup', async () => {
  const caller = new AbortController();
  let signal;
  await loadRoute({ stallProvisional: true, captureProvisional: input => {
    signal = input.signal;
    queueMicrotask(() => caller.abort());
  } })({ nextUrl: new URL('https://fixture?q=Pikachu&limit=5'), signal: caller.signal });
  assert.equal(signal.aborted, true);
});

test('timed-out searches are never cached as empty successful results', async () => {
  for (const options of [{ fastSearchTimeout: true }, { softTimeout: true }]) {
    const response = await loadRoute(options)({ nextUrl: new URL('https://fixture?q=Pikachu&limit=32') });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const payload = await response.json();
    assert.equal(payload.sort_degraded_reason, 'resolver_timeout');
    assert.equal(payload.source, options.softTimeout ? 'web_ranked_resolver_v2_degraded_soft_timeout' : 'web_ranked_resolver_v2_degraded_timeout');
    assert.equal(payload.rows.length, 0);
  }
});

test('complete-search soft timeout aborts the combined reader and returns a no-store failure', async () => {
  let signal;
  const response = await loadRoute({ stallCombined: true, capture: options => { signal = options.signal; } })({
    nextUrl: new URL('https://fixture?q=WB+Kids+Stamp&pagination=1'),
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).sort_degraded_reason, 'resolver_timeout');
  assert.equal(signal.aborted, true);
});

test('caller cancellation is propagated to the combined reader', async () => {
  const caller = new AbortController();
  let signal;
  const response = await loadRoute({ stallCombined: true, capture: options => {
    signal = options.signal;
    queueMicrotask(() => caller.abort());
  } })({ nextUrl: new URL('https://fixture?q=WB+Kids+Stamp&pagination=1'), signal: caller.signal });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).sort_degraded_reason, 'resolver_timeout');
  assert.equal(signal.aborted, true);
});

test('missing-image sentence routes to image discovery without spurious text', async () => {
  let options;
  const response = await loadRoute({ capture: value => { options = value; } })({
    nextUrl: new URL('https://fixture?q=all+cards+with+no+exact+image&limit=5'),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.smart_search.residualQuery, '');
  assert.equal(data.smart_search.imageState, 'missing');
  assert.equal(options.imageState, 'missing');
  assert.ok(data.rows.length > 0);
});

test('explicit Sword and Shield promo family combines with Cosmos without selecting the expansion', async () => {
  let options;
  const sets = [{ id: 'expansion', code: 'swsh1', name: 'Sword & Shield' },
    { id: 'promo', code: 'swshp', name: 'SWSH Black Star Promos' }];
  const rows = [{ id: '1', gv_id: 'GV-PK-TEST-1', name: 'Cyndaquil', finish_key: 'cosmos' }];
  const response = await loadRoute({ sets, rows, capture: value => { options = value; } })({
    nextUrl: new URL('https://fixture?q=cosmos+holo+Sword+and+Shield+promos&limit=5'),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(options.exactSetCode, 'swshp');
  assert.equal(options.finishKeys[0], 'cosmos');
  assert.equal(data.rows.length, 1);
});

test('printed XY promo requests use the bounded collector reader through the actual route',async()=>{
 const row={id:'pikachu-xy124',gv_id:'GV-PK-PR-XY-XY124',name:'Pikachu-EX',number:'XY124',set_code:'xyp'};
 for(const query of ['pika xy124','Pikachu XY124','XY124']){
  const calls=[];
  const get=loadRoute({collectorRows:[row],captureCollector:args=>calls.push(args)});
  const response=await get({nextUrl:new URL(`https://fixture?q=${encodeURIComponent(query)}&game=pokemon`)});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.sort_degraded_reason,null);
  assert.deepEqual(body.rows.map(card=>card.id),[row.id]);
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],query);
  assert.deepEqual(body.meta.intentSummary.expectedSetCodes,['xyp']);
 }
});

test('a missing printed XY promo stays an empty bounded result without a fallback',async()=>{
 const calls=[];
 const get=loadRoute({collectorRows:[],captureCollector:args=>calls.push(args)});
 const response=await get({nextUrl:new URL('https://fixture?q=pika+XY999&game=pokemon')});
 const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.sort_degraded_reason,null);
 assert.deepEqual(body.rows,[]);assert.equal(calls.length,1);
 assert.deepEqual(body.meta.intentSummary.expectedSetCodes,['xyp']);
});

test('retained GV identifiers keep identifier resolution ahead of printed promo lookup',async()=>{
 const row={id:'pikachu-xy124',gv_id:'GV-PK-PR-XY-XY124',name:'Pikachu-EX',number:'XY124',set_code:'xyp'};
 for(const query of ['GV-PK-PR-XY-XY124','gv-pk-pr-xy-xy124']){
  const collector=[],ranked=[];
  const get=loadRoute({rankedRows:[row],captureRanked:args=>ranked.push(args),captureCollector:args=>collector.push(args)});
  const response=await get({nextUrl:new URL(`https://fixture?q=${encodeURIComponent(query)}&game=pokemon`)});
  const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.sort_degraded_reason,null);
  assert.deepEqual(body.rows.map(card=>card.id),[row.id]);
  assert.equal(collector.length,0);assert.equal(ranked.length,1);
  assert.equal(ranked[0][0],row.gv_id);
 }
});

test('a real catalog opening-word collision cannot turn full-name promo searches into set searches',async()=>{
 const sets=[{id:'pwc',code:'pwc',name:'Pikachu World Collection'},
  {id:'xyp',code:'xyp',name:'XY Black Star Promos'}];
 const row={id:'pikachu-xy124',gv_id:'GV-PK-PR-XY-XY124',name:'Pikachu-EX',number:'XY124',set_code:'xyp'};
 for(const query of ['Pikachu XY124','PIKACHU XY124','pika xy124']){
  const calls=[];
  const get=loadRoute({sets,rows:[],collectorRows:[row],captureCollector:args=>calls.push(args)});
  const response=await get({nextUrl:new URL(`https://fixture?q=${encodeURIComponent(query)}&game=pokemon`)});
  const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.sort_degraded_reason,null);
  assert.deepEqual(body.rows.map(card=>card.id),[row.id]);
  assert.equal(calls.length,1);
  assert.ok(!(body.smart_search.queryFilters??[]).some(filter=>filter.kind==='set'&&filter.sourceText.toLowerCase()==='pikachu'));
 }
});

test('an explicit set parameter is retained when it conflicts with a printed promo family',async()=>{
 const calls=[];
 const get=loadRoute({rows:[],capture:options=>calls.push(options),collectorRows:[]});
 const response=await get({nextUrl:new URL('https://fixture?q=Pikachu+XY124&game=pokemon&set=base1')});
 const body=await response.json();
 assert.equal(response.status,200);assert.deepEqual(body.rows,[]);
 assert.equal(calls.length,1);assert.equal(calls[0].exactSetCode,'base1');
});

test('credentialed catalog searches are private and reuse the same request catalog', async () => {
 const sets=[{id:'visible',code:'base1',name:'Base Set',printed_total:102}];
 let options;
 const get=loadRoute({sets,capture:value=>{options=value;}});
 for(const headers of [new Headers(),new Headers({cookie:'sb-fixture-auth-token=fixture'}),new Headers({authorization:'Bearer fixture'})]){
  const response=await get({headers,nextUrl:new URL('https://fixture?q=Yuka+Morii+Wurmple')});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),[...headers].length?'private, no-store':'public, s-maxage=120, stale-while-revalidate=300');
  assert.equal(options.searchSets,sets);
  assert.match(response.headers.get('server-timing'),/^interpret;dur=\d+\.\d, resolve;dur=\d+\.\d, finish;dur=\d+\.\d(?:, (?:catalog|name_check|name_pages|parent_read);dur=\d+\.\d)*$/);
 }
});

test('actual resolver route pages full, lowercase, surname and explicit artist requests without loss', async () => {
  const get = loadRoute();
  for (const q of ['Yuka Morii', 'yuka morii', 'Morii', 'artist Yuka Morii']) {
    const ids = [];
    let offset = 0;
    do {
      const response = await get({ nextUrl: new URL(`https://fixture/explore?q=${encodeURIComponent(q)}&pagination=1&limit=48&offset=${offset}`) });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.pagination.total_count, 195);
      ids.push(...data.rows.map((row) => row.id));
      offset = data.pagination.next_offset;
    } while (offset !== null);
    assert.equal(new Set(ids).size, 195);
    assert.equal(ids.length, 195);
  }
});

test('artist paging counts language-filtered rows and supports installed mobile clients', async () => {
  const get = loadRoute();
  const english = await (await get({ nextUrl: new URL('https://fixture?q=Yuka+Morii&lang=en&pagination=1&offset=192&limit=48') })).json();
  assert.equal(english.pagination.total_count, 194);
  assert.equal(english.rows.length, 2);
  assert.equal(english.pagination.has_more, false);
  const legacy = await (await get({ nextUrl: new URL('https://fixture?q=Yuka+Morii&limit=32') })).json();
  assert.equal(legacy.rows.length, 195);
  assert.equal(legacy.pagination.has_more, false);
  const ordinaryResponse = await get({ nextUrl: new URL('https://fixture?q=Pikachu&limit=32&pagination=1') });
  assert.equal(ordinaryResponse.status, 200);
  const ordinary = await ordinaryResponse.json();
  assert.equal(ordinary.rows.length, 32);
  assert.equal(ordinary.pagination, undefined);
});

test('artist timeout and malformed offsets fail explicitly rather than publishing incomplete pages', async () => {
  const failed = await loadRoute({ fail: true })({ nextUrl: new URL('https://fixture?q=Yuka+Morii&pagination=1') });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).ok, false);
  for (const offset of ['-1', 'abc', '1.5', '9007199254740992']) {
    const invalid = await loadRoute()({ nextUrl: new URL(`https://fixture?q=Yuka+Morii&pagination=1&offset=${offset}`) });
    assert.equal(invalid.status, 400);
  }
});

const searchSets = [
 {id:'1',code:'base1',name:'Base Set'}, {id:'2',code:'base4',name:'Base Set 2'},
 {id:'3',code:'30c',name:'30th Celebration'}, {id:'4',code:'30c-classic',name:'30th Celebration Classic Collection'},
 {id:'5',code:'future1',name:'Future Garden'}, {id:'6',code:'fo',name:'Fossil'},
 {id:'7',code:'base5',name:'Team Rocket'},
 {id:'8',code:'asc',name:'Ascended Heroes'},
 {id:'25en',code:'cel25',name:'Celebrations'}, {id:'25classic',code:'cel25c',name:'Celebrations: Classic Collection'},
 {id:'25ja',code:'jp25',name:'拡張パック「25th ANNIVERSARY COLLECTION」'},
 {id:'20en',code:'g1',name:'Generations'}, {id:'20ja',code:'jp20',name:'20th Anniversary'},
];
test('actual route applies name/set intersections before complete pagination with removable set chips', async () => {
 for (const [query, text, codes] of [
  ['Mewtwo from 30th anniversary','Mewtwo',['30c','30c-classic']],
  ['30th anniversary Mewtwo','Mewtwo',['30c','30c-classic']],
  ['Pika 30th','Pika',['30c','30c-classic']],
  ['30th Pika','Pika',['30c','30c-classic']],
  ['25th anniversary','',['cel25','cel25c','jp25']],
  ['Pika 25th','Pika',['cel25','cel25c','jp25']],
  ['25th anniversary Chari','Chari',['cel25','cel25c','jp25']],
  ['Chari from the 25th anniversary','Chari',['cel25','cel25c','jp25']],
  ['20th Pika','Pika',['g1','jp20']],
  ['Pika 20th anniversary','Pika',['g1','jp20']],
  ['pika ascended','pika',['asc']],
  ['ascended pika','pika',['asc']],
  ['Chari base set','Chari',['base1']],
  ['Base Set 2 Chari','Chari',['base4']],
  ['Chari BASE,   SET 2','Chari',['base4']],
  ['Aerodactyl Fossil','Aerodactyl',['fo']],
  ['Fossil Aerodactyl','Aerodactyl',['fo']],
  ['Eevee Future Garden','Eevee',['future1']],
  ['Dark Charizard Team Rocket','Dark Charizard',['base5']],
  ['Team Rocket Dark Charizard','Dark Charizard',['base5']],
 ]) {
  let options;
  const get = loadRoute({sets:searchSets,capture:value=>{options=value;}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(query)+'&pagination=1&limit=48&offset=192')});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(options.textQuery,text);
  assert.deepEqual(JSON.parse(JSON.stringify(options.exactSetCodes)), codes);
  assert.equal(result.pagination.total_count,195);
  assert.equal(result.rows.length,3);
  assert.equal(result.pagination.next_offset,null);
  const chip=result.smart_search.queryFilters.find(filter=>filter.kind==='set');
  assert.equal(chip.queryWithout,text);
  assert.equal(result.smart_search.queryFilters.some(filter=>filter.kind==='number'),false);
 }
});

test('anniversary route combines artist, finish, language and complete legacy/paged results', async () => {
 for(const lang of ['en','ja']) {
  for(const pagination of ['0','1']) {
   let options;
   const get=loadRoute({sets:searchSets,rows:fixture.map(row=>({...row,artist:'Ken Sugimori',finish_key:'holo'})),capture:value=>{options=value;}});
   const q='Ken Sugimori Pika 25th anniversary holo';
   const response=await get({nextUrl:new URL('https://fixture?'+new URLSearchParams({q,game:'pokemon',lang,pagination,limit:'48'}))});
   assert.equal(response.status,200);
   const data=await response.json();
   assert.equal(options.artist,'Ken Sugimori');
   assert.equal(options.textQuery,'Pika');
   assert.deepEqual(JSON.parse(JSON.stringify(options.exactSetCodes)),['cel25','cel25c','jp25']);
   assert.deepEqual(JSON.parse(JSON.stringify(options.finishKeys)),['holo']);
   assert.equal(options.languageScope,lang);
   const expected=lang==='en'?194:1;
   assert.equal(data.pagination.total_count,expected);
   assert.equal(data.rows.length,pagination==='1'?Math.min(48,expected):expected);
   const chip=data.smart_search.queryFilters.find(filter=>filter.kind==='set');
   assert.equal(chip.queryWithout,'Ken Sugimori Pika holo');
  }
 }
});
test('route retains artist and finish with a set and refuses catalog-read failures', async () => {
 let options;
 const get=loadRoute({sets:searchSets,capture:value=>{options=value;}});
 const response=await get({nextUrl:new URL('https://fixture?q=Yuka+Morii+Wurmple+from+Future+Garden+reverse+holo&pagination=1')});
 assert.equal(response.status,200);
 assert.equal(options.artist,'Yuka Morii');
 assert.equal(options.textQuery,'Wurmple');
 assert.equal(options.exactSetCode,'future1');
 assert.deepEqual(JSON.parse(JSON.stringify(options.finishKeys)),['reverse']);
 const failed=await loadRoute({catalogFail:true})({nextUrl:new URL('https://fixture?q=Mewtwo+from+30th+anniversary')});
 assert.equal(failed.status,503);
 assert.equal(failed.headers.get('cache-control'),'private, no-store');
});

test('opening-word set filters retain artist and finish constraints', async () => {
 let options;
 const get=loadRoute({sets:searchSets,capture:value=>{options=value;}});
 const response=await get({nextUrl:new URL('https://fixture?q=Yuka+Morii+Wurmple+ascended+reverse+holo&pagination=1')});
 assert.equal(response.status,200);
 assert.equal(options.artist,'Yuka Morii');
 assert.equal(options.textQuery,'Wurmple');
 assert.equal(options.exactSetCode,'asc');
 assert.deepEqual(JSON.parse(JSON.stringify(options.finishKeys)),['reverse']);
});

test('complete card names take precedence over single-word and multiword catalog set matches', async () => {
 for (const name of ['Unidentified Fossil', "Team Rocket's Handiwork", 'Ascended Pikachu']) {
  const get=loadRoute({sets:searchSets,exactCardName:name});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(name)+'&pagination=1')});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.smart_search.queryFilters.some(filter=>filter.kind==='set'),false, JSON.stringify(result.smart_search));
  assert.equal(result.smart_search.artist, undefined);
  assert.equal(result.smart_search.residualQuery, name);
 }
});

test('oversized queries fail before accessing catalog services', async () => {
 const get=loadRoute({catalogFail:true});
 const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent('Mewtwo '+ '\t'.repeat(501)+'Base Set'))});
 assert.equal(response.status,400);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.match((await response.json()).error,/500 characters/);
});

test('a Pokemon name also starting a product title stays card text beside another set prefix', async () => {
 const sets=[...searchSets,{id:'9',code:'char-deck',name:'Charizard Half Deck'}, {id:'10',code:'swsh7',name:'Evolving Skies'}];
 for (const q of ['Charizard Evolving','Evolving Charizard']) {
  let options;
  const get=loadRoute({sets,exactCardNames:['Charizard'],capture:value=>{options=value;}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(q)+'&pagination=1')});
  assert.equal(response.status,200);
  assert.equal(options.textQuery,'Charizard');
  assert.equal(options.exactSetCode,'swsh7');
 }
});

test('partial card names take precedence over opening-word set shortcuts', async () => {
 const sets=[...searchSets,{id:'dark',code:'bw5',name:'Dark Explorers'}, {id:'shining',code:'sm35',name:'Shining Legends'}, {id:'mega',code:'me01',name:'Mega Evolution'}];
 for (const [q,name] of [['Dark Chari','Dark Charizard'],['Shining Chari','Shining Charizard'],['Mega Char','Mega Charizard X ex']]) {
  const get=loadRoute({sets,partialCardNames:{[q]:name}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(q)+'&pagination=1')});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.smart_search.queryFilters.some(f=>f.kind==='set'),false, q);
  assert.equal(data.smart_search.residualQuery,q);
 }
 let options;
 const get=loadRoute({sets,partialCardNames:{'Chari from Dark':'Dark Charizard'},capture:value=>{options=value;}});
 const response=await get({nextUrl:new URL('https://fixture?q=Chari+from+Dark&pagination=1')});
 assert.equal(response.status,200);
 assert.equal(options.exactSetCode,'bw5');
 assert.equal(options.textQuery,'Chari');
});

test('short card-name fragments retain bounded results instead of exhaustive discovery', async () => {
 for(const q of ['a','p','pi','a p','Ｐ']) {
  let exhaustive=0;
  const get=loadRoute({partialCardNames:{[q]:'Pikachu'},capture:()=>{exhaustive++;}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(q)+'&limit=32&pagination=1')});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(exhaustive,0);assert.equal(result.rows.length,32);assert.equal(result.pagination,undefined);
 }
});

test('numbered card names keep their name and number instead of becoming an implicit set shortcut', async () => {
 const sets=[{id:'mega',code:'me01',name:'Mega Evolution'}];
 const row={id:'greninja',gv_id:'GV-PK-MEP-081',name:'Mega Greninja ex',number:'081'};
 for(const q of ['Mega Greninja 081','Mega Greninja 81','081 Mega Greninja','Mega Greninja #081','Mega Greninja 081/094']) {
  let options;
  const get=loadRoute({sets,rows:[row],partialCardNames:{'Mega Greninja':'Mega Greninja ex'},capture:value=>{options=value;}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(q)+'&pagination=1')});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].gv_id,'GV-PK-MEP-081');
  assert.equal(options.textQuery,q,'the number remains a result constraint');
  assert.equal(Boolean(options.exactSetCode),false);
  assert.equal(options.exactSetCodes.length,0);
  assert.equal(body.smart_search.queryFilters.some(filter=>filter.kind==='set'),false);
  assert.equal(body.smart_search.queryFilters.some(filter=>filter.kind==='number'),true);
 }
});

test('numbered name disambiguation preserves explicit set constraints and unknown name fragments', async () => {
 const sets=[{id:'mega',code:'me01',name:'Mega Evolution'}];
 for(const q of ['Mega Greninja 081 from Mega','Mega Greninja unknown 081']) {
  let options;
  const get=loadRoute({sets,partialCardNames:{'Mega Greninja':'Mega Greninja ex'},capture:value=>{options=value;}});
  const response=await get({nextUrl:new URL('https://fixture?q='+encodeURIComponent(q))});
  assert.equal(response.status,200);
  assert.equal(options.exactSetCode,'me01');
  assert.ok(options.textQuery.includes('081'));
  if(q.includes('unknown')) assert.ok(options.textQuery.includes('unknown'));
 }
});

test('plain card-name queries expose all pages and complete legacy results', async () => {
 for(const q of ['Pika','Charizard']) {
  const get=loadRoute({partialCardNames:{Pika:'Pikachu',Charizard:'Charizard'}});
  const first=await (await get({nextUrl:new URL('https://fixture?q='+q+'&limit=32&pagination=1')})).json();
  assert.equal(first.rows.length,32);assert.equal(first.pagination.total_count,195);
  assert.equal(first.pagination.has_more,true);assert.equal(first.pagination.next_offset,32);
  const last=await (await get({nextUrl:new URL('https://fixture?q='+q+'&limit=32&pagination=1&offset=192')})).json();
  assert.equal(last.rows.length,3);assert.equal(last.pagination.has_more,false);
  const legacy=await (await get({nextUrl:new URL('https://fixture?q='+q+'&limit=32')})).json();
  assert.equal(legacy.rows.length,195);assert.equal(legacy.pagination.total_count,195);
 }
});

test('cameo route preserves explicit artist constraints outside the bundled artist inventory', async () => {
 for (const [query, illustrator, expected] of [
  ['Gengar cameo artist Nobody', null, ['Nobody']],
  ['Gengar cameo artist: "Nobody"', null, ['Nobody']],
  ['Gengar cameo artist Ken Sugimori', null, ['Ken Sugimori']],
  ['Gengar cameo artist Nobody', 'Ken Sugimori', undefined],
  ['Gengar cameo', null, undefined],
 ]) {
  let scope;
  const get=loadRoute({rows:[],capture:options=>{scope=options;}});
  const url=new URL('https://fixture/explore');url.searchParams.set('q',query);
  if(illustrator)url.searchParams.set('illustrator',illustrator);
  const response=await get({nextUrl:url});
  assert.equal(response.status,200,query);
  assert.equal(scope.cameoSubject,'Gengar',query);
  assert.deepEqual(scope.cameoArtistNames ? Array.from(scope.cameoArtistNames) : undefined,expected,query);
  assert.equal(scope.exactIllustrator,illustrator ?? undefined,query);
 }
});
