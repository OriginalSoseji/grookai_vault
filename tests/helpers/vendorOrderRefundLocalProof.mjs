import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordVendorCheckoutSignal,reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
import {readFulfillment} from '../../apps/web/src/lib/orders/orderFulfillment.ts';

export async function proveOrderRefundEvidence({notifications=false,db,admin,ownerApi,buyerApi,owner,binding,provider,signalIds,checks}) {
 const target=(await db.query(`select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
  where o.paid and cardinality(o.review_reasons)=0 and r.state='consumed' and o.fulfillment='pickup'
  ${notifications?'and not public.vendor_order_notification_pending_v1(o.id)':''}
  and not exists(select 1 from vendor_order_fulfillment_events e where e.order_id=o.id) limit 1`)).rows[0];
 assert.ok(target,'Need a paid unfulfilled order for refund regression');
 await db.query('update vendor_order_fulfillment_control set enabled=true');
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,true);
 const b=await binding(target.id),f=provider(b);
 const stable=async()=>JSON.stringify((await db.query(`select o.paid,r.state,r.instance_id,r.product_id,r.quantity,
  v.user_id,v.archived_at,p.available_quantity as product_quantity
  from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
  left join vault_item_instances v on v.id=r.instance_id left join vendor_store_custom_products p on p.id=r.product_id
  where o.id=$1`,[target.id])).rows[0]);
 const before=await stable();
 const refund={object:'refund',id:'re_localpending',charge:f.charge.id,payment_intent:f.intent.id,amount:1,currency:'usd',
  created:f.now,status:'pending',balance_transaction:null,pending_reason:'insufficient_funds',
  source_transfer_reversal:null,transfer_reversal:null,metadata:{grookai_order_id:randomUUID()}};
 f.refunds.data=[refund];assert.equal(f.charge.amount_refunded,0);
 const e=f.event('refund.created');e.created=f.now;e.id='evt_refund'+randomUUID().replaceAll('-','');e.data.object=refund;signalIds.push(e.id);
 const payload=JSON.stringify(e),signature=f.stripe.webhooks.generateTestHeaderString({payload,secret:f.config.webhookSecret,timestamp:f.now});
 const signal=()=>recordVendorCheckoutSignal(admin,f.stripe,f.config,payload,signature,f.now*1000);
 const calls=f.calls.length,results=await Promise.all([signal(),signal()]);
 for(const result of results)assert.deepEqual(result,{orderId:target.id,ignored:false});assert.equal(f.calls.length,calls);
 assert.equal((await db.query('select count(*) n from vendor_order_signals where event_id=$1',[e.id])).rows[0].n,'1');
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,!notifications,'Signals hold new fulfillment until checked; they do not change payment facts');
 assert.equal(await stable(),before);
 await reconcileVendorOrder(admin,f.stripe,f.config,target.id);
 const reasons=(await db.query('select review_reasons from vendor_orders where id=$1',[target.id])).rows[0].review_reasons;
 assert.ok(reasons.includes('refund_pending'));assert.equal(await stable(),before);
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,false);
 await assert.rejects(db.query('select vendor_order_fulfillment_record_v1($1,$2,$3,0,$4)',[target.id,owner,randomUUID(),'ready_pickup']),/order_fulfillment_payment_unresolved/);
 assert.ok((await db.query('select count(*) n from vendor_account_financial_holds where owner_id=$1',[owner])).rows[0].n>0);
 checks.push('signed refund event maps only its original intent and deduplicates once; actual scoped GET reconciliation detects pending zero-aggregate refund, retains stock/ownership and blocks fulfillment');
 for(const [status,reason] of [['failed','refund_failed'],['succeeded','refund_requires_reconciliation']]) {
  Object.assign(refund,{status,pending_reason:null,failure_reason:status==='failed'?'declined':null});
  if(status==='succeeded')f.charge.amount_refunded=1;
  await reconcileVendorOrder(admin,f.stripe,f.config,target.id);
  assert.ok((await db.query('select review_reasons from vendor_orders where id=$1',[target.id])).rows[0].review_reasons.includes(reason));
  assert.equal(await stable(),before);
 }
 assert.equal((await readFulfillment(buyerApi,target.id)).state,'unfulfilled');
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,false);
 assert.ok((await db.query('select count(*) n from vendor_order_observations where order_id=$1',[target.id])).rows[0].n>=3);
 await db.query('update vendor_order_fulfillment_control set enabled=false');
 checks.push('pending, failed and succeeded refund observations retain append-only payment history and prior review; buyer progress stays private, stock is never restored and financial holds remain');
}
