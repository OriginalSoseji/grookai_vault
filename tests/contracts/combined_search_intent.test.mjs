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
const { buildSmartSearchIntent: parse } = load(path.join(web, 'lib/search/smartSearchIntent.ts'));
const plain = (value) => JSON.parse(JSON.stringify(value));

test('artist, card and finish combine independently of order, case and commas', () => {
  for (const q of ['Yuka Morii Wurmple reverse holo', 'Wurmple reverse holo Yuka Morii',
    'reverse holo, Wurmple, YUKA MORII', 'artist Yuka Morii Wurmple reverse holo',
    'Wurmple illustrated by Yuka Morii reverse holo', 'Morii Wurmple reverse holo']) {
    const result = parse(q);
    assert.equal(result.artist, 'Yuka Morii', q);
    assert.equal(result.residualQuery.toLowerCase(), 'wurmple', q);
    assert.deepEqual(plain(result.finishKeys), ['reverse'], q);
    assert.deepEqual(plain(result.artistNames), ['Yuka Morii'], q);
  }
});

test('a high confidence full-name typo has a visible reversible correction', () => {
  const result = parse('Yuka Morri Wurmple');
  assert.equal(result.artist, 'Yuka Morii');
  assert.equal(result.residualQuery, 'Wurmple');
  assert.deepEqual(plain(result.artistCorrection), { original: 'Yuka Morri', corrected: 'Yuka Morii' });
  const literal = parse('"Yuka Morri" Wurmple');
  assert.equal(literal.artist, undefined);
  assert.equal(literal.residualQuery, 'Yuka Morri Wurmple');
});

test('partial first names retain ambiguity instead of arbitrarily selecting an artist', () => {
  const result = parse('Yuka, wurmple, holo');
  assert.equal(result.artist, 'Yuka');
  assert.deepEqual(plain(result.artistNames), ['Yuka Morii', 'Yuka Tanaka']);
  assert.equal(result.residualQuery, 'wurmple');
  assert.deepEqual(plain(result.finishKeys), ['holo']);
});

test('correction undo restores the literal artist while retaining the other constraints', () => {
  const corrected = parse('Wurmple Yuka Morri reverse holo');
  const restored = parse(corrected.originalSpellingQuery);
  assert.equal(restored.artist, 'Yuka Morri');
  assert.deepEqual(plain(restored.artistNames), ['Yuka Morri']);
  assert.equal(restored.artistCorrection, undefined);
  assert.equal(restored.residualQuery, 'Wurmple');
  assert.deepEqual(plain(restored.finishKeys), ['reverse']);
  const chip = restored.queryFilters.find((filter) => filter.kind === 'artist');
  assert.equal(parse(chip.queryWithout).artist, undefined);
  assert.equal(parse(chip.queryWithout).residualQuery, 'Wurmple');
  assert.equal(parse('artist: "Yuka Morri" Wurmple').artist, 'Yuka Morri');
  assert.equal(parse('"Yuka Morri" Wurmple').artist, undefined);
});

test('normal, holo, reverse holo and explicit any holo have disjoint intended meanings', () => {
  for (const [term, keys] of [['non-holo', ['normal']], ['non holo', ['normal']], ['holo', ['holo']],
    ['reverse holo', ['reverse']], ['any holo', ['holo', 'reverse']]]) {
    const result = parse(`Yuka Morii Wurmple ${term}`);
    assert.deepEqual(plain(result.finishKeys), keys, term);
    assert.equal(result.residualQuery, 'Wurmple', term);
    assert.deepEqual(plain(result.stampLabels), [], term);
  }
  const error = parse('Wurmple non-holo error');
  assert.deepEqual(plain(error.finishKeys), []);
  assert.deepEqual(plain(error.stampLabels), ['Non-Holo Error']);
});

test('single years and year ranges combine; artist credits and exact IDs are protected', () => {
  const result = parse('2007 Yuka Morii Wurmple');
  assert.equal(result.releaseYearMin, 2007); assert.equal(result.releaseYearMax, 2007);
  assert.equal(result.residualQuery, 'Wurmple');
  const range = parse('Yuka Morii Wurmple 2010-2007');
  assert.equal(range.releaseYearMin, 2007); assert.equal(range.releaseYearMax, 2010);
  for (const q of ['GV-PK-MEW-001-REVERSE-HOLO', 'GV-PK-WCD-2023-PSYCHIC_ELEGANCE-17-BRILLIANT_STARS-137-COLLAPSED_STADIUM']) {
    const exact = parse(q); assert.equal(exact.residualQuery, q); assert.equal(exact.artist, undefined);
    assert.equal(exact.releaseYearMin, undefined); assert.deepEqual(plain(exact.finishKeys), []);
  }
});

test('ordinary names, literal card names and unknown descriptions survive interpretation', () => {
  for (const q of ['Pikachu', 'Charizard', 'N', 'Master Ball', 'Poke Ball', 'Pikachu 58', 'sv1 25']) {
    const result = parse(q); assert.equal(result.artist, undefined, q); assert.equal(result.residualQuery, q, q);
  }
  assert.equal(parse('Yuka Morii Wurmple sparkly lightning background').residualQuery, 'Wurmple sparkly lightning background');
  assert.equal(parse('Yuka Morii "Master Ball"').residualQuery, 'Master Ball');
});

test('removing a collector number cannot change digits in a release year', () => {
  const result = parse('Yuka Morii 2007 Wurmple 7 reverse holo');
  const number = result.queryFilters.find((filter) => filter.kind === 'number');
  assert.equal(number.queryWithout, 'Yuka Morii 2007 Wurmple reverse holo');
});

test('game, language, numeric fractions and stamp phrases retain their meaning', () => {
  const result = parse('Japanese Pokemon Yuka Morii Wurmple 7/1019 reverse-holo');
  assert.equal(result.gameScope, 'pokemon'); assert.equal(result.languageScope, 'ja');
  assert.equal(result.residualQuery, 'Wurmple 7/1019');
  assert.deepEqual(plain(result.finishKeys), ['reverse']);
  assert.equal(parse('Pikachu Play Pokemon stamp').gameScope, undefined);
  assert.deepEqual(plain(parse('Pikachu Play Pokemon stamp').stampLabels), ['Play Pokémon Stamp']);
  assert.equal(parse('Yuka Morii Wurmple #2007').releaseYearMin, undefined);
  assert.equal(parse('Yuka Morii Wurmple 2007/2020').releaseYearMin, undefined);
  assert.equal(parse('MTG Lightning Bolt').gameScope, 'mtg');
});

test('negative ownership does not become positive ownership', () => {
 for (const q of ["Yuka Morii Wurmple not owned", "Yuka Morii Wurmple don't own", "Yuka Morii Wurmple missing from my collection"]) { const i=parse(q);assert.equal(i.ownedState,'missing');assert.equal(i.residualQuery,'Wurmple');assert.ok(i.queryFilters.some(f=>f.kind==='owned')); }
});

test('Master Ball remains a card name alongside rarity, number and set constraints', () => {for(const q of ['Master Ball common 2024', 'Master Ball Base Set 7', 'Poke Ball uncommon']){const i=parse(q);assert.equal(i.finishKeys.length,0,q);assert.match(i.residualQuery,/ball/i);}});
