import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareClient} from '../client_v1.mjs';
import {planSquareCatalog, squareManagedProjection, squareQrSku} from '../catalog_plan_v1.mjs';
import {planSquarePriceBatches, inspectSquarePriceBatchReceipt} from '../catalog_price_batch_plan_v1.mjs';

function fixture(n=2) {
  const scope={ownerId:'batch-owner',merchantId:'batch-merchant',locationId:'batch-location',environment:'sandbox'};
  const oldOffers=Array.from({length:n},(_,i)=>({ownerId:scope.ownerId,gvviId:'GVVI-BATCHLAB-'+String(i+1).padStart(6,'0'),
    selected:true,publicVendorOffer:true,available:true,name:'Sandbox copy '+(i+1),variationName:'NM',askingPriceAmount:'1',currency:'USD'}));
  const created=planSquareCatalog({scope,offers:oldOffers,catalog:{scope,complete:true,items:[]}});
  const items=created.actions.map((a,i)=>{
    const item=structuredClone(a.request.object);item.id='item-'+i;item.version=100;
    Object.assign(item.item_data.variations[0],{id:'variation-'+i,version:100});
    item.item_data.variations[0].item_variation_data.item_id=item.id;
    item.item_data.description='Seller note';item.item_data.tax_ids=['seller-tax'];item.item_data.image_ids=['seller-image'];
    item.custom_attribute_values={'seller-key':{name:'Seller-owned field',string_value:'preserve me'}};
    return item;
  });
  const mappings=items.map((item,i)=>({scope,gvviId:oldOffers[i].gvviId,itemId:item.id,variationId:item.item_data.variations[0].id,
    lastSyncedProjection:squareManagedProjection(item,item.item_data.variations[0])}));
  return {scope,offers:oldOffers.map(o=>({...o,askingPriceAmount:'2'})),mappings,catalog:{scope,complete:true,items}};
}
function receipt(batch) {
  return {objects:batch.request.batches[0].objects.map(object=>{
    const copy=structuredClone(object);copy.version++;copy.item_data.variations[0].version++;return copy;
  })};
}

test('25-copy atomic groups preserve complete seller fields, stable QR and stock settings; inputs untouched',()=>{
  const input=fixture(51),before=structuredClone(input),plan=planSquarePriceBatches(input);
  assert.equal(plan.executable,false);assert.deepEqual(plan.batches.map(b=>b.members.length),[25,25,1]);
  assert.deepEqual(plan.batches.map(b=>b.objectCount),[50,50,2]);assert.deepEqual(input,before);
  for(const batch of plan.batches)for(const object of batch.request.batches[0].objects){
    const expected=structuredClone(input.catalog.items.find(i=>i.id===object.id));
    expected.item_data.variations[0].item_variation_data.price_money.amount=200;
    assert.deepEqual(object,expected);
  }
  assert.equal(new Set(plan.batches.map(b=>b.request.idempotency_key)).size,3);
});
test('membership order is deterministic; owner/source/provider-version changes change the entire batch key',()=>{
  const input=fixture(),a=planSquarePriceBatches(input),reordered=structuredClone(input);
  for(const field of ['offers','mappings'])reordered[field].reverse();reordered.catalog.items.reverse();
  assert.deepEqual(planSquarePriceBatches(reordered),a);
  for(const mutation of [i=>i.offers[0].askingPriceAmount='3',i=>i.catalog.items[0].version++,
    i=>{i.scope.ownerId='other-owner';for(const o of i.offers)o.ownerId='other-owner';}]){
    const changed=structuredClone(input);mutation(changed);
    assert.notEqual(planSquarePriceBatches(changed).batches[0].request.idempotency_key,a.batches[0].request.idempotency_key);
  }
});
test('new/adopted/conflicting/shared/name-changing work stays out of price batches',()=>{
  const input=fixture();input.offers[0].name='Different name';input.mappings.pop();
  const plan=planSquarePriceBatches(input);assert.equal(plan.batches.length,0);
  assert.deepEqual(plan.deferred.map(r=>r.reason).sort(),['adoption_required','not_price_only']);
  const shared=fixture(),sibling=structuredClone(shared.catalog.items[0].item_data.variations[0]);
  sibling.id='sibling';sibling.item_variation_data.sku='seller-sibling';shared.catalog.items[0].item_data.variations.push(sibling);
  const result=planSquarePriceBatches(shared);assert.equal(result.batches[0].members.length,1);
  assert.equal(result.deferred[0].reason,'shared_square_item_requires_review');
});
test('private/unavailable/unselected copies cannot enter a batch and wrong owner/completeness fails',()=>{
  for(const field of ['selected','publicVendorOffer','available']){
    const input=fixture();input.offers[0][field]=false;const plan=planSquarePriceBatches(input);
    assert.equal(plan.batches[0].members.length,1);assert.equal(plan.excluded.length,1);
  }
  for(const mutate of [i=>i.offers[0].ownerId='foreign',i=>i.catalog.complete=false,i=>i.catalog.scope={...i.scope,merchantId:'foreign'}]){
    const input=fixture();mutate(input);assert.throws(()=>planSquarePriceBatches(input));
  }
});
test('seller edit and duplicate QR are deferred; unchanged prices are not sent',()=>{
  const input=fixture();input.catalog.items[0].item_data.name='Seller changed name';input.offers[1].askingPriceAmount='1';
  const plan=planSquarePriceBatches(input);assert.equal(plan.batches.length,0);assert.equal(plan.unchanged.length,1);
  assert.equal(plan.deferred[0].reason,'square_managed_fields_changed');
  const duplicate=fixture();duplicate.catalog.items[1].item_data.variations[0].item_variation_data.sku=duplicate.catalog.items[0].item_data.variations[0].item_variation_data.sku;
  const p=planSquarePriceBatches(duplicate);assert.ok(p.deferred.some(r=>r.reason==='duplicate_square_sku'));
});
test('whole objects split at the unchanged 1MiB byte bound; oversize object never truncates',()=>{
  const input=fixture(3);for(const item of input.catalog.items)item.item_data.description='雪'.repeat(180000);
  const plan=planSquarePriceBatches(input);assert.deepEqual(plan.batches.map(b=>b.members.length),[1,1,1]);
  for(const b of plan.batches)assert.ok(b.requestBytes<=1048576);
  input.catalog.items[0].item_data.description='雪'.repeat(360000);
  const oversized=planSquarePriceBatches(input);assert.equal(oversized.batches.length,2);
  assert.equal(oversized.deferred[0].reason,'complete_object_exceeds_request_limit');
});
test('non-JSON values cannot produce mismatched request hashes',()=>{
  for(const value of [undefined,NaN,Infinity,1n,new Date()]){
    const input=fixture();input.catalog.items[0].unsafe=value;assert.throws(()=>planSquarePriceBatches(input));
  }
});
test('receipt accepts complete reordered results with newer versions; no DB acknowledgement authority',()=>{
  const batch=planSquarePriceBatches(fixture()).batches[0],response=receipt(batch);response.objects.reverse();
  const result=inspectSquarePriceBatchReceipt(batch,response);assert.equal(result.executable,false);assert.equal(result.members.length,2);
});
test('partial, repeated, extra, foreign, stale, deleted, wrong-price or wrong-parent receipts fail entirely',()=>{
  const batch=planSquarePriceBatches(fixture()).batches[0];
  for(const mutate of [r=>r.objects.pop(),r=>r.objects.push(r.objects[0]),r=>r.objects[1]=r.objects[0],
    r=>r.objects[0].id='foreign',r=>r.objects[0].version=100,r=>r.objects[0].is_deleted=true,
    r=>r.objects[0].item_data.variations[0].version=100,
    r=>r.objects[0].item_data.variations[0].item_variation_data.price_money.amount=999,
    r=>r.objects[0].item_data.variations[0].item_variation_data.item_id='foreign',
    r=>r.errors=[{code:'INVALID_VALUE'}],r=>r.errors={code:'malformed'},r=>r.cursor='incomplete']){
    const response=receipt(batch);mutate(response);assert.throws(()=>inspectSquarePriceBatchReceipt(batch,response));
  }
});
test('changed body or swapped member binding cannot count as a receipt',()=>{
  const original=planSquarePriceBatches(fixture()).batches[0];
  for(const mutate of [b=>b.request.batches[0].objects[0].item_data.description='changed',b=>b.members.reverse(),
    b=>b.members[0].projection.price.amount=999,b=>b.members[0].itemVersion++,b=>b.members[0].sourceSnapshot.available=false,
    b=>b.members[0].sourceSnapshot.ownerId='foreign',b=>b.scope.merchantId='foreign',b=>b.requestBytes++,b=>b.objectCount++,
    b=>b.request=Object.fromEntries(Object.entries(b.request).reverse())]){
    const changed=structuredClone(original);mutate(changed);assert.throws(()=>inspectSquarePriceBatchReceipt(changed,receipt(original)));
  }
});
test('operator batch transport refuses production before IO and preserves pinned version/uncertainty/limits',async()=>{
  let calls=0;
  const forbidden=new SquareClient({environment:'production',accessToken:'fake-test-token',fetchImpl:async()=>{calls++;throw Error();}});
  await assert.rejects(forbidden.sandboxCatalogTestRequest('upsert',{}),e=>e.code==='square_sandbox_required');assert.equal(calls,0);
  const client=new SquareClient({environment:'sandbox',accessToken:'fake-test-token',fetchImpl:async(url,init)=>{
    calls++;assert.equal(url.origin,'https://connect.squareupsandbox.com');assert.equal(init.headers['Square-Version'],'2026-09-16');throw Error('connection lost');
  }});
  const batch=planSquarePriceBatches(fixture()).batches[0];
  await assert.rejects(client.sandboxCatalogTestRequest('upsert',batch.request),e=>e.code==='square_provider_unavailable'&&e.uncertain===true);
  await assert.rejects(client.sandboxCatalogTestRequest('retrieve',{object_ids:['one']}),e=>e.uncertain===false);
  const before=calls;await assert.rejects(client.sandboxCatalogTestRequest('upsert',{idempotency_key:'x',batches:[{objects:Array(26).fill({type:'ITEM'})}]}));assert.equal(calls,before);
});

function lookupClient(input,{pages,changeRetrieve,changeSearch}={}){
  const calls=[],items=structuredClone(input.catalog.items),rows=items.flatMap(item=>item.item_data.variations);
  const client=new SquareClient({environment:'sandbox',accessToken:'fake-test-token',fetchImpl:async(url,init)=>{
    const body=JSON.parse(init.body);calls.push({path:url.pathname,body});let response;
    if(url.pathname==='/v2/catalog/search'){
      const page=calls.filter(c=>c.path===url.pathname).length-1;response=structuredClone(pages?.[page]??{objects:rows});changeSearch?.(response,page);
    }else{assert.equal(url.pathname,'/v2/catalog/batch-retrieve');response={objects:structuredClone(items)};changeRetrieve?.(response);}
    return new Response(JSON.stringify(response),{headers:{'Content-Type':'application/json'}});
  }});
  return {client,calls,skus:input.offers.map(o=>squareQrSku(o.gvviId))};
}
test('25-SKU read uses one bounded search and one complete parent retrieval; retains all seller fields',async()=>{
  const input=fixture(25),{client,calls,skus}=lookupClient(input);
  assert.deepEqual(await client.itemsForExactSkus(skus),input.catalog.items);assert.equal(calls.length,2);
  assert.equal(calls[0].body.object_types[0],'ITEM_VARIATION');assert.equal(calls[0].body.limit,100);
  assert.equal(calls[0].body.query.set_query.attribute_name,'sku');assert.equal(calls[1].body.include_related_objects,false);
});
test('complete pagination surfaces duplicate SKU candidates to the existing conflict planner',async()=>{
  const input=fixture();input.catalog.items[1].item_data.variations[0].item_variation_data.sku=input.catalog.items[0].item_data.variations[0].item_variation_data.sku;
  const rows=input.catalog.items.map(i=>i.item_data.variations[0]);
  // Pass the requested SKU explicitly because the second copy intentionally has
  // no provider match. Both matching parents must survive the lookup.
  const {client,calls}=lookupClient(fixture(),{pages:[{objects:[rows[0]],cursor:'next'},{objects:[rows[1]]}],changeRetrieve:r=>r.objects=input.catalog.items});
  const items=await client.itemsForExactSkus([rows[0].item_variation_data.sku]);assert.equal(items.length,2);assert.equal(calls.length,3);
  assert.equal(calls[1].body.cursor,'next');
  assert.ok(planSquarePriceBatches({...input,catalog:{...input.catalog,items}}).deferred.some(d=>d.reason==='duplicate_square_sku'));
});
test('lookup refuses wrong-case, foreign, deleted, repeated, malformed or unbounded search results',async()=>{
  for(const mutate of [r=>r.objects[0].item_variation_data.sku=r.objects[0].item_variation_data.sku.toLowerCase(),
    r=>r.objects[0].type='ITEM',r=>r.objects[0].is_deleted=true,r=>r.objects.push(r.objects[0]),
    r=>r.objects[0].item_variation_data.item_id='bad/id',r=>r.objects={}]){
    const {client,skus}=lookupClient(fixture(),{changeSearch:mutate});await assert.rejects(client.itemsForExactSkus(skus));
  }
  for(const pages of [Array(5).fill({objects:[],cursor:'same'}),Array.from({length:5},(_,i)=>({objects:[],cursor:'page-'+i}))]){
    const {client,calls,skus}=lookupClient(fixture(),{pages});await assert.rejects(client.itemsForExactSkus(skus));
    assert.ok(calls.length<=5);assert.ok(calls.every(c=>c.path==='/v2/catalog/search'));
  }
});
test('lookup rejects missing/extra/foreign parents, changed QR/parent/version and incomplete child results',async()=>{
  for(const mutate of [r=>r.objects.pop(),r=>r.objects.push(r.objects[0]),r=>r.objects[0].id='foreign',
    r=>r.objects[0].version=Number.MAX_SAFE_INTEGER+1,r=>r.objects[0].item_data.variations[0].version=0,
    r=>r.objects[0].item_data.variations[0].item_variation_data.item_id='foreign',
    r=>r.objects[0].item_data.variations[0].item_variation_data.sku='foreign',
    r=>r.objects[0].item_data.variations=[],r=>r.cursor='partial']){
    const {client,skus}=lookupClient(fixture(),{changeRetrieve:mutate});await assert.rejects(client.itemsForExactSkus(skus));
  }
});
test('empty lookup proves no matches without an item fetch; invalid input fails before IO',async()=>{
  const {client,calls,skus}=lookupClient(fixture(),{pages:[{}]});assert.deepEqual(await client.itemsForExactSkus(skus),[]);assert.equal(calls.length,1);
  for(const invalid of [[],Array(26).fill(skus[0]),[skus[0],skus[0]],['https://foreign.example/q/card'],null]){
    const before=calls.length;await assert.rejects(client.itemsForExactSkus(invalid));assert.equal(calls.length,before);
  }
});
