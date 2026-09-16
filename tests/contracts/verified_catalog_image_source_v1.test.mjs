import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const read = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const cache = new Map();
function load(name) {
  if (name === 'server-only') return {};
  assert.ok(name.startsWith('@/lib/'));
  if (cache.has(name)) return cache.get(name);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(`apps/web/src/${name.slice(2)}.ts`), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: load, URL, console, process: { env: {} } });
  cache.set(name, exports);
  return exports;
}
const helpers = load('@/lib/publicCardImage');
const { resolveCanonImageV1 } = load('@/lib/canon/resolveCanonImageV1');
const source = 'self_hosted_verified_external_exact_product_v1';
const imagePath = `warehouse-derived/image-truth-v1/pokemon-30th-celebration-20260916/${'a'.repeat(64)}.jpeg`;

test('verified hosted source resolves to the stable canonical route without changing evidence', async () => {
  const row = { gv_id: 'GV-PK-30C-001', image_source: source, image_path: imagePath,
    image_status: 'representative_shared', image_note: 'Finish unconfirmed' };
  const before = JSON.stringify(row);
  const resolved = await resolveCanonImageV1(row);
  assert.equal(resolved.url, '/api/canon/cards/GV-PK-30C-001/image');
  assert.equal(resolved.image_path, imagePath);
  assert.equal(JSON.stringify(row), before);
});

test('only explicit supported provenance is recognized; no prefix or candidate promotion', async () => {
  for (const allowed of ['identity', source, ` ${source.toUpperCase()} `]) {
    assert.equal(helpers.isIdentityCardImageSource(allowed), true);
  }
  for (const rejected of [null, '', 'external', 'user_photo', 'verified', 'self_hosted_unknown', `${source}_candidate`]) {
    assert.equal(helpers.isIdentityCardImageSource(rejected), false);
    assert.equal((await resolveCanonImageV1({image_source: rejected, image_path: imagePath})).url, null);
  }
});

test('missing or ungoverned paths cannot create an anonymous storage URL', async () => {
  assert.equal((await resolveCanonImageV1({image_source: source})).url, null);
  const proxy = load('@/lib/canon/canonImageProxy');
  for (const value of ['private/user/photo.jpeg', '../secret.jpeg', 'https://evil.test/a.jpeg']) {
    assert.equal(proxy.resolveCanonCardImageStorageLocation(value), null);
    assert.equal((await resolveCanonImageV1({image_source: source, image_path: value})).url, null);
  }
  assert.ok(proxy.resolveCanonCardImageStorageLocation(imagePath));
});

test('card image route retains visibility checks and batch lookup admits the exact source', () => {
  const route = read('apps/web/src/app/api/canon/cards/[gv_id]/image/route.ts');
  assert.match(route, /isIdentityCardImageSource\(row\?\.image_source\)/);
  assert.match(route, /catalog_set_release_controls/);
  assert.match(route, /catalog_game_release_controls/);
  assert.match(route, /resolveCanonCardImageStorageLocation/);
  const batch = read('apps/web/src/app/api/canon/images/route.ts');
  assert.equal(batch.split('.in("image_source", ["identity", "self_hosted_verified_external_exact_product_v1"])').length - 1, 2);
  assert.match(read('lib/services/public/public_sets_service.dart'), /isHostedCatalogImageSource\(row\['image_source'\]\)/);
});
