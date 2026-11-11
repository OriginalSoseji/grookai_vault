// Actual local Auth/PostgREST plus synthetic provider transport. Retain the lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {SquareCatalogService, squareEnvironmentConfig} from '../../backend/square/service_v1.mjs';
import {runSquareCatalogTick} from '../../backend/square/worker_v1.mjs';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const require=createRequire(root+'/backend/package.json'),cfg=require('dotenv').parse(fs.readFileSync(root+'/apps/web/.env.local'));
assert.equal(cfg.SUPABASE_URL,'http://127.0.0.1:61841');assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(fs.existsSync(lab+'/runtime-fixture.private.json'),false,'Never recreate retained fixture accounts');
assert.equal(JSON.parse(fs.readFileSync(lab+'/worker-candidate-result.json')).pass,true);
const {createClient}=require('@supabase/supabase-js');
const admin=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_square-fresh-483-20261110','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
  {input,encoding:'utf8',timeout:60000,maxBuffer:8_000_000,windowsHide:true}).trim();
const fixture={at:new Date().toISOString(),localOnly:true,provider:'synthetic transport, not Square Sandbox'};
// Persist setup progress even if a later assertion fails; never duplicate users.
const save=()=>fs.writeFileSync(lab+'/runtime-fixture.private.json',JSON.stringify(fixture,null,2),{mode:0o600});
for(const role of ['owner','other']){
  const password='Local-'+randomUUID()+'!',email='square-'+role+'-'+randomUUID()+'@fixture.invalid';
  const result=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(result.error);
  const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await client.auth.signInWithPassword({email,password});assert.ifError(login.error);
  fixture[role]={id:result.data.user.id,email,password,accessToken:login.data.session.access_token};save();
}
const owner=fixture.owner.id,other=fixture.other.id;
for(const id of [owner,other])assert.match(id,/^[0-9a-f-]{36}$/);
const seeded=JSON.parse(sql(`begin;
create temporary table square_fixture_results(owner_id uuid,copy_id uuid,gvvi text);
do $$ declare actor uuid; card uuid; printing uuid; legacy uuid; copy uuid; n integer:=0;
begin
 select id into card from public.card_prints order by id limit 1;
 insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(card,'normal','GV-PK-SQUARE-RUNTIME-NORMAL') returning id into printing;
 foreach actor in array array['${owner}'::uuid,'${other}'::uuid] loop
  insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
   values(actor,'square-runtime-'||left(actor::text,8),'Square runtime fixture',true,true)
   on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true;
  insert into public.user_entitlements(user_id,tier,role,features) values(actor,'vendor','vendor','{"vendor_tools":true}');
  for i in 1..case when actor='${owner}'::uuid then 2 else 1 end loop
   n:=n+1;legacy:=gen_random_uuid();copy:=gen_random_uuid();
   insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,actor,id,name,gv_id,1 from public.card_prints where id=card;
   insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label)
    values(copy,actor,card,printing,legacy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(n::text,6,'0'),'sell','asking',20+n,'USD','NM');
   if grookai_square.offer(actor,copy) is null then raise exception 'Local public offer prerequisite failed';end if;
   insert into square_fixture_results values(actor,copy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(n::text,6,'0'));
  end loop;
 end loop;
end $$;
select coalesce(json_agg(row),'[]'::json) from square_fixture_results row;
commit;`));
fixture.copies=seeded;save();
const controls=await admin.rpc('square_controls_set_v1',{p_expected_revision:0,p_linking:true,p_catalog:true,p_owners:[owner]});assert.ifError(controls.error);
const rpc=async(action,data)=>{const result=await admin.rpc('square_service_v1',{p_action:action,p_data:data});
 if(result.error)throw Error(result.error.message);return result.data;};
const catalog=[];let writes=0;
const clientFactory=()=>({
 authorizationUrl:({state})=>'https://connect.squareupsandbox.com/oauth2/authorize?state='+state,
 obtainToken:async()=>({merchantId:'runtime-merchant',accessToken:'synthetic-access-token',refreshToken:'synthetic-refresh-token',expiresAt:'2030-01-01T00:00:00.000Z'}),
 merchant:async id=>({id}),locations:async()=>[{id:'runtime-location',name:'Runtime fixture',currency:'USD'}],
 itemsForExactSku:async sku=>structuredClone(catalog.filter(item=>item.item_data.variations.some(v=>v.item_variation_data.sku===sku))),
 upsert:async(payload,sku)=>{
  writes++;const item=structuredClone(payload.object);item.id=item.id.startsWith('#')?'runtime-item-'+writes:item.id;item.version=100+writes;
  const variation=item.item_data.variations.find(v=>v.item_variation_data.sku===sku);variation.id=variation.id.startsWith('#')?'runtime-variation-'+writes:variation.id;
  variation.version=item.version;variation.item_variation_data.item_id=item.id;
  const index=catalog.findIndex(row=>row.id===item.id);if(index<0)catalog.push(item);else catalog[index]=item;
  return {itemId:item.id,variationId:variation.id};
 }
});
const service=new SquareCatalogService({rpc,config:squareEnvironmentConfig(cfg),clientFactory});
const start=await service.start(owner),capability=new URL(start.launchUrl).searchParams.get('capability');
const launched=await service.launch(capability),state=new URL(launched.authorizationUrl).searchParams.get('state');
const connected=await service.callback({state,browserNonce:launched.browserNonce,code:'synthetic-code'});fixture.connectionId=connected.connectionId;save();
await service.configure(owner,fixture.connectionId,{locationId:'runtime-location',autoSync:true});
await service.select(owner,fixture.connectionId,{instanceIds:seeded.filter(row=>row.owner_id===owner).map(row=>row.copy_id),confirmed:true});
const first=await runSquareCatalogTick({client:admin,service,environment:'sandbox',enabled:true});assert.equal(first.succeeded,1);
const second=await runSquareCatalogTick({client:admin,service,environment:'sandbox',enabled:true});assert.equal(second.succeeded,1);assert.equal(writes,2);
const third=await runSquareCatalogTick({client:admin,service,environment:'sandbox',enabled:true});assert.equal(third.succeeded,1);assert.equal(writes,2,'Repeat sync must not duplicate a catalog item');
const health=await admin.rpc('square_health_v1');assert.ifError(health.error);assert.equal(health.data.uncertainOperations,0);
fixture.catalog=catalog;fixture.completed=true;save();
fs.writeFileSync(lab+'/runtime-proof.json',JSON.stringify({passed:true,actualLocalAuthUsers:2,actualSelectedCopies:2,workerRuns:3,
 actualServiceRpc:true,providerWrites:writes,duplicateCreates:0,providerTransport:'synthetic',realSquareRequests:0,
 controls:'single local synthetic owner only',productionWrites:0},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,localAuthUsers:2,copies:3,catalogItems:2,workerRuns:3,realSquareRequests:0,productionWrites:0}));
