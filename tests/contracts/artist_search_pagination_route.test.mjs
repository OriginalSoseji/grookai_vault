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

function loadRoute({ fail = false, sets = [], catalogFail = false, capture = () => {}, exactCardName, exactCardNames = [], partialCardNames = {} } = {}) {
  const cache = new Map();
  const mocks = {
    'server-only': {},
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/explore/getExploreRows': {
      getExploreRowsForCombinedSearch: async (options) => { capture(options); return fixture; },
      getExploreRowsForArtistSearch: async (artist, options) => {
        capture({ ...options, artist });
        if (fail) throw new Error('canceling statement due to statement timeout');
        return fixture;
      },
      getExploreRowsForLanguageScopedTextSearch: async () => fixture,
    },
    '@/lib/provisional/getPublicProvisionalCards': { getPublicProvisionalCards: async () => [] },
    '@/lib/provisional/getPromotionTransitionState': {
      getPromotionTransitionStateForCanonicalCards: async () => new Map(),
      applyPromotionTransitionsToCanonicalRows: (rows) => rows,
      suppressPromotedProvisionalRows: (rows) => rows,
    },
    '@/lib/resolver/resolveQuery': {},
    '@/lib/pricing/getPublicPricingByCardIds': { PublicPricingSortUnavailableError: class extends Error {} },
    '@/lib/supabase/server': {
      createServerComponentClient: async () => ({
        rpc: async (_name, args) => {
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
    vm.runInNewContext(code, { module, exports: module.exports, process, console, Error,
      setTimeout, clearTimeout, require: (id) => {
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
  return load(path.join(web, 'app/api/resolver/search/route.ts')).GET;
}

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
];
test('actual route applies name/set intersections before complete pagination with removable set chips', async () => {
 for (const [query, text, codes] of [
  ['Mewtwo from 30th anniversary','Mewtwo',['30c','30c-classic']],
  ['30th anniversary Mewtwo','Mewtwo',['30c','30c-classic']],
  ['Pika 30th','Pika',['30c','30c-classic']],
  ['30th Pika','Pika',['30c','30c-classic']],
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
