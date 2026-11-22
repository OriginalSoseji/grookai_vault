// Supplemental actual Auth/SQL test for the reviewed never-sent recovery path.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {SquareCatalogService} from '../../backend/square/service_v1.mjs';
import {SquareCommerceService} from '../../backend/square/commerce_service_v2.mjs';
import {squareAwareVaultArchive} from '../../backend/square/vault_archive_recovery_v1.mjs';
const root='C:/grookai_vault_remove_fix_20261114',out='C:/grookai_vault_operator_artifacts/card_remove_repair_20261114';
const profile=process.argv[2];assert.ok(['fresh','retained'].includes(profile));
const lab=out+'/'+(profile==='fresh'?'fresh-v2-496':'retained-v2-495'),project=profile==='fresh'?'square-remove-fresh-v2-496-20261114':'square-remove-ret-v2-495-20261114';
const sha=x=>createHash('sha256').update(x).digest('hex'),serviceSha256=sha(fs.readFileSync(root+'/backend/square/commerce_service_v2.mjs'));
const executedSourceSha256=sha(fs.readFileSync(new URL(import.meta.url)));
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,maxBuffer:8_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'496');
assert.equal(fs.existsSync(lab+'/cancel-runtime-intent.json'),false,'Consumed fixture intent: inspect retained state before any retry');
const fixture=JSON.parse(fs.readFileSync(lab+'/removal-fixture.private.json')),owner=fixture.owner.id;
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(cfg.API_URL,profile==='fresh'?'http://127.0.0.1:64341':'http://127.0.0.1:64441');
const make=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=make(localSupabaseStatusSecret(cfg)),client=make(cfg.ANON_KEY);
const login=await client.auth.signInWithPassword(fixture.owner);assert.ifError(login.error);
const connection=JSON.parse(sql(`select to_jsonb(c) from grookai_square.connections c where owner_id='${owner}'`));
assert.equal(connection.environment,'sandbox');assert.equal(connection.merchant_id,'removal-local-merchant');
for(const [table,fn,data]of [['controls','square_controls_set_v1',{p_linking:true,p_catalog:true}],['commerce_controls','square_commerce_controls_set_v2',{p_enabled:true}]]){
 const current=JSON.parse(sql('select to_jsonb(c) from grookai_square.'+table+' c'));
 const r=await admin.rpc(fn,{p_expected_revision:current.revision,p_owners:[...new Set([...current.owner_allowlist,owner])],...data});assert.ifError(r.error);
}
const instance=randomUUID(),legacy=randomUUID(),target=randomUUID(),gvvi='GVVI-'+owner.slice(0,8).toUpperCase()+'-990001';
fs.writeFileSync(lab+'/cancel-runtime-intent.json',JSON.stringify({consumed:true,at:new Date().toISOString(),profile,owner,instance,legacy,target,gvvi,connectionId:connection.id,executedSourceSha256,serviceSha256},null,2)+'\n',{flag:'wx'});
sql(`begin;
do $$declare parent uuid;printing uuid;begin
select id into strict parent from public.card_prints order by id offset 80 limit 1;
insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(parent,'normal','GV-PK-REMOVE-CANCELED-NORMAL') returning id into printing;
insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select '${legacy}','${owner}',id,name,gv_id,1 from public.card_prints where id=parent;
insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,condition_label,pricing_mode,asking_price_amount,asking_price_currency)
values('${instance}','${owner}',parent,printing,'${legacy}','${gvvi}','sell','NM','asking',20,'USD');
if grookai_square.offer('${owner}','${instance}') is null then raise exception 'fixture_offer_missing';end if;
end$$;
insert into grookai_square.targets(id,connection_id,owner_id,instance_id,item_id,variation_id) values('${target}','${connection.id}','${owner}','${instance}','cancel-local-item','cancel-local-variation');
commit;`);
const calls=[];let providerWrites=0;
const rpc=async(action,data)=>{calls.push(action);const r=await admin.rpc(action.startsWith('vault_removal_')?'square_vault_removal_service_v1':'square_commerce_service_v2',{p_action:action.startsWith('vault_removal_')?action.slice(14):action,p_data:data});if(r.error)throw Object.assign(Error(r.error.message),{code:r.error.message,databaseCode:r.error.code});return r.data??{recorded:true};};
const fake={inventoryQuantity:async()=>0,changeInventory:async()=>{providerWrites++;throw Error('Never-sent fixture must not publish');},recentOrders:async()=>[],recentRefunds:async()=>[]};
const config={environment:'sandbox',appId:'fixture',appSecret:'fixture',encryptionKey:Buffer.alloc(32,17).toString('base64'),callbackUrl:'https://fixture.invalid/api/square/oauth/callback',linkingEnabled:true,catalogEnabled:true,commerceEnabled:true,artworkEnabled:false};
const catalog=new SquareCatalogService({rpc,config,clientFactory:()=>fake}),commerce=new SquareCommerceService({catalog,rpc,config});
await catalog.withConnection(owner,connection.id,async({context})=>{
 const state=await rpc('allocation',{...context,targetId:target});assert.ok(state.offer);
 const payload={idempotency_key:randomUUID(),ignore_unchanged_counts:true,changes:[{type:'PHYSICAL_COUNT',physical_count:{catalog_object_id:'cancel-local-variation',location_id:connection.location_id,state:'IN_STOCK',quantity:'1',occurred_at:new Date().toISOString()}}]};
 await rpc('stock_prepare',{...context,targetId:target,kind:'allocate',payload,sourceSnapshot:state.offer});
});
const archive=()=>client.rpc('vault_archive_exact_instance_v1',{p_instance_id:instance});
const first=await archive();assert.equal(first.error?.message,'square_stock_reserved');assert.equal(JSON.parse(first.error.details).instanceId,instance);
const result=await squareAwareVaultArchive({archive,prepare:id=>commerce.prepareVaultRemoval(owner,id)});assert.ifError(result.error);
const state=JSON.parse(sql(`select jsonb_build_object('archived',(select archived_at is not null from public.vault_item_instances where id='${instance}'),'allocation',(select to_jsonb(a) from grookai_square.allocations a where target_id='${target}'),'operation',(select to_jsonb(o) from grookai_square.stock_operations o join grookai_square.allocations a on a.id=o.allocation_id where a.target_id='${target}'),'proofs',(select count(*) from grookai_square.vault_removal_readbacks_v1 where instance_id='${instance}'))`));
assert.equal(state.archived,true);assert.equal(state.allocation.state,'released');assert.equal(state.allocation.release_reason,'never_sent');assert.equal(state.operation.status,'failed');assert.equal(state.operation.kind,'allocate');assert.equal(state.proofs,0);assert.equal(providerWrites,0);assert.ok(calls.includes('stock_cancel_prepared'));assert.equal(calls.includes('vault_removal_attest'),false);
assert.equal(serviceSha256,sha(fs.readFileSync(root+'/backend/square/commerce_service_v2.mjs')));assert.equal(executedSourceSha256,sha(fs.readFileSync(new URL(import.meta.url))));
const proof={pass:true,at:new Date().toISOString(),profile,actualAuthSdk:true,case:'never-sent prepared allocation is canceled and the same owner archive succeeds without a second user action',providerWrites,withdrawalAttestationsInvented:0,archiveSucceeded:true,executedSourceSha256,serviceSha256,candidateSha256:sha(fs.readFileSync(root+'/supabase/migrations/20261114080000_square_aware_vault_removal_v1.sql')),productionWrites:0};
fs.writeFileSync(lab+'/cancel-runtime-proof.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
