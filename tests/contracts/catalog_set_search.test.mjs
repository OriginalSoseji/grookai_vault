import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const web = path.resolve('apps/web/src');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (id) => {
    let target = id.startsWith('@/') ? path.join(web, id.slice(2)) : path.resolve(path.dirname(file), id);
    if (!fs.existsSync(target)) target += '.ts';
    return load(target);
  } }, { filename: file });
  return module.exports;
}

const { resolveCatalogSetSearchIntent: resolve, readSearchSets, removeSetPhrase, isExactCatalogCardName } = load(path.join(web, 'lib/search/catalogSetSearch.ts'));
const { buildSmartSearchIntent } = load(path.join(web, 'lib/search/smartSearchIntent.ts'));
const { resolveSmartSearchQuery } = load(path.join(web, 'lib/search/resolveSmartSearchQuery.ts'));
const sets = [
 ['base1', 'Base Set'], ['base4', 'Base Set 2'], ['ecard1', 'Expedition Base Set'],
 ['30c', '30th Celebration'], ['30c-classic', '30th Celebration Classic Collection'],
 ['jp30', '30th Celebration Japan'], ['cel25', '25th Anniversary Collection'],
 ['future1', 'Future Garden'], ['fossil', 'Fossil'], ['evs', 'Evolving Skies'],
].map(([code, name]) => ({ id: code, code, name }));
const plain = value => JSON.parse(JSON.stringify(value));

test('name and set combine in either order without expanding Base Set into other releases', () => {
 for (const q of ['Chari base set', 'base set Chari', 'Chari from the Base Set', 'from Base Set Chari', 'Chari, BASE SET']) {
  const result = resolve(q, 'pokemon', sets);
  assert.deepEqual(plain(result.setCodes), ['base1']);
  assert.equal(result.remainingQuery, 'Chari');
 }
 assert.deepEqual(plain(resolve('Chari base set 2', 'pokemon', sets).setCodes), ['base4']);
 assert.deepEqual(plain(resolve('Chari Expedition Base Set', 'pokemon', sets).setCodes), ['ecard1']);
});

test('anniversary aliases use only real matching catalog releases and preserve specific collection names', () => {
 for (const q of ['Mewtwo from 30th anniversary', '30TH ANNIVERSARY Mewtwo', 'Mewtwo in the 30th anniversary']) {
  const result = resolve(q, 'pokemon', sets);
  assert.deepEqual(plain(result.setCodes), ['30c', '30c-classic', 'jp30']);
  assert.equal(result.remainingQuery, 'Mewtwo');
 }
 assert.deepEqual(plain(resolve('Mewtwo 30th Celebration Classic Collection', 'pokemon', sets).setCodes), ['30c-classic']);
 assert.equal(resolve('Mewtwo 30th anniversary', 'mtg', sets).matchedAlias, null);
 assert.equal(resolve('Mewtwo 30th anniversary', 'pokemon', []).matchedAlias, null);
});

test('new catalog names, codes and existing artist/finish interpretation combine without a bundled alias', () => {
 for (const q of ['Eevee Future Garden', 'Future Garden Eevee', 'Eevee future1']) {
  const result = resolve(q, 'pokemon', sets);
  assert.deepEqual(plain(result.setCodes), ['future1']);
  assert.equal(result.remainingQuery, 'Eevee');
 }
 const raw = 'Yuka Morii Wurmple from Evolving Skies reverse holo';
 const smart = buildSmartSearchIntent(raw, { gameScope: 'pokemon' });
 const result = resolve(resolveSmartSearchQuery(raw, smart), 'pokemon', sets);
 assert.equal(smart.artist, 'Yuka Morii');
 assert.deepEqual(plain(smart.finishKeys), ['reverse']);
 assert.equal(result.remainingQuery, 'Wurmple');
 assert.deepEqual(plain(result.setCodes), ['evs']);
 assert.equal(removeSetPhrase(raw, result.matchedAlias), 'Yuka Morii Wurmple reverse holo');
});

test('unknown words and identifiers survive; ambiguous single-word set names require a card-name check', () => {
 assert.equal(resolve('GV-PK-BASE1-4', 'pokemon', sets).remainingQuery, 'GV-PK-BASE1-4');
 assert.equal(resolve('Unidentified Fossil', 'pokemon', sets).requiresCardNameCheck, true);
 assert.equal(resolve('Aerodactyl from Fossil', 'pokemon', [{id:'fo',code:'fo',name:'Fossil'}]).remainingQuery, 'Aerodactyl');
 assert.equal(resolve('Mewtwo unknown Future Garden', 'pokemon', sets).remainingQuery, 'Mewtwo unknown');
});

test('caller-scoped catalog reader includes later pages and refuses partial/duplicate results', async () => {
 const rows = Array.from({length: 501}, (_, i) => ({id: String(i), code: 'set'+i, name: 'Set '+i}));
 const offsets=[];
 const client = (failure=false, duplicate=false) => ({from(table) {
  assert.equal(table, 'sets');
  return {select: () => ({eq: (field, game) => {
   assert.equal(field, 'game'); assert.equal(game, 'pokemon');
   return {order: () => ({range: async (start, end) => {
    offsets.push(start);
    return start && failure ? {error:{message:'catalog offline'}} : {data: duplicate && start ? [rows[0]] : rows.slice(start,end+1)};
   }})};
  }})};
 }});
 assert.equal((await readSearchSets(client(), 'pokemon')).length, 501);
 assert.deepEqual(offsets, [0,500]);
 await assert.rejects(readSearchSets(client(true), 'pokemon'), /catalog offline/);
 await assert.rejects(readSearchSets(client(false,true), 'pokemon'), /did not advance/);
});

test('set phrases protect number, year and finish-like tokens while quoted card text stays literal', () => {
 for (const phrase of ['Base Set 2', 'World Championships 2026', 'Reverse Holo Collection']) {
  const intent=buildSmartSearchIntent('Mewtwo '+phrase, {gameScope:'pokemon',protectedPhrases:[phrase]});
  assert.equal(intent.residualQuery, 'Mewtwo '+phrase);
  assert.deepEqual(plain(intent.finishKeys), []);
  assert.equal(intent.releaseYearMin, undefined);
  assert.equal(intent.queryFilters.some(filter=>filter.kind==='number'), false);
 }
 assert.equal(resolve('"Base Set" Mewtwo', 'pokemon', sets).matchedAlias, null);
 assert.equal(resolve('Unidentified Fossil', 'pokemon', sets).requiresCardNameCheck, true);
});

test('single-word set disambiguation checks actual card names and fails visibly on read errors', async () => {
 const client={rpc:async (name,args)=>{assert.equal(name,'search_game_card_prints_v4');assert.equal(args.game_code_in,'pokemon');return {data:[{name:'Unidentified Fossil'}]};}};
 assert.equal(await isExactCatalogCardName(client,'Unidentified Fossil','pokemon'),true);
 assert.equal(await isExactCatalogCardName(client,'Aerodactyl Fossil','pokemon'),false);
 await assert.rejects(isExactCatalogCardName({rpc:async()=>({error:{message:'unavailable'}})},'Unidentified Fossil','pokemon'),/unavailable/);
 assert.equal(resolve('Fossil Aerodactyl','pokemon',sets).remainingQuery,'Aerodactyl');
});
