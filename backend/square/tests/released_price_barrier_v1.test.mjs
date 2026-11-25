import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SquareCommerceService} from '../commerce_service_v2.mjs';
import {SquareApiError} from '../client_v1.mjs';

function harness({recovery='review',race=false,allocation='released',selected=true,quantity=0,pending=null,offer=true}={}){
 const ownerId=randomUUID(),connectionId=randomUUID(),instanceId=randomUUID(),targetId=randomUUID(),calls=[],providerWrites=[];
 const now=Date.parse('2026-11-25T19:00:00Z');
 const target={id:targetId,instance_id:instanceId,item_id:'retained-item',variation_id:'retained-variation',selected,allocation_state:allocation};
 const state={target,allocation:{id:randomUUID(),state:allocation},offer:offer?{gvviId:'GVVI-FIXTURE0-000001',askingPrice:2000}:null,sellEnabled:selected,pending};
 const rpc=async(action,data)=>{
  calls.push({action,data:structuredClone(data)});
  if(action==='commerce_targets')return [target];
  if(action==='allocation')return structuredClone(state);
  if(action==='stock_prepare'){
   state.allocation.state=data.kind==='allocate'?'preparing':'withdrawing';
   state.pending={id:randomUUID(),kind:data.kind,payload:structuredClone(data.payload),status:'prepared',created_at:new Date(now).toISOString()};
   return structuredClone(state.pending);
  }
  if(action==='stock_begin'){state.pending.status='sending';return structuredClone(state.pending);}
  if(action==='stock_finish'){state.allocation.state=state.pending.kind==='allocate'?'active':'review';state.pending=null;}
  if(action==='stock_cancel_prepared'){state.allocation.state='released';state.pending=null;}
  return {recorded:true};
 };
 const client={inventoryQuantity:async()=>quantity,changeInventory:async payload=>{
  providerWrites.push(structuredClone(payload));quantity=Number(payload.changes[0].physical_count.quantity);
 }};
 const catalog={withConnection:async(o,c,fn)=>fn({connection:{id:connectionId,owner_id:ownerId,location_id:'fixture-location',auto_sync:true},context:{ownerId:o,connectionId:c,leaseToken:'fixture',fence:1},client}),
  syncPriceBatch:async()=>({status:recovery,acknowledged:0}),
  sync:async()=>{if(race)throw new SquareApiError('square_price_batch_pending');return {status:'unchanged'};}};
 const service=new SquareCommerceService({rpc,catalog,config:{commerceEnabled:true,catalogEnabled:true,priceBatchEnabled:false},now:()=>now});
 service.reconcile=async()=>({orderReviews:0});service.enroll=async()=>{};
 return {calls,providerWrites,state,run:()=>service.processConnection(ownerId,connectionId,{manual:true,focusInstanceId:instanceId})};
}

for(const scenario of [{recovery:'review'},{recovery:'paused'},{recovery:'idle',race:true}])test('real stock path cannot mint a released allocation while price recovery blocks: '+JSON.stringify(scenario),async()=>{
 const h=harness(scenario),result=await h.run();
 assert.equal(result.skipped,1);assert.equal(result.focusStatus,'pending');assert.equal(result.succeeded,0);
 assert.equal(h.providerWrites.length,0);assert.equal(h.state.allocation.state,'released');
 assert.ok(!h.calls.some(x=>x.action==='stock_prepare'||x.action==='stock_begin'));
 assert.ok(h.calls.some(x=>x.action==='target_checked'));
});
test('real released-copy stock allocation remains available after catalog pricing clears',async()=>{
 const h=harness({recovery:'idle'}),result=await h.run();
 assert.equal(result.focusStatus,'ready');assert.equal(h.providerWrites.length,1);assert.equal(h.state.allocation.state,'active');
 assert.equal(h.providerWrites[0].changes[0].physical_count.quantity,'1');
});
test('existing active stock still withdraws during unresolved pricing',async()=>{
 const h=harness({allocation:'active',selected:false,quantity:1,offer:false});await h.run();
 assert.equal(h.providerWrites.length,1);assert.equal(h.providerWrites[0].changes[0].physical_count.quantity,'0');
 assert.equal(h.state.allocation.state,'review');
});
test('an already accepted allocation still recovers from its saved operation without another stock write',async()=>{
 const pending={id:randomUUID(),kind:'allocate',status:'uncertain',created_at:'2026-11-25T18:59:00.000Z',payload:{idempotency_key:'saved-operation'}};
 const h=harness({allocation:'review',quantity:1,pending}),result=await h.run();
 assert.equal(result.focusStatus,'pending');assert.equal(h.providerWrites.length,0);assert.equal(h.state.pending,null);
 assert.ok(h.calls.some(x=>x.action==='stock_finish'));assert.ok(!h.calls.some(x=>x.action==='stock_prepare'||x.action==='stock_begin'));
});
