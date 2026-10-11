// Actual Auth/RPC tests against the guarded synthetic publication fixture only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {confirmedPortfolioOutcome,validatePortfolioPage,validatePortfolioCapabilities,validatePortfolioSummary} from '../../apps/web/src/lib/vault/portfolioHistory.mjs';
import {summarizePortfolioObservationV1} from '../../backend/vault/portfolio_history_v1.mjs';
const root='C:/gv_product_portfolio_history_20261008',base='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008';
const project='portfolio-rel-full-437-v1-20261008',lab=base+'/release-full-437-v1';
assert.equal(process.argv.length,3);assert.equal(process.cwd().replaceAll('\\','/'),root);
const fixture=process.argv[2];assert.match(fixture,new RegExp('^'+base+'/release-market-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const f=read(fixture+'/fixture.private.json');assert.equal(f.project,project);assert.equal(f.state,'prepared');
assert.equal(read(base+'/RELEASE_SQL_PARITY_V1.json').status,'passed');const freeze=read(lab+'/freeze.json');
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest,name);
const command=(n,args)=>execFileSync(n,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35621');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const dbUrl='postgresql://postgres:postgres@127.0.0.1:35620/postgres',db=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows,auth={persistSession:false,autoRefreshToken:false};
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),clients=[];
const out=base+'/release-rpc-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
const checks=[];const passed=name=>{checks.push(name);save('check-'+checks.length+'.json',{status:'passed',name,at:new Date().toISOString()});};
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
let day,restoreError;const keep=[];
async function newOwner(){
 const email=randomUUID()+'@portfolio-proof.invalid',password=randomUUID()+'Aa9!';
 const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
 const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});ok(await client.auth.signInWithPassword({email,password}));clients.push(client);keep.push(user.id);
 return {owner:user.id,client};
}
const request=()=>({version:1,requestId:randomUUID(),day});
const call=(client,mode,r)=>client.rpc('portfolio_history_'+mode+'_v1',{p_request:r});
const rows=async(owner)=>q('select observation,evidence,summary from portfolio_history_points where owner_id=$1 order by sequence',[owner]);
async function addCopies(owner,n,{printing=f.printing,graded=false}={}){
 const result=await q(`insert into vault_item_instances(user_id,card_print_id,card_printing_id,condition_label,is_graded)
   select $1::uuid,$2::uuid,$3::uuid,'NM',$5 from generate_series(1,$4::integer) returning id`,[owner,f.card,printing,n,graded]);
 assert.equal(result.length,n);return result.map(r=>r.id);
}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,437);
 const pointer=(await q('select * from market_price_current_publication'))[0];assert.equal(pointer.run_id,f.runId);save('pointer-before.json',pointer);
 const owner={owner:f.owner,client:createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth})};clients.push(owner.client);ok(await owner.client.auth.signInWithPassword({email:f.email,password:f.password}));
 const caps=validatePortfolioCapabilities(ok(await owner.client.rpc('portfolio_history_capabilities_v1')));assert.equal(caps.enabled,true);day=caps.day;
 save('intent.json',{at:new Date().toISOString(),project,fixture,sourceSha256:freeze.sourceHashes['20261008220000_portfolio_history_v1.sql'],producerSha256:hash(fs.readFileSync(import.meta.filename)),productionWrites:0});
 const anon=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});assert.ok((await anon.rpc('portfolio_history_list_v1')).error);passed('anonymous_read_denied');
 const empty=await newOwner(),emptyRequest=request();const emptyAck=confirmedPortfolioOutcome(emptyRequest,ok(await call(empty.client,'capture',emptyRequest)),empty.owner);
 assert.equal(emptyAck.status,'captured');assert.equal(emptyAck.summary.state,'empty');assert.equal(emptyAck.summary.coverage.owned,0);passed('complete_empty_capture');
 const exact=await addCopies(owner.owner,1),missing=await addCopies(owner.owner,1,{printing:f.missingPrinting}),unresolved=await addCopies(owner.owner,1,{printing:null});
 const slab=(await q("insert into slab_certs(grader,cert_number,card_print_id,grade) values('PSA',$1,$2,9) returning id",[String(90000000+Math.floor(Math.random()*10000000)),f.card]))[0];
 await q('insert into vault_item_instances(user_id,slab_cert_id,is_graded) values($1,$2,true)',[owner.owner,slab.id]);
 const r=request();const ack=confirmedPortfolioOutcome(r,ok(await call(owner.client,'capture',r)),owner.owner);
 assert.equal(ack.status,'captured');assert.equal(ack.summary.coverage.owned,4);assert.equal(ack.summary.coverage.priced,1);assert.equal(ack.summary.totals.USD.exact,'12.34');assert.equal(ack.summary.coverage.byKind.slab.unpriced,1);
 const saved=await rows(owner.owner);assert.equal(saved.length,1);assert.deepEqual(summarizePortfolioObservationV1(saved[0].observation),ack.summary);passed('governed_exact_price_and_complete_mixed_coverage');
 assert.deepEqual(ok(await call(owner.client,'capture',r)),ack);assert.deepEqual(ok(await call(owner.client,'recover',r)),ack);passed('exact_retry_returns_original_observation');
 assert.equal((await call(owner.client,'capture',{...r,day:'2000-01-01'})).error?.code,'22023');passed('changed_retry_rejected');
 await q("update vault_item_instances set condition_label='LP' where id=$1",[exact[0]]);await q('update vault_item_instances set archived_at=clock_timestamp() where id=$1',[missing[0]]);
 const repeat=request();const reused=confirmedPortfolioOutcome(repeat,ok(await call(owner.client,'capture',repeat)),owner.owner);
 assert.equal(reused.status,'reused');assert.deepEqual(reused.summary,ack.summary);assert.deepEqual(await rows(owner.owner),saved);passed('daily_coalescing_never_rewrites_prior_inventory');
 const exported=ok(await owner.client.rpc('portfolio_history_export_v1',{p_point_id:ack.pointId,p_limit:2}));assert.equal(exported.rows.length,2);assert.ok(exported.nextAfterCopy);
 const exported2=ok(await owner.client.rpc('portfolio_history_export_v1',{p_point_id:ack.pointId,p_limit:2,p_after_copy:exported.nextAfterCopy}));assert.equal(exported2.rows.length,2);assert.equal(exported2.nextAfterCopy,null);
 assert.deepEqual([...exported.rows,...exported2.rows].map(x=>x.copy),saved[0].observation.copies);
 for(const row of [...exported.rows,...exported2.rows])assert.equal(row.copy.copyId,row.evidence.copyId);
 const original=[...exported.rows,...exported2.rows].find(x=>x.copy.copyId===exact[0]);assert.equal(original.evidence.basis.condition,'NM');passed('paged_export_retains_original_basis');
 const page=validatePortfolioPage(ok(await owner.client.rpc('portfolio_history_list_v1')),owner.owner);assert.equal(page.points.length,1);assert.deepEqual(page.points[0],ack.summary);
 assert.equal((await owner.client.rpc('portfolio_history_list_v1',{p_watermark:'999999'})).error?.code,'22023');passed('history_page_and_fixed_watermark');
 assert.equal(ok(await call(empty.client,'recover',r)),null);assert.ok((await empty.client.rpc('portfolio_history_export_v1',{p_point_id:ack.pointId})).error);assert.ok((await empty.client.rpc('portfolio_history_compare_v1',{p_before_id:ack.pointId,p_after_id:emptyAck.pointId})).error);passed('owner_isolation');
 const stale=request();stale.day='2000-01-01';const staleAck=confirmedPortfolioOutcome(stale,ok(await call(owner.client,'capture',stale)),owner.owner);assert.equal(staleAck.status,'failed');assert.equal(staleAck.errorCode,'day_expired');assert.deepEqual(ok(await call(owner.client,'capture',stale)),staleAck);passed('expired_day_is_terminal_not_backdated');
 const identical=await newOwner(),same=request();const sameOutcomes=await Promise.all([call(identical.client,'capture',same),call(identical.client,'capture',same)]);assert.deepEqual(ok(sameOutcomes[0]),ok(sameOutcomes[1]));assert.equal((await rows(identical.owner)).length,1);passed('concurrent_identical_capture');
 const distinct=await newOwner();const different=await Promise.all([call(distinct.client,'capture',request()),call(distinct.client,'capture',request())]);assert.deepEqual(different.map(x=>ok(x).status).sort(),['captured','reused']);assert.equal(ok(different[0]).pointId,ok(different[1]).pointId);passed('concurrent_day_capture_coalesces');
 const lockEvidence=[];
 const waitLock=async(pid,name)=>{for(let i=0;i<100;i++){const blocked=await q("select pid,pg_blocking_pids(pid) blockers from pg_stat_activity where wait_event_type='Lock' and $1::int=any(pg_blocking_pids(pid)) and strpos(query,$2)>0",[pid,name]);if(blocked.length){lockEvidence.push({name,...blocked[0]});return blocked[0].pid;}await new Promise(r=>setTimeout(r,80));}throw Error('Expected lock not observed: '+name);};
 for(const first of ['capture','cancel']){
  const actor=await newOwner(),pending=request(),second=first==='capture'?'cancel':'capture';await q('insert into portfolio_history_owners(owner_id) values($1)',[actor.owner]);
  const gate=new pg.Client({connectionString:dbUrl});await gate.connect();let firstPromise,secondPromise;
  try{await gate.query('begin');const pid=(await gate.query('select pg_backend_pid() pid')).rows[0].pid;await gate.query('select 1 from portfolio_history_owners where owner_id=$1 for update',[actor.owner]);
   firstPromise=call(actor.client,first,pending).then(x=>x);const firstPid=await waitLock(pid,'portfolio_history_'+first+'_v1');
   secondPromise=call(actor.client,second,pending).then(x=>x);await waitLock(firstPid,'portfolio_history_'+second+'_v1');await gate.query('commit');
   const a=ok(await firstPromise),b=ok(await secondPromise);assert.deepEqual(a,b);assert.equal(a.status,first==='capture'?'captured':'cancelled');
  }finally{await gate.query('rollback').catch(()=>{});await gate.end();if(firstPromise)await firstPromise;if(secondPromise)await secondPromise;}
 }save('forced-locks.json',{lockEvidence,bothOrders:true});passed('both_forced_capture_cancellation_lock_orders');
 const limit=await newOwner();await addCopies(limit.owner,20000);const largeRequest=request(),started=Date.now();
 const large=confirmedPortfolioOutcome(largeRequest,ok(await call(limit.client,'capture',largeRequest)),limit.owner);assert.equal(large.status,'captured');assert.equal(large.summary.coverage.owned,20000);assert.equal(large.summary.totals.USD.exact,'246800');
 const bytes=(await q('select octet_length(observation::text)+octet_length(evidence::text) bytes from portfolio_history_points where owner_id=$1',[limit.owner]))[0].bytes;
 save('capacity.json',{copies:20000,elapsedMs:Date.now()-started,evidenceBytes:bytes,actualAuthRpc:true});passed('actual_twenty_thousand_copy_capture');
 const oversized=await newOwner();await addCopies(oversized.owner,20001,{printing:null});const tooBig=request();const rejected=confirmedPortfolioOutcome(tooBig,ok(await call(oversized.client,'capture',tooBig)),oversized.owner);
 assert.equal(rejected.errorCode,'too_many_copies');assert.equal((await rows(oversized.owner)).length,0);passed('oversized_inventory_never_saves_partial_history');
 const deleted=await newOwner(),deletedRequest=request();ok(await call(deleted.client,'capture',deletedRequest));ok(await call(deleted.client,'cancel',request()));ok(await admin.auth.admin.deleteUser(deleted.owner));
 for(const table of ['portfolio_history_owners','portfolio_history_points','portfolio_history_requests'])assert.equal((await q('select count(*)::int n from '+table+' where owner_id=$1',[deleted.owner]))[0].n,0);passed('account_removal_cascades_private_history');
 await q('delete from market_price_current_publication where run_id=$1',[f.runId]);
 const unavailable=await newOwner();await addCopies(unavailable.owner,1);const failed=request();const unavailableAck=confirmedPortfolioOutcome(failed,ok(await call(unavailable.client,'capture',failed)),unavailable.owner);
 assert.equal(unavailableAck.errorCode,'pricing_unavailable');assert.equal((await rows(unavailable.owner)).length,0);passed('missing_publication_is_failure_not_zero_value');
 await q('update portfolio_history_control set enabled=false');assert.deepEqual(ok(await call(owner.client,'capture',r)),ack);assert.deepEqual(ok(await call(owner.client,'recover',r)),ack);
 const pending=request();assert.equal(ok(await call(owner.client,'recover',pending)),null);const cancelled=confirmedPortfolioOutcome(pending,ok(await call(owner.client,'cancel',pending)),owner.owner);assert.equal(cancelled.status,'cancelled');assert.deepEqual(ok(await call(owner.client,'capture',pending)),cancelled);
 assert.equal((await call(owner.client,'capture',request())).error?.code,'55000');passed('entry_off_recovery_and_terminal_cancellation');
 assert.deepEqual(await rows(owner.owner),saved);passed('original_observation_bytes_retained');
 save('result.json',{status:'passed',at:new Date().toISOString(),checks,actualAuthRpc:true,owner:owner.owner,retainedUsers:keep.length-1,deletedSyntheticUser:deleted.owner,
  sourceSha256:freeze.sourceHashes['20261008220000_portfolio_history_v1.sql'],productionWrites:0,resets:0});
}catch(error){save('failure.json',{status:'failed',at:new Date().toISOString(),message:error.message,stack:error.stack,checks});throw error;
}finally{
 await db.query('rollback').catch(()=>{});await db.end();
 try{const log=command(process.execPath,[root+'/scripts/audits/product_portfolio_history_release_price_fixture_v1.mjs','restore',fixture]);fs.writeFileSync(out+'/restore.private.log',log,{flag:'wx'});assert.equal(read(fixture+'/retention.json').status,'passed');}
 catch(error){restoreError=error;save('restore-failure.json',{message:error.message});}
 for(const client of clients)await client.auth.signOut({scope:'local'}).catch(()=>{});
 if(restoreError)throw restoreError;
}
fs.writeFileSync(base+'/RELEASE_RPC_V1.json',JSON.stringify({status:'passed',out,fixture,project,checks:checks.length,productionWrites:0},null,2));
console.log(JSON.stringify({status:'passed',out,checks:checks.length}));
