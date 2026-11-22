// Retained, unlinked local Auth/PostgREST qualification. Never a production runner.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {SquareCatalogService} from '../../backend/square/service_v1.mjs';
import {SquareCommerceService} from '../../backend/square/commerce_service_v2.mjs';
import {squareAwareVaultArchive} from '../../backend/square/vault_archive_recovery_v1.mjs';
const [profile,phase]=process.argv.slice(2);
assert.ok(['fresh','retained'].includes(profile));assert.ok(['seed','reseed','resume-seed','upgrade','test'].includes(phase));
const root='C:/grookai_vault_remove_fix_20261114',out='C:/grookai_vault_operator_artifacts/card_remove_repair_20261114';
const lab=out+'/'+(profile==='fresh'?'fresh-v2-496':'retained-v2-495'),project=profile==='fresh'?'square-remove-fresh-v2-496-20261114':'square-remove-ret-v2-495-20261114';
const sha=x=>createHash('sha256').update(x).digest('hex');
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,maxBuffer:16_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(cfg.API_URL,profile==='fresh'?'http://127.0.0.1:64341':'http://127.0.0.1:64441');
const make=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=make(localSupabaseStatusSecret(cfg)),publicKey=cfg.ANON_KEY;
const privatePath=lab+'/removal-fixture-v4.private.json';
const executedSourceSha256=sha(fs.readFileSync(new URL(import.meta.url))),serviceSha256=sha(fs.readFileSync(root+'/backend/square/commerce_service_v2.mjs'));
const save=(name,value)=>fs.writeFileSync(lab+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const protectedState=()=>sql(`select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from public.vault_item_instances v),'anchors',(select jsonb_agg(to_jsonb(v) order by id) from public.vault_items v),'users',(select jsonb_agg(to_jsonb(v) order by id) from auth.users v),'connections',(select jsonb_agg(to_jsonb(v) order by id) from grookai_square.connections v),'targets',(select jsonb_agg(to_jsonb(v) order by id) from grookai_square.targets v),'allocations',(select jsonb_agg(to_jsonb(v) order by id) from grookai_square.allocations v))`);
if(['seed','reseed','resume-seed'].includes(phase)){
 assert.equal(fs.existsSync(privatePath),phase==='resume-seed','Do not recreate retained fixture users');
 assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-proof.json')).pass,true);
 const fixture=phase==='resume-seed'?JSON.parse(fs.readFileSync(privatePath)):{localOnly:true,provider:'deterministic transport; real local SQL/Auth',owner:null,other:null};
 const persist=()=>fs.writeFileSync(privatePath,JSON.stringify(fixture,null,2),{mode:0o600});persist();
 for(const role of phase==='resume-seed'?[]:['owner','other']){
  const email='remove-'+role+'-'+randomUUID()+'@fixture.invalid',password='Local-'+randomUUID()+'!';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
  fixture[role]={id:created.data.user.id,email,password};persist();
 }
 const owner=fixture.owner.id,other=fixture.other.id;
 assert.equal(sql(`select count(*) from public.vault_item_instances where user_id in ('${owner}','${other}')`),'0');
 sql(`begin;
 create schema if not exists square_removal_fixture;
 revoke all on schema square_removal_fixture from public,anon,authenticated,service_role;
 create table if not exists square_removal_fixture.copies(case_no integer,ordinal integer,owner_id uuid,instance_id uuid,parent_id uuid,legacy_id uuid,gvvi text);
 do $$declare actor uuid; parent uuid; printing uuid; legacy uuid; copy uuid; n integer:=0;begin
 foreach actor in array array['${owner}'::uuid,'${other}'::uuid] loop
 insert into public.user_entitlements(user_id,tier,role,features) values(actor,'vendor','vendor','{"vendor_tools":true}');
 insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled)
 values(actor,'remove-fixture-'||left(actor::text,8),'Local removal fixture',true,true)
 on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true;
 for j in 0..case when actor='${owner}'::uuid then 14 else 0 end loop
 select id into strict parent from public.card_prints order by id offset (160+j+case when actor='${owner}'::uuid then 0 else 20 end) limit 1;
 insert into public.card_printings(card_print_id,finish_key,printing_gv_id) values(parent,'normal','GV-PK-REMOVE-'||upper(left(actor::text,8))||'-'||j) returning id into printing;
 legacy:=gen_random_uuid();
 insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select legacy,actor,id,name,gv_id,3 from public.card_prints where id=parent;
 for i in 1..3 loop
 n:=n+1;copy:=gen_random_uuid();
 insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,condition_label,pricing_mode,asking_price_amount,asking_price_currency)
 values(copy,actor,parent,printing,legacy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(n::text,6,'0'),'sell','NM','asking',20,'USD');
 insert into square_removal_fixture.copies values(j,i,actor,copy,parent,legacy,'GVVI-'||upper(left(actor::text,8))||'-'||lpad(n::text,6,'0'));
 if grookai_square.offer(actor,copy) is null then raise exception 'fixture_public_offer_missing';end if;
 end loop;end loop;end loop;end$$;
 commit;`);
 fixture.copies=JSON.parse(sql(`select json_agg(v order by owner_id,case_no,ordinal) from square_removal_fixture.copies v where owner_id in ('${owner}','${other}')`));persist();
 save(phase==='seed'?'runtime-v4-initial-state.json':'runtime-v4-reseed-state.json',{sha256:sha(protectedState()),ledger:Number(sql('select count(*) from supabase_migrations.schema_migrations'))});
 console.log(JSON.stringify({pass:true,phase,profile,users:2,copies:fixture.copies.length,productionWrites:0}));
}else if(phase==='upgrade'){
 assert.equal(profile,'retained');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'495');
 const before=JSON.parse(fs.readFileSync(lab+'/runtime-v4-initial-state.json'));assert.equal(sha(protectedState()),before.sha256);
 const candidate='20261114080000_square_aware_vault_removal_v1.sql';
 fs.copyFileSync(root+'/supabase/migrations/'+candidate,lab+'/supabase/migrations/'+candidate,fs.constants.COPYFILE_EXCL);
 save('upgrade-intent.json',{consumed:true,candidateSha256:sha(fs.readFileSync(root+'/supabase/migrations/'+candidate)),before});
 for(const label of ['upgrade','upgrade-noop']){
  const log=fs.openSync(lab+'/'+label+'.log','wx');try{execFileSync('supabase',['db','push','--local','--yes','--workdir',lab,'--network-id',project],{stdio:['ignore',log,log],windowsHide:true,timeout:180000});}finally{fs.closeSync(log);}
 }
 assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'496');assert.equal(sha(protectedState()),before.sha256);
 save('upgrade-proof.json',{pass:true,retained495To496:true,protectedStateUnchanged:true,beforeSha256:before.sha256,candidateSha256:sha(fs.readFileSync(root+'/supabase/migrations/'+candidate)),officialCliApply:true,noop:true,productionWrites:0});
 console.log(JSON.stringify({pass:true,phase,profile,productionWrites:0}));
}else{
 assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'496');
 assert.equal(fs.existsSync(lab+'/removal-runtime-v2-proof.json'),false);
 const fixture=JSON.parse(fs.readFileSync(privatePath));
 const clients={};for(const role of ['owner','other']){clients[role]=make(publicKey);const r=await clients[role].auth.signInWithPassword(fixture[role]);assert.ifError(r.error);}
 const owner=fixture.owner.id,other=fixture.other.id,cases=n=>fixture.copies.filter(r=>r.owner_id===owner&&r.case_no===n);
 const rpc=async(action,data)=>{
  const r=await admin.rpc(action.startsWith('vault_removal_')?'square_vault_removal_service_v1':'square_commerce_service_v2',{
   p_action:action.startsWith('vault_removal_')?action.slice(14):action,p_data:data});
  if(r.error)throw Object.assign(Error(r.error.message),{code:r.error.message,databaseCode:r.error.code});return r.data??{recorded:true};
 };
 const counts=new Map(),providerCalls=[],merchant='removal-local-'+owner.slice(0,8);
 const fake={authorizationUrl:({state})=>'https://connect.squareupsandbox.com/oauth2/authorize?state='+state,
  obtainToken:async()=>({merchantId:merchant,accessToken:'local-only-access',refreshToken:'local-only-refresh',expiresAt:'2030-01-01T00:00:00Z'}),
  merchant:async id=>({id}),locations:async()=>[{id:'removal-local-location',currency:'USD'}],
  inventoryQuantity:async id=>{providerCalls.push(['read',id]);return counts.get(id)??0;},
  changeInventory:async body=>{providerCalls.push(['write',body.idempotency_key]);for(const c of body.changes)counts.set(c.physical_count.catalog_object_id,Number(c.physical_count.quantity));},
  recentOrders:async()=>[],recentRefunds:async()=>[]};
 const config={environment:'sandbox',appId:'fixture',appSecret:'fixture',encryptionKey:Buffer.alloc(32,17).toString('base64'),callbackUrl:'https://fixture.invalid/api/square/oauth/callback',linkingEnabled:true,catalogEnabled:true,commerceEnabled:true,artworkEnabled:false};
 const catalog=new SquareCatalogService({rpc,config,clientFactory:()=>fake}),commerce=new SquareCommerceService({catalog,rpc,config});
 let r=await admin.rpc('square_controls_set_v1',{p_expected_revision:Number(sql('select revision from grookai_square.controls')),p_linking:true,p_catalog:true,p_owners:[owner]});assert.ifError(r.error);
 r=await admin.rpc('square_commerce_controls_set_v2',{p_expected_revision:Number(sql('select revision from grookai_square.commerce_controls')),p_enabled:true,p_owners:[owner]});assert.ifError(r.error);
 const started=await catalog.start(owner),launched=await catalog.launch(new URL(started.launchUrl).searchParams.get('capability'));
 const connected=await catalog.callback({state:new URL(launched.authorizationUrl).searchParams.get('state'),browserNonce:launched.browserNonce,code:'local-fixture-code'});
 const connection=connected.connectionId;
 await catalog.configure(owner,connection,{locationId:'removal-local-location',autoSync:true});
 await commerce.preferences(owner,connection,{autoEnroll:true,sellOnSquare:true,confirmed:true});
 sql(`insert into grookai_square.targets(connection_id,owner_id,instance_id,item_id,variation_id)
 select '${connection}','${owner}',instance_id,'local-item-'||instance_id,'local-variation-'||instance_id from square_removal_fixture.copies where owner_id='${owner}' and case_no>0
 `);
 fixture.targets=JSON.parse(sql(`select json_agg(t) from grookai_square.targets t where connection_id='${connection}'`));
 const target=copy=>fixture.targets.find(t=>t.instance_id===copy.instance_id);
 const check=[];const test=async(name,run)=>{await run();check.push(name);console.log('PASS '+name);};
 const direct=(copy,client=clients.owner)=>client.rpc('vault_archive_exact_instance_v1',{p_instance_id:copy.instance_id});
 const archive=async(callback)=>squareAwareVaultArchive({archive:callback,prepare:id=>commerce.prepareVaultRemoval(owner,id)});
 const allocate=async copies=>{for(const c of copies)assert.equal((await commerce.stock(owner,connection,target(c).id)).status,'ready');};
 const archived=c=>sql(`select archived_at is not null from public.vault_item_instances where id='${c.instance_id}'`)==='t';
 const blocked=async c=>{const result=await direct(c);assert.equal(result.error?.message,'square_stock_reserved');assert.equal(result.error.code,'55000');assert.equal(JSON.parse(result.error.details).instanceId,c.instance_id);assert.equal(archived(c),false);};
 await test('ordinary owner copy archives without provider transport',async()=>{const n=providerCalls.length;r=await direct(cases(0)[0]);assert.ifError(r.error);assert.equal(providerCalls.length,n);});
 await test('real SDK structured rollback then governed withdrawal and exact archive',async()=>{const c=cases(1)[0];await allocate([c]);await blocked(c);r=await archive(()=>direct(c));assert.ifError(r.error);assert.equal(archived(c),true);assert.equal(counts.get(target(c).variation_id),0);assert.equal(sql(`select state from grookai_square.allocations where instance_id='${c.instance_id}'`),'released');assert.equal(archived(cases(1)[1]),false);});
 await test('Remove all remains atomic across three allocated copies',async()=>{const cs=cases(2);await allocate(cs);const call=()=>clients.owner.rpc('vault_archive_all_instances_v1',{p_vault_item_id:cs[0].legacy_id,p_card_print_id:cs[0].parent_id});r=await call();assert.ok(r.error);assert.ok(cs.every(c=>!archived(c)));r=await archive(call);assert.ifError(r.error);assert.ok(cs.every(archived));});
 await test('selected parents remain atomic and prepare only encountered claims',async()=>{const cs=[...cases(3),...cases(4)];await allocate(cs);const call=()=>clients.owner.rpc('vault_archive_selected_cards_v1',{p_card_print_ids:[cs[0].parent_id,cs[3].parent_id]});r=await call();assert.ok(r.error);assert.ok(cs.every(c=>!archived(c)));r=await archive(call);assert.ifError(r.error);assert.ok(cs.every(archived));assert.equal(archived(cases(5)[0]),false);});
 await test('other owner and anonymous callers cannot mint archive proof',async()=>{const c=cases(5)[0];await allocate([c]);r=await direct(c,clients.other);assert.ok(r.error);for(const client of [clients.owner,clients.other,make(publicKey)]){r=await client.rpc('square_vault_removal_service_v1',{p_action:'attest',p_data:{ownerId:owner,instanceId:c.instance_id}});assert.ok(r.error);}await assert.rejects(commerce.prepareVaultRemoval(other,c.instance_id),/square_copy_not_owned/);assert.equal(archived(c),false);});
 await test('changed asking price invalidates proof and requires fresh preparation',async()=>{const c=cases(6)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);sql(`update public.vault_item_instances set asking_price_amount=21 where id='${c.instance_id}'`);await blocked(c);await commerce.prepareVaultRemoval(owner,c.instance_id);r=await direct(c);assert.ifError(r.error);});
 await test('expired readback cannot release stock claim',async()=>{const c=cases(7)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);sql(`update grookai_square.vault_removal_readbacks_v1 set checked_at=clock_timestamp()-interval '10 minutes',expires_at=clock_timestamp()-interval '5 minutes' where instance_id='${c.instance_id}'`);await blocked(c);});
 await test('mapped pending checkout blocks preparation; later cancellation clears it',async()=>{const c=cases(8)[0];await allocate([c]);const observe=state=>catalog.withConnection(owner,connection,({context})=>rpc('order_observe',{...context,evidence:{id:'local-pending',locationId:'removal-local-location',currency:'USD',state,lines:[{variationId:target(c).variation_id}]},evidenceHash:sha(state)}));await observe('pending');await assert.rejects(commerce.prepareVaultRemoval(owner,c.instance_id),/square_removal_unconfirmed/);await blocked(c);await observe('canceled');await commerce.prepareVaultRemoval(owner,c.instance_id);r=await direct(c);assert.ifError(r.error);});
 await test('live lease blocks archive and retry succeeds after lease is released',async()=>{const c=cases(9)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);await catalog.withConnection(owner,connection,async()=>{r=await direct(c);assert.equal(r.error?.message,'square_removal_busy');assert.equal(archived(c),false);});r=await direct(c);assert.ifError(r.error);});
 await test('failed durable worker run invalidates otherwise fresh readback',async()=>{const c=cases(11)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);sql(`update grookai_square.worker_runs set status='failed' where id=(select run_id from grookai_square.vault_removal_readbacks_v1 where instance_id='${c.instance_id}' order by checked_at desc limit 1)`);await blocked(c);});
 await test('new webhook signal after preparation blocks archive until reconciled',async()=>{const c=cases(12)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);sql(`insert into grookai_square.signals(environment,merchant_id,event_id,resource_type,resource_id,body_hash) values('sandbox','${merchant}','late-local-signal-${owner}','order','local-late-order','${sha('local-late')}')`);await blocked(c);sql(`update grookai_square.signals set processed_at=clock_timestamp() where event_id='late-local-signal-${owner}'`);r=await direct(c);assert.ifError(r.error);});
 await test('stale reconcile cursor fails closed even with a fresh proof',async()=>{const c=cases(13)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);const cursor=sql(`select reconcile_cursor from grookai_square.connections where id='${connection}'`);sql(`update grookai_square.connections set reconcile_cursor=clock_timestamp()-interval '3 minutes' where id='${connection}'`);await blocked(c);sql(`update grookai_square.connections set reconcile_cursor='${cursor}' where id='${connection}'`);r=await direct(c);assert.ifError(r.error);});
 await test('opposite lock order returns busy without deadlock or partial archive',async()=>{const c=cases(14)[0];await allocate([c]);await commerce.prepareVaultRemoval(owner,c.instance_id);
  const lock=spawn('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const done=new Promise((resolve,reject)=>{lock.once('error',reject);lock.once('exit',code=>code===0?resolve():reject(Error('local lock fixture failed')));});
  const ready=new Promise(resolve=>lock.stdout.on('data',data=>{if(data.toString().includes('LOCKED'))resolve();}));
  lock.stdin.end(`begin;select id from grookai_square.allocations where instance_id='${c.instance_id}' for update;\n\\echo LOCKED\nselect pg_sleep(12);rollback;`);
  await ready;const start=Date.now();r=await direct(c);assert.equal(r.error?.message,'square_removal_busy');assert.ok(Date.now()-start<10000);assert.equal(archived(c),false);await done;r=await direct(c);assert.ifError(r.error);
 });
 await test('verified local paid order still records exactly one sale and disposition',async()=>{
  const c=cases(14)[1];await allocate([c]);const now=new Date().toISOString(),money={amount:2000,currency:'USD'};
  const order={id:'local-paid-order',location_id:'removal-local-location',state:'COMPLETED',version:1,total_money:money,
   line_items:[{uid:'local-paid-line',catalog_object_id:target(c).variation_id,quantity:'1',total_money:money}],
   tenders:[{payment_id:'local-paid-payment',amount_money:money}]};
  fake.payment=async()=>({id:'local-paid-payment',order_id:order.id,location_id:order.location_id,status:'COMPLETED',created_at:now,total_money:money});
  fake.recentOrders=async()=>[order];await commerce.reconcile(owner,connection);await commerce.reconcile(owner,connection);fake.recentOrders=async()=>[];
  assert.equal(archived(c),true);assert.equal(sql(`select state from grookai_square.allocations where instance_id='${c.instance_id}'`),'sold');
  assert.equal(sql(`select count(*) from grookai_square.sales where connection_id='${connection}' and order_id='local-paid-order'`),'1');
  assert.equal(sql(`select count(*) from public.vault_item_instance_dispositions where vault_item_instance_id='${c.instance_id}'`),'1');
  assert.equal(sql(`select count(*) from grookai_square.vault_removal_archives_v1 where instance_id='${c.instance_id}'`),'0');
 });
 // The unresolved operation deliberately quarantines this connection; run last.
 await test('unconfirmed provider quantity cannot mint removal evidence',async()=>{const c=cases(10)[0];await allocate([c]);await commerce.withdraw(owner,connection,target(c).id);counts.set(target(c).variation_id,1);const original=fake.changeInventory;fake.changeInventory=async()=>{};await assert.rejects(commerce.prepareVaultRemoval(owner,c.instance_id));fake.changeInventory=original;await blocked(c);});
 const candidateSha256=sha(fs.readFileSync(root+'/supabase/migrations/20261114080000_square_aware_vault_removal_v1.sql'));
 assert.equal(candidateSha256,sha(fs.readFileSync(lab+'/supabase/migrations/20261114080000_square_aware_vault_removal_v1.sql')),'Runtime proof must match actual applied SQL');
 assert.equal(executedSourceSha256,sha(fs.readFileSync(new URL(import.meta.url))),'Executed runtime source changed');
 assert.equal(serviceSha256,sha(fs.readFileSync(root+'/backend/square/commerce_service_v2.mjs')),'Executed backend changed');
 save('removal-runtime-v2-proof.json',{pass:true,profile,candidateSha256,executedSourceSha256,serviceSha256,checks:check,actualAuthUsers:2,actualSdkRpc:true,providerTransport:'deterministic local only',realSquareRequests:0,productionWrites:0});
 console.log(JSON.stringify({pass:true,profile,checks:check.length,productionWrites:0}));
}
