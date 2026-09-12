import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../apps/web/src/lib/collectorPreview.ts', import.meta.url), 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: module.exports, process: { env: {} }, URL, Request, Response, Headers, Set, fetch });
const { createPreviewReadFetch, previewRequestKind } = module.exports;

test('preview transport permits catalog reads but drops supplied user credentials', async () => {
  let sent;
  const read = createPreviewReadFetch('https://catalog.supabase.co', 'public-key', async (input, init) => {
    sent = { input, init }; return Response.json([]);
  });
  await read('https://catalog.supabase.co/rest/v1/card_prints?select=name', { headers: { Authorization: 'Bearer user-jwt', Cookie: 'session=x' } });
  assert.equal(sent.init.headers.get('authorization'), 'Bearer public-key');
  assert.equal(sent.init.headers.get('cookie'), null);
  assert.equal(sent.init.credentials, 'omit');
  assert.equal(sent.init.redirect, 'error');
});
test('all writes, auth, Storage, unknown RPCs, off-origin reads fail without network', async () => {
  let calls = 0;
  const read = createPreviewReadFetch('https://catalog.supabase.co', 'public-key', async () => { calls++; return Response.json([]); });
  for (const [path, method] of [
    ['/rest/v1/card_prints', 'POST'], ['/rest/v1/card_prints', 'PATCH'], ['/rest/v1/card_prints', 'DELETE'],
    ['/rest/v1/rpc/admin_vault_instance_create_v1', 'POST'], ['/rest/v1/rpc/delete_anything', 'GET'],
    ['/auth/v1/token', 'POST'], ['/auth/v1/user', 'GET'], ['/storage/v1/object/x', 'PUT'],
    ['/rest/v1/rpc/get_public_catalog_sets_v2', 'DELETE'],
  ]) assert.equal((await read(`https://catalog.supabase.co${path}`, { method })).status, 403);
  assert.equal((await read('https://elsewhere.test/rest/v1/card_prints')).status, 403);
  assert.equal(calls, 0);
});
test('bounded catalog RPCs work via POST, without broad RPC access', async () => {
  const read = createPreviewReadFetch('https://catalog.supabase.co', 'public-key', async () => Response.json([]));
  assert.equal((await read('https://catalog.supabase.co/rest/v1/rpc/get_public_card_printing_options_v1', { method: 'POST' })).status, 200);
});
test('HTTP boundary rejects server actions, sign-in and administration', () => {
  for (const path of ['/', '/card/GV-PK-MEW-200', '/api/telemetry', '/api/canon/cards/GV-PK-MEW-200/image']) assert.equal(previewRequestKind(path, 'POST'), 'deny');
  for (const path of ['/vault', '/login', '/auth/callback', '/founder', '/submit', '/wall']) assert.equal(previewRequestKind(path, 'GET'), 'account');
  assert.equal(previewRequestKind('/api/slabs/upgrade', 'GET'), 'deny');
  assert.equal(previewRequestKind('/api/resolver/search', 'GET'), 'read');
  assert.equal(previewRequestKind('/api/canon/cards/GV-PK-MEW-200/image', 'GET'), 'image');
});
test('preview build fails closed on admin credentials; all common clients are guarded', () => {
  const root = new URL('../../apps/web/', import.meta.url);
  assert.match(fs.readFileSync(new URL('next.config.mjs', root), 'utf8'), /collectorPreview && process\.env\.SUPABASE_SECRET_KEY/);
  for (const path of ['src/lib/supabase/server.ts', 'src/lib/supabase/publicServer.ts', 'src/lib/supabaseClient.ts']) {
    assert.match(fs.readFileSync(new URL(path, root), 'utf8'), /createPreviewReadFetch/);
  }
  assert.match(fs.readFileSync(new URL('src/lib/supabase/admin.ts', root), 'utf8'), /if \(collectorPreview\) throw/);
});
