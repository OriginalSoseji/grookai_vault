import test from 'node:test';import assert from 'node:assert/strict';
import {createSquareCapacityProvider} from './capacity_provider_fixture_v1.mjs';
const vendors=[1,2].map(n=>({merchantId:'capacity-merchant-'+n,locationId:'capacity-location-'+n,accessToken:'capacity-fixture-token-'+n}));
const item=(sku='fixture-sku')=>({type:'ITEM',id:'#item',item_data:{name:'Local fixture',description:'seller note',variations:[{type:'ITEM_VARIATION',id:'#variation',item_variation_data:{name:'Regular',sku,pricing_type:'FIXED_PRICING',price_money:{amount:1100,currency:'USD'}}}]}});
const request=(server,n,path,body)=>fetch(server.origin+path,{method:'POST',headers:{Authorization:'Bearer '+vendors[n].accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('capacity provider isolates merchants, models full replacement and preserves idempotent absolute stock writes',async()=>{
 const server=await createSquareCapacityProvider({vendors});
 try{
  const create={idempotency_key:'create-one',object:item()};const first=await request(server,0,'/v2/catalog/object',create);assert.equal(first.status,200);
  const saved=(await first.json()).catalog_object;assert.equal(server.snapshot(vendors[1].merchantId).items.length,0);
  const same=await request(server,0,'/v2/catalog/object',create);assert.deepEqual((await same.json()).catalog_object,saved);
  const replacement=structuredClone(saved);delete replacement.item_data.description;
  assert.equal((await request(server,0,'/v2/catalog/object',{idempotency_key:'replace',object:replacement})).status,200);
  assert.equal(server.snapshot(vendors[0].merchantId).items[0].item_data.description,undefined);
  const change={idempotency_key:'stock-once',changes:[{type:'PHYSICAL_COUNT',physical_count:{catalog_object_id:saved.item_data.variations[0].id,location_id:vendors[0].locationId,state:'IN_STOCK',quantity:'1',occurred_at:'2026-11-23T00:00:00Z'}}]};
  assert.equal((await request(server,0,'/v2/inventory/changes/batch-create',change)).status,200);
  assert.equal((await request(server,0,'/v2/inventory/changes/batch-create',change)).status,200);
  assert.equal(server.stats().inventoryWrites,1);assert.equal(server.stats().catalogWrites,2);assert.equal(server.stats().idempotentReplays,2);
 }finally{await server.close();}
});

test('capacity provider rejects overlapping seller updates while allowing different sellers concurrently',async()=>{
 const server=await createSquareCapacityProvider({vendors,delayMs:25});
 try{
  const same=await Promise.all([request(server,0,'/v2/catalog/object',{idempotency_key:'one',object:item()}),request(server,0,'/v2/catalog/object',{idempotency_key:'two',object:item()})]);
  assert.deepEqual(same.map(r=>r.status).sort(),[200,429]);assert.equal(server.stats().parallelSellerUpdates,1);
  const distinct=await Promise.all([request(server,0,'/v2/catalog/object',{idempotency_key:'three',object:item('other')}),request(server,1,'/v2/catalog/object',{idempotency_key:'four',object:item('other')})]);
  assert.deepEqual(distinct.map(r=>r.status),[200,200]);assert.equal(server.stats().parallelSellerUpdates,1);
 }finally{await server.close();}
});

test('capacity provider can lose an accepted response and recover its retained key without a duplicate create',async()=>{
 const server=await createSquareCapacityProvider({vendors});
 try{
  server.loseNextCatalogResponse(vendors[0].merchantId);const body={idempotency_key:'uncertain',object:item()};
  await assert.rejects(request(server,0,'/v2/catalog/object',body));assert.equal(server.stats().catalogWrites,1);
  assert.equal((await request(server,0,'/v2/catalog/object',body)).status,200);
  assert.equal(server.stats().catalogWrites,1);assert.equal(server.stats().items,1);assert.equal(server.stats().idempotentReplays,1);
  assert.equal((await request(server,0,'/v2/catalog/object',{...body,object:item('conflicting')})).status,409);
 }finally{await server.close();}
});

test('explicit existing-inventory fixtures are counted separately and can settle a synthetic sale',async()=>{
 const server=await createSquareCapacityProvider({vendors});
 try{
  const existing=item();existing.id='existing-item';existing.version=1;const variation=existing.item_data.variations[0];variation.id='existing-variation';variation.version=1;variation.item_variation_data.item_id=existing.id;
  server.seedExistingInventory({merchantId:vendors[0].merchantId,items:[existing],counts:{[variation.id]:1}});
  assert.equal(server.stats().seededItems,1);assert.equal(server.stats().catalogWrites,0);assert.equal(server.stats().inventoryWrites,0);
  server.completeSale({merchantId:vendors[0].merchantId,variationId:variation.id,saleId:'one',amountMinor:1100});
  const state=server.exportState();assert.equal(state.kind,'synthetic provider fixture only');assert.equal(state.merchants[0].orders.length,1);assert.equal(state.merchants[0].payments.length,1);
  assert.equal(server.snapshot(vendors[0].merchantId).counts[variation.id],0);assert.equal(server.stats().inventoryWrites,0);
 }finally{await server.close();}
});

test('an exported accepted-but-lost catalog response retains its exact key and version across provider restart',async()=>{
 const first=await createSquareCapacityProvider({vendors});let state;
 const body={idempotency_key:'lost-before-restart',object:item()};
 try{first.loseNextCatalogResponse(vendors[0].merchantId);await assert.rejects(request(first,0,'/v2/catalog/object',body));state=first.exportState();}
 finally{await first.close();}
 const second=await createSquareCapacityProvider({vendors,initialState:state});
 try{
  assert.equal(second.stats().stateRestores,1);assert.equal(second.stats().catalogWrites,1);assert.equal(second.stats().seededItems,0);
  const replay=await request(second,0,'/v2/catalog/object',body);assert.equal(replay.status,200);const saved=(await replay.json()).catalog_object;
  assert.deepEqual(saved,state.merchants[0].items[0]);assert.equal(second.stats().catalogWrites,1);assert.equal(second.stats().idempotentReplays,1);
  const updated=structuredClone(saved);updated.item_data.name='Updated after restart';
  const response=await request(second,0,'/v2/catalog/object',{idempotency_key:'new-after-restart',object:updated});assert.equal(response.status,200);
  assert.ok((await response.json()).catalog_object.version>saved.version);assert.equal(second.snapshot(vendors[0].merchantId).items.length,1);assert.equal(second.snapshot(vendors[1].merchantId).items.length,0);
 }finally{await second.close();}
});

test('provider restoration retains exact sale evidence and rejects a different merchant/location before listening',async()=>{
 const first=await createSquareCapacityProvider({vendors});let state;
 try{
  const existing=item();existing.id='sold-item';existing.version=1;const variation=existing.item_data.variations[0];variation.id='sold-variation';variation.item_variation_data.item_id=existing.id;
  first.seedExistingInventory({merchantId:vendors[0].merchantId,items:[existing],counts:{[variation.id]:1}});first.completeSale({merchantId:vendors[0].merchantId,variationId:variation.id,saleId:'retained',amountMinor:1100});state=first.exportState();
 }finally{await first.close();}
 const second=await createSquareCapacityProvider({vendors,initialState:state});
 try{assert.deepEqual(second.snapshot(vendors[0].merchantId),{items:state.merchants[0].items,counts:Object.fromEntries(state.merchants[0].counts),orders:state.merchants[0].orders.map(([,value])=>value)});assert.deepEqual(second.exportState().merchants,state.merchants);assert.equal(second.stats().catalogWrites,0);assert.equal(second.stats().inventoryWrites,0);}
 finally{await second.close();}
 for(const key of ['merchantId','locationId']){const wrong=structuredClone(state);wrong.merchants[0][key]+='-different';await assert.rejects(createSquareCapacityProvider({vendors,initialState:wrong}));}
});
