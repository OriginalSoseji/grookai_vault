// Real local Next -> GoTrue/PostgREST/Storage integration; fixed loopback targets.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const local = path.join(root, '.local/storefront/supabase-verification');
const cfg = JSON.parse(fs.readFileSync(path.join(local, 'status-private.json')));
const f = JSON.parse(fs.readFileSync(path.join(local, 'fixture-private.json')));
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
assert.equal(process.argv.length, 2);
const base = 'http://127.0.0.1:15440';
const results = [];
const api = (route, role, body) => fetch(base + route, { redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { ...(role ? { authorization: `Bearer ${f.users[role].token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
const check = async (name, fn) => { try {
    await fn();
    results.push({ name, passed: true });
    console.log('PASS ' + name);
}
catch (e) {
    results.push({ name, passed: false, error: e.message });
    throw e;
} };
const store = `/api/stores/${f.slug}`, product = `${store}/products/${f.productId}`, photo = path.basename(f.photoPath), media = `${product}/media/${photo}`;
const current = async () => { const r = await api(`/api/stores/owner/products?id=${f.productId}`, 'owner'); assert.equal(r.status, 200); return (await r.json()).products[0]; };
const change = (p, action, data = {}) => api('/api/stores/owner/products', 'owner', { id: p.id, version: p.version, action, data });
const client = key => createClient(cfg.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let browser;
try {
    await check('real API owner isolation and public/private projection', async () => {
        assert.equal((await api('/api/stores/owner/products')).status, 401);
        assert.equal((await api(`${store}/preview`, 'other')).status, 404);
        const owner = await api(`${store}/preview`, 'owner');
        assert.equal(owner.status, 200);
        assert.match(owner.headers.get('cache-control'), /no-store/);
        const pub = await api(store);
        assert.equal(pub.status, 200);
        const body = await pub.json();
        assert(!JSON.stringify(body).includes('PRIVATE-REAL-SKU'));
        const app = await api(`${store}/app`, 'visitor');
        assert.equal(app.status, 200);
        assert.deepEqual((await app.json()).items, body.items);
        assert.equal((await api(`${store}/app`)).status, 401);
    });
    await check('real Storage bytes delivered only through guarded no-store media', async () => {
        const r = await api(media);
        assert.equal(r.status, 200);
        assert.match(r.headers.get('cache-control'), /no-store/);
        assert.match(r.headers.get('content-type'), /image\/png/);
        assert.deepEqual(Buffer.from(await r.arrayBuffer()), fs.readFileSync(path.join(root, '.local/storefront/device-fixture.png')));
        assert.equal((await api(`${product}/media/${randomUUID()}.png`)).status, 404);
    });
    await check('HTTP concurrent edits return one 200 and one prompt 409', async () => {
        const p = await current(), start = Date.now();
        const r = await Promise.all([change(p, 'save', { available_quantity: 5 }), change(p, 'save', { available_quantity: 6 })]);
        assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
        assert(Date.now() - start < 10000);
        assert.match(await r.find(x => x.status === 409).text(), /Reload before saving/);
    });
    await check('unpublish immediately removes public detail/media and keeps owner preview', async () => {
        assert.equal((await change(await current(), 'unpublish')).status, 200);
        for (const route of [product, media])
            assert.equal((await api(route)).status, 404);
        assert.equal((await api(`${store}/preview/products/${f.productId}/media/${photo}`, 'owner')).status, 200);
        assert.equal((await api(`${store}/preview/products/${f.productId}/media/${photo}`, 'other')).status, 404);
        assert.equal((await change(await current(), 'publish')).status, 200);
    });
    await check('real signup ledger is service-only and atomic under concurrent credit', async () => {
        const admin = client(cfg.SECRET_KEY), anon = client(cfg.PUBLISHABLE_KEY), created = new Date(Date.now() - 1000).toISOString(), expires = new Date(Date.now() + 86400000).toISOString();
        const signup = await anon.auth.signUp({ email: `store-visitor-${Date.now()}@fixture.invalid`, password: `Local-proof-${randomUUID()}!` });
        assert.ifError(signup.error);
        const args = { p_referred_user_id: signup.data.user.id, p_store_id: f.storeId, p_gvvi_id: null, p_created_at: created, p_expires_at: expires };
        assert((await anon.rpc('vendor_referral_credit_v1', args)).error);
        const credited = await Promise.all([admin.rpc('vendor_referral_credit_v1', args), admin.rpc('vendor_referral_credit_v1', args)]);
        credited.forEach(r => assert.ifError(r.error));
        assert.deepEqual(credited.map(r => r.data).sort(), ['already_credited', 'credited']);
        const existing = await admin.rpc('vendor_referral_credit_v1', { ...args, p_referred_user_id: f.users.other.id });
        assert.equal(existing.data, 'not_new_account');
        const self = await admin.rpc('vendor_referral_credit_v1', { ...args, p_referred_user_id: f.users.owner.id, p_created_at: new Date(Date.now() - 3600000).toISOString() });
        assert.equal(self.data, 'self_referral_blocked');
        const expired = await admin.rpc('vendor_referral_credit_v1', { ...args, p_expires_at: created });
        assert.equal(expired.data, 'invalid_context');
        const forged = await api('/api/telemetry', 'visitor', { eventName: 'vendor_referred_signup', metadata: { vendor_user_id: f.users.other.id } });
        assert.equal(forged.status, 403);
    });
    await check('real public browser renders browse-only store and product at desktop/mobile', async () => {
        const require = createRequire(path.join(root, 'apps/web/package.json'));
        const { chromium } = require('@playwright/test');
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.route('**/*', route => { const u = new URL(route.request().url()); return ['127.0.0.1', 'localhost'].includes(u.hostname) ? route.continue() : route.abort(); });
        for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
            await page.setViewportSize({ width, height });
            await page.goto(`${base}/store/${f.slug}`, { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: 'Real local store', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: /checkout|buy now/i }).count(), 0);
            await page.screenshot({ path: path.join(local, `real-${label}-store.png`), fullPage: true });
            await page.goto(`${base}/store/${f.slug}/products/${f.productId}`, { waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: 'Real Storage collectible', exact: true }).waitFor();
            assert(!await page.locator('body').innerText().then(x => x.includes('PRIVATE-REAL-SKU')));
            await page.waitForFunction(() => Array.from(document.querySelectorAll('article img')).every(i => i.complete && i.naturalWidth > 0));
            await page.screenshot({ path: path.join(local, `real-${label}-product.png`), fullPage: true });
        }
    });
}
finally {
    await browser?.close();
    fs.writeFileSync(path.join(local, 'web-receipt.json'), JSON.stringify({ recordedAt: new Date().toISOString(), realSupabase: true, results }, null, 2) + '\n');
}
