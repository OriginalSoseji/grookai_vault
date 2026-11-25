import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function loadAdapter(client) {
  const filename = 'apps/web/src/lib/provisional/getPublicProvisionalCards.ts';
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, process, console, Error,
    require(id) {
      if (id === 'server-only') return {};
      if (id === '@/lib/supabase/publicServer') return { createPublicServerClient: () => client };
      if (id === '@/lib/provisional/provisionalProductCopy') return { PROVISIONAL_NOT_CANON_COPY: '', PROVISIONAL_SOURCE_COPY: '' };
      throw new Error(`Unexpected import: ${id}`);
    },
  }, { filename });
  return module.exports.getPublicProvisionalCards;
}

async function bounded(promise, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 3000); })]);
  } finally { clearTimeout(timer); }
}

test('provisional adapter aborts its actual Supabase HTTP request', async () => {
  let arrived, closed;
  const arrival = new Promise(resolve => { arrived = resolve; });
  const close = new Promise(resolve => { closed = resolve; });
  const server = createServer((req, res) => {
    req.on('error', () => {});
    req.resume();
    res.once('close', () => closed(!res.writableEnded));
    arrived();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const controller = new AbortController();
  try {
    const client = createClient(`http://127.0.0.1:${server.address().port}`, 'local-fixture-key', { auth: { persistSession: false, autoRefreshToken: false } });
    const pending = loadAdapter(client)({ query: 'Pikachu', signal: controller.signal });
    void pending.catch(() => {});
    await bounded(arrival, 'provisional request did not arrive');
    controller.abort();
    await assert.rejects(pending, /Public provisional warehouse query failed/);
    assert.equal(await bounded(close, 'provisional request remained open'), true);
  } finally {
    controller.abort();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('provisional adapter remains compatible with callers without a signal', async () => {
  const server = createServer((req, res) => { req.resume(); res.writeHead(200, { 'content-type': 'application/json' }); res.end('[]'); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const client = createClient(`http://127.0.0.1:${server.address().port}`, 'local-fixture-key', { auth: { persistSession: false, autoRefreshToken: false } });
    const rows = await bounded(loadAdapter(client)({ query: 'Pikachu' }), 'provisional request did not finish');
    assert.equal(rows.length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
