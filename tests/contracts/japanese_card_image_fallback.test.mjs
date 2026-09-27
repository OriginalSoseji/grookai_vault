import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
function load(relative) {
  const source = fs.readFileSync(new URL(`../../apps/web/src/lib/${relative}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, URL, require(id) {
    assert.equal(id, '@/lib/canon/canonImageProxy');
    return load('canon/canonImageProxy');
  } });
  return module.exports;
}
const { normalizePublicCardImageSrc, shouldBypassNextImageOptimization } = load('publicCardImage');
const official = 'https://www.pokemon-card.com/assets/images/card_images/large/SV8a/046662_P_SUBOMI.jpg';

test('official fallback keeps its exact URL and bypasses the optimizer', () => {
  assert.equal(normalizePublicCardImageSrc(official), official);
  assert.equal(shouldBypassNextImageOptimization(official), true);
  const wrapped = `https://grookaivault.com/_next/image?url=${encodeURIComponent(official)}&w=640&q=75`;
  assert.equal(normalizePublicCardImageSrc(wrapped), official);
  assert.equal(shouldBypassNextImageOptimization(wrapped), true);
});

test('official fallback exception does not permit other hosts, protocols or paths', () => {
  for (const url of [
    official.replace('https:', 'http:'),
    official.replace('www.pokemon-card.com', 'www.pokemon-card.com.example.org'),
    official.replace('www.pokemon-card.com', 'pokemon-card.com'),
    official.replace('www.pokemon-card.com', 'www.pokemon-card.com:8443'),
    official.replace('https://', 'https://user:password@'),
    official.replace('/card_images/large/', '/card_images/large-other/'),
    official.replace('/card_images/large/', '/other/'),
    official.replace('/SV8a/', '/../'),
  ]) assert.equal(shouldBypassNextImageOptimization(url), false, url);
});

test('private non-catalog storage remains rejected and canon identity remains unchanged', () => {
  const privateUrl = 'https://fixture.supabase.co/storage/v1/object/public/user-card-images/user-upload/front.jpg';
  assert.equal(normalizePublicCardImageSrc(privateUrl), undefined);
  const canon = '/api/canon/cards/GV-PK-JPN-PRODUCT-DDA484E49B308E00-1/image';
  assert.equal(normalizePublicCardImageSrc(canon), canon);
  assert.equal(shouldBypassNextImageOptimization(canon), true);
});

for (const mode of ['development', 'production']) {
  test(`Next image props deliver official fallback directly in ${mode} mode`, () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = mode;
    try {
      const { getImageProps } = require('next/image');
      const { props } = getImageProps({ src: official, alt: 'Budew', width: 1200, height: 1600, unoptimized: shouldBypassNextImageOptimization(official) });
      assert.equal(props.src, official);
      assert.equal(props.srcSet, undefined);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
}
