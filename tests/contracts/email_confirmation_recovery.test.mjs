import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const { NextRequest } = require('next/server');
function load(relative, mocks) {
  const source = fs.readFileSync(new URL(`../../apps/web/src/${relative}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, URL, process, require(name) {
    if (mocks[name]) return mocks[name];
    if (name === 'next/server') return require(name);
    if (name === '@/lib/auth/routeAccess' || name === '@/lib/binders/safePath') return load(name.slice(2), mocks);
    throw Error(`Unexpected import ${name}`);
  } });
  return module.exports;
}

for (const scenario of [
  { name: 'email confirmation retains account', next: '/account' },
  { name: 'email destination wins over stale OAuth cookie', next: '/account', cookie: '/wall' },
  { name: 'external URL is rejected', next: 'https://example.invalid', expected: '/vault' },
  { name: 'protocol-relative URL is rejected', next: '//example.invalid', expected: '/vault' },
  { name: 'secret invitation destination is excluded', next: '/b/private-token', expected: '/vault' },
  { name: 'expired or reused link recovers', next: '/account', fail: 'returned' },
  { name: 'missing verifier in fresh browser recovers', next: '/account', fail: 'thrown' },
  { name: 'missing code recovers', next: '/account', noCode: true },
  { name: 'OAuth cookie continuation is preserved', next: '/account', cookie: '/wall', oauth: true, expected: '/wall' },
]) {
  test(scenario.name, async () => {
    let exchanges = 0;
    const events = [];
    const { GET } = load('app/auth/callback/route', {
      '@/lib/supabase/server': { createClient: () => ({ auth: {
        async exchangeCodeForSession(code) {
          exchanges++;
          assert.equal(code, 'fixture-code');
          if (scenario.fail === 'thrown') throw Error('Fixture verifier missing');
          return { error: scenario.fail ? { message: 'Fixture link expired' } : null };
        },
        async getUser() { return { data: { user: { id: 'fixture-user' } } }; },
      } }) },
      '@/lib/telemetry/trackServerEvent': { trackServerEvent: async (event) => { events.push(event); return 'existing'; } },
      '@/lib/gvvi/vendorReferralAttribution': { consumeVendorReferralAttribution: async () => {} },
    });
    const requestUrl = new URL('http://127.0.0.1:3210/auth/callback');
    if (!scenario.noCode) requestUrl.searchParams.set('code', 'fixture-code');
    requestUrl.searchParams.set('next', scenario.next);
    if (!scenario.oauth) requestUrl.searchParams.set('flow', 'email');
    const request = new NextRequest(requestUrl, { headers: scenario.cookie ? { cookie: `grookai-auth-next=${encodeURIComponent(scenario.cookie)}` } : {} });
    const response = await GET(request);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin, new URL(request.url).origin);
    const failed = Boolean(scenario.fail || scenario.noCode);
    if (failed) {
      assert.equal(location.pathname, '/login');
      assert.equal(location.searchParams.get('next'), scenario.expected ?? scenario.next);
      assert.equal(location.searchParams.get('error'), 'email_confirmation_failed');
      assert.equal(events.length, 0);
    } else {
      assert.equal(location.pathname, scenario.expected ?? scenario.next);
      assert.equal(events[0].metadata.auth_method, scenario.oauth ? 'google_oauth' : 'email_password');
    }
    assert.equal(exchanges, scenario.noCode ? 0 : 1);
    assert.match(response.headers.get('set-cookie'), /grookai-auth-next=;.*Max-Age=0/);
  });
}
