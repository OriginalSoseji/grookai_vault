import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTestTypeScript} from './testTypeScriptLoader.mjs';

const compile = file => ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
}).outputText;
const intentModule = loadTestTypeScript('lib/search/smartSearchIntent.ts');
const queryModule = loadTestTypeScript('lib/search/resolveSmartSearchQuery.ts');
const routeJs = compile('../../app/api/resolver/search/route.ts');

function load(source, imports = {}) {
  const testModule = {exports: {}};
  vm.runInNewContext(source, {module: testModule, exports: testModule.exports, require: id => {
    if (!(id in imports)) throw Error(`Unexpected import ${id}`);
    return imports[id];
  }, URL, URLSearchParams, Map, Set, Date, Promise, setTimeout, clearTimeout, console, process, performance});
  return testModule.exports;
}

function setup({available = true, state = 'ready', userId = null, owned = [], catalogSets, catalogCardName, publishedNames} = {}) {
  const members = Array.from({length: 90}, (_, index) => ({card_print_id: `card-${index}`, gv_id: `GV-PK-TEST-${index}`}));
  const calls = [];
  const nameProbes = [];
  const snapshot = {state, rows: state === 'ready' ? members : [], valid_until: new Date(Date.now() + 3600000).toISOString()};
  const unrestricted = () => {throw Error('UNRESTRICTED_SEARCH_FORBIDDEN');};
  const imports = {
    '@/lib/search/catalogSetSearch': {readSearchSets: async () => catalogSets ?? [],
      resolveCatalogSetSearchIntent: catalogSets ? loadTestTypeScript('lib/search/catalogSetSearch.ts').resolveCatalogSetSearchIntent
        : query => ({matchedAlias: null, setCodes: [], remainingQuery: query}),
      removeSetPhrase: loadTestTypeScript('lib/search/catalogSetSearch.ts').removeSetPhrase,
      isCatalogCardNameQuery: catalogCardName ? loadTestTypeScript('lib/search/catalogSetSearch.ts').isCatalogCardNameQuery : async () => false,
      isPublishedPlayableCardNameQuery: loadTestTypeScript('lib/search/catalogSetSearch.ts').isPublishedPlayableCardNameQuery,
      isExactCatalogCardName: async () => false},
    '@/lib/search/completeNamedCardSearch': {supportsCompleteNameSearch: value => Boolean(catalogCardName) && loadTestTypeScript('lib/search/completeNamedCardSearch.ts').supportsCompleteNameSearch(value)},
    '@/lib/search/artistSearch': {isKnownArtistQuery: () => false},
    '@/lib/search/artistSearchPagination': loadTestTypeScript('lib/search/artistSearchPagination.ts'),
    '@/lib/search/structuredCollectorSearchMeta': loadTestTypeScript('lib/search/structuredCollectorSearchMeta.ts'),
    '@/lib/catalogSearchAccess': {catalogSearchAccess: () => ({allowed: false})},
    'next/server': {NextResponse: {json: (body, options) => ({body, status: options?.status ?? 200, headers: options?.headers})}},
    '@/lib/cards/identitySearch': {isIdentityFilterActive: () => false, normalizeIdentityFilterKey: () => 'all'},
    '@/lib/provisional/getPublicProvisionalCards': {getPublicProvisionalCards: unrestricted},
    '@/lib/provisional/getPromotionTransitionState': {
      getPromotionTransitionStateForCanonicalCards: async () => new Map(),
      applyPromotionTransitionsToCanonicalRows: rows => rows,
      suppressPromotedProvisionalRows: rows => rows,
    },
    '@/lib/explore/getExploreRows': new Proxy({getExploreRowsForPlayableCards: async (scopedMembers, options) => {
      calls.push({members: scopedMembers, options});
      return scopedMembers.map(member => ({id: member.card_print_id, gv_id: member.gv_id, name: 'Boss\'s Orders'}));
    }}, {get: (target, key) => target[key] ?? unrestricted}),
    '@/lib/publicLanguageScope': {normalizePublicLanguageScope: value => value ?? 'all', matchesPublicLanguageScope: () => true},
    '@/lib/resolver/normalizeQuery': {normalizeQuery: () => ({collectorExpectations: [], rarityIntent: [], traitIntent: [], variantTokens: [], expectedSetCodes: []})},
    '@/lib/resolver/resolveQuery': {resolveQueryWithMeta: unrestricted},
    '@/lib/publicSets.shared': {resolvePublicSetRouteCode: value => value, resolveGameScopedSetSearchIntent: query => ({setCodes: [], remainingQuery: query})},
    '@/lib/search/smartSearchIntent': intentModule,
    '@/lib/search/normalizeSearchText': {normalizeSearchText: value => String(value ?? '').toLowerCase()},
    '@/lib/publicGameScope': {normalizePublicGameScope: value => value ?? 'pokemon'},
    '@/lib/search/smartVariantSearchPolicy': {classifySmartVariantResolverState: count => count ? 'WEAK_MATCH' : 'NO_MATCH'},
    '@/lib/search/resolveSmartSearchQuery': queryModule,
    '@/lib/supabase/server': {createServerComponentClient: async () => ({
      from: table => {assert.equal(table, 'card_prints');return {select: () => ({in: (_, ids) => ({data: (publishedNames ?? (catalogCardName ? [{id:'card-0',gv_id:'GV-PK-TEST-0',name:catalogCardName}] : [])).filter(row=>ids.includes(row.id)),error:null})})};},
      rpc: async (_, args) => {nameProbes.push(args.q);return {data: args.q === catalogCardName ? [{id: 'card-0', name: catalogCardName, gv_id: 'GV-PK-TWM-216'}] : []};},
      auth: {getUser: async () => ({data: {user: userId ? {id: userId} : null}})},
    })},
    '@/lib/vault/getOwnedCountsByCardPrintIds': {getOwnedCardPrintIdsForUser: async () => owned,
      getOwnedCountsByCardPrintIds: async () => new Map(owned.map(id => [id, 1]))},
    '@/lib/pricing/getPublicPricingByCardIds': {PublicPricingSortUnavailableError: class extends Error {}},
    '@/lib/playables/getPokemonPlayables': {getPokemonPlayables: async () => available ? snapshot : null},
  };
  const {GET} = load(routeJs, imports);
  return {calls, members, nameProbes, get: query => GET({nextUrl: new URL(`https://example.test/api/resolver/search?${query}`), headers: new Headers()})};
}

test('playable words compile into visible typed filters while preserving card names', () => {
  for (const word of ['playable', 'playables', 'PLAYABLES']) {
    const intent = intentModule.buildSmartSearchIntent(`${word} Boss's Orders`);
    assert.equal(intent.playable, true);
    assert.equal(queryModule.resolveSmartSearchQuery(intent.originalQuery, intent), "Boss's Orders");
    assert(intent.queryFilters.some(filter => filter.kind === 'playable'));
  }
  const only = intentModule.buildSmartSearchIntent('show me playable Pokemon Standard cards');
  assert.equal(queryModule.resolveSmartSearchQuery(only.originalQuery, only), '');
  assert.deepEqual(Array.from(only.finishKeys), []);
  assert.equal(intentModule.buildSmartSearchIntent('unplayable cards').playable, undefined);
});

test('Pokemon rarity aliases and explicit artwork have removable filters without changing query meaning', () => {
  const sir = intentModule.buildSmartSearchIntent('SIR playables Bloodmoon Ursaluna ex');
  assert.equal(sir.playable, true);
  assert.equal(sir.residualQuery, 'SIR Bloodmoon Ursaluna ex');
  const rarity = sir.queryFilters.find(filter => filter.kind === 'rarity');
  assert.equal(rarity.label, 'Rarity: special illustration rare');
  assert.equal(rarity.queryWithout, 'playables Bloodmoon Ursaluna ex');
  assert.equal(sir.queryFilters.find(filter => filter.kind === 'text').sourceText, 'Bloodmoon Ursaluna ex');
  for (const spelling of ['full art', 'full-art', 'fullart']) {
    const intent = intentModule.buildSmartSearchIntent(`${spelling} playables`);
    assert.equal(intent.queryFilters.find(filter => filter.kind === 'artwork').label, 'Artwork: Full Art');
    assert.equal(intent.queryFilters.find(filter => filter.kind === 'artwork').queryWithout, 'playables');
    assert.equal(intent.residualQuery, spelling);
  }
  assert(!intentModule.buildSmartSearchIntent('Sir Shandlar', {gameScope: 'mtg'}).queryFilters.some(filter => filter.kind === 'rarity'));
  assert(!intentModule.buildSmartSearchIntent('"SIR" playables').queryFilters.some(filter => filter.kind === 'rarity'));
});

function discoveryMatcher() {
  const unknown = new Proxy({}, {get: () => () => {throw Error('UNEXPECTED_DEPENDENCY');}});
  const compiledModule = {exports: {}};
  vm.runInNewContext(compile('../explore/getExploreRows.ts') + '\nmodule.exports.matches = rowMatchesSmartDiscoveryText;', {
    module: compiledModule, exports: compiledModule.exports, Map, Set,
    require: id => id === '@/lib/search/normalizeSearchText' ? loadTestTypeScript('lib/search/normalizeSearchText.ts')
      : id === '@/lib/search/collectorCardQuery' ? loadTestTypeScript('lib/search/collectorCardQuery.ts')
        : id === '@/lib/search/catalogArtworkClassification' ? loadTestTypeScript('lib/search/catalogArtworkClassification.ts') : unknown,
  });
  return compiledModule.exports.matches;
}

test('quoted collector text stays literal through the resolver route and actual discovery matcher', async () => {
  const matches = discoveryMatcher();
  const sir = {gv_id: 'GV-PK-TWM-216', name: 'Bloodmoon Ursaluna ex', rarity: 'Special Illustration Rare'};
  for (const literal of ['SIR', 'Full Art']) {
    const f = setup();
    const q = `"${literal}" playables`;
    const response = await f.get(`q=${encodeURIComponent(q)}`);
    assert.equal(response.status, 200);
    const forwarded = f.calls[0].options.textQuery;
    assert.equal(forwarded, `"${literal}"`);
    assert(!response.body.smart_search.queryFilters.some(filter => ['rarity', 'artwork'].includes(filter.kind)));
    assert(matches({...sir, name: literal, rarity: 'Common'}, forwarded));
    assert.equal(matches(sir, forwarded), false);
  }
  const mixed = intentModule.buildSmartSearchIntent('SIR "Full Art" playables');
  const forwarded = queryModule.resolveSmartSearchQuery(mixed.originalQuery, mixed);
  assert.equal(forwarded, 'SIR "Full Art"');
  assert(matches({...sir, name: 'Full Art'}, forwarded));
  assert.equal(matches({...sir, name: 'Full Art', rarity: 'Common'}, forwarded), false);
});

test('full rarity names survive real catalog set inference and repeated set words', async () => {
  const catalogSets = [{id: 'special-deck', code: 'sp-test', name: 'Special Deck Set'}];
  for (const suffix of ['', ' from Special']) {
    const f = setup({catalogSets});
    const response = await f.get(`q=${encodeURIComponent(`special illustration rare playables${suffix}`)}`);
    assert.equal(response.status, 200);
    assert.equal(f.calls[0].options.textQuery, 'special illustration rare');
    const filters = response.body.smart_search.queryFilters;
    assert.equal(filters.find(filter => filter.kind === 'rarity').label, 'Rarity: special illustration rare');
    assert.equal(filters.some(filter => filter.kind === 'set'), Boolean(suffix));
    if (suffix) {
      assert.equal(f.calls[0].options.exactSetCode, 'sp-test');
      assert.equal(filters.find(filter => filter.kind === 'set').queryWithout, 'special illustration rare playables');
    }
    const matches = discoveryMatcher();
    const row = {gv_id: 'GV-PK-TWM-216', name: 'Bloodmoon Ursaluna ex', rarity: 'Special Illustration Rare'};
    assert(matches(row, f.calls[0].options.textQuery));
    assert.equal(matches({...row, rarity: 'Illustration Rare'}, f.calls[0].options.textQuery), false);
  }
});

test('collector-filtered card names preserve ex while explicit set connectors remain constraints', async () => {
  const catalogSets = [{id: 'ex-deck', code: 'ex-test', name: 'EX Deck'}];
  for (const filter of ['SIR', 'IR', 'full-art', 'special illustration rare']) {
    for (const suffix of ['', ' from EX Deck']) {
      const f = setup({catalogSets, catalogCardName: 'Bloodmoon Ursaluna ex'});
      const response = await f.get(`q=${encodeURIComponent(`${filter} playables Bloodmoon Ursaluna ex${suffix}`)}`);
      assert.equal(response.status, 200, `${filter}${suffix}: ${JSON.stringify(f.nameProbes)}`);
      assert.equal(f.nameProbes.length, 0, 'published names do not need the broad name RPC');
      assert.equal(f.calls[0].options.textQuery, `${filter} Bloodmoon Ursaluna ex`, `${filter}${suffix}: ${JSON.stringify(f.nameProbes)}`);
      assert.equal(response.body.smart_search.queryFilters.some(item => item.kind === 'set'), Boolean(suffix));
      if (suffix) assert.equal(f.calls[0].options.exactSetCode, 'ex-test');
    }
  }
});

test('untrusted name hints retain global disambiguation while plain playable text needs no global probe', async () => {
  const config={catalogSets:[{id:'ex-deck',code:'ex-test',name:'EX Deck'}],catalogCardName:'Bloodmoon Ursaluna ex'};
  const stale=setup({...config,publishedNames:[{id:'card-0',gv_id:'GV-PK-WRONG',name:config.catalogCardName}]});
  assert.equal((await stale.get('q=playables+Bloodmoon+Ursaluna+ex')).status,200);
  assert.equal(stale.nameProbes.length,1,'a stale GV-ID cannot bypass the authoritative probe');
  for(const query of ['"Full Art" playables','sir playables','playables Boss\'s Orders']){
    const f=setup(config);assert.equal((await f.get(`q=${encodeURIComponent(query)}`)).status,200);
    assert.equal(f.nameProbes.length,0,'without an ambiguous set, published discovery is already complete');
  }
  const explicit=setup(config);
  assert.equal((await explicit.get('q=full-art+Bloodmoon+Ursaluna+ex&playable=1')).status,200);
  assert.equal(explicit.nameProbes.length,0);
});

test('complete playable discovery applies SIR and IR aliases as separate exact rarity constraints', () => {
  const matches = discoveryMatcher();
  const row = {gv_id: 'GV-PK-TWM-216', name: 'Bloodmoon Ursaluna ex', rarity: 'Special Illustration Rare'};
  for (const q of ['sir', 'SIR Bloodmoon Ursaluna ex', 'special illustration rare Bloodmoon Ursaluna ex']) assert(matches(row, q));
  for (const q of ['ir', 'illustration rare', 'sir Pikachu']) assert.equal(matches(row, q), false);
  assert(matches({...row, rarity: 'Illustration Rare'}, 'IR'));
  assert.equal(matches({...row, rarity: 'Illustration Rare'}, 'SIR'), false);
  assert(matches({...row, name: 'Rare Candy', rarity: 'Common'}, 'common Rare Candy'));
  assert.equal(matches({...row, rarity: 'Uncommon'}, 'common'), false);
  assert(matches({...row, rarity: 'Rare Ultra'}, 'ultra rare'));
  assert(matches({...row, rarity: 'Rare Holo'}, 'rare'));
  assert(matches({...row, gv_id: 'GV-MTG-TEST-1', name: 'Sir Shandlar', rarity: 'Rare'}, 'Sir Shandlar'));
  assert(matches({...row, name: "Sirfetch'd", rarity: 'Rare'}, "Sirfetch'd"));
});

test('full art discovery uses explicit artwork markers and does not infer them from premium rarity or names', () => {
  const matches = discoveryMatcher();
  const base = {gv_id: 'GV-PK-TWM-202', name: 'Bloodmoon Ursaluna ex', rarity: 'Ultra Rare'};
  for (const spelling of ['full art', 'full-art', 'fullart']) {
    assert(matches({...base, variant_key: 'full_art'}, spelling));
    assert(matches({...base, printed_identity_modifier: 'Full Art'}, `${spelling} Bloodmoon Ursaluna ex`));
    assert.equal(matches(base, spelling), false);
    assert.equal(matches({...base, rarity: 'Special Illustration Rare'}, spelling), false);
    assert.equal(matches({...base, name: 'Full Art'}, spelling), false);
  }
  assert.equal(matches({...base, variant_key: 'full_art'}, 'full art Pikachu'), false);
});

test('verified artwork metadata filters only its exact card and preserves text and rarity constraints', () => {
  const model=JSON.parse(fs.readFileSync(new URL('../../../../../shared/catalog/pokemon_artwork_classification_v1.json',import.meta.url),'utf8'));
  const fact=model.rows.find(row=>row.gv_id==='GV-PK-TWM-202');
  assert(fact,'the released evidence includes the verified Ursaluna Full Art');
  const card={...fact,id:fact.card_print_id},matches=discoveryMatcher();
  assert(matches(card,'full art Bloodmoon Ursaluna ex'));
  assert(matches(card,'fullart'));
  assert.equal(matches(card,'full art Pikachu'),false);
  assert.equal(matches(card,'full art SIR'),false);
  for(const change of [{id:'other'},{gv_id:'GV-PK-TWM-216'},{name:'Other'},{set_code:'other'},
    {number:'216'},{rarity:'Special Illustration Rare'},{variant_key:'other'},{printed_identity_modifier:'other'}]) {
    assert.equal(matches({...card,...change},'full art'),false);
  }
  assert.equal(matches({...card,id:'ordinary',gv_id:'GV-PK-TWM-141',number:'141',rarity:'Double Rare'},'full art'),false);
});

test('playables uses its canonical ID scope before the response limit and keeps residual text', async () => {
  const f = setup();
  const response = await f.get('q=playables+Boss%27s+Orders&limit=1&pagination=1');
  assert.equal(response.status, 200);
  assert.equal(f.calls[0].members.length, 90);
  assert.equal(f.calls[0].options.textQuery, "Boss's Orders");
  assert.equal(response.body.rows.length, 1);
  assert.equal(response.body.provisional.length, 0);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});

test('owned playables intersects ownership before bounded discovery', async () => {
  const f = setup({userId: 'owner', owned: ['card-89']});
  const response = await f.get('q=playables&owned=owned');
  assert.equal(response.status, 200);
  assert.deepEqual(Array.from(f.calls[0].members, member => member.card_print_id), ['card-89']);
  assert.equal(response.body.rows[0].id, 'card-89');
});

test('unavailable data and incompatible games never use an unrestricted fallback', async () => {
  const missing = setup({available: false});
  assert.equal((await missing.get('q=playables')).status, 503);
  assert.equal(missing.calls.length, 0);
  const wrongGame = setup();
  assert.equal((await wrongGame.get('q=playables&game=mtg')).status, 400);
  assert.equal((await wrongGame.get('q=playables&lang=ja')).status, 400);
  assert.equal(wrongGame.calls.length, 0);
});

test('an explicit playable filter alone is valid search criteria', async () => {
  const f = setup();
  assert.equal((await f.get('playable=1')).status, 200);
  assert.equal(f.calls.length, 1);
});

test('insufficient recent coverage is explained instead of reported as an empty playable search', async () => {
  const f = setup({state: 'insufficient_evidence'});
  const response = await f.get('q=playables');
  assert.equal(response.status, 503);
  assert.equal(response.body.state, 'insufficient_evidence');
  assert.match(response.body.error, /Not enough recent Standard decklists/);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(f.calls.length, 0);
  assert.equal(response.body.rows, undefined);
});

test('serialized server-action input cannot grant playable membership', async () => {
  const source = compile('../explore/getExploreRows.ts');
  const snapshot = {rows: [{card_print_id: 'eligible', gv_id: 'GV-PK-ELIGIBLE-1'}]};
  const unknown = new Proxy({}, {get: () => () => {throw Error('UNEXPECTED_DEPENDENCY');}});
  const compiledModule = {exports: {}};
  vm.runInNewContext(source, {module: compiledModule, exports: compiledModule.exports, Map, Set,
    require: id => id === '@/lib/playables/getPokemonPlayables' ? {getPokemonPlayables: async () => snapshot} : unknown});
  const rows = await compiledModule.exports.getExploreRowsForPlayableCards([
    {card_print_id: 'not-eligible', gv_id: 'GV-PK-OTHER-1'},
    {card_print_id: 'eligible', gv_id: 'GV-PK-INCORRECT-1'},
  ], {sortMode: 'relevance', includePricing: false});
  assert.equal(rows.length, 0);
});

test('the shared badge renders support context and suppresses absent or expired signals', () => {
  const {default: Badge} = load(compile('../../components/cards/PlayableBadge.tsx'), {'react': React, 'react/jsx-runtime': jsxRuntime});
  const signal = {as_of: new Date().toISOString(), valid_until: new Date(Date.now() + 3600000).toISOString(), lists: 12, events: 3};
  const html = renderToStaticMarkup(React.createElement(Badge, {signal}));
  assert.match(html, />Playable<\/span>/);
  assert.match(html, /12 recent Standard decklists across 3 events/);
  assert.equal(renderToStaticMarkup(React.createElement(Badge)), '');
  assert.equal(renderToStaticMarkup(React.createElement(Badge, {signal: {...signal, valid_until: '2020-01-01T00:00:00Z'}})), '');
});
