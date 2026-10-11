// Additional actual Auth tests. Explicitly synthetic dated points are lab-only fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {seedPortfolioSealedFixture} from '../../tests/integration/helpers/portfolio_sealed_fixture.mjs';
import {confirmedPortfolioOutcome,validatePortfolioPage,validatePortfolioComparison} from '../../apps/web/src/lib/vault/portfolioHistory.mjs';
import {summarizePortfolioObservationV1,comparePortfolioObservationsV1} from '../../backend/vault/portfolio_history_v1.mjs';
const root='C:/gv_product_portfolio_history_20261008',base='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008',project='portfolio-rel-full-437-v1-20261008',lab=base+'/release-full-437-v1';
assert.equal(process.argv.length,2);assert.equal(process.cwd().replaceAll('\\','/'),root);
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);const prior=read(base+'/RELEASE_RPC_V1.json');assert.equal(prior.status,'passed');assert.equal(prior.project,project);assert.equal(read(prior.out+'/result.json').status,'passed');assert.equal(read(prior.fixture+'/retention.json').status,'passed');
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest,name);
assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
const command=(n,args)=>execFileSync(n,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35621');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35620/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows,auth={persistSession:false,autoRefreshToken:false},admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),clients=[];
const out=base+'/release-extended-rpc-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'}),checks=[];
const passed=name=>{checks.push(name);save('check-'+checks.length+'.json',{status:'passed',name});};
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
async function newOwner(){const email=randomUUID()+'@portfolio-extended.invalid',password=randomUUID()+'Aa9!';const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user,client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});ok(await client.auth.signInWithPassword({email,password}));clients.push(client);return {owner:user.id,client};}
const restoredControls=['portfolio_history_control','catalog_game_release_controls','sealed_product_game_release_controls'];
let before,retained,tables,started=false,day;
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,437);
 assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);
 for(const table of ['sealed_product_release_pointer','sealed_product_image_release_pointer'])assert.equal((await q('select * from '+table+" where game_key='pokemon'")).length,0,'Preserve prior sealed publication');
 tables=(await q("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name like 'sealed_%' order by table_name")).map(r=>r.table_name);
 tables=[...new Set([...tables,...restoredControls,'portfolio_history_owners','portfolio_history_points','portfolio_history_requests'])];
 retained={};for(const table of tables)retained[table]=await q('select to_jsonb(t) row from '+table+' t');
 before={};for(const table of restoredControls)before[table]=await q('select to_jsonb(t) row from '+table+' t');
 save('intent.private.json',{at:new Date().toISOString(),project,consumed:true,retained,controls:before,syntheticDatedPoints:true,sourceSha256:freeze.sourceHashes['20261008220000_portfolio_history_v1.sql']});
 started=true;const sealedOwner=await newOwner();day=ok(await sealedOwner.client.rpc('portfolio_history_capabilities_v1')).day;
 await q('begin');const variant=await seedPortfolioSealedFixture(db,sealedOwner.owner,day);await q('update portfolio_history_control set enabled=true');await q('commit');
 await q('begin');await q('select ensure_vault_owner_v1($1)',[sealedOwner.owner]);
 const copies=await q("insert into vault_item_instances(user_id,gv_vi_id,sealed_product_variant_id,condition_label,seal_state,package_condition) select user_id,generate_gv_vi_id_v1(owner_code,next_instance_index+n),$2,null,s,c from vault_owners cross join (values(0,'factory_sealed','undamaged'),(1,'opened','undamaged'),(2,'factory_sealed','damaged')) x(n,s,c) where user_id=$1 returning id,seal_state,package_condition",[sealedOwner.owner,variant]);
 await q('update vault_owners set next_instance_index=next_instance_index+3 where user_id=$1',[sealedOwner.owner]);await q('commit');
 const request={version:1,requestId:randomUUID(),day};const ack=confirmedPortfolioOutcome(request,ok(await sealedOwner.client.rpc('portfolio_history_capture_v1',{p_request:request})),sealedOwner.owner);
 assert.equal(ack.status,'captured');assert.equal(ack.summary.totals.USD.exact,'50.25');assert.deepEqual(ack.summary.coverage.byKind.sealed,{owned:3,priced:1,unpriced:2});assert.equal(ack.summary.coverage.byReason.ineligible_seal_state,1);assert.equal(ack.summary.coverage.byReason.ineligible_package_condition,1);
 const saved=(await q('select observation,evidence,summary from portfolio_history_points where owner_id=$1',[sealedOwner.owner]))[0];assert.deepEqual(summarizePortfolioObservationV1(saved.observation),ack.summary);assert.equal(saved.observation.copies.find(c=>c.reference).reference.observedAt,day);assert.equal(saved.observation.copies.find(c=>c.reference).reference.publishedAt,null);passed('governed_sealed_price_and_opened_damaged_coverage');
 ok(await sealedOwner.client.rpc('vault_dispose_sealed_copy_v1',{p_instance_id:copies[0].id,p_request_id:randomUUID(),p_operation:'remove'}));assert.deepEqual((await q('select observation,evidence,summary from portfolio_history_points where owner_id=$1',[sealedOwner.owner]))[0],saved);passed('sealed_archive_preserves_original_snapshot');
 await assert.rejects(q('update portfolio_history_points set summary=summary where owner_id=$1',[sealedOwner.owner]));passed('immutable_point_update_guard');
 const owner=await newOwner(),copyId=randomUUID(),provenanceId=randomUUID(),observations=[];
 await q('begin');await q('insert into portfolio_history_owners(owner_id,next_sequence) values($1,71)',[owner.owner]);
 for(let sequence=1;sequence<=70;sequence++){
  const time=new Date(day+'T12:00:00.000Z');time.setUTCDate(time.getUTCDate()-(71-sequence));
  const observation={version:1,scope:'all_active_owned_copies',ownerId:owner.owner,snapshotId:randomUUID(),sequence:String(sequence),capturedAt:time.toISOString(),complete:true,ownedCount:1,copies:[{copyId,kind:'raw',basisKey:'a'.repeat(64),reference:{amount:String(100+sequence),currency:'USD',provenanceId,observedAt:time.toISOString(),publishedAt:time.toISOString()},unpricedReason:null}]};observations.push(observation);
  await q('insert into portfolio_history_points(owner_id,id,sequence,captured_day,captured_at,observation,evidence,summary) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)',[owner.owner,observation.snapshotId,sequence,time.toISOString().slice(0,10),time.toISOString(),JSON.stringify(observation),JSON.stringify([{copyId,syntheticFixture:true,basis:{},source:{}}]),JSON.stringify(summarizePortfolioObservationV1(observation))]);
 }await q('commit');save('synthetic-dated-fixture.json',{owner:owner.owner,points:70,purpose:'Pagination and comparison only; not reconstructed customer history',source:'explicit synthetic test observations'});
 const first=validatePortfolioPage(ok(await owner.client.rpc('portfolio_history_list_v1')),owner.owner);assert.equal(first.points.length,30);assert.equal(first.watermark,'70');
 const nextRequest={version:1,requestId:randomUUID(),day},today=confirmedPortfolioOutcome(nextRequest,ok(await owner.client.rpc('portfolio_history_capture_v1',{p_request:nextRequest})),owner.owner);assert.equal(today.summary.sequence,'71');
 const second=validatePortfolioPage(ok(await owner.client.rpc('portfolio_history_list_v1',{p_before:first.nextBefore,p_watermark:first.watermark})),owner.owner,{before:first.nextBefore,watermark:first.watermark});
 const third=validatePortfolioPage(ok(await owner.client.rpc('portfolio_history_list_v1',{p_before:second.nextBefore,p_watermark:first.watermark})),owner.owner,{before:second.nextBefore,watermark:first.watermark});
 assert.deepEqual([...first.points,...second.points,...third.points].map(p=>p.sequence),Array.from({length:70},(_,i)=>String(70-i)));assert.equal(third.nextBefore,null);passed('seventy_point_keyset_pagination_with_concurrent_new_point');
 const comparison=validatePortfolioComparison(ok(await owner.client.rpc('portfolio_history_compare_v1',{p_before_id:observations[0].snapshotId,p_after_id:observations[69].snapshotId})),observations[0].snapshotId,observations[69].snapshotId);assert.deepEqual(comparison,comparePortfolioObservationsV1(observations[0],observations[69]));assert.equal(comparison.currencies.USD.components.marketMovement,'69');passed('actual_auth_stored_comparison_matches_independent_model');
 const exhausted=await newOwner();await q('insert into portfolio_history_owners(owner_id,next_sequence) values($1,9223372036854775807)',[exhausted.owner]);const exhaustedRequest={version:1,requestId:randomUUID(),day};assert.equal(confirmedPortfolioOutcome(exhaustedRequest,ok(await exhausted.client.rpc('portfolio_history_capture_v1',{p_request:exhaustedRequest})),exhausted.owner).errorCode,'capacity_reached');passed('sequence_capacity_is_terminal_without_point');
 save('result.json',{status:'passed',at:new Date().toISOString(),checks,actualAuthRpc:true,syntheticDatedPoints:70,sealedOwner:sealedOwner.owner,historyOwner:owner.owner,sourceSha256:freeze.sourceHashes['20261008220000_portfolio_history_v1.sql'],productionWrites:0});
}catch(error){save('failure.json',{status:'failed',message:error.message,stack:error.stack,checks});throw error;}
finally{
 await q('rollback').catch(()=>{});
 if(started){
  await q('begin');
  // These two game pointers were verified absent before the synthetic fixture.
  await q("delete from sealed_product_image_release_pointer where game_key='pokemon'");await q("delete from sealed_product_release_pointer where game_key='pokemon'");
  await q('update portfolio_history_control set enabled=$1',[before.portfolio_history_control[0].row.enabled]);
  for(const table of ['catalog_game_release_controls','sealed_product_game_release_controls']){
   const key=table==='catalog_game_release_controls'?'game_code':'game_key',old=before[table].find(r=>r.row[key]==='pokemon')?.row;
   if(old){await q('update '+table+' set release_status=$1 where '+key+"='pokemon'",[old.release_status]);}
   else await q('delete from '+table+' where '+key+"='pokemon'");
  }await q('commit');
  for(const table of restoredControls)assert.deepEqual((await q('select to_jsonb(t) row from '+table+' t')).map(r=>JSON.stringify(r.row)).sort(),before[table].map(r=>JSON.stringify(r.row)).sort());
  for(const table of tables){const now=new Set((await q('select to_jsonb(t) row from '+table+' t')).map(r=>JSON.stringify(r.row)));for(const row of retained[table])assert.ok(now.has(JSON.stringify(row.row)),'Retain '+table);}
  save('retention.json',{status:'passed',at:new Date().toISOString(),retainedTables:tables.length,controlsRestored:true,sealedPointersRestoredToAbsent:true,allNewFixturesRetained:true});
 }
 await db.end();for(const client of clients)await client.auth.signOut({scope:'local'}).catch(()=>{});
}
fs.writeFileSync(base+'/RELEASE_EXTENDED_RPC_V1.json',JSON.stringify({status:'passed',out,project,checks:checks.length,productionWrites:0},null,2));
console.log(JSON.stringify({status:'passed',out,checks:checks.length}));
