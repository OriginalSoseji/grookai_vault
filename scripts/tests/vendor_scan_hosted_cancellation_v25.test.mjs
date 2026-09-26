import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url)), ts = require('typescript');
const source = fs.readFileSync('apps/web/src/app/api/stores/owner/intake/match/route.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function load(match, authenticated = true) {
  const exports = {}, callbacks = [], state = { released: 0 };
  vm.runInNewContext(code, { exports, Promise, console: { warn() {} }, require: name => {
    if (name === 'next/server') return { after: cb => callbacks.push(cb), NextResponse: { json: (body, options) => ({ body, ...options }) } };
    if (name === '@/lib/supabase/server') return { createServerComponentClient: async () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'synthetic' } : null } }) }, rpc: async () => ({ data: { store: {}, capabilities: { store_app: true }, rollout: { app_enabled: true } } }) }) };
    if (name === '@/lib/stores/storefrontServer') return { STORE_NO_STORE: {}, createStorePublicClient: () => { throw Error('No public read is needed for empty result'); } };
    if (name === '@/lib/getSiteOrigin') return { getSiteOrigin: () => 'https://pilot.invalid' };
    if (name === '@/lib/stores/visualMatchServer') return { visualMatchingEnabled: () => true, beginVisualMatch: () => () => state.released++, visualCandidates: match };
    if (name === '@/lib/stores/visualMatchCore.mjs') return { MAX_SCAN_BYTES: 4 * 1024 * 1024 };
    if (name === '@/lib/stores/scanProcessV1.mjs') return { readScanBody: async () => new Uint8Array([1]), ScanProcessError: class extends Error {} };
    if (['@/lib/cards/getPublicCardPrintingOptions', '@/lib/canon/resolveCardImageFieldsV1', '@/lib/cards/resolveDisplayIdentity'].includes(name)) return {};
    throw Error(name);
  } });
  return { ...exports, callbacks, state };
}
function request(signal, type = 'image/jpeg') { return { headers: new Headers({ origin: 'https://pilot.invalid', 'content-type': type }), signal }; }

test('disconnect reaches matching and after waits for child disposal before slot release', async () => {
  const started = defer(), exited = defer(), controller = new AbortController(); let sawAbort = false;
  const api = load(async (_, signal) => {
    started.resolve();
    await new Promise(resolve => signal.addEventListener('abort', () => { sawAbort = true; resolve(); }, { once: true }));
    await exited.promise; throw Error('Worker was stopped');
  });
  const pending = api.POST(request(controller.signal)); await started.promise;
  assert.equal(api.callbacks.length, 1); let cleanupDone = false;
  const cleanup = api.callbacks[0]().then(() => { cleanupDone = true; });
  controller.abort(); await Promise.resolve();
  assert.equal(sawAbort, true); assert.equal(api.state.released, 0); assert.equal(cleanupDone, false);
  exited.resolve(); assert.equal((await pending).status, 503); await cleanup;
  assert.equal(api.state.released, 1); assert.equal(cleanupDone, true);
});
test('successful and rejected uploads settle cleanup; unauthenticated requests never register work', async () => {
  for (const [type, expected] of [['image/jpeg', 200], ['text/plain', 415]]) {
    const api = load(async () => ({ candidates: [] }));
    assert.equal((await api.POST(request(new AbortController().signal, type))).status, expected);
    await api.callbacks[0](); assert.equal(api.state.released, 1);
  }
  const api = load(() => { throw Error('Must not run'); }, false);
  assert.equal((await api.POST(request(new AbortController().signal))).status, 401);
  assert.equal(api.callbacks.length, 0); assert.equal(api.state.released, 0);
});
test('hosting cancellation is limited to the scan route', () => {
  const config = JSON.parse(fs.readFileSync('apps/web/vercel.json'));
  assert.deepEqual(config.functions, { 'src/app/api/stores/owner/intake/match/route.ts': { supportsCancellation: true } });
});
