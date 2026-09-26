// Bounded hosted UI release proof. Reuses retained synthetic accounts; creates no fixtures.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { out, verified, query } from './ops.mjs';

const origin = process.argv[2];
const recognition = process.argv.includes('--recognition');
assert.ok(origin === 'https://grookai-vendor-preview.vercel.app' ||
  /^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/.test(origin ?? ''));
const canonical = 'https://grookai-vendor-preview.vercel.app';
const project = await verified();
assert.equal(project.id, 'hrtbjchobencariqclab');
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const { createServerClient } = require('@supabase/ssr');
const accounts = JSON.parse(fs.readFileSync(path.join(out, 'proof-accounts.private.json')));
const key = JSON.parse(fs.readFileSync(path.join(out, 'keys.private.json'))).find(k => k.name === 'anon').api_key;
const invite = JSON.parse(fs.readFileSync(path.join(out, 'review-invite.private.json')));
assert.equal(new URL(invite.url).origin, canonical);
const jar = new Map();
const client = createServerClient(`https://${project.id}.supabase.co`, key, { cookies: {
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  setAll: values => values.forEach(c => jar.set(c.name, c.value)),
} });
const passed = [];
const request = async (route, { auth = true, method = 'GET', body } = {}) => {
  const response = await fetch(origin + route, { method, redirect: 'manual',
    headers: { ...(auth ? { cookie: [...jar].map(([k, v]) => k + '=' + v).join('; ') } : {}),
      ...(method === 'POST' ? { Origin: canonical, 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { /* HTML is expected on pages. */ }
  return { status: response.status, headers: response.headers, text, data };
};
const pass = text => { passed.push(text); console.log('PASS ' + text); };
try {
  const start = await request(new URL(invite.url).pathname + new URL(invite.url).search, { auth: false });
  assert.equal(start.status, 307);
  assert.equal(start.headers.get('location'), canonical + '/vendor-preview');
  assert.match(start.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(start.headers.get('set-cookie'), /Secure/i);
  assert.match(start.headers.get('cache-control'), /no-store/);
  assert.equal(start.headers.get('referrer-policy'), 'no-referrer');
  const landing = await request('/vendor-preview', { auth: false });
  assert.equal(landing.status, 200);
  assert.match(landing.text, /computer or phone/);
  assert.match(landing.text, /Scan batches are drafts/);
  assert.equal((await request('/login?next=%2Fvendor-preview&mode=signup', { auth: false })).status, 200);
  pass('public HTTPS invitation, protected cookie, landing and own-account signup route work without hosting login');
  for (const route of ['/api/stores/owner', '/api/stores/owner/intake']) {
    assert.equal((await request(route, { auth: false })).status, 401);
  }
  pass('anonymous owner and intake reads rejected');
  assert.equal((await client.auth.signInWithPassword(accounts[2])).error, null);
  const owner = await request('/api/stores/owner');
  assert.equal(owner.status, 200);
  assert.ok(owner.data.store?.id);
  assert.equal(owner.data.capabilities.store_app, true);
  assert.equal(owner.data.preorders_enabled, false);
  assert.match(owner.headers.get('cache-control'), /no-store/);
  const page = await request('/account/store');
  assert.equal(page.status, 200);
  const inventory = await request('/api/stores/owner/inventory?q=Pikachu&offset=0');
  assert.equal(inventory.status, 200);
  assert.ok(inventory.data.cards.length > 0);
  pass('retained synthetic owner can load workspace, inventory and sample catalog');
  const intake = await request('/api/stores/owner/intake');
  assert.equal(intake.status, 200);
  assert.deepEqual(intake.data, { commit: false, recognition });
  assert.equal((await request('/api/stores/owner/intake', { method: 'POST', body: {} })).status, 503);
  pass(`scan drafts exposed with recognition ${recognition ? 'enabled' : 'disabled'} and batch submission disabled`);
  for (const [route, body] of [
    ['/api/stores/owner/preorders', {}],
    ['/api/vendor-billing/owner', { action: 'checkout', plan: 'store_web' }],
    ['/api/vendor-payments/owner', { action: 'onboarding' }],
    ['/api/vendor-orders/checkout', { orderId: accounts[2].id }],
  ]) {
    const result = await request(route, { method: 'POST', body });
    assert.equal(result.status, 503, route + ': ' + result.status);
    assert.ok(!result.headers.get('location'));
  }
  pass('preorders, paid subscriptions, seller onboarding and buyer checkout remain disabled');
  const financial = await query('select (select count(*) from vendor_orders)::int as orders, (select count(*) from vendor_billing_accounts)::int as billing, (select count(*) from vendor_seller_accounts)::int as sellers, (select count(*) from web_events)::int as telemetry');
  assert.deepEqual(financial[0], { orders: 0, billing: 0, sellers: 0, telemetry: 0 });
  const digest = createHash('sha256').update(invite.code).digest('hex');
  const access = (await query(`select expires_at,max_members,revoked,(select count(*) from public.vendor_pilot_members m where m.invite_id=i.id)::int as used from public.vendor_pilot_invites i where code_hash='${digest}'`))[0];
  assert.equal(access.revoked, false);
  assert.ok(new Date(access.expires_at) > new Date());
  assert.ok(access.used < access.max_members);
  pass('no financial or telemetry records; invitation active with available reviewer slots');
  const receipt = { at: new Date().toISOString(), origin, database: project.id, passed, invitation: access, financial: financial[0], fixtureWrites: 0 };
  fs.writeFileSync(path.join(out, 'batch-hosted-proof-' + Date.now() + '.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: passed.length, availableSlots: access.max_members - access.used }));
} finally {
  await client.auth.signOut({ scope: 'local' });
}
