// Read-only deployment/database inventory. Never reads or prints credential values.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { query, ref } from 'file:///C:/gv_store_production_20260926/scripts/release/storefront_production_live_common_v1.mjs';

assert.equal(process.argv.length, 2);
assert.equal(ref, 'ycdxbpibncqcchqiihfz');
const target = JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/storefront_production_20260926/LIVE_SELLER_TARGET.private.json','utf8'));
assert.match(target.ownerId,/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const project = 'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum';
const team = 'team_EFKFYSau9Gf8wEaix8zXgQZG';
const token = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'))).token;
async function hosting(route) {
  const response = await fetch(`https://api.vercel.com${route}?teamId=${team}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, `Hosting read HTTP ${response.status}`);
  return response.json();
}
const [envs, alias, rows] = await Promise.all([
  hosting(`/v10/projects/${project}/env`), hosting('/v4/aliases/grookaivault.com'),
  query(`begin transaction read only;
    select jsonb_build_object(
      'readOnly', current_setting('transaction_read_only'),
      'migrations', (select count(*) from supabase_migrations.schema_migrations),
      'cards', (select count(*) from public.card_prints),
      'sets', (select count(*) from public.sets),
      'traits', (select count(*) from public.card_print_traits),
      'sellerBindings', (select count(*) from public.vendor_seller_accounts),
      'sellerRollout', (select to_jsonb(r) from public.vendor_seller_rollout r),
      'ordersRollout', (select to_jsonb(r) from public.vendor_orders_rollout r),
      'ownerMatches', (select count(*) from auth.users where id = '${target.ownerId}'::uuid),
      'ownerStore', (select jsonb_build_object('id', s.id, 'ownerId', s.owner_id, 'slug', s.slug)
        from public.vendor_stores s join auth.users u on u.id=s.owner_id
        where u.id='${target.ownerId}'::uuid),
      'ownerSeller', (select jsonb_build_object('id', a.id, 'state', a.state, 'mode', a.livemode,
        'platform', a.stripe_account_id, 'account', a.connected_account_id)
        from public.vendor_seller_accounts a join auth.users u on u.id=a.owner_id
        where u.id='${target.ownerId}'::uuid)
    ) as state;
    commit;`),
]);
const db = rows[0].state;
assert.equal(db.readOnly, 'on');
assert.ok(db.cards >= 40000 && db.sets >= 150 && db.traits >= 5000, 'Environment mismatch');
assert.equal(db.ownerMatches, 1);
assert.ok(db.ownerStore);
assert.equal(db.ownerStore.id,target.storeId,'Owner/store pairing changed');
const report = { version: 'vendor-live-seller-preflight-v1', at: new Date().toISOString(),
  project: ref, deploymentId: alias.deploymentId,
  productionConfigKeys: envs.envs.filter(e => e.target?.includes('production') && !e.gitBranch)
    .map(e => e.key).filter(k => /^(STRIPE_|GROOKAI_VENDOR_|SUPABASE_URL$)/.test(k)).sort(),
  database: db, productionWrites: 0 };
const dir = 'C:/grookai_vault_operator_artifacts/storefront_production_20260926';
fs.writeFileSync(path.join(dir, `LIVE_SELLER_PREFLIGHT_${Date.now()}.private.json`), JSON.stringify(report,null,2), {flag:'wx'});
console.log(JSON.stringify({...report, database:{...db,ownerStore:{exists:true,slug:db.ownerStore.slug}}},null,2));
