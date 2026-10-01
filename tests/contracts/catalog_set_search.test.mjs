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

const { resolveCatalogSetSearchIntent: resolve, readSearchSets, removeSetPhrase, isExactCatalogCardName, isCatalogCardNameQuery } = load(path.join(web, 'lib/search/catalogSetSearch.ts'));
const { buildSmartSearchIntent } = load(path.join(web, 'lib/search/smartSearchIntent.ts'));
const { resolveSmartSearchQuery } = load(path.join(web, 'lib/search/resolveSmartSearchQuery.ts'));
const sets = [
 ['base1', 'Base Set'], ['base4', 'Base Set 2'], ['ecard1', 'Expedition Base Set'],
 ['30c', '30th Celebration'], ['30c-classic', '30th Celebration Classic Collection'],
 ['jp30', '30th Celebration Japan'], ['cel25', '25th Anniversary Collection'],
 ['future1', 'Future Garden'], ['fossil', 'Fossil'], ['evs', 'Evolving Skies'], ['base5', 'Team Rocket'],
 ['me02.5', 'Ascended Heroes'], ['asc-special', 'Ascended Legends'], ['silver', 'Silver Tempest'],
].map(([code, name]) => ({ id: code, code, name }));
const plain = value => JSON.parse(JSON.stringify(value));

test('opening set words combine with partial card names in either order', () => {
 for (const q of ['Pika 30th', '30th Pika', 'Pika, 30TH', 'Pika from the 30th']) {
  const result = resolve(q, 'pokemon', sets);
  assert.deepEqual(plain(result.setCodes), ['30c', '30c-classic', 'jp30']);
  assert.equal(result.remainingQuery, 'Pika');
 }
 for (const q of ['pika ascended', 'ascended pika', 'pika from Ascended']) {
  const result = resolve(q, 'pokemon', sets);
  assert.deepEqual(plain(result.setCodes), ['asc-special', 'me02.5']);
  assert.equal(result.remainingQuery, 'pika');
 }
 assert.deepEqual(plain(resolve('pika Ascended Heroes', 'pokemon', sets).setCodes), ['me02.5']);
 assert.deepEqual(plain(resolve('pika Silver', 'pokemon', sets).setCodes), ['silver']);
 assert.equal(resolve('pika ascended', 'pokemon', sets).requiresCardNameCheck, true);
 assert.equal(resolve('"ascended" pika', 'pokemon', sets).matchedAlias, null);
 assert.equal(resolve('pika ascendedly', 'pokemon', sets).matchedAlias, null);
 assert.equal(resolve('pika unknown ascended', 'pokemon', sets).remainingQuery, 'pika unknown');
});

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

test('unknown words and identifiers survive; ambiguous catalog set names require a card-name check', () => {
 assert.equal(resolve('GV-PK-BASE1-4', 'pokemon', sets).remainingQuery, 'GV-PK-BASE1-4');
 assert.equal(resolve('Unidentified Fossil', 'pokemon', sets).requiresCardNameCheck, true);
 assert.equal(resolve("Team Rocket's Handiwork", 'pokemon', sets).requiresCardNameCheck, true);
 assert.equal(resolve('Handiwork Team Rocket', 'pokemon', sets).requiresCardNameCheck, true);
 assert.equal(resolve('Handiwork from Team Rocket', 'pokemon', sets).requiresCardNameCheck, false);
 assert.equal(resolve('Handiwork base5', 'pokemon', sets).requiresCardNameCheck, false);
 assert.equal(resolve('Aerodactyl from Fossil', 'pokemon', [{id:'fo',code:'fo',name:'Fossil'}]).remainingQuery, 'Aerodactyl');
 assert.equal(resolve('Mewtwo unknown Future Garden', 'pokemon', sets).remainingQuery, 'Mewtwo unknown');
});

test('caller-scoped catalog reader exceeds the REST row cap in one call and refuses incomplete data', async () => {
 const rows = Array.from({length: 1382}, (_, i) => ({id: String(i), code: 'set'+i, name: 'Set '+i}));
 let calls = 0;
 const client = (result) => ({rpc: async (name, args) => {
  calls += 1;
  assert.equal(name, 'get_search_set_catalog_v1');
  assert.deepEqual(plain(args), {game_code_in:'pokemon'});
  return result;
 }});
 assert.equal((await readSearchSets(client({data:{complete:true,sets:rows}}), 'pokemon')).length, 1382);
 assert.equal(calls, 1);
 await assert.rejects(readSearchSets(client({error:{message:'catalog offline'}}), 'pokemon'), /catalog offline/);
 await assert.rejects(readSearchSets(client({data:{complete:false,sets:rows}}), 'pokemon'), /completely/);
 await assert.rejects(readSearchSets(client({data:{complete:true,sets:[rows[0],rows[0]]}}), 'pokemon'), /did not advance/);
 await assert.rejects(readSearchSets(client({data:{complete:true,sets:[{id:'bad'}]}}), 'pokemon'), /invalid row/);
 await assert.rejects(readSearchSets(client({data:null}), 'pokemon'), /completely/);
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

test('set disambiguation checks actual card names and fails visibly on read errors', async () => {
 const client={rpc:async (name,args)=>{assert.equal(name,'search_game_card_prints_v4');assert.equal(args.game_code_in,'pokemon');return {data:[{name:'Unidentified Fossil'}]};}};
 assert.equal(await isExactCatalogCardName(client,'Unidentified Fossil','pokemon'),true);
 assert.equal(await isExactCatalogCardName(client,'Aerodactyl Fossil','pokemon'),false);
 await assert.rejects(isExactCatalogCardName({rpc:async()=>({error:{message:'unavailable'}})},'Unidentified Fossil','pokemon'),/unavailable/);
 assert.equal(resolve('Fossil Aerodactyl','pokemon',sets).remainingQuery,'Aerodactyl');
});

test('set cleanup handles long hostile separators without changing meaningful text', () => {
 const separators='\t,'.repeat(10000);
 assert.equal(removeSetPhrase(separators+'Mewtwo from the Base Set'+separators,'Base Set'),'Mewtwo');
 assert.equal(removeSetPhrase('Mewtwo from'+ '\t'.repeat(10000)+'the Base Set','Base Set'),'Mewtwo');
});

test('partial card disambiguation accepts literal fragments and rejects unrelated or fuzzy hits', async () => {
 const client={rpc:async()=>({data:[{name:'Dark Charizard'}]})};
 for (const query of ['Dark Chari','dark, CHARI','Chari Dark']) assert.equal(await isCatalogCardNameQuery(client,query,'pokemon'),true);
 for (const query of ['Pika Ascended','Dark Chari unknown','Dark Chra','']) assert.equal(await isCatalogCardNameQuery(client,query,'pokemon'),false);
 await assert.rejects(isCatalogCardNameQuery({rpc:async()=>({error:{message:'unavailable'}})},'Dark Chari','pokemon'),/unavailable/);
});
