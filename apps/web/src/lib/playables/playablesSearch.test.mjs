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

function setup({available = true, state = 'ready', userId = null, owned = []} = {}) {
  const members = Array.from({length: 90}, (_, index) => ({card_print_id: `card-${index}`, gv_id: `GV-PK-TEST-${index}`}));
  const calls = [];
  const snapshot = {state, rows: state === 'ready' ? members : [], valid_until: new Date(Date.now() + 3600000).toISOString()};
  const unrestricted = () => {throw Error('UNRESTRICTED_SEARCH_FORBIDDEN');};
  const imports = {
    '@/lib/search/catalogSetSearch': {readSearchSets: async () => [], resolveCatalogSetSearchIntent: query => ({matchedAlias: null, setCodes: [], remainingQuery: query}), isCatalogCardNameQuery: async () => false},
    '@/lib/search/completeNamedCardSearch': {supportsCompleteNameSearch: () => false},
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
    '@/lib/supabase/server': {createServerComponentClient: async () => ({auth: {getUser: async () => ({data: {user: userId ? {id: userId} : null}})}})},
    '@/lib/vault/getOwnedCountsByCardPrintIds': {getOwnedCardPrintIdsForUser: async () => owned,
      getOwnedCountsByCardPrintIds: async () => new Map(owned.map(id => [id, 1]))},
    '@/lib/pricing/getPublicPricingByCardIds': {PublicPricingSortUnavailableError: class extends Error {}},
    '@/lib/playables/getPokemonPlayables': {getPokemonPlayables: async () => available ? snapshot : null},
  };
  const {GET} = load(routeJs, imports);
  return {calls, members, get: query => GET({nextUrl: new URL(`https://example.test/api/resolver/search?${query}`), headers: new Headers()})};
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
      : id === '@/lib/search/collectorCardQuery' ? loadTestTypeScript('lib/search/collectorCardQuery.ts') : unknown,
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
