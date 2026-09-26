// Real, separate database connections; committed synthetic rows are removed by ID.
// This fixed local target cannot be supplied through environment variables.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,project,hash,guardRuntime} from './vendor_billing_runtime_v1.mjs';

assert.equal(process.argv.length,2);
const runtime=guardRuntime();
const replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire('C:/gv_store_release_20260919/package.json');
assert.equal(require('pg/package.json').version,'8.20.0');
const {Client}=require('pg');
const makeClient=()=>new Client({host:'127.0.0.1',port:17622,user:'postgres',password:'postgres',database:'postgres',ssl:false,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000,application_name:'vendor_billing_concurrency_v1'});
const left=makeClient(),right=makeClient(),monitor=makeClient();
const owner='a2000000-0000-4000-8000-000000000001';
const tokenA='b2000000-0000-4000-8000-000000000001',tokenB='b2000000-0000-4000-8000-000000000002';
const checks=[];
let rightPid,monitorConnected=false,lockWaitsObserved=0;
const value=r=>r.rows[0].value;

// Observe the second backend waiting on the first transaction's lock. This makes
// each race a real overlapping execution, rather than two sequential promises.
async function waitForLock() {
  const deadline=Date.now()+5000;
  while(Date.now()<deadline) {
    const r=await monitor.query('select wait_event_type from pg_stat_activity where pid=$1',[rightPid]);
    if(r.rows[0]?.wait_event_type==='Lock'){lockWaitsObserved++;return;}
    await delay(25);
  }
  throw new Error('Second connection never reached the expected database lock');
}
async function race(query,leftParams,rightParams=leftParams) {
  let pending;
  try {
    await left.query('begin');await left.query('set local role service_role');
    const a=value(await left.query(query,leftParams));
    await right.query('begin');await right.query('set local role service_role');
    pending=right.query(query,rightParams).then(result=>({result}),error=>({error}));
    await waitForLock();
    await left.query('commit');
    const b=await pending;if(b.error)throw b.error;
    await right.query('commit');
    return [a,value(b.result)];
  } catch(error) {
    await left.query('rollback');
    if(pending)await pending;
    await right.query('rollback');throw error;
  }
}

let failure;
try {
  const connections=await Promise.allSettled([left.connect(),right.connect(),monitor.connect().then(()=>{monitorConnected=true;})]);
  for(const result of connections)if(result.status==='rejected')throw result.reason;
  rightPid=(await right.query('select pg_backend_pid() as pid')).rows[0].pid;
  await monitor.query('insert into auth.users(id,email,created_at) values($1,$2,now())',[owner,'billing-race@fixture.invalid']);
  const [accountA,accountB]=await race('select public.vendor_billing_reserve_account_v1($1,$2,false) as value',[owner,'acct_billingRace']);
  assert.equal(accountA.customer_attempt_id,accountB.customer_attempt_id);
  checks.push('Concurrent account reservation returns the same durable customer attempt');

  const [claimA,claimB]=await race('select public.vendor_billing_claim_v1($1,$2) as value',[owner,tokenA],[owner,tokenB]);
  assert.equal(Number(claimA.lease_fence),1);assert.equal(claimB,null);
  checks.push('Only one overlapping claim acquires the customer lease');

  await left.query('select public.vendor_billing_bind_customer_v1($1,$2,$3,$4)',[owner,tokenA,claimA.lease_fence,'cus_billingRace']);
  const [checkoutA,checkoutB]=await race('select public.vendor_billing_begin_checkout_v1($1,$2,$3,$4) as value',[owner,tokenA,claimA.lease_fence,'store_web']);
  assert.equal(checkoutA.id,checkoutB.id);
  assert.equal((await monitor.query('select count(*)::int as n from public.vendor_billing_checkout_attempts where owner_id=$1',[owner])).rows[0].n,1);
  checks.push('Overlapping same-lease retries cannot create two checkout attempts');

  const [eventA,eventB]=await race('select public.vendor_billing_enqueue_event_v1($1,false,$2,$3,$4,$5,$6) as value',
    ['acct_billingRace','evt_billingRace','invoice.paid','cus_billingRace','sub_billingRace','2026-09-19T00:00:00Z']);
  assert.equal(eventA.inserted,true);assert.equal(eventB.inserted,false);
  assert.equal((await monitor.query('select count(*)::int as n from public.vendor_billing_events where stripe_account_id=$1',['acct_billingRace'])).rows[0].n,1);
  checks.push('Concurrent duplicate callbacks retain exactly one inbox row');

  await monitor.query("update public.vendor_billing_accounts set lease_expires_at=clock_timestamp()-interval '1 second' where owner_id=$1",[owner]);
  const newClaim=value(await right.query('select public.vendor_billing_claim_v1($1,$2) as value',[owner,tokenB]));
  assert.equal(Number(newClaim.lease_fence),2);
  await assert.rejects(left.query('select public.vendor_billing_bind_checkout_v1($1,$2,$3,$4,$5,$6)',[owner,tokenA,1,checkoutA.id,'cs_test_billingRace','open']),e=>e.code==='P0001'&&e.message==='billing_lease_lost');
  const unchanged=(await monitor.query('select state,session_id from public.vendor_billing_checkout_attempts where id=$1',[checkoutA.id])).rows[0];
  assert.deepEqual(unchanged,{state:'creating',session_id:null});
  checks.push('An expired worker cannot write after another connection takes the lease');
  assert.equal(value(await monitor.query('select public.vendor_store_capabilities_v1($1) as value',[owner])).store_app,false);
  checks.push('Checkout reservation and callback receipt grant no store access');

  await right.query('select public.vendor_billing_bind_checkout_v1($1,$2,$3,$4,$5,$6,$7)',[owner,tokenB,2,checkoutA.id,'cs_test_billingRace','completed','sub_billingRace']);
  const commitSql='select public.vendor_billing_commit_projection_v1($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12) as value';
  const start=new Date(Date.now()-60000),end=new Date(Date.now()+86400000);
  const granted=value(await right.query(commitSql,[owner,tokenB,2,'cus_billingRace','sub_billingRace','active','store_web',start,end,'paid',checkoutA.id,null]));
  assert.equal(granted.capabilities.store_web,true);
  checks.push('Verified checkout enrollment atomically commits a paid contribution');

  // Hold an unrelated operator edit's entitlement lock while a leased worker
  // starts committing. Let its short test lease expire during that lock wait.
  // Even though it entered with a valid fence, the entire commit must roll back.
  await monitor.query('insert into public.vendor_stores(owner_id,slug,display_name,app_published,web_published) values($1,$2,$3,true,true)',[owner,'billing-race','Synthetic billing race']);
  const slowClaim=value(await right.query('select public.vendor_billing_claim_v1($1,$2) as value',[owner,tokenA]));
  await monitor.query("update public.vendor_billing_accounts set lease_expires_at=clock_timestamp()+interval '1 second' where owner_id=$1",[owner]);
  await left.query('begin');await left.query('select id from public.user_entitlements where user_id=$1 for update',[owner]);
  const waiting=right.query(commitSql,[owner,tokenA,slowClaim.lease_fence,'cus_billingRace','sub_billingRace','active','store_app',start,end,'paid',null,'evt_billingRace']).then(result=>({result}),error=>({error}));
  try {await waitForLock();await delay(1100);} finally {await left.query('commit');}
  const rejected=await waiting;
  assert.equal(rejected.error?.code,'P0001');assert.equal(rejected.error?.message,'billing_lease_lost');
  assert.equal(value(await monitor.query('select public.vendor_store_capabilities_v1($1) as value',[owner])).store_web,true);
  assert.equal((await monitor.query('select app_published and web_published as kept from public.vendor_stores where owner_id=$1',[owner])).rows[0].kept,true);
  assert.equal((await monitor.query('select state from public.vendor_billing_events where stripe_account_id=$1 and event_id=$2',['acct_billingRace','evt_billingRace'])).rows[0].state,'pending');
  checks.push('Lease expiry during a real entitlement-lock wait rolls back grant, publication and event changes');
  const closingClaim=value(await right.query('select public.vendor_billing_claim_v1($1,$2) as value',[owner,tokenB]));
  const closing=value(await right.query('select public.vendor_billing_request_closeout_v1($1,$2,$3,$4) as value',[owner,tokenB,closingClaim.lease_fence,'a'.repeat(64)]));
  await right.query("select public.vendor_billing_record_closeout_v1($1,$2,$3,$4,'[]')",[owner,tokenB,closingClaim.lease_fence,closing.closeout_id]);
  await left.query('begin');
  await left.query("insert into public.vendor_account_financial_holds(owner_id,reason,reference_id) values($1,'order_fulfillment',$2)",[owner,tokenA]);
  const archiveSql='select public.vendor_billing_archive_closeout_v1($1,$2,$3,$4,$5) as value';
  const archiveParams=[owner,tokenB,closingClaim.lease_fence,closing.closeout_id,'a'.repeat(64)];
  const heldArchive=right.query(archiveSql,archiveParams).then(result=>({result}),error=>({error}));
  try{await waitForLock();}finally{await left.query('commit');}
  assert.equal((await heldArchive).error?.message,'billing_financial_hold');
  assert.equal((await monitor.query('select count(*)::int as n from public.vendor_billing_closed_accounts where id=$1',[closing.closeout_id])).rows[0].n,0);
  checks.push('A concurrent financial hold prevents archival after a real Auth-row lock wait');
  await left.query('delete from public.vendor_account_financial_holds where owner_id=$1',[owner]);
  assert.equal(value(await right.query(archiveSql,archiveParams)),closing.closeout_id);
  assert.equal((await monitor.query('select count(*)::int as n from public.vendor_billing_accounts where owner_id=$1',[owner])).rows[0].n,0);
  checks.push('Verified archive commits only after the financial hold is resolved');
} catch(error) {failure=error;}
finally {
  // Delete only this runner's reserved synthetic identities; never reset a DB.
  if(monitorConnected) {
    await monitor.query('begin');
    try {
      await monitor.query('delete from public.vendor_billing_events where stripe_account_id=$1 and event_id=$2',['acct_billingRace','evt_billingRace']);
      await monitor.query('delete from public.vendor_billing_accounts where owner_id=$1',[owner]);
      await monitor.query('delete from public.vendor_account_financial_holds where owner_id=$1',[owner]);
      await monitor.query('delete from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1($1)',[owner]);
      await monitor.query('delete from auth.users where id=$1 and email=$2',[owner,'billing-race@fixture.invalid']);
      await monitor.query('commit');
    } catch(error) {await monitor.query('rollback');failure??=error;}
  }
  await Promise.allSettled([left.end(),right.end(),monitor.end()]);
}
guardRuntime();
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,image:runtime.image,imageId:runtime.imageId,checks,
  crossConnectionConcurrency:true,lockWaitsObserved,fixturesRemoved:true,productionWrites:0,providerRequests:0,
  migrationSha256:runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql'],runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),
  ...(failure?{error:failure.message}:{})};
const output=path.join(root,'docs/audits/vendor_stripe_billing_schema_v1');
fs.writeFileSync(path.join(output,`concurrency-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));
if(failure)throw failure;
