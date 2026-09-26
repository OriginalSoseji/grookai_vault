import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {guard,sql,output,hash} from '../schema/vendor_preorder_conflict_runtime_v1.mjs';
assert.equal(process.argv.length,2);const before=guard({full:true});
const proof=`begin;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','preorder-a@example.invalid'),('10000000-0000-4000-8000-000000000002','preorder-b@example.invalid');
insert into user_entitlements(user_id,tier,features) select id,'vendor','{"store_app":true,"store_web":false}'::jsonb from auth.users;
insert into vendor_stores(id,owner_id,slug,display_name) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','preorder-a','Synthetic A'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','preorder-b','Synthetic B');
update vendor_store_rollout set app_enabled=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare d jsonb:='{"title":"Upcoming box","description":"","expected_date":"2026-12-01","price_cents":10000,"allocation_limit":10,"payment_mode":"reservation","deposit_cents":null,"terms":"Synthetic terms","status":"draft"}'; r jsonb; i integer;
begin
 r:=public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',0,d);
 assert (r->>'version')::integer=1;
 assert public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',0,d)=r;
 d:=d||'{"payment_mode":"full"}';r:=public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',1,d);assert (r->>'version')::integer=2;
 begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',1,d||'{"title":"stale edit"}');raise exception 'Stale edit accepted';exception when sqlstate 'PT409' then null;end;
 d:=d||'{"payment_mode":"deposit","deposit_cents":2500}';r:=public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',2,d);assert (r->>'deposit_cents')::integer=2500;
 for i in 0..2 loop
   begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000002',0,d||jsonb_build_object('deposit_cents',case i when 0 then 0 when 1 then 10000 else 10001 end));raise exception 'Invalid deposit accepted';exception when check_violation then null;end;
 end loop;
 begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000002',0,d||'{"allocation_limit":0}');raise exception 'Invalid allocation accepted';exception when check_violation then null;end;
 begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000002',0,d||'{"status":"published"}');raise exception 'Publication accepted';exception when check_violation then null;end;
 assert (public.vendor_preorders_owner_v1()->>'total')::integer=1;
 begin update public.vendor_preorders set price_cents=1;raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 assert (public.vendor_preorders_owner_v1()->>'total')::integer=0;
 assert (select count(*) from public.vendor_preorders)=0;
 begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',3,'{}');raise exception 'Foreign update accepted';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.vendor_preorders;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
 begin perform public.vendor_preorders_owner_v1();raise exception 'Anonymous RPC accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
update user_entitlements set is_active=false where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
 assert (public.vendor_preorders_owner_v1()->>'total')::integer=1;
 begin perform public.vendor_preorders_save_v1('30000000-0000-4000-8000-000000000001',3,'{}');raise exception 'Inactive write accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 assert (select count(*) from vault_item_instances)=0;
 assert (select count(*) from vendor_orders)=0;
 assert not exists(select 1 from vendor_stores where app_published or web_published);
end $$;
rollback;`;
sql(proof);assert.deepEqual(guard({full:true}),before);
fs.writeFileSync(path.join(output,'local-proof.json'),JSON.stringify({at:new Date().toISOString(),status:'passed',project:before.project,proofSha256:hash(proof),groups:['three vendor-selected modes and deposit constraints','idempotent retry and stale-update rejection','owner RLS and anonymous/foreign/direct-write rejection','inactive grant denies writes but retains owner inspection','no inventory, order or publication side effects; rollback and empty/off guard'],productionWrites:0},null,2));
console.log('PASS: 5 local preorder integration groups; fixtures rolled back; 415-file empty/off guard passed');
