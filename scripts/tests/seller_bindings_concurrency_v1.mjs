// Separate real PostgreSQL connections. Fixed 188xx only, no provider requests.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {createRequire} from 'node:module';import {setTimeout as delay} from 'node:timers/promises';
import {root,project,output,addition,hash,guard} from '../schema/seller_bindings_runtime_v1.mjs';
assert.equal(process.argv.length,2);const runtime=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire('C:/gv_store_release_20260919/package.json');
assert.equal(require('pg/package.json').version,'8.20.0');const {Client}=require('pg');
const make=()=>new Client({host:'127.0.0.1',port:18822,user:'postgres',password:'postgres',database:'postgres',ssl:false,
 connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000,application_name:'seller_bindings_concurrency_v1'});
const left=make(),right=make(),monitor=make();
const owners=['a4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002'];
const stores=['c4000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000002'];
const tokenA='b4000000-0000-4000-8000-000000000001',tokenB='b4000000-0000-4000-8000-000000000002';
const controller={feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'};
const val=r=>r.rows[0].value;const checks=[];let rightPid,connected=false,lockWaitsObserved=0,failure;
async function waitForLock(){const until=Date.now()+4000;while(Date.now()<until){
 const r=await monitor.query('select wait_event_type from pg_stat_activity where pid=$1',[rightPid]);
 if(r.rows[0]?.wait_event_type==='Lock'){lockWaitsObserved++;return true;}await delay(25);
}return false;}
async function race(query,params,otherParams=params){
 await left.query('begin');await left.query('set local role service_role');
 const a=val(await left.query(query,params));
 await right.query('begin');await right.query('set local role service_role');
 const pending=right.query(query,otherParams).then(result=>({result}),error=>({error}));
 const waiting=await waitForLock();await left.query('commit');const b=await pending;
 if(b.error)throw b.error;await right.query('commit');assert.equal(waiting,true,'Expected real overlapping row/advisory wait');return [a,val(b.result)];
}
try{
 await monitor.connect();connected=true;await left.connect();await right.connect();
 rightPid=(await right.query('select pg_backend_pid() as pid')).rows[0].pid;
 for(let i=0;i<2;i++){
  await monitor.query('insert into auth.users(id,email,created_at) values($1,$2,now())',[owners[i],`seller-race-${i}@fixture.invalid`]);
  await monitor.query('insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,$4)',[stores[i],owners[i],`seller-race-${i}`,'Synthetic seller race']);
  await monitor.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true}')",[owners[i]]);
 }
 await monitor.query('update vendor_store_rollout set app_enabled=true');await monitor.query('update vendor_seller_rollout set onboarding_enabled=true');
 const reserve='select public.vendor_seller_reserve_v1($1,$2,$3,false,$4) as value';
 const [a,b]=await race(reserve,[owners[0],stores[0],'acct_sellerRace',controller]);
 assert.equal(a.id,b.id);assert.equal(a.creation_attempt_id,b.creation_attempt_id);checks.push('concurrent reserve keeps one binding and attempt');
 const claim='select public.vendor_seller_claim_v1($1,$2) as value';
 const [winner,loser]=await race(claim,[a.id,tokenA],[a.id,tokenB]);assert.equal(loser,null);
 checks.push('one lease winner under real contention');
 const prepare='select public.vendor_seller_prepare_creation_v1($1,$2,$3) as value';
 const [p,q]=await race(prepare,[a.id,tokenA,winner.lease_fence]);assert.equal(p.creation_started_at,q.creation_started_at);
 assert.equal(p.creation_attempt_id,q.creation_attempt_id);checks.push('creation retry preserves provider idempotency clock');
 const bind='select public.vendor_seller_bind_v1($1,$2,$3,$4) as value';
 const enqueue='select public.vendor_seller_enqueue_v1($1,false,$2,$3,$4,$5) as value';
 await left.query('begin');await left.query('set local role service_role');
 await left.query(bind,[a.id,tokenA,winner.lease_fence,'acct_raceBound']);
 const pending=right.query(enqueue,['acct_sellerRace','evt_boundRace','acct_raceBound','deauthorized','2026-09-19T00:00:00Z']).then(result=>({result}),error=>({error}));
 const waited=await waitForLock();await left.query('commit');const done=await pending;if(done.error)throw done.error;
 assert.equal((await monitor.query('select state from vendor_seller_accounts where id=$1',[a.id])).rows[0].state,'deauthorized',
   'A deauthorization committed during first binding must not be lost');assert.equal(waited,true);
 await assert.rejects(right.query(bind,[a.id,tokenA,winner.lease_fence,'acct_raceBound']),e=>e.message==='seller_lease_lost');
 checks.push('deauthorization racing a known binding invalidates its lease');
 const second=val(await right.query(reserve,[owners[1],stores[1],'acct_sellerRace',controller]));
 const secondLease=val(await right.query(claim,[second.id,tokenB]));await right.query(prepare,[second.id,tokenB,secondLease.lease_fence]);
 await left.query('begin');await left.query('set local role service_role');
 await left.query(enqueue,['acct_sellerRace','evt_earlyRace','acct_raceEarly','deauthorized','2026-09-19T00:00:00Z']);
 const early=right.query(bind,[second.id,tokenB,secondLease.lease_fence,'acct_raceEarly']).then(result=>({result}),error=>({error}));
 const earlyWait=await waitForLock();await left.query('commit');const earlyDone=await early;if(earlyDone.error)throw earlyDone.error;
 const state=(await monitor.query('select state from vendor_seller_accounts where id=$1',[second.id])).rows[0].state;
 assert.equal(state,'deauthorized','A deauthorization committed during first binding must not be lost');
 assert.equal(earlyWait,true);checks.push('unknown-account deauthorization and first binding share one arbitration lock');
 const [e1,e2]=await race(enqueue,['acct_sellerRace','evt_duplicateRace','acct_raceEarly','refresh','2026-09-19T00:00:00Z']);
 assert.equal(e1.inserted,true);assert.equal(e2.inserted,false);checks.push('concurrent event callbacks append once');
 await right.query('select public.vendor_seller_release_v1($1,$2,$3)',[second.id,tokenB,secondLease.lease_fence]);
 const expiring=val(await right.query(claim,[second.id,tokenA]));
 await monitor.query("update vendor_seller_accounts set lease_expires_at=clock_timestamp()+interval '1 second' where id=$1",[second.id]);
 await left.query('begin');await left.query('set local role service_role');
 await left.query(enqueue,['acct_sellerRace','evt_waitExpiry','acct_raceEarly','refresh','2026-09-19T00:00:00Z']);
 const blocked=right.query(bind,[second.id,tokenA,expiring.lease_fence,'acct_raceEarly']).then(result=>({result}),error=>({error}));
 const expiryWait=await waitForLock();await delay(1100);await left.query('commit');
 assert.equal(expiryWait,true);assert.equal((await blocked).error?.message,'seller_lease_lost');
 checks.push('lease expiry during provider-account arbitration rejects the stale writer');
}catch(error){failure=error;}
finally{
 await left.query('rollback').catch(()=>{});await right.query('rollback').catch(()=>{});
 if(connected){await monitor.query('begin');try{
  await monitor.query('delete from vendor_seller_events where stripe_account_id=$1',['acct_sellerRace']);
  // Only these reserved synthetic bindings; never a shared reset or schema edit.
  await monitor.query('set local session_replication_role=replica');
  await monitor.query('delete from vendor_seller_accounts where owner_id=any($1::uuid[])',[owners]);
  await monitor.query('set local session_replication_role=origin');
  await monitor.query('delete from vendor_stores where id=any($1::uuid[])',[stores]);
  await monitor.query('delete from auth.users where id=any($1::uuid[])',[owners]);
  await monitor.query('update vendor_store_rollout set app_enabled=false');await monitor.query('update vendor_seller_rollout set onboarding_enabled=false');
  await monitor.query('commit');
 }catch(error){await monitor.query('rollback');throw error;}}
 await Promise.allSettled([left.end(),right.end(),monitor.end()]);
}
assert.deepEqual(guard({full:true}),runtime);
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,migrationSha256:runtime.sourceHashes[addition],
 runnerSha256:hash(fs.readFileSync(path.join(root,'scripts/tests/seller_bindings_concurrency_v1.mjs'))),checks,lockWaitsObserved,
 failure:failure?.message,fixturesRemoved:true,providerRequests:0,productionWrites:0};
fs.writeFileSync(path.join(output,`concurrency-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
if(failure)process.exitCode=1;
