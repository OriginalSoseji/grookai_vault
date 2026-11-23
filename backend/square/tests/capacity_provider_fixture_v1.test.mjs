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
