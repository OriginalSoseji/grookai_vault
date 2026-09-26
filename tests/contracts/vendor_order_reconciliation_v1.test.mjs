import test from 'node:test';import assert from 'node:assert/strict';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
import {reconcileVendorOrderPage} from '../../apps/web/src/lib/payments/vendorOrderReconciliation.ts';
function fixture(){
 const f=checkoutFixture(),rows=[{order_id:f.order.orderId,stripe_account_id:f.config.scope.accountId,livemode:false,session_id:f.order.sessionId}];
 const filters=[],calls=[];const q={};for(const method of ['select','eq','not','order','limit','gt'])q[method]=(...args)=>{filters.push([method,...args]);return q;};
 q.then=(resolve,reject)=>Promise.resolve({data:rows,error:null}).then(resolve,reject);
 const admin={from(table){assert.equal(table,'vendor_order_attempts');return q;},async rpc(name,params){calls.push(name);
  if(name==='vendor_order_refund_context_v1')return {data:{binding:{...structuredClone(f.order),revision:f.order.revision+1,paymentIntentId:f.intent.id,stockState:'consumed'},paid:true,requests:[]},error:null};
  if(name==='vendor_order_binding_v1')return {data:structuredClone(f.order),error:null};
  if(name==='vendor_order_apply_v1')return {data:{id:params.p_order_id,revision:2,paid:true,review_reasons:[]},error:null};
  if(name==='vendor_order_refund_observe_v1'){assert.equal(params.p_revision,2);assert.equal(params.p_inventory.complete,true);return {data:null,error:f.refundFailure?{message:'PRIVATE DATABASE FAILURE'}:null};}assert.fail(name);
 }};
 return {f,rows,filters,calls,q,admin,run:(input={},now=()=>f.now)=>reconcileVendorOrderPage(admin,f.stripe,f.config,input,now)};
}
test('bounded sweep reads only scoped durable bindings and returns no raw payment evidence',async()=>{
 const x=fixture(),r=await x.run();assert.deepEqual(r,{succeeded:[x.f.order.orderId],failed:[],next:null,complete:true,budgetExhausted:false});
 assert.ok(x.filters.some(a=>JSON.stringify(a)===JSON.stringify(['eq','stripe_account_id',x.f.config.scope.accountId])));
 assert.ok(x.filters.some(a=>JSON.stringify(a)===JSON.stringify(['eq','livemode',false])));
 assert.ok(x.filters.some(a=>JSON.stringify(a)===JSON.stringify(['not','session_id','is',null])));
 assert.ok(x.filters.some(a=>JSON.stringify(a)===JSON.stringify(['limit',11])));assert.doesNotMatch(JSON.stringify(r),/PRIVATE|cs_|pi_|acct_/);
});
for(const input of [{limit:0},{limit:26},{limit:1.1},{after:'invalid'},{after:'44444444-4444-4444-8444-444444444444 OR true'}])test(`invalid bounds ${JSON.stringify(input)} never access storage/provider`,async()=>{
 const x=fixture();await assert.rejects(x.run(input),/order_reconcile_invalid/);assert.equal(x.filters.length,0);assert.equal(x.f.calls.length,0);
});
test('one extra row produces exact continuation cursor and no skipped provider work',async()=>{
 const x=fixture();x.rows.push({...x.rows[0],order_id:'55555555-5555-4555-8555-555555555555'});
 const r=await x.run({limit:1});assert.equal(r.next,x.f.order.orderId);assert.equal(r.complete,false);assert.equal(r.succeeded.length,1);
 assert.deepEqual(x.calls,['vendor_order_binding_v1','vendor_order_apply_v1','vendor_order_refund_observe_v1','vendor_order_refund_context_v1']);
});
test('refund projection failure after payment apply keeps the order in retry results',async()=>{
 const x=fixture();x.f.refundFailure=true;const r=await x.run();assert.deepEqual(r.failed,[x.f.order.orderId]);assert.deepEqual(r.succeeded,[]);
 assert.deepEqual(x.calls,['vendor_order_binding_v1','vendor_order_apply_v1','vendor_order_refund_observe_v1']);assert.doesNotMatch(JSON.stringify(r),/PRIVATE/);
});
test('opaque database errors are redacted',async()=>{
 const x=fixture();x.q.then=(r,j)=>Promise.resolve({data:null,error:{message:'PRIVATE OWNER'}}).then(r,j);
 await assert.rejects(x.run(),/^VendorOrderError: order_storage_unavailable$/);
});
for(const [field,value] of [['order_id','invalid'],['stripe_account_id','acct_foreign'],['livemode',true],['session_id','cs_live_foreign'],['session_id',null]])test(`scope integrity rejects ${field}`,async()=>{
 const x=fixture();x.rows[0][field]=value;await assert.rejects(x.run(),/order_reconcile_scope_mismatch/);assert.equal(x.calls.length,0);
});
test('duplicate or out-of-order rows cannot skip work',async()=>{const x=fixture();x.rows.push({...x.rows[0]});await assert.rejects(x.run(),/order_reconcile_scope_mismatch/);});
test('cursor requires strictly later rows',async()=>{const x=fixture();await assert.rejects(x.run({after:x.f.order.orderId}),/order_reconcile_scope_mismatch/);});
test('failed provider read returns order for retry without exposing error details',async()=>{
 const x=fixture();x.f.fail='/v1/account';const r=await x.run();assert.deepEqual(r.failed,[x.f.order.orderId]);assert.equal(r.succeeded.length,0);assert.equal(x.calls.length,1);
});
test('elapsed budget before first order retains original cursor and reports incomplete',async()=>{
 const x=fixture();let calls=0;const r=await x.run({},()=>calls++?x.f.now+60:x.f.now);
 assert.equal(r.budgetExhausted,true);assert.equal(r.complete,false);assert.equal(r.next,null);assert.equal(x.calls.length,0);
});
test('clock regression fails closed before starting provider work',async()=>{
 const x=fixture();let calls=0;const r=await x.run({},()=>calls++?x.f.now-1:x.f.now);assert.equal(r.complete,false);assert.equal(x.f.calls.length,0);
});
test('empty page completes without provider access',async()=>{const x=fixture();x.rows.length=0;const r=await x.run();assert.equal(r.complete,true);assert.equal(x.f.calls.length,0);});
