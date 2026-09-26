import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createOrderQueueRepository,createOrderQueueService,projectOrderQueueStatus,orderQueueAlerts} from '../../apps/web/src/lib/payments/vendorOrderQueue.ts';
import {createOrderHttpRuntime} from '../../apps/web/src/lib/payments/vendorOrderRuntimeService.ts';
import {createVendorOrderHandlers} from '../../apps/web/src/lib/payments/vendorOrderHttp.ts';
import {creationFixture} from './vendorCheckoutCreationFixture.mjs';
import {runCommerceWorker} from '../../backend/payments/vendor_commerce_worker_v1.mjs';
export async function proveOrderQueue({db,admin,anon,buyerApi,ownerApi,owner,buyer,ids,copies,create,checks,binding,registry,multi,race}){
 const sample=registry.values().next().value,config=sample.config,platform=config.scope.accountId,scope={p_platform:platform,p_live:false};
 const rpc=async(name,args={})=>{const r=await admin.rpc(name,{...scope,...args});assert.equal(r.error,null,r.error?.message);return r.data;};
 const snapshot=async()=>JSON.stringify((await db.query('select o.id,o.paid,o.revision,o.review_reasons,r.state from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id order by o.id')).rows);
 // Add one reserved, never-started synthetic order with an ID below the scan
 // cursor. Its normal creation claim will happen after the first page commits.
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 const late=await create(copies[24],{id:'00000000-0000-4000-8000-000000000024'});
 const initial=await snapshot();
 assert.match((await admin.rpc('vendor_order_reconcile_seed_v1',{...scope,p_limit:1})).error?.message??'',/order_queue_disabled/);
 for(const client of [anon,buyerApi,ownerApi]){
  for(const [name,args] of [['seed',{p_limit:1}],['claim',{p_token:randomUUID()}],['finish',{p_order:randomUUID(),p_token:randomUUID(),p_fence:1,p_result:'retry'}],['status',{}]])
   assert.match((await client.rpc(`vendor_order_reconcile_${name}_v1`,{...scope,...args})).error?.message??'',/permission denied/);
  for(const table of ['control','scopes','jobs','events'])assert.ok((await client.from('vendor_order_reconcile_'+table).select('*')).error);
 }
 for(const table of ['control','scopes','jobs','events'])assert.ok((await admin.from('vendor_order_reconcile_'+table).insert({})).error);
 await db.query('update vendor_order_reconcile_control set enabled=true');
 const queuedBefore=(await db.query('select (select count(*) from vendor_order_reconcile_jobs) jobs,(select count(*) from vendor_order_reconcile_scopes) scopes')).rows[0];
 await db.query('begin');await db.query('select vendor_order_reconcile_seed_v1($1,false,1)',[platform]);await db.query('rollback');
 assert.equal((await db.query('select count(*) n from vendor_order_reconcile_jobs')).rows[0].n,queuedBefore.jobs);
 assert.equal((await db.query('select count(*) n from vendor_order_reconcile_scopes')).rows[0].n,queuedBefore.scopes);
 const expected=Number((await db.query('select count(*) n from vendor_order_attempts where creation_started_at is not null')).rows[0].n);
 let page=await rpc('vendor_order_reconcile_seed_v1',{p_limit:1}),scanned=page.scanned;assert.equal(page.complete,false);
 assert.equal((await admin.rpc('vendor_order_checkout_prepare_v1',{p_order_id:late.o.id,p_buyer_id:buyer,p_token:randomUUID()})).error,null);
 do{page=await rpc('vendor_order_reconcile_seed_v1',{p_limit:1});scanned+=page.scanned;assert.ok(scanned<=expected);}while(!page.complete);
 assert.equal(scanned,expected);assert.equal(Number((await db.query('select count(*) n from vendor_order_reconcile_jobs')).rows[0].n),expected);
 assert.equal((await db.query('select count(*) n from vendor_order_reconcile_jobs where order_id=$1',[late.o.id])).rows[0].n,'0');
 await Promise.all([rpc('vendor_order_reconcile_seed_v1',{p_limit:100}),rpc('vendor_order_reconcile_seed_v1',{p_limit:100})]);
 assert.equal(Number((await db.query('select count(*) n from vendor_order_reconcile_jobs')).rows[0].n),expected+1);
 assert.equal((await db.query('select count(*) n from vendor_order_reconcile_jobs where order_id=$1',[late.o.id])).rows[0].n,'1');
 const young=(await db.query('select next_run_at from vendor_order_reconcile_jobs where order_id=$1',[late.o.id])).rows[0];assert.ok(young.next_run_at-Date.now()>23*3600000);
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
 await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);
 assert.equal((await admin.rpc('vendor_order_reconcile_status_v1',{p_platform:'acct_foreign',p_live:false})).data.total,0);
 assert.equal((await admin.rpc('vendor_order_reconcile_status_v1',{p_platform:platform,p_live:true})).data.total,0);
 assert.equal(await snapshot(),initial);
 checks.push('queue service-only RPC/base-table ACLs, disabled default, atomic rollback of cursor/enqueue, bounded restartable pages, concurrent reseeding and account/mode isolation; no payment or stock mutation');
 checks.push('an attempt starting behind the committed UUID cursor is found on the next complete sweep, while a young unbound attempt is scheduled beyond its creation window');
 const claimSql='select vendor_order_reconcile_claim_v1($1,false,$2) value';
 const [aResult,bResult]=await race(claimSql,[platform,randomUUID()],claimSql,[platform,randomUUID()]);
 const a=aResult.rows[0].value,b=bResult.rows[0].value;assert.ok(a&&b);assert.notEqual(a.orderId,b.orderId);
 const finish=(c,result='retry')=>rpc('vendor_order_reconcile_finish_v1',{p_order:c.orderId,p_token:c.token,p_fence:c.fence,p_result:result});
 await finish(b);
 await db.query("update vendor_order_reconcile_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where order_id=$1",[a.orderId]);
 let health=projectOrderQueueStatus(await rpc('vendor_order_reconcile_status_v1'));assert.equal(health.expiredLeases,1);assert.ok(orderQueueAlerts(health).includes('expired_leases'));
 const successor=await rpc('vendor_order_reconcile_claim_v1',{p_token:randomUUID()});assert.equal(successor.orderId,a.orderId);assert.equal(successor.fence,a.fence+1);
 assert.match((await admin.rpc('vendor_order_reconcile_finish_v1',{...scope,p_order:a.orderId,p_token:a.token,p_fence:a.fence,p_result:'retry'})).error?.message??'',/order_queue_lease_lost/);
 const saved=await finish(successor);assert.deepEqual(await finish(successor),saved);
 assert.match((await admin.rpc('vendor_order_reconcile_finish_v1',{...scope,p_order:a.orderId,p_token:successor.token,p_fence:successor.fence,p_result:'not_found'})).error?.message??'',/order_queue_receipt_conflict/);
 const job=(await db.query('select * from vendor_order_reconcile_jobs where order_id=$1',[a.orderId])).rows[0];assert.equal(job.failures,1);assert.equal(job.abandoned_claims,'1');
 assert.ok(job.next_run_at-job.last_finished_at>=29000&&job.next_run_at-job.last_finished_at<=31000);
 await assert.rejects(db.query("update vendor_order_reconcile_events set result='retry' where order_id=$1",[a.orderId]),/order_queue_event_immutable/);
 await assert.rejects(db.query('delete from vendor_order_reconcile_events where order_id=$1',[a.orderId]),/order_queue_event_immutable/);
 await rpc('vendor_order_reconcile_seed_v1',{p_limit:100});assert.equal((await db.query('select next_run_at from vendor_order_reconcile_jobs where order_id=$1',[a.orderId])).rows[0].next_run_at.toISOString(),job.next_run_at.toISOString());
 assert.equal(await snapshot(),initial);
 checks.push('real overlapping workers claim distinct jobs; crash expiry rotates fence, rejects stale completion, records abandonment and one immutable idempotent completion; retry backoff survives reseeding');
 // Prove consistent scope-before-job order in the race that exposed the draft:
 // an expired lease lets seed update a never-finished job while completion races.
 const c=await rpc('vendor_order_reconcile_claim_v1',{p_token:randomUUID()});assert.ok(c);
 await db.query("update vendor_order_reconcile_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where order_id=$1",[c.orderId]);
 await race('select vendor_order_reconcile_seed_v1($1,false,100)',[platform],
  'select vendor_order_reconcile_finish_v1($1,false,$2,$3,$4,$5)',[platform,c.orderId,c.token,c.fence,'retry'],{error:/order_queue_lease_lost/});
 const c2=await rpc('vendor_order_reconcile_claim_v1',{p_token:randomUUID()});assert.equal(c2.orderId,c.orderId);await finish(c2);
 checks.push('seed/completion contention follows one lock order and stale completion fails without deadlock or lost cursor');
 // Isolate one actual bound obligation for end-to-end HTTP execution. This is
 // fixture scheduling only; no payment/order fields are altered.
 const cleanOrders=new Set((await db.query("select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id where o.paid and cardinality(o.review_reasons)=0 and r.state='consumed'")).rows.map(r=>r.id));
 const target=[...registry.values()].find(f=>cleanOrders.has(f.order.orderId)&&f.session.status==='complete'&&f.session.payment_status==='paid');assert.ok(target);
 const targetId=target.order.orderId;
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()+interval '1 day',lease_token=null,lease_expires_at=null");
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[targetId]);
 const rt=createOrderHttpRuntime(admin,multi,config,false,true),operator='ab'.repeat(32);
 const h=createVendorOrderHandlers({authenticate:async()=>null,origin:()=> 'http://127.0.0.1:22040',runtime:()=>rt,reconcileToken:()=>operator});
 const post=(action,headers={authorization:`Bearer ${operator}`})=>h.queue(new Request('http://127.0.0.1:22040/api/vendor-orders/queue',{method:'POST',headers,body:JSON.stringify({action})}));
 assert.equal((await post('tick',{cookie:'owner'})).status,401);
 const r=await post('tick');assert.equal(r.status,200,await r.clone().text());const body=await r.json();assert.equal(body.receipt.orderId,targetId);assert.equal(body.receipt.result,'verified');
 assert.equal((await binding(targetId)).stockState,'consumed');
 const targetJob=(await db.query('select * from vendor_order_reconcile_jobs where order_id=$1',[targetId])).rows[0];assert.equal(targetJob.failures,0);assert.ok(targetJob.next_run_at-targetJob.last_finished_at>5*3600000);
 checks.push('authenticated operator tick loads retained queue job and actual SDK/SQL verifier with acquisition disabled, then persists verification and recurring paid-order schedule');
 // The private scheduler uses the same direct backend runtime, without HTTP,
 // browser identity, package access or acquisition enablement.
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[targetId]);
 const workerEnv={STRIPE_PAYMENTS_MODE:'test',STRIPE_BILLING_MODE:'test',STRIPE_ACCOUNT_ID:platform,SUPABASE_URL:'http://127.0.0.1:22021',SUPABASE_SECRET_KEY:'fixture-only-config',GROOKAI_VENDOR_ORDER_QUEUE_ENABLED:'true'};
 const worked=await runCommerceWorker({env:workerEnv,args:['--orders'],admin,orderService:async()=>({tick:()=>rt.queueTick()})});
 assert.equal(worked.healthy,true);assert.equal(worked.outcome,'verified');assert.doesNotMatch(JSON.stringify(worked),new RegExp(targetId));
 const monitored=await runCommerceWorker({env:{...workerEnv,GROOKAI_VENDOR_ORDER_QUEUE_ENABLED:'false'},args:['--health'],admin});
 assert.equal(monitored.healthy,false);assert.ok(monitored.lanes.billing.alerts.includes('not_started'));assert.ok(monitored.lanes.orders.counts.total>0);
 checks.push('private scheduled worker directly reuses real retained order verification; independent aggregate health observes both actual RPCs with processing paused and no provider credential');
 // Fresh service/repository instances simulate process restart. Failures remain
 // durable, due later, and visible without depending on process-local counters.
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[targetId]);
 const restart=()=>createOrderQueueService({repo:createOrderQueueRepository(admin,config),enabled:true,reconcile:async()=>{throw Error('PRIVATE PROVIDER FAILURE');},discover:async()=>{throw Error('PRIVATE PROVIDER FAILURE');}});
 const failed=await restart().tick();assert.equal(failed.receipt.result,'retry');
 const renewed=await restart().status();assert.ok(renewed.unresolved>=1);assert.ok(renewed.attention.some(x=>x.orderId===targetId));assert.doesNotMatch(JSON.stringify(renewed),/PRIVATE/);
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[targetId]);
 await restart().tick();const retry=(await db.query('select failures,extract(epoch from next_run_at-last_finished_at) delay from vendor_order_reconcile_jobs where order_id=$1',[targetId])).rows[0];assert.equal(retry.failures,2);assert.ok(Number(retry.delay)>=59&&Number(retry.delay)<=61);
 // Route a due old unbound job through the real discovery adapter. A complete
 // empty SDK lookup persists not_found, never payment absence or stock release.
 const unbound=(await db.query("select order_id from vendor_order_attempts where session_id is null and creation_started_at<clock_timestamp()-interval '24 hours' order by order_id limit 1")).rows[0];assert.ok(unbound);
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()+interval '1 day',lease_token=null,lease_expires_at=null");
 await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[unbound.order_id]);
 await db.query("update vendor_order_attempts set lease_expires_at=clock_timestamp()-interval '1 second' where order_id=$1",[unbound.order_id]);
 await db.query('begin');const p=(await db.query('select vendor_order_checkout_recovery_v1($1,$2) value',[unbound.order_id,randomUUID()])).rows[0].value;await db.query('rollback');
 const df=creationFixture(p);df.now=Math.floor(Date.now()/1000);df.discoveryPages={first:{object:'list',url:'/v1/checkout/sessions',has_more:false,data:[]}};
 const dr=await createOrderHttpRuntime(admin,df.stripe,df.config,false,true).queueTick();assert.equal(dr.receipt.result,'not_found');assert.equal(await binding(unbound.order_id),null);assert.ok(df.calls.every(c=>c.method==='GET'));
 assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:unbound.order_id})).data.stockState,'payment_pending');
 checks.push('real queued unbound discovery persists not_found after scoped SDK reads and keeps the original pending stock intact');
 await db.query('update vendor_order_reconcile_control set enabled=false');
 const paused=await post('status');assert.equal(paused.status,503);assert.ok((await paused.json()).alerts.includes('disabled'));
 assert.equal((await post('tick')).status,503);
 checks.push('process restart retains failures and doubles bounded retry delay; monitoring lists unresolved orders after queue pause and cannot activate work');
}
