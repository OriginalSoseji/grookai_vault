import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planSquareCatalog,squareManagedProjection} from '../catalog_plan_v1.mjs';
import {planSquarePriceBatches} from '../catalog_price_batch_plan_v1.mjs';
import {processSquarePriceBatch} from '../price_batch_service_v1.mjs';
import {SquareClient,SquareApiError} from '../client_v1.mjs';

function fixture({started=false,enabled=true,providerError=null,observeStatuses=[],beginError=null,receiptFailure=false}={}) {
  const scope={ownerId:'owner-batch',merchantId:'merchant-batch',locationId:'location-batch',environment:'sandbox'};
  const old={ownerId:scope.ownerId,gvviId:'GVVI-WORKERLAB-000001',selected:true,publicVendorOffer:true,available:true,
    name:'Local card',variationName:'NM',askingPriceAmount:'1',currency:'USD'};
  const item=planSquareCatalog({scope,offers:[old],catalog:{scope,complete:true,items:[]}}).actions[0].request.object;
  item.id='worker-item';item.version=100;Object.assign(item.item_data.variations[0],{id:'worker-variation',version:100});
  item.item_data.variations[0].item_variation_data.item_id=item.id;item.item_data.description='Keep seller note';
  const offer={...old,askingPriceAmount:'2'};
  const target={id:'target-worker',instance_id:'instance-worker',item_id:item.id,variation_id:'worker-variation',last_synced_projection:squareManagedProjection(item,item.item_data.variations[0])};
  const plan=planSquarePriceBatches({scope,offers:[offer],catalog:{scope,complete:true,items:[item]},
    mappings:[{scope,gvviId:offer.gvviId,itemId:item.id,variationId:'worker-variation',lastSyncedProjection:target.last_synced_projection}]}).batches[0];
  const batch={id:'batch-worker',plan,members:plan.members,request_text:JSON.stringify(plan.request),request_hash:plan.requestHash,
    status:started?'uncertain':'prepared',started_at:started?'2026-11-23T00:00:00Z':null};
  const response=structuredClone(plan.request.batches[0].objects);response[0].version++;response[0].item_data.variations[0].version++;
  const calls=[],errors=[];let pending=started?batch:null;let observes=0;
  const args={connection:{owner_id:scope.ownerId,merchant_id:scope.merchantId,location_id:scope.locationId,environment:'sandbox'},
    context:{ownerId:scope.ownerId,connectionId:'connection-worker',leaseToken:'lease-worker',fence:8},enabled,
    client:{itemsForExactSkus:async()=>{calls.push('read');return [structuredClone(item)];},
      upsertPriceBatch:async(text,hash)=>{calls.push('send');assert.equal(text,batch.request_text);assert.equal(hash,batch.request_hash);if(providerError)throw providerError;return {objects:response};}},
    rpc:async(action,data)=>{calls.push(action);assert.equal(data.fence,8);assert.equal(data.leaseToken,'lease-worker');
      if(action==='price_batch_state')return {pending,admissionEnabled:true,legacyPending:false,candidates:[{target,offer}]};
      if(action==='price_batch_prepare'){assert.equal(data.requestText,batch.request_text);assert.equal(data.bindings[0].targetId,target.id);assert.deepEqual(data.bindings[0].previousObject,item);pending=batch;return batch;}
      if(action==='price_batch_begin'){if(beginError)throw beginError;return {batch,attempt:{id:'attempt-worker'}};}
      if(action==='price_batch_observe'){observes++;if(receiptFailure)throw new SquareApiError('square_state_unavailable');return {...batch,status:observeStatuses.shift()??'succeeded'};}
      if(action==='price_batch_failure'){errors.push(data);return {...batch,status:'uncertain'};}
      throw Error(action);
    }};
  return {args,batch,calls,errors,get observes(){return observes;}};
}

test('saves complete request before begin and sends literal committed bytes',async()=>{
  const f=fixture();assert.deepEqual(await processSquarePriceBatch(f.args),{status:'synced',acknowledged:1});
  assert.deepEqual(f.calls,['price_batch_state','read','price_batch_prepare','price_batch_begin','send','price_batch_observe']);
});
test('disabled admission still discovers and reconciles a stored parent',async()=>{
  const f=fixture({started:true,enabled:false});assert.equal((await processSquarePriceBatch(f.args)).status,'reconciled');
  assert.deepEqual(f.calls,['price_batch_state','read','price_batch_observe']);
});
test('disabled new admission never reads or dispatches without a parent',async()=>{
  const f=fixture({enabled:false});assert.equal((await processSquarePriceBatch(f.args)).status,'idle');assert.deepEqual(f.calls,['price_batch_state']);
});
test('restart reads all saved members before retrying the original body/key',async()=>{
  const f=fixture({started:true,enabled:false,observeStatuses:['uncertain','succeeded']});assert.equal((await processSquarePriceBatch(f.args)).status,'synced');
  assert.deepEqual(f.calls,['price_batch_state','read','price_batch_observe','price_batch_begin','send','price_batch_observe']);
});
test('changed dispatched source stays in review without sending',async()=>{
  const f=fixture({started:true,observeStatuses:['uncertain'],beginError:new SquareApiError('square_reconciliation_required')});
  assert.deepEqual(await processSquarePriceBatch(f.args),{status:'review',acknowledged:0});assert.ok(!f.calls.includes('send'));
});
test('accepted response loss is recorded uncertain then recovered by readback',async()=>{
  const f=fixture({providerError:new SquareApiError('square_provider_unavailable',{uncertain:true})});
  assert.equal((await processSquarePriceBatch(f.args)).status,'reconciled');assert.equal(f.errors[0].uncertain,true);assert.equal(f.observes,1);
});
test('known rejection reconciles every member rather than assuming no effects',async()=>{
  const f=fixture({providerError:new SquareApiError('square_request_rejected',{status:400,uncertain:false}),observeStatuses:['uncertain']});
  await assert.rejects(()=>processSquarePriceBatch(f.args),/square_request_rejected/);assert.equal(f.errors[0].providerStatus,400);assert.equal(f.errors[0].uncertain,false);assert.equal(f.observes,1);
});
test('known rejection plus independent original readback can close no-effect',async()=>{
  const f=fixture({providerError:new SquareApiError('square_request_rejected',{status:400,uncertain:false}),observeStatuses:['no_effect']});
  assert.equal((await processSquarePriceBatch(f.args)).status,'no_effect');
});
test('429 preserves provider backoff and avoids immediate additional provider reads',async()=>{
  const error=new SquareApiError('square_rate_limited',{status:429,uncertain:false,retryAfterSeconds:120});const f=fixture({providerError:error});
  await assert.rejects(()=>processSquarePriceBatch(f.args),e=>e===error);assert.equal(f.observes,0);assert.equal(f.errors[0].providerStatus,429);
});
test('database receipt loss retains dispatch uncertainty and cannot report success',async()=>{
  const f=fixture({receiptFailure:true});await assert.rejects(()=>processSquarePriceBatch(f.args),/square_state_unavailable/);assert.equal(f.errors[0].uncertain,true);assert.equal(f.observes,2);
});
test('incomplete provider receipt requires independent readback',async()=>{
  const f=fixture({observeStatuses:['uncertain']});f.args.client.upsertPriceBatch=async()=>({objects:[]});
  await assert.rejects(()=>processSquarePriceBatch(f.args),/square_batch_receipt_unconfirmed/);assert.equal(f.errors[0].uncertain,true);assert.equal(f.observes,1);
});
test('real transport rejects altered bytes before IO and sends exact valid text',async()=>{
  const f=fixture();const bodies=[];const client=new SquareClient({environment:'sandbox',accessToken:'local-test-token',fetchImpl:async(url,options)=>{
    assert.equal(url.pathname,'/v2/catalog/batch-upsert');bodies.push(options.body);return new Response(JSON.stringify({objects:[]}),{status:200});}});
  await assert.rejects(()=>client.upsertPriceBatch(f.batch.request_text+' ',f.batch.request_hash),/square_batch_invalid_request/);assert.equal(bodies.length,0);
  await client.upsertPriceBatch(f.batch.request_text,createHash('sha256').update(f.batch.request_text).digest('hex'));assert.deepEqual(bodies,[f.batch.request_text]);
});
test('database jsonb key ordering cannot alter the saved request or invalidate its receipt',async()=>{
  const f=fixture();const reverse=x=>Array.isArray(x)?x.map(reverse):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).reverse().map(k=>[k,reverse(x[k])])):x;
  f.batch.plan=reverse(f.batch.plan);assert.notEqual(JSON.stringify(f.batch.plan.request),f.batch.request_text);
  assert.equal((await processSquarePriceBatch(f.args)).status,'synced');assert.equal(f.errors.length,0);
});
test('catalog kill permits readback but prevents another dispatch of a pending parent',async()=>{
  const f=fixture({started:true,observeStatuses:['uncertain']});f.args.catalogEnabled=false;
  assert.deepEqual(await processSquarePriceBatch(f.args),{status:'paused',acknowledged:0});assert.ok(!f.calls.includes('price_batch_begin'));
});
