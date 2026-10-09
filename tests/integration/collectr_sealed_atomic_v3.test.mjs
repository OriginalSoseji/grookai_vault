// Explicit opt-in, isolated internal-network lab, rollback-only fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import pg from 'pg';
import {validateSealedCatalogEvidence} from '../../supabase/functions/vault-import-collection-v2/sealed_identity.ts';
const hash=s=>createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');
test('mixed import database transaction, reuse, recovery, privacy, and rollback', {skip:process.env.GV_COLLECTR_SEALED_SQL_PROOF!=='1'&&process.env.GV_COLLECTR_COST_SQL_PROOF!=='1'},async()=>{
 const precision=process.env.GV_COLLECTR_COST_SQL_PROOF==='1';
 assert.ok(!precision||process.env.GV_COLLECTR_SEALED_SQL_PROOF!=='1','Choose one isolated proof');
 const root=path.resolve(import.meta.dirname,'../..'),out='C:/grookai_vault_operator_artifacts/'+(precision?'collectr_cost_precision_20261008':'collectr_sealed_save_20261005');
 assert.equal(root.replaceAll('\\','/').toLowerCase(),'c:/gv_collectr_adventure_20261001');
 const project=precision?'collectr-cost-full-430-v1-20261008':'collectr-sealed-full-428-v3-20261005',container='supabase_db_'+project;
 const inspect=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
 assert.equal(inspect.State.Running,true);assert.deepEqual(Object.keys(inspect.NetworkSettings.Networks),[project]);
 const network=JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(network.Internal,true);
 assert.equal(inspect.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
 if(precision)assert.equal(network.IPAM.Config[0].Subnet,'10.245.201.0/24');
 const replay=JSON.parse(fs.readFileSync(precision?out+'/full-430-v1/replay-result.json':out+'/full-428-v3/replay-result.json'));assert.equal(replay.status,'passed');
 const db=new pg.Client({host:'127.0.0.1',port:precision?33700:58720,user:'postgres',password:'postgres',database:'postgres',statement_timeout:30000});
 const checks=[];await db.connect();
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const scalar=async(sql,args=[])=>(await q(sql,args))[0]?.value;
 const check=async(name,fn)=>{await fn();checks.push(name);};
 const retained=()=>scalar(`select jsonb_build_object('copies',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from vault_item_instances t),
  'groups',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id,source_sha256,group_key)::text,'')) from vault_collection_import_groups_v2 t),
  'receipts',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id,request_id)::text,'')) from vault_collection_import_receipts_v3 t),
  'writer',pg_get_functiondef('public.admin_import_vault_collection_v3(uuid,uuid,text,text,jsonb,jsonb,jsonb)'::regprocedure)) value`);
 const retainedBefore=await retained();
 const user=randomUUID(),visitor=randomUUID(),family=randomUUID(),variant=randomUUID(),candidate=randomUUID(),review=randomUUID(),mapping=randomUUID(),release=randomUUID(),card=randomUUID(),printing=randomUUID(),set=randomUUID(),request=randomUUID();
 const source=[{'Product Name':'Synthetic card',Set:'Example','Card Number':'1',Quantity:'1',Grade:'Ungraded'},
 {'Product Name':'Example Booster Box',Set:'Example','Card Number':'',Quantity:'2',Grade:'Ungraded','Card Condition':'Near Mint','Average Cost Paid':'0','Portfolio Name':'Private'},
 {'Product Name':'Review only','Card Number':'',Grade:'PSA 10'}];
 const cardTarget={sourceIndices:[0],cardId:card,gvId:'GV-PK-SEALED-'+card,cardPrintingId:printing,finishKey:'normal',desiredQuantity:1,condition:'NM',acquisitionCost:2,createdAt:'2026-01-01T00:00:00Z',createdAtDateOnly:false,notes:'original card'};
 const sealedTarget={objectKind:'sealed',sourceIndices:[1],sealedVariantId:variant,identityFingerprint:hash(variant),language:'en',releaseId:release,mappingId:mapping,desiredQuantity:2,sealState:'unknown',packageCondition:'unknown',acquisitionCost:0,acquisitionCurrency:'USD',createdAt:'2026-02-01T00:00:00Z',createdAtDateOnly:false,notes:'sealed notes'};
 const call=(req=request,rows=source,cards=[cardTarget],sealed=[sealedTarget],owner=user)=>scalar('select public.admin_import_vault_collection_v3($1,$2,$3,$4,$5,$6,$7) value',[owner,req,hash({rows,cards,sealed}),hash(rows),JSON.stringify(rows),JSON.stringify(cards),JSON.stringify(sealed)]);
 const state=()=>scalar(`select jsonb_build_object('copies',(select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]') from vault_item_instances i where user_id=$1),
  'groups',(select coalesce(jsonb_agg(to_jsonb(g) order by group_key),'[]') from vault_collection_import_groups_v2 g where user_id=$1),
  'docs',(select coalesce(jsonb_agg(to_jsonb(d) order by source_sha256),'[]') from vault_collection_import_documents_v2 d where user_id=$1),
  'cardReceipts',(select coalesce(jsonb_agg(to_jsonb(r) order by request_id),'[]') from vault_collection_import_receipts_v2 r where user_id=$1),
  'journal',(select coalesce(jsonb_agg(to_jsonb(j) order by request_id),'[]') from vault_sealed_requests_v1 j where user_id=$1),
  'owner',(select to_jsonb(o) from vault_owners o where user_id=$1)) value`,[user]);
 try{
  assert.equal(await scalar("select current_setting('max_worker_processes') value"),'0');
  assert.equal(await scalar('select count(*)::int value from supabase_migrations.schema_migrations'),precision?430:428);
  await q('begin');
  // Candidate functions may evolve after the first replay. Changes remain within
  // this transaction and rollback; a fresh final replay remains a separate gate.
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/'+(precision?'20261008100000_collectr_sealed_cost_precision_v1.sql':'20261005080000_collectr_sealed_import_v3.sql')),'utf8');
  await q(migration.replace(/\bbegin;\s*/,'').replace(/commit;\s*$/,''));
  await q("insert into auth.users(id,email) values($1::uuid,$1::text||'@sealed-fixture.invalid'),($2::uuid,$2::text||'@sealed-fixture.invalid')",[user,visitor]);
  await q('select ensure_vault_owner_v1($1)',[user]);
  await q("insert into sets(id,code,name,game) values($1::uuid,$1::text,'Example','pokemon')",[set]);
  await q("insert into card_prints(id,set_id,name,number,gv_id,game_id) values($1,$2,'Synthetic card','1',$3,(select id from games where code='pokemon'))",[card,set,cardTarget.gvId]);
  await q("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'normal')",[printing,card]);
  await q("insert into sealed_product_families(id,game_key,family_key,canonical_name,manufacturer_name,identity_contract_version,identity_fingerprint) values($1::uuid,'pokemon',$1::text,'Example Booster Box','Fixture','fixture',$2)",[family,hash(family)]);
  await q("insert into sealed_product_variants(id,family_id,variant_key,canonical_name,package_form,language_code,identity_contract_version,identity_fingerprint) values($1,$2,'fixture','Example Booster Box','booster_box','en','fixture',$3)",[variant,family,hash(variant)]);
  await q("insert into tcgcsv_source_categories(category_id,name,raw_payload,payload_hash) values(2147483000,'Fixture','{}',$1)",[hash('category')]);
  await q("insert into tcgcsv_source_groups(group_id,category_id,name,raw_payload,payload_hash) values(2147483001,2147483000,'Example','{}',$1)",[hash('group')]);
  await q(`insert into sealed_product_candidates(id,source_provider,source_category_id,source_group_id,source_product_id,source_product_name,source_payload_hash,classifier_version,classification,confidence)
   values($1,'tcgplayer',2147483000,2147483001,2147483002,'Example Booster Box',$2,'fixture','sealed_candidate',1)`,[candidate,hash(candidate)]);
  await q("insert into sealed_product_candidate_reviews(id,candidate_id,decision,promotion_authorized,reviewed_by,review_contract_version) values($1,$2,'confirmed_sealed',true,$3,'fixture')",[review,candidate,user]);
  await q(`insert into sealed_product_source_mappings(id,variant_id,candidate_id,review_id,source_provider,source_category_id,source_group_id,source_product_id,source_product_name,source_payload_hash,classifier_version,mapping_contract_version,mapping_fingerprint)
   values($1,$2,$3,$4,'tcgplayer',2147483000,2147483001,2147483002,'Example Booster Box',$5,'fixture','fixture',$6)`,[mapping,variant,candidate,review,hash(candidate),hash(mapping)]);
  await q(`insert into sealed_product_releases(id,release_key,game_key,source_audit_producer_sha,source_sample_logical_hash,release_contract_version,manifest_fingerprint,expected_member_count,created_by)
   values($1::uuid,$1::text,'pokemon',$2,$3,'fixture',$3,1,$4)`,[release,'a'.repeat(40),hash(release),user]);
  const qualification=randomUUID();
  await q(`insert into sealed_product_pricing_lane_qualifications(id,variant_id,source_mapping_id,source_price_row_identity,source_subtype_name_normalized,observed_on,currency,qualification_status,source_observation_fingerprint,qualification_contract_version)
   values($1,$2,$3,'fixture','normal',current_date,'USD','qualified_exact',$4,'fixture')`,[qualification,variant,mapping,hash(qualification)]);
  await q('insert into sealed_product_release_members(release_id,variant_id,source_mapping_id,member_fingerprint,qualification_id) values($1,$2,$3,$4,$5)',[release,variant,mapping,hash('member'),qualification]);
  await q('select sealed_product_freeze_release_v1($1,$2,$3)',[release,hash(release),user]);
  await q('select sealed_product_set_active_release_v1($1,null,$2)',[release,user]);
  await q("insert into sealed_product_game_release_controls(game_key,release_status,release_version) values('pokemon','public','fixture') on conflict(game_key) do update set release_status='public'");
  await q("update catalog_game_release_controls set release_status='public' where game_code='pokemon'");
  await q('update sealed_ownership_controls_v1 set enabled=true where singleton');
  // Same product with incompatible metadata must never be reused.
  await q(`insert into vault_item_instances(user_id,gv_vi_id,sealed_product_variant_id,seal_state,package_condition,acquisition_cost,acquisition_currency,created_at,notes,name,intent)
   select user_id,generate_gv_vi_id_v1(owner_code,next_instance_index),$2,'unknown','unknown',0,'USD','2026-02-01', 'sealed notes','Example Booster Box','hold' from vault_owners where user_id=$1`,[user,variant]);
  await q('update vault_owners set next_instance_index=next_instance_index+1 where user_id=$1',[user]);
  const existing=await scalar('select to_jsonb(i) value from vault_item_instances i where user_id=$1',[user]);
  await check('authenticated catalog snapshot is complete and bound',async()=>{
   await q("select set_config('request.jwt.claim.sub',$1,true)",[user]);await q('set local role authenticated');
   const catalog=await scalar('select get_collection_import_sealed_catalog_v3() value');validateSealedCatalogEvidence(catalog);assert.equal(catalog.variants.length,1);await q('reset role');
  });
  let saved;
  await check('mixed save reuses sealed copy and adds only one card and one sealed copy',async()=>{
   saved=await call();assert.equal(saved.success,true,JSON.stringify(saved));assert.equal(saved.importedCards,1);assert.equal(saved.importedSealed,1);assert.equal(saved.reviewRows,1);
   assert.ok(saved.sealedTargets[0].instanceIds.includes(existing.id));assert.equal((await state()).copies.length,3);
   assert.deepEqual(await scalar('select to_jsonb(i) value from vault_item_instances i where id=$1',[existing.id]),existing);
   assert.deepEqual(await scalar('select source_rows value from vault_collection_import_documents_v2 where user_id=$1',[user]),source);
  });
  const stable=await state();
  await check('lost response returns original receipt with no writes',async()=>{assert.deepEqual(await call(),saved);assert.deepEqual(await state(),stable);});
  await check('new request same file returns same copy IDs and adds zero',async()=>{
   const result=await call(randomUUID());assert.equal(result.importedCards,0);assert.equal(result.importedSealed,0);assert.deepEqual(result.targets,saved.targets);assert.deepEqual(result.sealedTargets,saved.sealedTargets);
   assert.deepEqual((await state()).copies,stable.copies);
  });
  await check('reusing request UUID for changed payload conflicts',async()=>assert.equal((await call(request,source,[],[])).error,'import_request_conflict'));
  await check('an existing V2 request UUID cannot be adopted by V3',async()=>{
   const req=randomUUID();const prior=await scalar('select admin_import_vault_collection_v2($1,$2,$3,$4,$5) value',[user,req,hash(source),JSON.stringify(source),JSON.stringify([cardTarget])]);
   assert.equal(prior.success,true);const before=await state();assert.equal((await call(req)).error,'import_request_conflict');assert.deepEqual(await state(),before);
  });
  const failure=async(name,mutate)=>check(name,async()=>{
   const before=await state(),req=randomUUID();const [rows,cards,sealed]=mutate();
   const result=await call(req,rows,cards,sealed);assert.equal(result.success,false);assert.deepEqual(await state(),before);
   assert.equal(await scalar('select status value from vault_collection_import_receipts_v3 where user_id=$1 and request_id=$2',[user,req]),'failed');
  });
  const fresh=()=>source.map(r=>({...r,Attempt:randomUUID()}));
  await failure('late wrong sealed identity rolls back cards, documents, groups and V2 receipts',()=>[fresh(),[{...cardTarget,notes:'must rollback'}],[{...sealedTarget,identityFingerprint:'f'.repeat(64)}]]);
  await failure('stale release is rejected atomically',()=>[fresh(),[cardTarget],[{...sealedTarget,releaseId:randomUUID()}]]);
  await failure('stale mapping is rejected atomically',()=>[fresh(),[cardTarget],[{...sealedTarget,mappingId:randomUUID()}]]);
  await failure('overlapping card and sealed source indices reject',()=>[fresh(),[cardTarget],[{...sealedTarget,sourceIndices:[0]}]]);
  await failure('source grade cannot become a sealed copy',()=>{const s=fresh();s[1].Grade='PSA 10';return[s,[cardTarget],[sealedTarget]];});
  await failure('numbered source cannot become a sealed copy',()=>{const s=fresh();s[1]['Card Number']='12';return[s,[cardTarget],[sealedTarget]];});
  await failure('changed existing source target cannot be rebound',()=>[source,[cardTarget],[{...sealedTarget,notes:'different'}]]);
  await q('update sealed_ownership_controls_v1 set enabled=false,canary_enabled=true where singleton');
  await failure('broad disabled/canary-only mode denies new sealed import and rolls back cards',()=>[fresh(),[cardTarget],[sealedTarget]]);
  await check('previous group recovery survives disabled rollout and archive',async()=>{
   await q("select vault_dispose_sealed_copy_v1($1,$2,'remove')",[saved.sealedTargets[0].instanceIds[0],randomUUID()]);
   const result=await call(randomUUID());assert.equal(result.importedSealed,0);assert.deepEqual(result.sealedTargets,saved.sealedTargets);
  });
  await q('update sealed_ownership_controls_v1 set enabled=true where singleton');
  await q("update sealed_product_game_release_controls set release_status='hidden' where game_key='pokemon'");
  await failure('hidden game fails after card creation and leaves no partial import',()=>[fresh(),[{...cardTarget,notes:'rollback hidden'}],[sealedTarget]]);
  await q("update sealed_product_game_release_controls set release_status='public' where game_key='pokemon'");
  await check('signed-in sealed visibility works for the service writer without owner impersonation',async()=>{
   await q("update sealed_product_game_release_controls set release_status='signed_in' where game_key='pokemon'");
   await q("select set_config('request.jwt.claim.role','service_role',true)");await q('set local role service_role');
   const result=await call(randomUUID(),fresh(),[],[sealedTarget]);assert.equal(result.success,true);
   await q('reset role');await q("select set_config('request.jwt.claim.role','',true)");
   await q("update sealed_product_game_release_controls set release_status='public' where game_key='pokemon'");
  });
  await check('vault-paused failure stays specific and rolls back the mixed request',async()=>{
   await q("create function pg_temp.pause_import_fixture() returns trigger language plpgsql as $$begin raise exception 'fixture_pause' using errcode='GV001';end$$");
   await q('create trigger collectr_pause_fixture before insert on vault_item_instances for each row execute function pg_temp.pause_import_fixture()');
   const before=await state(),result=await call(randomUUID(),fresh(),[{...cardTarget,notes:'new paused copy'}],[sealedTarget]);assert.equal(result.error,'vault_paused');assert.deepEqual(await state(),before);
   await q('drop trigger collectr_pause_fixture on vault_item_instances');
  });
  await check('distinct metadata gets distinct copies',async()=>{
   const result=await call(randomUUID(),fresh(),[],[{...sealedTarget,desiredQuantity:1,notes:'different owner note'}]);assert.equal(result.success,true);assert.equal(result.importedSealed,1);
   assert.ok(!saved.sealedTargets[0].instanceIds.includes(result.sealedTargets[0].instanceIds[0]));
  });
  await check('owner-only readback includes archived mapped copies',async()=>{
   await q('set local role authenticated');await q("select set_config('request.jwt.claim.sub',$1,true)",[user]);
   const copies=await q('select * from get_collection_import_sealed_copies_v3($1,$2)',[hash(source),saved.sealedTargets[0].instanceIds]);assert.equal(copies.length,2);assert.equal(copies.filter(c=>c.archived_at).length,1);
   assert.deepEqual(await scalar('select get_collection_import_receipt_v3($1,$2) value',[request,hash({rows:source,cards:[cardTarget],sealed:[sealedTarget]})]),saved);
   await q("select set_config('request.jwt.claim.sub',$1,true)",[visitor]);
   assert.equal((await q('select * from get_collection_import_sealed_copies_v3($1,$2)',[hash(source),saved.sealedTargets[0].instanceIds])).length,0);
   assert.equal(await scalar('select get_collection_import_receipt_v3($1,$2) value',[request,hash({rows:source,cards:[cardTarget],sealed:[sealedTarget]})]),null);
   await q('reset role');
  });
  await check('direct writer and receipt table access denied to clients',async()=>{
   for(const role of ['anon','authenticated']){
    assert.equal(await scalar("select has_function_privilege($1,'public.admin_import_vault_collection_v3(uuid,uuid,text,text,jsonb,jsonb,jsonb)','execute') value",[role]),false);
    assert.equal(await scalar("select has_table_privilege($1,'vault_collection_import_receipts_v3','select') value",[role]),false);
   }
  });
  await check('existing card copy unchanged across sealed tests',async()=>{
   const copy=stable.copies.find(c=>c.card_print_id===card);assert.deepEqual(await scalar('select to_jsonb(i) value from vault_item_instances i where id=$1',[copy.id]),copy);
  });
  if(precision){
   for(const [raw,cost] of [['9.9950',9.995],['4.9980',4.998],['0.0001',0.0001],['1.2345',1.2345],['9999999999.9899',9999999999.9899],['9999999999.9900',9999999999.99]]){
    await check('exact fractional cost save, owner readback and idempotency: '+raw,async()=>{
     const rows=fresh();rows[1]['Average Cost Paid']=raw;
     const target={...sealedTarget,acquisitionCost:cost},req=randomUUID(),before=(await state()).copies;
     const result=await call(req,rows,[],[target]);assert.equal(result.success,true);assert.equal(result.importedSealed,2);
     const ids=result.sealedTargets[0].instanceIds;
     const stored=await q('select acquisition_cost::text cost, acquisition_cost=$2::numeric exact, acquisition_currency currency from vault_item_instances where id=any($1::uuid[])',[ids,raw]);
     assert.equal(stored.length,2);assert.ok(stored.every(c=>c.exact&&c.currency==='USD'));
     assert.equal(await scalar('select sum(acquisition_cost)=2*$2::numeric value from vault_item_instances where id=any($1::uuid[])',[ids,raw]),true);
     await q("select set_config('request.jwt.claim.sub',$1,true)",[user]);await q('set local role authenticated');
     const readback=await q('select acquisition_cost::text cost from get_collection_import_sealed_copies_v3($1,$2)',[hash(rows),ids]);
     assert.deepEqual(readback.map(r=>r.cost),stored.map(r=>r.cost));await q('reset role');
     assert.deepEqual(await call(req,rows,[],[target]),result);
     const retry=await call(randomUUID(),rows,[],[target]);assert.equal(retry.importedSealed,0);assert.deepEqual(retry.sealedTargets,result.sealedTargets);
     assert.deepEqual((await state()).copies.filter(c=>!ids.includes(c.id)),before);
     assert.deepEqual(await scalar('select source_rows value from vault_collection_import_documents_v2 where user_id=$1 and source_sha256=$2',[user,hash(rows)]),rows);
     const group=await scalar('select target value from vault_collection_import_groups_v2 where user_id=$1 and source_sha256=$2',[user,hash(rows)]);assert.deepEqual(group,target);
    });
   }
   for(const cost of [-1,0.00001,1.23451,9999999999.9901,10000000000,'NaN','Infinity','-Infinity','malformed']){
    await failure('invalid cost rolls back complete mixed save: '+cost,()=>[fresh(),[{...cardTarget,notes:'rollback precision '+cost}],[{...sealedTarget,acquisitionCost:cost}]]);
   }
   await failure('fractional cost cannot lose its currency',()=>[fresh(),[cardTarget],[{...sealedTarget,acquisitionCost:9.995,acquisitionCurrency:null}]]);
  }
  await q('rollback');assert.equal(await scalar('select count(*)::int value from auth.users where id=any($1::uuid[])',[[user,visitor]]),0);
  assert.deepEqual(await retained(),retainedBefore,'Retained lab data and schema must survive rollback unchanged');
  const receipt={status:'passed',at:new Date().toISOString(),checks,migrationSha256:hash(migration),productionWrites:0,allFixturesRolledBack:true,retainedLabUnchanged:true,kind:'rollback-only on qualified replay',project,migrations:precision?430:428};
  fs.writeFileSync(out+'/atomic-'+Date.now()+'.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
 }finally{await db.query('rollback').catch(()=>{});await db.end();}
});
