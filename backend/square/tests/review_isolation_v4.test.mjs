import test from 'node:test';import assert from 'node:assert/strict';
import {SquareCommerceService} from '../commerce_service_v2.mjs';import {SquareApiError} from '../client_v1.mjs';
const ownerId='b1000000-0000-4000-8000-000000000001',connectionId='b1000000-0000-4000-8000-000000000002',targetId='b1000000-0000-4000-8000-000000000003';
const instanceId='b1000000-0000-4000-8000-000000000004',location='fixture-location',usd=amount=>({amount,currency:'USD'});
const order=(id,variation,quantity='1',amount=1000)=>({id,location_id:location,state:'COMPLETED',version:1,total_money:usd(1000),
 line_items:[{uid:'line-'+id,catalog_object_id:variation,quantity,total_money:usd(amount)}],tenders:[{id:'pay-'+id,amount_money:usd(1000)}]});
function harness({badQuantity='2',badAmount=1000,providerFailure=false,reviewFailure=false,refundSignal=false}={}){
 const calls=[],bad=order('bad','bad-variation',badQuantity,badAmount),good=order('good','good-variation'),paid=new Set();let quantity=0,pending;
 const client={order:async id=>id==='bad'?bad:good,payment:async id=>{
  if(providerFailure&&id==='pay-bad')throw new SquareApiError('square_provider_unavailable');
  return {id,order_id:id==='pay-bad'?'bad':'good',location_id:location,status:'COMPLETED',created_at:'2026-11-11T07:00:00Z',total_money:usd(1000)};
 },refund:async()=>({id:'refund-bad',payment_id:'pay-bad',location_id:location,status:'COMPLETED',amount_money:usd(1000)}),
 recentOrders:async()=>[bad,good],recentRefunds:async()=>refundSignal?[await client.refund()]:[],inventoryQuantity:async()=>quantity,
 changeInventory:async body=>{quantity=Number(body.changes[0].physical_count.quantity);}};
 const rpc=async(action,data)=>{
  calls.push({action,data:structuredClone(data)});
  if(action==='signals')return [{event_id:'bad-signal',resource_type:refundSignal?'refund':'order',resource_id:refundSignal?'refund-bad':'bad'}];
  if(action==='order_variations')return data.variationIds.filter(id=>['bad-variation','good-variation'].includes(id));
  if(action==='order_observe'){
   if(data.evidence.state==='review'&&reviewFailure)throw new SquareApiError('square_state_unavailable');
   if(data.evidence.state==='paid')paid.add(data.evidence.id);
   return {recorded:true};
  }
  if(action==='commerce_targets')return [{id:targetId,instance_id:instanceId,selected:true}];
  if(action==='allocation')return {target:{item_id:'new-item',variation_id:'new-variation'},allocation:null,offer:{gvviId:'GVVI-DEMO0000-000001'},sellEnabled:true,pending:null};
  if(action==='stock_prepare'){pending={id:'operation',kind:data.kind,payload:data.payload,status:'prepared'};return pending;}
  if(action==='stock_begin')return {...pending,status:'sending'};
  return {recorded:true};
 };
 const catalog={withConnection:async(a,b,fn)=>fn({connection:{id:connectionId,owner_id:ownerId,location_id:location,created_at:'2026-11-10T00:00:00Z',auto_sync:true},context:{ownerId,connectionId},client}),
 sync:async()=>({status:'synchronized'})};
 return {calls,paid,service:new SquareCommerceService({catalog,rpc,config:{commerceEnabled:true,catalogEnabled:true},now:()=>Date.parse('2026-11-11T08:00:00Z')})};
}

test('quantity2 and zero-price orders persist scoped review while signals, valid sales and a new listing continue',async()=>{
 for(const options of [{badQuantity:'2'},{badQuantity:'1',badAmount:0}]){
  const h=harness(options),result=await h.service.processConnection(ownerId,connectionId,{focusInstanceId:instanceId});
  assert.equal(result.focusStatus,'ready');assert.equal(result.failed,0);assert.equal(result.orderReviews,1);assert.deepEqual([...h.paid],['good']);
  const review=h.calls.find(row=>row.action==='order_observe'&&row.data.evidence.state==='review').data.evidence;
  assert.deepEqual(review.lines,[{variationId:'bad-variation'}]);assert.equal(review.errorCode,'square_sale_requires_review');
  assert.equal(h.calls.find(row=>row.action==='signal_done').data.errorCode,'square_sale_requires_review');
  assert.ok(h.calls.some(row=>row.action==='cursor'));assert.ok(h.calls.some(row=>row.action==='stock_finish'));
 }
});

test('reviewed orders also drain refund hints and the independent refund feed without fabricating a sale',async()=>{
 const h=harness({refundSignal:true}),result=await h.service.reconcile(ownerId,connectionId);
 assert.equal(result.orderReviews,1);assert.deepEqual([...h.paid],['good']);
 assert.equal(h.calls.some(row=>row.action==='refund_observe'),false);
 assert.ok(h.calls.some(row=>row.action==='signal_done'));assert.ok(h.calls.some(row=>row.action==='cursor'));
});

test('provider outages and failed review persistence retain the signal and cursor for retry',async()=>{
 for(const options of [{providerFailure:true},{reviewFailure:true}]){
  const h=harness(options);await assert.rejects(h.service.reconcile(ownerId,connectionId),/square_provider_unavailable|square_state_unavailable/);
  assert.equal(h.calls.some(row=>row.action==='signal_done'),false);assert.equal(h.calls.some(row=>row.action==='cursor'),false);
  if(options.providerFailure)assert.equal(h.calls.some(row=>row.action==='order_observe'),false);
 }
});
