import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {squareOrderEvidence,squareTenderPaymentIds,squareRefundEvidence} from '../order_evidence_v2.mjs';
import {squareWebhookHint} from '../webhook_v2.mjs';
import {SquareCommerceService} from '../commerce_service_v2.mjs';
import {SquareApiError} from '../client_v1.mjs';
const usd=amount=>({amount,currency:'USD'}),locationId='fixture-location';
function fixtures(){return {
 order:{id:'order',location_id:locationId,state:'COMPLETED',version:2,total_money:usd(1334),
  line_items:[{uid:'line',catalog_object_id:'variation',quantity:'1',total_money:usd(1334),total_tax_money:usd(100),total_service_charge_money:usd(34)}],
  tenders:[{id:'payment',amount_money:usd(1334)}]},
 payments:[{id:'payment',order_id:'order',location_id:locationId,status:'COMPLETED',created_at:'2026-11-11T07:00:00Z',total_money:usd(1334),refunded_money:usd(0),customer_id:'private-customer',card_details:{card:{last_4:'1234'}}}],
 scope:{locationId,mappedVariationIds:['variation']}};}
test('settlement accepts actual POS tender IDs, excludes tax/service charges and retains no customer/card data',()=>{
 const f=fixtures();assert.deepEqual(squareTenderPaymentIds(f.order),['payment']);
 const value=squareOrderEvidence(f.order,f.payments,f.scope);assert.equal(value.state,'paid');assert.equal(value.lines[0].saleCents,1200);
 assert.equal(JSON.stringify(value).includes('private-customer'),false);assert.equal(JSON.stringify(value).includes('1234'),false);
});
test('pending/approved/failed payments and open/canceled orders never become a completed sale',()=>{
 for(const status of ['PENDING','APPROVED','CANCELED','FAILED']){const f=fixtures();f.payments[0].status=status;assert.equal(squareOrderEvidence(f.order,f.payments,f.scope).state,'pending');}
 for(const state of ['OPEN','DRAFT','CANCELED']){const f=fixtures();f.order.state=state;assert.equal(squareOrderEvidence(f.order,[],f.scope).state,state==='CANCELED'?'canceled':'pending');}
});
test('paid evidence preserves immutable payment creation and rejects missing or malformed sale clocks',()=>{
 const f=fixtures();assert.equal(squareOrderEvidence(f.order,f.payments,f.scope).payments[0].createdAt,'2026-11-11T07:00:00.000Z');
 for(const value of [undefined,'','not-a-date']){f.payments[0].created_at=value;assert.throws(()=>squareOrderEvidence(f.order,f.payments,f.scope),/square_payment_time_unconfirmed/);}
});
test('split tenders must exactly sum to the full order; cash supplied/change is never used as sale revenue',()=>{
 const f=fixtures();f.order.tenders=[{payment_id:'one',amount_money:usd(1000),cash_details:{buyer_supplied_money:usd(2000)}},{payment_id:'two',amount_money:usd(334)}];
 f.payments=[{...f.payments[0],id:'one',total_money:usd(1000)},{...f.payments[0],id:'two',total_money:usd(334)}];
 assert.equal(squareOrderEvidence(f.order,f.payments,f.scope).state,'paid');
 f.payments[1].total_money=usd(333);assert.throws(()=>squareOrderEvidence(f.order,f.payments,f.scope));
});
test('wrong location/order/currency, duplicate tenders, quantity2 and free ambiguous lines require review',()=>{
 for(const mutate of [f=>f.order.location_id='other',f=>f.payments[0].location_id='other',f=>f.payments[0].order_id='other',
  f=>f.order.total_money.currency='EUR',f=>f.order.line_items[0].quantity='2',f=>f.order.line_items[0].total_money=usd(0),
  f=>f.order.tenders.push(f.order.tenders[0]),f=>f.order.line_items.push({...f.order.line_items[0],uid:'different'})]){
  const f=fixtures();mutate(f);assert.throws(()=>squareOrderEvidence(f.order,f.payments,f.scope));
 }
});
test('mixed carts ignore unrelated manual lines and preserve original paid facts after a refund',()=>{
 const f=fixtures();f.order.line_items.push({uid:'manual',quantity:'10'});f.payments[0].refunded_money=usd(1334);
 const value=squareOrderEvidence(f.order,f.payments,f.scope);assert.equal(value.state,'paid');assert.equal(value.lines.length,1);assert.equal(value.payments[0].refundedCents,1334);
});
test('refund evidence is bound to authenticated payment/order/location and never changes stock itself',()=>{
 const f=fixtures(),refund={id:'refund',payment_id:'payment',location_id:locationId,status:'COMPLETED',amount_money:usd(1334)};
 assert.deepEqual(squareRefundEvidence(refund,f.payments[0],{locationId}),{id:'refund',orderId:'order',locationId,currency:'USD',status:'COMPLETED',amountCents:1334});
 assert.throws(()=>squareRefundEvidence({...refund,payment_id:'other'},f.payments[0],{locationId}));
});

const key='synthetic-subscription-key',url='https://example.org/api/square/webhook';
const event={event_id:'event-1',merchant_id:'merchant',type:'payment.updated',data:{id:'payment',object:{payment:{id:'payment',customer_id:'private-customer'}}}};
const signed=(value=event)=>{const body=Buffer.from(JSON.stringify(value));return {body,signature:createHmac('sha256',key).update(url).update(body).digest('base64'),key,notificationUrl:url,environment:'sandbox'};};
test('webhook validation binds exact URL/raw bytes and returns only minimal resource hints',()=>{
 const value=squareWebhookHint(signed());assert.equal(value.resourceId,'payment');assert.equal(value.type,'payment');
 assert.equal(JSON.stringify(value).includes('private-customer'),false);
 for(const change of [{notificationUrl:'https://example.org/other'},{body:Buffer.from(JSON.stringify(event)+' ')},{signature:'invalid'},{key:key+'wrong'}])assert.throws(()=>squareWebhookHint({...signed(),...change}));
});
test('signed unsupported event types are ignored; malformed identifiers and oversized bodies are rejected',()=>{
 assert.equal(squareWebhookHint(signed({...event,type:'customer.created'})),null);
 assert.throws(()=>squareWebhookHint(signed({...event,event_id:'../path'})));
 assert.throws(()=>squareWebhookHint({...signed(),body:Buffer.alloc(1048577)}));
});

const ownerId='b1000000-0000-4000-8000-000000000001',connectionId='b1000000-0000-4000-8000-000000000002',targetId='b1000000-0000-4000-8000-000000000003';
function stockHarness({acceptThenTimeout=false,existingQuantity=0,active=false,privateOffer=false}={}){
 const calls=[];let quantity=existingQuantity,writes=0;
 const now=Date.parse('2026-11-11T07:00:00Z');
 const state={target:{id:targetId,item_id:'item',variation_id:'variation'},allocation:active?{id:'allocation',state:'active'}:null,
  offer:privateOffer?null:{gvviId:'GVVI-DEMO0000-000001'},sellEnabled:true,pending:null};
 const rpc=async(action,data)=>{
  calls.push({action,data:structuredClone(data)});
  if(action==='allocation')return structuredClone(state);
  if(action==='stock_prepare'){
   state.allocation={id:'allocation',state:'preparing'};state.pending={id:'operation',kind:data.kind,payload:data.payload,status:'prepared',created_at:new Date(now).toISOString()};return structuredClone(state.pending);
  }
  if(action==='stock_begin'){state.pending.status='sending';return structuredClone(state.pending);}
  if(action==='stock_fail'){state.pending.status='uncertain';state.allocation.state='review';}
  if(action==='stock_finish'){state.allocation.state=state.pending.kind==='allocate'?'active':'review';state.pending=null;}
  if(action==='stock_cancel_prepared'){state.allocation.state='released';state.pending=null;}
  return {recorded:true};
 };
 const client={inventoryQuantity:async()=>quantity,changeInventory:async payload=>{
  assert.equal(calls.at(-1).action,'stock_begin');writes++;quantity=Number(payload.changes[0].physical_count.quantity);
  if(acceptThenTimeout)throw new SquareApiError('square_provider_unavailable',{uncertain:true});
 }};
 const catalog={withConnection:async(a,b,action)=>{assert.equal(a,ownerId);assert.equal(b,connectionId);return action({
  connection:{id:connectionId,owner_id:ownerId,location_id:locationId},context:{ownerId,connectionId,leaseToken:'fixture',fence:1},client});}};
 const service=()=>new SquareCommerceService({catalog,rpc,config:{commerceEnabled:true},now:()=>now});
 return {service,state,calls,get writes(){return writes;}};
}
test('one stock unit is durably prepared before sending and active readback never replenishes it again',async()=>{
 const h=stockHarness();assert.equal((await h.service().stock(ownerId,connectionId,targetId)).status,'ready');assert.equal(h.writes,1);
 assert.equal(h.calls.find(row=>row.action==='stock_prepare').data.payload.changes[0].physical_count.quantity,'1');
 assert.equal((await h.service().stock(ownerId,connectionId,targetId)).status,'ready');assert.equal(h.writes,1);
});
test('accepted stock write with lost response recovers by readback after restart without new request or count write',async()=>{
 const h=stockHarness({acceptThenTimeout:true});await assert.rejects(h.service().stock(ownerId,connectionId,targetId));
 assert.equal(h.state.pending.status,'uncertain');assert.equal(h.writes,1);
 assert.equal((await h.service().stock(ownerId,connectionId,targetId)).status,'stock_reconciled');assert.equal(h.writes,1);assert.equal(h.state.pending,null);
});
test('unknown existing Square stock and unexplained sold decrements never authorize allocation or replenishment',async()=>{
 for(const options of [{existingQuantity:1},{active:true,existingQuantity:0}]){
  const h=stockHarness(options);await assert.rejects(h.service().stock(ownerId,connectionId,targetId));assert.equal(h.writes,0);
 }
});
test('privacy loss withdraws stock to zero and retains the claim for offline-sale/physical-copy review',async()=>{
 const h=stockHarness({active:true,existingQuantity:1,privateOffer:true});
 assert.equal((await h.service().stock(ownerId,connectionId,targetId)).status,'withdrawn_review');assert.equal(h.writes,1);assert.equal(h.state.allocation.state,'review');
 assert.equal(h.calls.find(row=>row.action==='stock_prepare').data.payload.changes[0].physical_count.quantity,'0');
});

test('an allocated card with a failed catalog update records a failed run and exact safe diagnostic context',async()=>{
 const calls=[],instanceId='b1000000-0000-4000-8000-000000000004';
 const rpc=async(action,data)=>{
  calls.push({action,data:structuredClone(data)});
  if(action==='signals')return [];
  if(action==='commerce_targets')return [{id:targetId,instance_id:instanceId,selected:true,allocation_state:'active'}];
  if(action==='allocation')return {target:{item_id:'item',variation_id:'variation'},allocation:{state:'active'},offer:{gvviId:'GVVI-DEMO0000-000001'},sellEnabled:true,pending:null};
  return {recorded:true};
 };
 const catalog={withConnection:async(a,b,fn)=>fn({connection:{id:connectionId,owner_id:ownerId,location_id:locationId,created_at:'2026-11-10T00:00:00Z',auto_sync:true},context:{ownerId,connectionId},client:{recentOrders:async()=>[],recentRefunds:async()=>[],inventoryQuantity:async()=>1}}),
  sync:async()=>{const error=new SquareApiError('square_state_unavailable');error.databaseCode='42501';throw error;}};
 const service=new SquareCommerceService({catalog,rpc,config:{commerceEnabled:true,catalogEnabled:true}});
 const result=await service.processConnection(ownerId,connectionId,{focusInstanceId:instanceId});
 assert.equal(result.failed,1);assert.equal(result.succeeded,0);assert.equal(result.focusStatus,'review');
 const finished=calls.find(c=>c.action==='commerce_run_finish');assert.equal(finished.data.result.status,'failed');
 const detail=calls.filter(c=>c.action==='commerce_run_detail').at(-1).data;
 assert.equal(detail.ownerId,ownerId);assert.equal(detail.connectionId,connectionId);assert.equal(detail.targetId,targetId);assert.equal(detail.stage,'catalog');assert.equal(detail.databaseCode,'42501');
 assert.equal(detail.errorCode,'square_state_unavailable');assert.equal(JSON.stringify(detail).includes('token'),false);
 calls.length=0;catalog.sync=async()=>{throw new SquareApiError('square_connection_busy');};
 const busy=await service.processConnection(ownerId,connectionId,{focusInstanceId:instanceId});
 assert.equal(busy.failed,0);assert.equal(busy.skipped,1);assert.equal(busy.focusStatus,'pending');
 assert.equal(calls.find(c=>c.action==='commerce_run_finish').data.result.status,'succeeded');
 assert.equal(calls.find(c=>c.action==='commerce_run_finish').data.result.skipped,1);
});
