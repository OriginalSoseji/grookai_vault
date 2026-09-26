import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
import {reconcileVendorOrder,recordVendorCheckoutSignal} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
function repository(f,{conflicts=0}={}){
 const calls=[];return {calls,async rpc(name,params){
  calls.push({name,params});
  if(name==='vendor_order_refund_context_v1')return {data:{binding:{...structuredClone(f.order),revision:f.order.revision+1,paymentIntentId:f.intent.id,stockState:'consumed'},paid:true,requests:[]},error:null};
  if(name==='vendor_order_binding_v1')return {error:null,data:structuredClone(f.order)};
  if(name==='vendor_order_apply_v1'){
   if(conflicts-->0){f.order.revision++;return {error:{message:'order_revision_conflict'},data:null};}
   return {error:null,data:{id:f.order.orderId,revision:f.order.revision+1,paid:params.p_evidence.payment==='paid',review_reasons:params.p_evidence.reviewReasons}};
  }
  if(name==='vendor_order_signal_v1')return {error:null,data:null};
  if(name==='vendor_order_refund_observe_v1')return {error:null,data:null};
  assert.fail(name);
 }};
}
test('private service loads persisted order and passes only original verified evidence to scoped atomic apply',async()=>{
 const f=checkoutFixture(),r=repository(f),out=await reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now);
 assert.deepEqual(out,{orderId:f.order.orderId,revision:2,paid:true,needsReview:false});
 assert.deepEqual(r.calls.map(c=>c.name),['vendor_order_binding_v1','vendor_order_apply_v1','vendor_order_refund_observe_v1','vendor_order_refund_context_v1']);
 const apply=r.calls[1].params;assert.equal(apply.p_revision,1);assert.equal(apply.p_connected,f.order.seller.connectedAccountId);
 assert.equal(apply.p_evidence.stockAction,'consume');assert.doesNotMatch(JSON.stringify(out),/PRIVATE|pi_|ch_|acct_/);
});
test('revision conflict reloads and re-verifies all provider evidence before a bounded retry',async()=>{
 const f=checkoutFixture(),r=repository(f,{conflicts:1});await reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now);
 assert.equal(r.calls.length,6);assert.equal(r.calls[3].params.p_revision,2);assert.equal(r.calls[4].params.p_revision,3);assert.equal(f.calls.length,32);
 assert.equal(f.calls.filter(c=>c.path==='/v1/refunds').length,4,'Both attempts must re-read refund evidence twice');
 assert.notEqual(r.calls[1].params.p_evidence.orderHash,r.calls[3].params.p_evidence.orderHash);
});
test('repeated revision conflicts stop after two observations',async()=>{
 const f=checkoutFixture(),r=repository(f,{conflicts:9});await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now),/order_revision_conflict/);
 assert.equal(r.calls.length,4);assert.equal(f.calls.length,32);
 assert.equal(f.calls.filter(c=>c.path==='/v1/refunds').length,4);
});
for(const [label,mutate] of [
 ['wrong amount',f=>f.intent.amount++],['foreign seller',f=>f.account.id='acct_foreign'],
 ['provider failure',f=>f.fail='/v1/account'],['changed evidence',f=>f.onCall=c=>{if(c.path==='/v1/charges/ch_order')f.charge.amount_refunded++;}],
])test(`${label} cannot reach atomic apply`,async()=>{
 const f=checkoutFixture();mutate(f);const r=repository(f);await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now));
 assert.deepEqual(r.calls.map(c=>c.name),['vendor_order_binding_v1']);
});
for(const data of [null,{orderId:'44444444-4444-4444-8444-444444444445'}])test('missing or mismatched binding cannot call provider',async()=>{
 const f=checkoutFixture(),r={async rpc(){return {data,error:null};}};
 await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now),/order_not_bound/);assert.equal(f.calls.length,0);
});
test('private storage failures redact raw database details',async()=>{
 const f=checkoutFixture(),r={async rpc(){return {data:null,error:{message:'PRIVATE SQL OWNER EMAIL'}};}};
 await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>f.now),/^VendorOrderError: order_storage_unavailable$/);
});
test('stale process observation is rejected before persistence',async()=>{
 const f=checkoutFixture(),r=repository(f);let n=0;
 await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,f.order.orderId,()=>++n>30?f.now+60:f.now));
 assert.equal(r.calls.length,1);
});
test('invalid order ID is rejected without storage or provider access',async()=>{
 const f=checkoutFixture(),r=repository(f);await assert.rejects(reconcileVendorOrder(r,f.stripe,f.config,'invalid'),/order_invalid/);
 assert.equal(r.calls.length,0);assert.equal(f.calls.length,0);
});
test('signal writes only verified scope/resource lookup, never buyer/order/vendor metadata',async()=>{
 const f=checkoutFixture(),r=repository(f),event=f.event();event.data.object.metadata={grookai_order_id:'FORGED'};
 const signed=f.sign(event);assert.deepEqual(await recordVendorCheckoutSignal(r,f.stripe,f.config,signed.payload,signed.signature,f.now*1000),{orderId:null,ignored:false});
 assert.equal(r.calls[0].params.p_resource,f.order.sessionId);assert.equal(r.calls[0].params.p_platform,f.config.scope.accountId);
 assert.doesNotMatch(JSON.stringify(r.calls),/FORGED/);assert.equal(f.calls.length,0);
});
test('tampered signed signal never reaches storage',async()=>{
 const f=checkoutFixture(),r=repository(f),signed=f.sign(f.event());
 await assert.rejects(recordVendorCheckoutSignal(r,f.stripe,f.config,signed.payload+' ',signed.signature,f.now*1000),/checkout_signature_invalid/);assert.equal(r.calls.length,0);
});
test('subscription signals are ignored rather than made into orders',async()=>{
 const f=checkoutFixture(),r=repository(f),signed=f.sign({...f.event(),type:'customer.subscription.updated'});
 assert.deepEqual(await recordVendorCheckoutSignal(r,f.stripe,f.config,signed.payload,signed.signature,f.now*1000),{orderId:null,ignored:true});assert.equal(r.calls.length,0);
});
