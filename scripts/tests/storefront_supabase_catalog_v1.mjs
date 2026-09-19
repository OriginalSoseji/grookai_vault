// Synthetic catalog/copy fixtures in the fully replayed isolated real schema only.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), local = path.join(root, '.local/storefront/supabase-verification');
const cfg = JSON.parse(fs.readFileSync(path.join(local, 'status-private.json'))), f = JSON.parse(fs.readFileSync(path.join(local, 'fixture-private.json')));
assert.equal(process.argv.length, 2);
assert.equal(cfg.API_URL, 'http://127.0.0.1:16421');
assert.equal(new URL(cfg.DB_URL).hostname, '127.0.0.1');
assert.equal(new URL(cfg.DB_URL).port, '16422');
const db = new pg.Client({ connectionString: cfg.DB_URL });
await db.connect();
const q = (s, p = []) => db.query(s, p);
assert.equal((await q('show max_worker_processes')).rows[0].max_worker_processes, '0');
const anon = createClient(cfg.API_URL, cfg.ANON_KEY, { auth: { persistSession: false } }), owner = createClient(cfg.API_URL, cfg.ANON_KEY, { accessToken: async () => f.users.owner.token }), visitor = createClient(cfg.API_URL, cfg.ANON_KEY, { accessToken: async () => f.users.visitor.token });
const rpc = async (c, name, args) => { const r = await c.rpc(name, args); assert.ifError(r.error); return r.data; };
const read = (args = {}, c = anon) => rpc(c, 'vendor_store_read_v2', { p_slug: f.slug, p_surface: 'web', p_kind: 'catalog', ...args });
const select = id => rpc(owner, 'vendor_store_select_item_v1', { p_instance_id: id, p_selected: true });
const results = [];
const check = async (name, fn) => { try {
    await fn();
    results.push({ name, passed: true });
    console.log('PASS ' + name);
}
catch (e) {
    results.push({ name, passed: false, error: e.message });
    throw e;
} };
const id = { set: randomUUID(), card: randomUUID(), otherCard: randomUUID(), printing: randomUUID(), wrongPrinting: randomUUID(), legacy: randomUUID(), copy: randomUUID(), sibling: randomUUID(), unselected: randomUUID(), hold: randomUUID(), section: randomUUID() };
try {
    await check('actual schema admits explicit synthetic same-parent copy fixtures', async () => {
        // Clear only this recorded synthetic store's selection to make retries independent.
        assert.match(f.slug, /^real-store-[0-9]+$/);
        await q('delete from vendor_store_items where store_id=$1', [f.storeId]);
        const game = (await q("select id from games where code='pokemon' limit 1")).rows[0].id;
        const code = `proof${Date.now()}`;
        await q("insert into sets(id,code,name,game) values($1,$2,'Storefront synthetic proof','pokemon')", [id.set, code]);
        for (const [card, number] of [[id.card, '001'], [id.otherCard, '002']])
            await q("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,$2,$3,'Synthetic Store Pikachu',$4,$5,$6,'missing')", [card, game, id.set, number, code, `GV-PK-${code.toUpperCase()}-${number}`]);
        for (const [printing, card] of [[id.printing, id.card], [id.wrongPrinting, id.otherCard]])
            await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'holo','GV-PRINT-'||upper($1::uuid::text))", [printing, card]);
        const card = (await q('select gv_id from card_prints where id=$1', [id.card])).rows[0];
        await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic Store Pikachu',$4)", [id.legacy, f.users.owner.id, id.card, card.gv_id]);
        for (const key of ['copy', 'sibling', 'unselected', 'hold'])
            await q("insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label) values($1,$2,$3,$4,$5,$6,$7,'asking',25,'USD','NM')", [id[key], f.users.owner.id, id.card, id.printing, id.legacy, `GVVI-${id[key].toUpperCase()}`, 'sell']);
        await select(id.copy);
        await select(id.sibling);
        await select(id.hold);
        await q("update vault_item_instances set intent='hold' where id=$1", [id.hold]);
        const rows = (await read()).items;
        assert.deepEqual(rows.map(x => x.id).sort(), [id.copy, id.sibling].sort());
        assert(rows.every(x => x.printing_gv_id && x.asking_price_amount === 25));
    });
    await check('real catalog app/web parity, explicit selection, search and section intersection', async () => {
        const web = await read(), app = await read({ p_surface: 'app' }, visitor);
        assert.deepEqual(web.items, app.items);
        assert.equal(web.total, 2);
        assert.equal((await read({ p_query: 'Synthetic Store Pikachu', p_limit: 1 })).items.length, 1);
        assert.equal((await read({ p_query: 'No such card' })).total, 0);
        await q("insert into wall_sections(id,user_id,name) values($1,$2,'Synthetic section')", [id.section, f.users.owner.id]);
        for (const key of ['copy', 'unselected', 'hold'])
            await q('insert into wall_section_memberships(section_id,vault_item_instance_id) values($1,$2)', [id.section, id[key]]);
        await rpc(owner, 'vendor_store_select_section_v1', { p_section_id: id.section, p_selected: true, p_position: 0 });
        assert.deepEqual((await read({ p_section_id: id.section })).items.map(x => x.id), [id.copy]);
        await q('update vault_item_instances set asking_price_amount=30 where id=$1', [id.unselected]);
        assert.equal((await read()).total, 2);
    });
    await check('real quarantine, wrong-parent and unassigned printing deny the next read', async () => {
        await q("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic test only')", [id.printing]);
        assert.equal((await read()).total, 0);
        await q('update card_printing_truth_reviews set active=false where card_printing_id=$1', [id.printing]);
        assert.equal((await read()).total, 2);
        await q('update vault_item_instances set card_printing_id=null where id=$1', [id.copy]);
        assert.equal((await read()).total, 1);
        await assert.rejects(q('update vault_item_instances set card_printing_id=$1 where id=$2', [id.wrongPrinting, id.copy]), /does not belong/);
        assert.equal((await read()).total, 1);
        await q('update vault_item_instances set card_printing_id=$1 where id=$2', [id.printing, id.copy]);
        assert.equal((await read()).total, 2);
    });
    await check('real archive, transfer, zero price and privacy invalidate copy exposure', async () => {
        await q('update vault_item_instances set archived_at=now() where id=$1', [id.copy]);
        assert.equal((await read()).total, 1);
        await q('update vault_item_instances set archived_at=null,asking_price_amount=0 where id=$1', [id.copy]);
        assert.equal((await read()).total, 1);
        await q('update vault_item_instances set asking_price_amount=25,user_id=$1 where id=$2', [f.users.other.id, id.copy]);
        assert.equal((await read()).total, 1);
        await q('update public_profiles set vault_sharing_enabled=false where user_id=$1', [f.users.owner.id]);
        assert.equal(await read(), null);
        await q('update public_profiles set vault_sharing_enabled=true where user_id=$1', [f.users.owner.id]);
    });
}
finally {
    await db.end();
    fs.writeFileSync(path.join(local, 'catalog-receipt.json'), JSON.stringify({ recordedAt: new Date().toISOString(), realSchema: true, syntheticCatalog: true, results }, null, 2) + '\n');
}
