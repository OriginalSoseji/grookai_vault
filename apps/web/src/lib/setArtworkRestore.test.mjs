import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(directory, 'publicSets.ts'), 'utf8');
const parsed = ts.createSourceFile('publicSets.ts', source, ts.ScriptTarget.Latest, true);
const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ['getSetLevelHeroImage', 'mapSetRowToSummary'].includes(node.name?.text));
assert.equal(functions.length, 2);
const printer = ts.createPrinter();
const extracted = functions.map(node => printer.printNode(ts.EmitHint.Unspecified, node, parsed)).join('\n');
const output = ts.transpileModule(`${extracted}\nexport { mapSetRowToSummary };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mapperModule = { exports: {} };
let presentation;
vm.runInNewContext(output, {
  exports: mapperModule.exports,
  getCatalogSetPresentation: () => presentation,
  normalizePublicSetDisplayName: name => name,
  getReleaseYear: () => 2026,
  getSetSortDate: row => row.release_date,
  getBaseSetPrintRunLaneCardCountAdjustment: () => 0,
  getCatalogSetType: () => undefined,
  normalizeSetCode: value => value.toLowerCase(),
  normalizeSetQuery: value => (value ?? '').toLowerCase(),
  tokenizeSetWords: value => value.toLowerCase().split(' '),
});
const map = mapperModule.exports.mapSetRowToSummary;
const row = { id: 'set-id', game: 'pokemon', code: 'ASC', name: 'Ascended Heroes', printed_total: 217, release_date: '2026-01-01' };
const card = '/api/canon/cards/GV-PK-ASC-285/image';
const pack = '/catalog-set-covers/' + 'a'.repeat(64) + '.jpg';

test('set summary rejects representative and unlabelled card covers without losing set identity', () => {
  presentation = { name: row.name, display_code: 'ASC', representative_cover_url: card };
  for (const hero_image_source of ['representative_card', 'warehouse_card', undefined, '']) {
    const result = map({ ...row, hero_image_url: card, hero_image_source }, 217);
    assert.equal(result.hero_image_url, undefined);
    assert.equal(result.hero_image_source, undefined);
    assert.equal(result.code, 'asc');
    assert.equal(result.card_count, 217);
    assert.equal(result.name, row.name);
  }
});

test('set summary uses exact package evidence instead of the rejected card', () => {
  presentation = { name: row.name, display_code: 'ASC', package_cover_url: pack, representative_cover_url: card };
  const result = map({ ...row, hero_image_url: card, hero_image_source: 'representative_card' }, 217);
  assert.equal(result.hero_image_url, pack);
  assert.equal(result.hero_image_source, 'official_package');
});

test('persisted TCGdex and Pokemon TCG API provenance preserves approved set logos', () => {
  presentation = { name: row.name, display_code: 'ASC' };
  for (const [hero_image_source, hero_image_url] of [
    ['tcgdex', 'https://assets.tcgdex.net/en/sv/sv06/logo.png'],
    ['pokemontcgapi', 'https://images.pokemontcg.io/base1/logo.png'],
  ]) {
    const result = map({ ...row, hero_image_source, hero_image_url }, 217);
    assert.equal(result.hero_image_url, hero_image_url);
    assert.equal(result.hero_image_source, hero_image_source);
  }
});

test('verified set and package provenance remains selected for every game', () => {
  presentation = { name: row.name, display_code: 'ASC', package_cover_url: pack };
  for (const game of ['pokemon', 'one_piece', 'mtg']) {
    for (const hero_image_source of ['official_package', 'set_cover', 'official_set_logo', 'sealed_product_image']) {
      const url = 'https://catalog.example.test/exact-set-art.png';
      const result = map({ ...row, game, hero_image_url: url, hero_image_source }, 217);
      assert.equal(result.game_code, game);
      assert.equal(result.hero_image_url, url);
      assert.equal(result.hero_image_source, hero_image_source);
    }
  }
});

test('the Pokemon restoration preserves existing governed One Piece and Magic covers', () => {
  presentation = { name: row.name, display_code: 'ASC' };
  for (const game of ['one_piece', 'mtg']) {
    const url = `https://catalog.example.test/set-covers/${game}/example/cover.jpg`;
    const result = map({ ...row, game, hero_image_url: url, hero_image_source: 'manual' }, 217);
    assert.equal(result.hero_image_url, url);
    assert.equal(result.game_code, game);
  }
});

test('restored logo mappings resolve locally for 30th, Ascended Heroes and Pitch Black', async () => {
  const filename = path.join(directory, 'setLogoAssets.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const target = { exports: {} };
  vm.runInNewContext(compiled, { exports: target.exports, process: { cwd: () => path.resolve(directory, '../..') }, require: name => name === 'server-only' ? {} : name === 'react' ? { cache: fn => fn } : require(name) });
  const actual = await target.exports.getSetLogoAssetPathMap(['30c', '30c-classic', 'asc', 'me02.5', 'me05']);
  for (const code of ['30c', '30c-classic']) assert.equal(actual.get(code), '/set-logos/30th.png');
  assert.equal(actual.get('asc'), '/set-logos/me02.5.png');
  assert.equal(actual.get('me02.5'), '/set-logos/me02.5.png');
  assert.equal(actual.get('me05'), '/set-logos/me05.png');
  for (const value of actual.values()) assert(fs.existsSync(path.join(directory, '../../public', value)));
});
