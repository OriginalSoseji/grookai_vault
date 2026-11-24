import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {SquareCommerceService} from '../commerce_service_v2.mjs';import {SquareApiError} from '../client_v1.mjs';
function harness({automatic=true,recovery={status:'idle',acknowledged:0},admission={status:'synced',acknowledged:25},targets,priceEnabled=true,catalogError,stockError}={}){
 const calls=[],owner=randomUUID(),connection=randomUUID();targets??=Array.from({length:5},()=>({id:randomUUID(),instance_id:randomUUID(),selected:true,allocation_state:'active'}));
 let terminal;
 const catalog={withConnection:async(o,c,fn)=>fn({connection:{auto_sync:automatic},context:{ownerId:o,connectionId:c}}),
  syncPriceBatch:async(o,c,options)=>{calls.push(options.admit?'admit':'recover');const value=options.admit?admission:recovery;if(value instanceof Error)throw value;return value;},
  sync:async()=>{calls.push('single');if(catalogError)throw catalogError;return {status:'unchanged'};},
  syncArtwork:async()=>{calls.push('artwork');return {status:'current'};}};
 const rpc=async(action,data)=>{if(action==='commerce_targets'){calls.push('read');return targets;}
  if(action==='commerce_run_finish')terminal=data.result;return {recorded:true};};
 const service=new SquareCommerceService({catalog,rpc,config:{catalogEnabled:true,commerceEnabled:true,priceBatchEnabled:priceEnabled}});
 service.reconcile=async()=>{calls.push('settle');return {orderReviews:0};};service.enroll=async()=>{calls.push('enroll');};
 service.stock=async()=>{calls.push('stock');if(stockError)throw stockError;return {status:'ready'};};
 return {calls,targets,owner,connection,service,terminal:()=>terminal,run:options=>service.processConnection(owner,connection,options)};
}
test('settlement and ordinary stock checks precede one admitted batch;25 prices never inflate checked-target counts',async()=>{
 const h=harness(),r=await h.run();assert.deepEqual(h.calls.slice(0,4),['settle','enroll','recover','read']);assert.equal(h.calls.at(-1),'admit');assert.equal(h.calls.filter(x=>x==='stock').length,5);
 assert.equal(r.priceBatch.acknowledged,25);assert.equal(r.succeeded+r.failed+r.skipped,5);assert.equal(h.terminal().succeeded,5);assert.equal(h.terminal().failed,0);
});
test('focused and manual work recover saved parents without admitting unrelated price batches',async()=>{
 for(const manual of [false,true]){const h=harness(),r=await h.run({manual,focusInstanceId:h.targets[0].instance_id});assert.ok(h.calls.includes('recover'));assert.ok(!h.calls.includes('admit'));assert.equal(r.focusStatus,'ready');}
 const h=harness();await h.run({manual:true});assert.ok(!h.calls.includes('admit'));
});
test('disabled new admission and paused automatic sync still discover existing parents',async()=>{
 for(const options of [{priceEnabled:false},{automatic:false}]){const h=harness(options);await h.run();assert.equal(h.calls.filter(x=>x==='recover').length,1);assert.ok(!h.calls.includes('admit'));}
});
test('recovering one25-member parent never starts another parent in the same invocation',async()=>{
 const h=harness({recovery:{status:'reconciled',acknowledged:25}}),r=await h.run();assert.ok(!h.calls.includes('admit'));assert.equal(r.priceBatch.acknowledged,25);assert.equal(r.succeeded+r.failed+r.skipped,5);
});
test('unresolved catalog uncertainty leaves existing stock reachable and never advertises focused POS readiness',async()=>{
 const h=harness({recovery:{status:'review',acknowledged:0}}),r=await h.run({focusInstanceId:h.targets[0].instance_id});assert.equal(h.calls.filter(x=>x==='stock').length,5);assert.ok(!h.calls.includes('single'));assert.ok(!h.calls.includes('artwork'));assert.equal(r.focusStatus,'pending');assert.equal(r.succeeded,0);assert.equal(r.skipped,5);assert.equal(r.batchReview,true);
});
test('an unresolved parent cannot create positive stock for a new unallocated target',async()=>{
 const h=harness({recovery:{status:'review',acknowledged:0},targets:[{id:randomUUID(),instance_id:randomUUID(),selected:true,allocation_state:null}]});const r=await h.run();assert.ok(!h.calls.includes('stock'));assert.ok(!h.calls.includes('single'));assert.equal(r.skipped,1);
});
test('price-provider failure remains durable while continuing existing stock work; its failure is not a checked price count',async()=>{
 const h=harness({recovery:new SquareApiError('square_provider_unavailable')}),r=await h.run();assert.equal(h.calls.filter(x=>x==='stock').length,5);assert.equal(r.batchFailures,1);assert.equal(r.skipped,5);assert.equal(h.terminal().status,'failed');assert.equal(h.terminal().failed,0);assert.equal(r.errorCode,'square_provider_unavailable');
});
test('malformed batch acknowledgements fail closed without crediting25 checked targets',async()=>{
 const h=harness({admission:{status:'synced',acknowledged:26}}),r=await h.run();assert.equal(r.batchFailures,1);assert.equal(r.succeeded+r.failed+r.skipped,5);assert.equal(h.terminal().status,'failed');
});
test('a batch started after the initial read cannot bypass the database barrier or double count a stock failure',async()=>{
 const h=harness({catalogError:new SquareApiError('square_price_batch_pending'),stockError:new SquareApiError('square_stock_unconfirmed')}),r=await h.run();assert.equal(r.failed,5);assert.equal(r.skipped,0);assert.equal(r.succeeded+r.failed+r.skipped,5);
});
test('a racing parent keeps focused active stock pending even when the existing stock check returns ready',async()=>{
 const h=harness({catalogError:new SquareApiError('square_price_batch_pending')}),r=await h.run({focusInstanceId:h.targets[0].instance_id});assert.equal(r.focusStatus,'pending');assert.equal(r.skipped,5);assert.ok(!h.calls.includes('artwork'));
});

test('batch review and failure never overflow a25-target manual journal',async()=>{
 for(const recovery of [{status:'review',acknowledged:0},new SquareApiError('square_provider_unavailable')]){
  const targets=Array.from({length:25},()=>({id:randomUUID(),instance_id:randomUUID(),selected:true,allocation_state:'active'}));
  const h=harness({recovery,targets}),r=await h.run({maxTargets:25,manual:true});
  assert.equal(r.skipped,25);assert.equal(h.terminal().skipped,25);assert.equal(h.terminal().failed,0);
  assert.equal(h.terminal().status,recovery instanceof Error?'failed':'succeeded');assert.ok(!h.calls.includes('admit'));
 }
});

test('batch outcomes do not overflow or inflate the25-target manual journal',async()=>{
 for(const recovery of [{status:'review',acknowledged:0},new SquareApiError('square_provider_unavailable')]){
  const targets=Array.from({length:25},()=>({id:randomUUID(),instance_id:randomUUID(),selected:true,allocation_state:'active'}));
  const h=harness({targets,recovery}),r=await h.run({manual:true,maxTargets:25});
  assert.equal(r.succeeded+r.failed+r.skipped,25);assert.equal(h.terminal().skipped,25);assert.equal(h.terminal().failed,0);
  assert.equal(h.terminal().status,recovery instanceof Error?'failed':'succeeded');
 }
});
