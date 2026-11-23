// Local transport fixture, never Square evidence. No Supabase or production IO.
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=value=>structuredClone(value);
const usd=amount=>({amount,currency:'USD'});

export async function createSquareCapacityProvider({vendors,delayMs=0}={}){
 assert.ok(Array.isArray(vendors)&&vendors.length>0&&vendors.length<=100);
 assert.ok(Number.isInteger(delayMs)&&delayMs>=0&&delayMs<=1000);
 const byToken=new Map(),byMerchant=new Map();
 for(const vendor of vendors){
  assert.match(vendor.accessToken,/^capacity-fixture-token-[0-9]+$/);
  assert.ok(!byToken.has(vendor.accessToken)&&!byMerchant.has(vendor.merchantId));
  const state={merchantId:vendor.merchantId,locationId:vendor.locationId,items:new Map(),skus:new Map(),counts:new Map(),keys:new Map(),orders:new Map(),payments:new Map(),sequence:0,updating:false,failNext:false,dropNext:false};
  byToken.set(vendor.accessToken,state);byMerchant.set(vendor.merchantId,state);
 }
 const metrics={requests:0,seededItems:0,catalogWrites:0,inventoryWrites:0,idempotentReplays:0,parallelSellerUpdates:0,injectedRateLimits:0,injectedResponseLosses:0,versionConflicts:0,routes:{}};
 let latency=delayMs;
 const send=(response,status,body,headers={})=>{response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});response.end(JSON.stringify(body));};
 const failure=(response,status,code,headers)=>send(response,status,{errors:[{code}]},headers);
 const server=http.createServer(async(request,response)=>{
  let locked;
  try{
   const token=request.headers.authorization?.replace(/^Bearer /,'');const state=byToken.get(token);
   if(!state){failure(response,401,'UNAUTHORIZED');return;}
   const url=new URL(request.url,'http://fixture.invalid'),route=request.method+' '+url.pathname.replace(/^(\/v2\/(?:catalog\/object|orders|payments)\/)[^/]+$/,'$1:id');
   metrics.requests++;metrics.routes[route]=(metrics.routes[route]??0)+1;
   const chunks=[];let bytes=0;
   for await(const chunk of request){bytes+=chunk.length;if(bytes>1048576)throw Error('payload');chunks.push(chunk);}
   const body=bytes?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};
   if(request.method==='POST'&&url.pathname==='/v2/catalog/object'){
    if(state.updating){metrics.parallelSellerUpdates++;failure(response,429,'RATE_LIMITED',{'Retry-After':'1'});return;}
    state.updating=true;locked=state;
    if(state.failNext){state.failNext=false;metrics.injectedRateLimits++;failure(response,429,'RATE_LIMITED',{'Retry-After':'1'});return;}
   }
   if(latency)await new Promise(resolve=>setTimeout(resolve,latency));
   const key=body.idempotency_key;
   if(key&&state.keys.has(key)){
    const old=state.keys.get(key);if(old.hash!==digest(body)){failure(response,409,'IDEMPOTENCY_KEY_REUSED');return;}
    metrics.idempotentReplays++;send(response,200,clone(old.result));return;
   }
   let result;
   if(url.pathname==='/v2/merchants/'+state.merchantId)result={merchant:{id:state.merchantId,status:'ACTIVE'}};
   else if(url.pathname==='/v2/locations')result={locations:[{id:state.locationId,merchant_id:state.merchantId,status:'ACTIVE',name:'Local capacity fixture',currency:'USD'}]};
   else if(url.pathname==='/v2/catalog/search'){
    assert.deepEqual(body.object_types,['ITEM_VARIATION']);const sku=body.query?.exact_query?.attribute_value;
    assert.equal(body.query?.exact_query?.attribute_name,'sku');
    const itemId=state.skus.get(sku),item=itemId&&state.items.get(itemId);
    result={objects:item?clone(item.item_data.variations.filter(v=>v.item_variation_data.sku===sku)):[]};
   }else if(url.pathname==='/v2/catalog/object'&&request.method==='POST'){
    assert.ok(key);const item=clone(body.object);assert.equal(item.type,'ITEM');
    const old=state.items.get(item.id);if(old&&old.version!==item.version){metrics.versionConflicts++;failure(response,409,'VERSION_MISMATCH');return;}
    state.sequence++;if(item.id.startsWith('#'))item.id='cap-item-'+state.merchantId+'-'+state.sequence;
    item.version=1000+state.sequence;assert.ok(item.item_data.variations.length);
    if(old)for(const variation of old.item_data.variations)state.skus.delete(variation.item_variation_data.sku);
    for(const variation of item.item_data.variations){
     if(variation.id.startsWith('#'))variation.id='cap-variation-'+state.merchantId+'-'+state.sequence;
     variation.version=item.version;variation.item_variation_data.item_id=item.id;
     assert.ok(Number.isSafeInteger(variation.item_variation_data.price_money.amount));
     const sku=variation.item_variation_data.sku;assert.ok(!state.skus.has(sku)||state.skus.get(sku)===item.id);state.skus.set(sku,item.id);
    }
    // Store the complete replacement, including deliberate omitted-field loss.
    state.items.set(item.id,item);metrics.catalogWrites++;result={catalog_object:item};
   }else if(url.pathname.startsWith('/v2/catalog/object/')){
    const item=state.items.get(decodeURIComponent(url.pathname.split('/').at(-1)));if(!item){failure(response,404,'NOT_FOUND');return;}result={object:clone(item)};
   }else if(url.pathname==='/v2/inventory/counts/batch-retrieve'){
    assert.equal(body.catalog_object_ids.length,1);assert.deepEqual(body.location_ids,[state.locationId]);const variationId=body.catalog_object_ids[0];
    result={counts:[{catalog_object_id:variationId,location_id:state.locationId,state:'IN_STOCK',quantity:String(state.counts.get(variationId)??0)}]};
   }else if(url.pathname==='/v2/inventory/changes/batch-create'){
    assert.ok(key);assert.equal(body.changes.length,1);assert.equal(body.changes[0].type,'PHYSICAL_COUNT');const count=body.changes[0].physical_count;
    assert.equal(count.location_id,state.locationId);assert.ok(['0','1'].includes(count.quantity));assert.ok([...state.items.values()].some(item=>item.item_data.variations.some(v=>v.id===count.catalog_object_id)));
    state.counts.set(count.catalog_object_id,Number(count.quantity));metrics.inventoryWrites++;result={counts:[{...count,catalog_object_type:'ITEM_VARIATION'}]};
   }else if(url.pathname==='/v2/orders/search'){
    assert.deepEqual(body.location_ids,[state.locationId]);const bounds=body.query.filter.date_time_filter.updated_at;
    result={orders:[...state.orders.values()].filter(o=>o.updated_at>=bounds.start_at&&(!bounds.end_at||o.updated_at<body.query.filter.date_time_filter.updated_at.end_at)).map(clone)};
   }else if(url.pathname.startsWith('/v2/orders/'))result={order:clone(state.orders.get(url.pathname.split('/').at(-1)))};
   else if(url.pathname.startsWith('/v2/payments/'))result={payment:clone(state.payments.get(url.pathname.split('/').at(-1)))};
   else if(url.pathname==='/v2/refunds')result={refunds:[]};
   else{failure(response,404,'FIXTURE_ROUTE_MISSING');return;}
   if(key)state.keys.set(key,{hash:digest(body),result:clone(result)});
   if(state.dropNext&&request.method==='POST'&&url.pathname==='/v2/catalog/object'){
    state.dropNext=false;metrics.injectedResponseLosses++;response.destroy();return;
   }
   send(response,200,result);
  }catch{if(!response.destroyed&&!response.headersSent)failure(response,400,'FIXTURE_REJECTED');}
  finally{if(locked)locked.updating=false;}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const merchant=id=>{const state=byMerchant.get(id);assert.ok(state);return state;};
 return{
  origin:'http://127.0.0.1:'+server.address().port,
  stats:()=>clone({...metrics,items:[...byMerchant.values()].reduce((n,s)=>n+s.items.size,0)}),
  snapshot:id=>{const s=merchant(id);return{items:[...s.items.values()].map(clone),counts:Object.fromEntries(s.counts),orders:[...s.orders.values()].map(clone)};},
  setDelay:ms=>{assert.ok(Number.isInteger(ms)&&ms>=0&&ms<=1000);latency=ms;},
  seedExistingInventory:({merchantId,items,counts})=>{
   assert.equal(metrics.requests,0,'Only explicit initial fixtures may be seeded');const s=merchant(merchantId);assert.equal(s.items.size,0);
   for(const item of items){assert.equal(item.type,'ITEM');assert.ok(Number.isSafeInteger(item.version)&&item.version>0);
    assert.ok(!s.items.has(item.id));s.items.set(item.id,clone(item));
    for(const variation of item.item_data.variations){assert.equal(variation.item_variation_data.item_id,item.id);assert.ok(!s.skus.has(variation.item_variation_data.sku));s.skus.set(variation.item_variation_data.sku,item.id);assert.ok([0,1].includes(counts[variation.id]));s.counts.set(variation.id,counts[variation.id]);}
   }metrics.seededItems+=items.length;
  },
  exportState:()=>({version:'SQUARE_CAPACITY_PROVIDER_V1',kind:'synthetic provider fixture only',metrics:clone(metrics),merchants:[...byMerchant.values()].map(s=>({merchantId:s.merchantId,locationId:s.locationId,sequence:s.sequence,items:[...s.items.values()].map(clone),counts:[...s.counts],keys:[...s.keys],orders:[...s.orders],payments:[...s.payments]}))}),
  rateLimitNext:id=>{merchant(id).failNext=true;},
  loseNextCatalogResponse:id=>{merchant(id).dropNext=true;},
  addSellerNote:(id,itemId,note)=>{const item=merchant(id).items.get(itemId);assert.ok(item);item.item_data.description=String(note);},
  completeSale:({merchantId,variationId,saleId,amountMinor})=>{
   const s=merchant(merchantId);assert.equal(s.counts.get(variationId),1);assert.ok(Number.isSafeInteger(amountMinor)&&amountMinor>0);
   const orderId='cap-order-'+saleId,paymentId='cap-payment-'+saleId,stamp=new Date().toISOString();assert.ok(!s.orders.has(orderId));
   s.orders.set(orderId,{id:orderId,location_id:s.locationId,state:'COMPLETED',version:1,updated_at:stamp,total_money:usd(amountMinor),
    line_items:[{uid:'line-'+saleId,catalog_object_id:variationId,quantity:'1',total_money:usd(amountMinor),total_tax_money:usd(0)}],tenders:[{id:paymentId,amount_money:usd(amountMinor)}]});
   s.payments.set(paymentId,{id:paymentId,order_id:orderId,location_id:s.locationId,status:'COMPLETED',created_at:stamp,total_money:usd(amountMinor),refunded_money:usd(0),refund_ids:[]});s.counts.set(variationId,0);return{orderId,paymentId};
  },
  close:()=>new Promise((resolve,reject)=>{server.closeAllConnections();server.close(error=>error?reject(error):resolve());})
 };
}
