import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
const base = '.local/storefront/supabase-verification', out = '.local/storefront/native_auth';
const cfg = JSON.parse(fs.readFileSync(base + '/status-private.json'));
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
assert.equal(new URL(cfg.DB_URL).port, '16422');
assert(!fs.existsSync(out + '/fixture-defines.json'));
const db = new pg.Client({ connectionString: cfg.DB_URL });
await db.connect();
assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes, '0');
const fixture = {};
const run = Date.now();
try {
    for (const role of ['owner', 'visitor']) {
        const c = createClient(cfg.API_URL, cfg.ANON_KEY, { auth: { persistSession: false } });
        const email = `native-${role}-${run}@fixture.invalid`, password = `Local-${randomUUID()}!`;
        const r = await c.auth.signUp({ email, password });
        assert.ifError(r.error);
        fixture[role] = { id: r.data.user.id, email, password };
        await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,$3,true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true", [r.data.user.id, `native-${role}-${run}`, `Native ${role}`]);
        if (role === 'owner') {
            await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}')", [r.data.user.id]);
            fixture.slug = `native-proof-${run}`;
            const store = await c.rpc('vendor_store_save_v1', { p_slug: fixture.slug, p_display_name: 'Native auth proof store' });
            assert.ifError(store.error);
            fixture.storeId = store.data.store.id;
            const draft = await c.rpc('vendor_store_custom_mutate_v1', { p_product_id: null, p_expected_version: null, p_action: 'save', p_data: { title: 'Native auth collectible', description: 'Local proof only', asking_price_amount: 42.5, available_quantity: 2, private_sku: 'NATIVE-PRIVATE' } });
            assert.ifError(draft.error);
            let p = draft.data.products[0];
            fixture.productId = p.id;
            const photo = `${fixture.storeId}/products/${p.id}/${randomUUID()}.png`;
            const upload = await c.storage.from('vendor-store-media').upload(photo, fs.readFileSync('.local/storefront/device-fixture.png'), { contentType: 'image/png' });
            assert.ifError(upload.error);
            for (const [action, data] of [['photos', { paths: [photo] }], ['publish', {}]]) {
                const r = await c.rpc('vendor_store_custom_mutate_v1', { p_product_id: p.id, p_expected_version: p.version, p_action: action, p_data: data });
                assert.ifError(r.error);
                p = r.data.products[0];
            }
            for (const surface of ['app', 'web'])
                assert.ifError((await c.rpc('vendor_store_publish_v1', { p_surface: surface, p_publish: true })).error);
        }
    }
    fs.writeFileSync(out + '/fixture-private.json', JSON.stringify(fixture, null, 2));
    fs.writeFileSync(out + '/fixture-defines.json', JSON.stringify({ SUPABASE_URL: cfg.API_URL, SUPABASE_PUBLISHABLE_KEY: cfg.ANON_KEY, GROOKAI_WEB_BASE_URL: 'http://127.0.0.1:15440', FIXTURE_OWNER_EMAIL: fixture.owner.email, FIXTURE_OWNER_PASSWORD: fixture.owner.password, FIXTURE_VISITOR_EMAIL: fixture.visitor.email, FIXTURE_VISITOR_PASSWORD: fixture.visitor.password, FIXTURE_SLUG: fixture.slug, FIXTURE_PRODUCT_ID: fixture.productId }, null, 2));
    console.log('Created two synthetic real Auth accounts and native fixture; secrets remain ignored.');
}
finally {
    await db.end();
}
