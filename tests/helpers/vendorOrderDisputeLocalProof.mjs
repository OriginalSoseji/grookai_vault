import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordVendorCheckoutSignal,reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
import {readFulfillment} from '../../apps/web/src/lib/orders/orderFulfillment.ts';

export async function proveOrderDisputeEvidence({notifications=false,db,admin,ownerApi,buyerApi,owner,binding,provider,signalIds,checks}) {
 const target=(await db.query(`select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
  where o.paid and cardinality(o.review_reasons)=0 and r.state='consumed' and o.fulfillment='pickup'
  ${notifications?'and not public.vendor_order_notification_pending_v1(o.id)':''}
  and not exists(select 1 from vendor_order_fulfillment_events e where e.order_id=o.id) limit 1`)).rows[0];
 assert.ok(target,'Need a separate paid unfulfilled order for dispute proof');
 await db.query('update vendor_order_fulfillment_control set enabled=true');
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,true);
 const f=provider(await binding(target.id));
 const stable=async()=>JSON.stringify((await db.query(`select o.paid,r.state,r.instance_id,r.product_id,r.quantity,
 v.user_id,v.archived_at,p.available_quantity from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
 left join vault_item_instances v on v.id=r.instance_id left join vendor_store_custom_products p on p.id=r.product_id where o.id=$1`,[target.id])).rows[0]);
 const before=await stable(),d={object:'dispute',id:'du_localfinancial',charge:f.charge.id,payment_intent:f.intent.id,livemode:false,
 created:f.now,amount:1,currency:'usd',reason:'product_not_received',status:'needs_response',is_charge_refundable:false,
 evidence_details:{due_by:f.now+86400,has_evidence:false,past_due:false,submission_count:0},balance_transactions:[],
 evidence:{customer_email_address:'PRIVATE DISPUTE EMAIL'},metadata:{grookai_order_id:randomUUID()}};
 f.disputes.data=[d];assert.equal(f.charge.disputed,false);
 const e=f.event();e.type='charge.dispute.created';e.id='evt_'+randomUUID().replaceAll('-','');e.created=f.now;e.data.object=structuredClone(d);
 const signed=f.sign(e);signalIds.push(e.id);
 const sign=()=>recordVendorCheckoutSignal(admin,f.stripe,f.config,signed.payload,signed.signature,f.now*1000);
 const responses=await Promise.all([sign(),sign()]);for(const r of responses)assert.deepEqual(r,{orderId:target.id,ignored:false});
 await reconcileVendorOrder(admin,f.stripe,f.config,target.id);
 const reasons=async()=>(await db.query('select review_reasons from vendor_orders where id=$1',[target.id])).rows[0].review_reasons;
 assert.ok((await reasons()).includes('dispute_action_required'));assert.equal(await stable(),before);
 assert.equal((await readFulfillment(ownerApi,target.id)).canManage,false);
 await assert.rejects(db.query('select vendor_order_fulfillment_record_v1($1,$2,$3,0,$4)',[target.id,owner,randomUUID(),'ready_pickup']),/order_fulfillment_payment_unresolved/);
 checks.push('signed dispute signal maps only the original intent; actual SDK/SQL reconciliation catches a dispute despite false charge flag and blocks new fulfillment without changing paid/stock/ownership facts');
 for(const status of ['under_review','lost','won']) {
  d.status=status;d.evidence_details.has_evidence=true;d.evidence_details.submission_count=1;
  await reconcileVendorOrder(admin,f.stripe,f.config,target.id);assert.equal(await stable(),before);
  assert.equal((await readFulfillment(ownerApi,target.id)).canManage,false);
 }
 assert.ok((await reasons()).includes('dispute_lost'));
 assert.equal((await readFulfillment(buyerApi,target.id)).state,'unfulfilled');
 const observations=(await db.query('select evidence from vendor_order_observations where order_id=$1',[target.id])).rows;
 assert.doesNotMatch(JSON.stringify(observations),/PRIVATE DISPUTE|customer_email|grookai_order_id/);
 assert.ok((await db.query('select count(*) n from vendor_account_financial_holds where reference_id=$1',[target.id])).rows[0].n>0);
 await db.query('update vendor_order_fulfillment_control set enabled=false');
 checks.push('dispute status transitions keep append-only financial review and owner/buyer history; won does not silently clear prior loss/holds or restore stock');
}
