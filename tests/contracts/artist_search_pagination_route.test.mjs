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

function loadRoute({ fail = false } = {}) {
  const cache = new Map();
  const mocks = {
    'server-only': {},
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/explore/getExploreRows': {
      getExploreRowsForArtistSearch: async () => {
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
        from: (table) => {
          assert.equal(table, 'sets');
          return { select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }) };
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
