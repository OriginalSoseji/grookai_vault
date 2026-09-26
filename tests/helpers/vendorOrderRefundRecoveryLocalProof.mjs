import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {refundFixture} from './vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
import {createOrderQueueRepository,createOrderQueueService} from '../../apps/web/src/lib/payments/vendorOrderQueue.ts';

export async function proveOrderRefundRecovery({db,admin,ownerApi,buyerApi,owner,ids,copies,create,bind,provider,race,checks}) {
 await db.query('update vendor_order_refunds_control set enabled=true');
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);
 const created=await create(copies[29]),b=await bind(created),source=provider(b),f=refundFixture(),id=b.orderId;
 for(const key of ['order','config','platform','account','session','lines','intent','charge','now','balance','platformBalance'])f[key]=source[key];
 // Earlier groups share this synthetic seller; provider IDs must be unique
 // across the whole account, not restart at re_1 for each fixture instance.
 const addRefund=f.addRefund;
 f.addRefund=(...args)=>{const r=addRefund(...args);r.id='re_'+id.replaceAll('-','')+f.refunds.data.length;return r;};
 const clock=()=>Math.floor(Date.now()/1000),service=createOrderRefundService(admin,f.stripe,f.config,{enabled:true,now:clock});
 await reconcileVendorOrder(admin,f.stripe,f.config,id,clock);
 const command={orderId:id,requestId:randomUUID(),amountMinor:100,reason:'requested_by_customer'};
 f.postMode='absent';await assert.rejects(service.create(command,owner),/order_refund_provider_uncertain/);
 // Age only this synthetic request; no consumed baseline/reset helper is used.
 await db.query('begin');await db.query('set local session_replication_role=replica');
 await db.query("update vendor_order_refund_requests set creation_started_at=clock_timestamp()-interval '24 hours',lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[command.requestId]);
 await db.query('commit');
 await db.query('update vendor_order_refunds_control set enabled=false');
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
 await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);
 const snapshot=async()=>JSON.stringify((await db.query(`select o.paid,r.state,r.quantity,v.user_id,v.archived_at
  from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
  join vault_item_instances v on v.id=r.instance_id where o.id=$1`,[id])).rows);
 const initial=await snapshot(),posts=f.calls.filter(c=>c.method==='POST').length;
 let lastFailure=null;
 const queue=createOrderQueueService({repo:createOrderQueueRepository(admin,f.config),enabled:true,
  reconcile:async orderId=>{try{return await reconcileVendorOrder(admin,f.stripe,f.config,orderId,clock);}
   catch(error){lastFailure=error.message;throw error;}},discover:async()=>{throw Error('Unexpected unbound checkout');}});
 await db.query('update vendor_order_reconcile_control set enabled=true');
 const focus=async()=>{
  await admin.rpc('vendor_order_reconcile_seed_v1',{p_platform:f.config.scope.accountId,p_live:false,p_limit:100});
  await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()+interval '2 days',lease_token=null,lease_expires_at=null");
  await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[id]);
 };
 const tick=async()=>{f.now=clock();lastFailure=null;await focus();const result=await queue.tick();assert.equal(result.receipt.orderId,id);return result;};
 assert.equal((await tick()).receipt.result,'needs_review');
 let row=(await db.query('select * from vendor_order_refund_requests where id=$1',[command.requestId])).rows[0];
 assert.equal(row.status,'unbound');assert.equal(row.refund_id,null);assert.equal(await snapshot(),initial);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,posts);
 checks.push('actual queue keeps a 24-hour uncertain refund unresolved on empty provider inventory, reports needs_review, and neither reissues nor changes paid stock despite disabled issuance/acquisition/packages');

 const leaseSql='select to_jsonb(vendor_order_refund_recovery_v1($1,$2,$3)) value';
 const [winner]=await race(leaseSql,[id,command.requestId,randomUUID()],leaseSql,[id,command.requestId,randomUUID()],{error:/order_refund_busy/});
 f.refundStatus='pending';f.now=clock();f.addRefund(command.requestId,100);
 assert.equal((await tick()).receipt.result,'retry');
 assert.equal((await db.query('select refund_id from vendor_order_refund_requests where id=$1',[command.requestId])).rows[0].refund_id,null);
 await db.query("update vendor_order_refund_requests set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[command.requestId]);
 assert.equal((await tick()).receipt.result,'needs_review',lastFailure);
 row=(await db.query('select * from vendor_order_refund_requests where id=$1',[command.requestId])).rows[0];
 assert.equal(row.status,'pending');assert.equal(row.refund_id,f.refunds.data[0].id);assert.ok(Number(row.lease_fence)>Number(winner.rows[0].value.lease_fence));
 assert.equal((await buyerApi.rpc('vendor_order_refund_status_v1',{p_order_id:id})).data.pendingMinor,100);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,posts);assert.equal(await snapshot(),initial);
 checks.push('competing SQL recovery leases serialize; automatic queue retry cannot steal an active lease, then recovers the unique late provider match after expiry with original account/charge/amount and no second POST');

 f.refunds.data[0].status='failed';assert.equal((await tick()).receipt.result,'needs_review');
 assert.equal((await db.query('select status from vendor_order_refund_requests where id=$1',[command.requestId])).rows[0].status,'failed');
 const holdsBefore=JSON.stringify((await db.query('select * from vendor_account_financial_holds where reference_id=$1 order by id',[id])).rows);
 const observationsBefore=(await db.query('select count(*) n from vendor_order_observations where order_id=$1',[id])).rows[0].n;
 const review=await service.reviewResolution(id,owner);assert.equal(review.decision,'operator_review_required');
 assert.equal(review.permitsFulfillment,false);assert.equal(review.clearsFinancialHolds,false);
 assert.equal(JSON.stringify((await db.query('select * from vendor_account_financial_holds where reference_id=$1 order by id',[id])).rows),holdsBefore);
 assert.equal((await db.query('select count(*) n from vendor_order_observations where order_id=$1',[id])).rows[0].n,observationsBefore);
 assert.equal((await ownerApi.rpc('vendor_order_fulfillment_status_v1',{p_order_id:id})).data.paymentReady,false);
 assert.equal(await snapshot(),initial);assert.equal(f.calls.filter(c=>c.method==='POST').length,posts);
 await assert.rejects(service.reviewResolution(id,b.buyerId),/unavailable/);
 checks.push('queue observes failed outcome without erasing pending-refund history; read-only owner review cannot clear financial holds or permit fulfillment, buyer cannot invoke owner review, and original stock/ownership remain unchanged');
 await db.query('update vendor_order_reconcile_control set enabled=false');
}
