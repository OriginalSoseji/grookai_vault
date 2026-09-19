// Real local GoTrue, PostgREST and Storage. Never reads application env files.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const local = path.join(root, '.local/storefront/supabase-verification');
const cfg = JSON.parse(fs.readFileSync(path.join(local, 'status-private.json')));
assert.equal(process.argv.length, 2);
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
const dbUrl = new URL(cfg.DB_URL);
assert.equal(dbUrl.hostname, '127.0.0.1');
assert.equal(dbUrl.port, '16422');
const db = new pg.Client({ connectionString: cfg.DB_URL, connectionTimeoutMillis: 3000 });
await db.connect();
const q = (s, p = []) => db.query(s, p);
assert.equal((await q('show max_worker_processes')).rows[0].max_worker_processes, '0');
assert.equal((await q('select count(*) n from supabase_migrations.schema_migrations')).rows[0].n, '397');
const client = (key = cfg.PUBLISHABLE_KEY) => createClient(cfg.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const admin = client(cfg.SECRET_KEY), anon = client();
const runId = Date.now();
const slug = `real-store-${runId}`;
const users = {};
const results = [];
const check = async (name, fn) => { try {
    await fn();
    results.push({ name, passed: true });
    console.log('PASS ' + name);
}
catch (error) {
    results.push({ name, passed: false, error: error.message });
    throw error;
} };
const rpc = async (c, name, args = {}) => { const r = await c.rpc(name, args); if (r.error)
    throw Object.assign(new Error(r.error.message), { code: r.error.code }); return r.data; };
const read = (c = anon, surface = 'web') => rpc(c, 'vendor_store_read_v2', { p_slug: slug, p_surface: surface });
let store, product, photoPath;
const mutate = async (c, p, action, data = {}) => (await rpc(c, 'vendor_store_custom_mutate_v1', { p_product_id: p?.id ?? null, p_expected_version: p?.version ?? null, p_action: action, p_data: data })).products[0];
const detail = (c, id, surface = 'web') => rpc(c, 'vendor_store_custom_detail_v1', { p_slug: slug, p_product_id: id, p_surface: surface });
const publish = (c, surface, value) => rpc(c, 'vendor_store_publish_v1', { p_surface: surface, p_publish: value });
try {
    await check('real GoTrue signup, password sign-in and refresh', async () => {
        for (const role of ['owner', 'other', 'visitor']) {
            const c = client(), email = `store-${role}-${runId}@fixture.invalid`, password = `Local-proof-${randomUUID()}!`;
            const sign = await c.auth.signUp({ email, password });
            assert.ifError(sign.error);
            assert(sign.data.session);
            const login = await c.auth.signInWithPassword({ email, password });
            assert.ifError(login.error);
            const refresh = await c.auth.refreshSession();
            assert.ifError(refresh.error);
            const current = await c.auth.getUser();
            assert.ifError(current.error);
            assert.equal(current.data.user.id, sign.data.user.id);
            users[role] = { client: c, id: sign.data.user.id, email, token: refresh.data.session.access_token };
        }
    });
    const owner = users.owner.client, other = users.other.client, visitor = users.visitor.client;
    await check('database grants and rollout gate direct RPC creation', async () => {
        await assert.rejects(rpc(owner, 'vendor_store_save_v1', { p_slug: slug, p_display_name: 'Real local store' }));
        for (const [role, web] of [['owner', true], ['other', false]]) {
            await q("insert into public.user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor',$2)", [users[role].id, { store_app: true, store_web: web }]);
            await q("insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,$3,true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true", [users[role].id, `profile-${role}-${runId}`, role]);
        }
        await q('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
        store = (await rpc(owner, 'vendor_store_save_v1', { p_slug: slug, p_display_name: 'Real local store', p_description: 'Synthetic real Supabase proof' })).store;
        assert.equal(store.app_published, false);
        assert.equal(store.web_published, false);
        assert.equal(await read(), null);
        await rpc(other, 'vendor_store_save_v1', { p_slug: `other-${runId}`, p_display_name: 'Other local store' });
        await assert.rejects(publish(other, 'web', true));
    });
    await check('draft ownership and base-table RLS', async () => {
        product = await mutate(owner, null, 'save', { title: 'Real Storage collectible', description: 'Seller-provided synthetic object', private_sku: 'PRIVATE-REAL-SKU', asking_price_amount: 42.50, available_quantity: 2 });
        assert.equal(product.published, false);
        assert.equal(await detail(anon, product.id), null);
        assert.equal(await detail(other, product.id, 'preview'), null);
        assert.equal((await rpc(other, 'vendor_store_custom_owner_v1', { p_product_id: product.id })).products.length, 0);
        await assert.rejects(mutate(other, product, 'save', { title: 'Forged' }));
        assert((await anon.from('vendor_store_custom_products').select('*')).error);
        assert((await owner.from('vendor_store_custom_products').update({ published: true }).eq('id', product.id)).error);
        await assert.rejects(mutate(owner, product, 'publish'));
    });
    const bytes = fs.readFileSync(path.join(root, '.local/storefront/device-fixture.png'));
    await check('real Storage multipart photo, MIME/size/scope enforcement and private draft', async () => {
        const pathFor = () => `${store.id}/products/${product.id}/${randomUUID()}.png`;
        assert((await other.storage.from('vendor-store-media').upload(pathFor(), bytes, { contentType: 'image/png' })).error);
        assert((await owner.storage.from('vendor-store-media').upload(pathFor(), Buffer.from('<svg/>'), { contentType: 'image/svg+xml' })).error);
        assert((await owner.storage.from('vendor-store-media').upload(pathFor(), Buffer.alloc(5 * 1024 * 1024 + 1), { contentType: 'image/png' })).error);
        assert((await owner.storage.from('vendor-store-media').upload(`${store.id}/products/${randomUUID()}/${randomUUID()}.png`, bytes, { contentType: 'image/png' })).error);
        // Dart emits an explicit empty filename. Node's FormData omits the filename
        // attribute when empty, which is a different (non-file) request.
        photoPath = pathFor();
        const boundary = `storefront-${randomUUID()}`;
        const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="cacheControl"\r\n\r\n3600\r\n--${boundary}\r\nContent-Disposition: form-data; name=""; filename=""\r\nContent-Type: image/png\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
        const upload = await fetch(`${cfg.API_URL}/storage/v1/object/vendor-store-media/${photoPath}`, { method: 'POST', headers: { apikey: cfg.PUBLISHABLE_KEY, authorization: `Bearer ${users.owner.token}`, 'content-type': `multipart/form-data; boundary=${boundary}` }, body });
        assert.equal(upload.status, 200, await upload.text());
        const downloaded = await owner.storage.from('vendor-store-media').download(photoPath);
        assert.ifError(downloaded.error);
        assert.deepEqual(Buffer.from(await downloaded.data.arrayBuffer()), bytes);
        assert((await other.storage.from('vendor-store-media').download(photoPath)).error);
        assert((await anon.storage.from('vendor-store-media').download(photoPath)).error);
        product = await mutate(owner, product, 'photos', { paths: [photoPath] });
        assert.equal(product.published, false);
    });
    await check('explicit product/store publication and app/web parity', async () => {
        product = await mutate(owner, product, 'publish');
        assert.equal(await read(), null);
        await publish(owner, 'app', true);
        assert.equal(await read(), null);
        await publish(owner, 'web', true);
        const web = await read(), app = await read(visitor, 'app');
        assert.deepEqual(web.items, app.items);
        assert.equal(web.items.length, 1);
        assert.equal(web.items[0].entry_type, 'custom_product');
        const dto = await detail(anon, product.id);
        assert.equal(dto.product.title, product.title);
        assert(!JSON.stringify(dto).includes('PRIVATE-REAL-SKU'));
        assert(!('owner_id' in dto.product));
    });
    await check('real concurrent version checks accept exactly one quantity save', async () => {
        fs.writeFileSync(path.join(local, 'fixture-private.json'), JSON.stringify({ slug, storeId: store.id, productId: product.id, photoPath, product, users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, { id: v.id, email: v.email, token: v.token }])) }, null, 2));
        const raceClient = () => createClient(cfg.API_URL, cfg.PUBLISHABLE_KEY, { accessToken: async () => users.owner.token, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
        const saves = await Promise.allSettled([mutate(raceClient(), product, 'save', { available_quantity: 3 }), mutate(raceClient(), product, 'save', { available_quantity: 4 })]);
        assert.equal(saves.filter(x => x.status === 'fulfilled').length, 1);
        assert.equal(saves.find(x => x.status === 'rejected').reason.code, 'PT409');
        product = saves.find(x => x.status === 'fulfilled').value;
    });
    await check('zero stock, restock, downgrade and re-upgrade require republishing', async () => {
        product = await mutate(owner, product, 'save', { available_quantity: 0 });
        assert.equal(await detail(anon, product.id), null);
        product = await mutate(owner, product, 'save', { available_quantity: 2 });
        assert.equal(product.published, false);
        product = await mutate(owner, product, 'publish');
        await q("update user_entitlements set features='{}' where user_id=$1", [users.owner.id]);
        assert.equal(await read(), null);
        await q("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1", [users.owner.id]);
        assert.equal(await read(), null);
        product = (await rpc(owner, 'vendor_store_custom_owner_v1', { p_product_id: product.id })).products[0];
        assert.equal(product.published, false);
        product = await mutate(owner, product, 'publish');
        await publish(owner, 'app', true);
        await publish(owner, 'web', true);
    });
    await check('sharing and rollout removal revoke next real RPC read', async () => {
        await q('update public_profiles set vault_sharing_enabled=false where user_id=$1', [users.owner.id]);
        assert.equal(await read(), null);
        await q('update public_profiles set vault_sharing_enabled=true where user_id=$1', [users.owner.id]);
        assert(await read());
        await q('update vendor_store_rollout set custom_enabled=false');
        assert.equal(await detail(anon, product.id), null);
        await q('update vendor_store_rollout set custom_enabled=true');
    });
    fs.writeFileSync(path.join(local, 'fixture-private.json'), JSON.stringify({ slug, storeId: store.id, productId: product.id, photoPath, users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, { id: v.id, email: v.email, token: v.token }])) }, null, 2));
}
finally {
    fs.writeFileSync(path.join(local, 'auth-storage-receipt.json'), JSON.stringify({ recordedAt: new Date().toISOString(), project: 'grookai-storefront-verification-20260918', realAuth: true, realStorage: true, results }, null, 2) + '\n');
    await db.end();
}
