// Persistent synthetic provider for actual local Auth/HTTP/backend testing.
// This is not Square Sandbox evidence and never contacts a provider or database.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const file=lab+'/provider-fixture-state-v2.private.json';
const initial=JSON.parse(fs.readFileSync(lab+'/runtime-fixture.private.json'));
let state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{catalog:initial.catalog,counts:{},orders:{},payments:{},refunds:{},requests:{},sequence:0,providerRequests:0};
// Forward-enrich old invented fixtures from their original synthetic order clock.
// These are local test facts, never captured Square provider evidence.
for(const payment of Object.values(state.payments))if(!payment.created_at){
 const order=state.orders[payment.order_id];assert.ok(Number.isFinite(Date.parse(order?.updated_at)));payment.created_at=order.updated_at;
}
const save=()=>{fs.writeFileSync(file+'.next',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(file+'.next',file);};
save();
const usd=amount=>({amount,currency:'USD'});
const send=(response,status,value)=>{response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const server=http.createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://127.0.0.1:61852');
  if(url.pathname==='/health'){send(response,200,{synthetic:true,providerRequests:state.providerRequests,items:state.catalog.length,orders:Object.keys(state.orders).length});return;}
  const chunks=[];let size=0;
  for await(const chunk of request){size+=chunk.length;if(size>1048576)throw Error('too_large');chunks.push(chunk);}
  const body=size?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};
  if(url.pathname.startsWith('/fixture/')){
   assert.equal(request.headers['x-grookai-fixture'],'local-only');
   if(url.pathname==='/fixture/set-count'){
    assert.ok(state.catalog.some(item=>item.item_data.variations.some(v=>v.id===body.variationId)));
    assert.ok(Number.isInteger(body.quantity)&&body.quantity>=0&&body.quantity<=3);
    state.counts[body.variationId]=body.quantity;save();send(response,200,{recorded:true});return;
   }
   if(url.pathname==='/fixture/fail-next-catalog-write'){
    assert.equal(request.method,'POST');state.failNextCatalogWrite=true;save();send(response,200,{armed:true});return;
   }
   if(url.pathname==='/fixture/omit-order-from-search'){
    assert.ok(state.orders[body.orderId]);state.orderSearchOmissions??=[];
    if(!state.orderSearchOmissions.includes(body.orderId))state.orderSearchOmissions.push(body.orderId);
    save();send(response,200,{omitted:true});return;
   }
   const id=body.id??randomUUID();
   if(url.pathname==='/fixture/complete-sale'){
    const current=state.counts[body.variationId]??0;assert.equal(current,1);
    const item=state.catalog.find(row=>row.item_data.variations.some(v=>v.id===body.variationId));assert.ok(item);
    const variation=item.item_data.variations.find(v=>v.id===body.variationId),amount=body.amountCents??variation.item_variation_data.price_money.amount;
    const paymentId='payment-'+id,orderId='order-'+id;assert.ok(['1','2'].includes(body.quantity??'1'));
    state.orders[orderId]={id:orderId,location_id:'runtime-location',state:'COMPLETED',version:1,total_money:usd(amount),updated_at:new Date().toISOString(),
     line_items:[{uid:'line-'+id,catalog_object_id:body.variationId,quantity:body.quantity??'1',total_money:usd(amount),total_tax_money:usd(0)}],tenders:[{id:paymentId,amount_money:usd(amount)}]};
    state.payments[paymentId]={id:paymentId,order_id:orderId,location_id:'runtime-location',status:'COMPLETED',created_at:new Date().toISOString(),total_money:usd(amount),refunded_money:usd(0),refund_ids:[]};
    state.counts[body.variationId]=0;save();send(response,200,{orderId,paymentId});return;
   }
   if(url.pathname==='/fixture/refund'){
    const payment=state.payments[body.paymentId];assert.ok(payment);const refundId='refund-'+id;
    state.refunds[refundId]={id:refundId,payment_id:payment.id,location_id:'runtime-location',status:'COMPLETED',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),amount_money:payment.total_money};
    payment.refunded_money=payment.total_money;if(!payment.refund_ids.includes(refundId))payment.refund_ids.push(refundId);
    save();send(response,200,{refundId});return;
   }
   throw Error('fixture_route_missing');
  }
  assert.equal(request.headers.authorization,'Bearer synthetic-access-token');state.providerRequests++;
  if(url.pathname==='/v2/catalog/object'&&request.method==='POST'&&state.failNextCatalogWrite){
   state.failNextCatalogWrite=false;save();send(response,503,{errors:[{code:'SERVICE_UNAVAILABLE'}]});return;
  }
  const key=body.idempotency_key;
  if(key&&state.requests[key]){
   assert.equal(state.requests[key].hash,hash(body),'idempotency_conflict');send(response,200,state.requests[key].result);return;
  }
  let value;
  if(url.pathname==='/v2/locations')value={locations:[{id:'runtime-location',name:'Local Square fixture',merchant_id:'runtime-merchant',status:'ACTIVE',currency:'USD'}]};
  else if(url.pathname==='/v2/merchants')value={merchant:[{id:'runtime-merchant',status:'ACTIVE'}]};
  else if(url.pathname==='/v2/merchants/runtime-merchant')value={merchant:{id:'runtime-merchant',status:'ACTIVE'}};
  else if(url.pathname==='/v2/catalog/search'){
   const sku=body.query.exact_query.attribute_value;
   value={objects:state.catalog.flatMap(item=>item.item_data.variations.filter(row=>row.item_variation_data.sku===sku))};
  }else if(url.pathname==='/v2/catalog/object'&&request.method==='POST'){
   const item=structuredClone(body.object),index=state.catalog.findIndex(row=>row.id===item.id);
   if(index>=0&&item.version!==state.catalog[index].version){send(response,409,{errors:[{code:'VERSION_MISMATCH'}]});return;}
   state.sequence++;if(item.id.startsWith('#'))item.id='http-item-'+state.sequence;
   item.version=1000+state.sequence;
   for(const row of item.item_data.variations){if(row.id.startsWith('#'))row.id='http-variation-'+state.sequence;row.version=item.version;row.item_variation_data.item_id=item.id;}
   if(index>=0)state.catalog[index]=item;else state.catalog.push(item);value={catalog_object:item};
  }else if(url.pathname.startsWith('/v2/catalog/object/')){
   const item=state.catalog.find(row=>row.id===url.pathname.split('/').at(-1));if(!item){send(response,404,{errors:[{code:'NOT_FOUND'}]});return;}value={object:item};
  }else if(url.pathname==='/v2/inventory/counts/batch-retrieve')value={counts:[{catalog_object_id:body.catalog_object_ids[0],location_id:'runtime-location',state:'IN_STOCK',quantity:String(state.counts[body.catalog_object_ids[0]]??0)}]};
  else if(url.pathname==='/v2/inventory/changes/batch-create'){
   assert.equal(body.changes.length,1);const count=body.changes[0].physical_count;assert.equal(count.location_id,'runtime-location');assert.ok(['0','1'].includes(count.quantity));
   state.counts[count.catalog_object_id]=Number(count.quantity);value={counts:[{...count,catalog_object_type:'ITEM_VARIATION'}]};
  }else if(url.pathname==='/v2/orders/search')value={orders:Object.values(state.orders).filter(row=>!(state.orderSearchOmissions??[]).includes(row.id)&&row.updated_at>=body.query.filter.date_time_filter.updated_at.start_at&&(!body.query.filter.date_time_filter.updated_at.end_at||row.updated_at<body.query.filter.date_time_filter.updated_at.end_at))};
  else if(url.pathname.startsWith('/v2/orders/'))value={order:state.orders[url.pathname.split('/').at(-1)]};
  else if(url.pathname.startsWith('/v2/payments/'))value={payment:state.payments[url.pathname.split('/').at(-1)]};
  else if(url.pathname==='/v2/refunds')value={refunds:Object.values(state.refunds).filter(r=>r.updated_at>=url.searchParams.get('updated_at_begin_time')&&r.updated_at<=url.searchParams.get('updated_at_end_time'))};
  else if(url.pathname.startsWith('/v2/refunds/'))value={refund:state.refunds[url.pathname.split('/').at(-1)]};
  else{send(response,404,{errors:[{code:'FIXTURE_ROUTE_MISSING'}]});return;}
  if(key)state.requests[key]={hash:hash(body),result:value};save();send(response,200,value);
 }catch{send(response,400,{errors:[{code:'FIXTURE_REJECTED'}]});}
});
server.listen(61852,'127.0.0.1',()=>console.log('LOCAL synthetic Square provider: http://127.0.0.1:61852; no external requests'));
