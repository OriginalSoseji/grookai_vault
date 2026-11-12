import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {syncSquareArtwork} from '../artwork_sync_v1.mjs';
import {renderSquareArtwork,loadSquareArtwork,squareArtworkSourceUrl} from '../artwork_source_v1.mjs';
import {SquareClient,SquareApiError} from '../client_v1.mjs';
import {squareDesiredProjection} from '../catalog_plan_v1.mjs';
import {SquareCommerceService} from '../commerce_service_v2.mjs';
import {SquareCatalogService} from '../service_v1.mjs';
import {sealSquareCredential} from '../credential_envelope_v1.mjs';
const gvvi='GVVI-DEMO0000-000001';
const offer={gvviId:gvvi,name:'Fixture card',variationName:'Holo · NM',askingPriceAmount:'2.00',currency:'USD'};
const input=await sharp({create:{width:240,height:336,channels:3,background:'#87ddfa'}}).png().toBuffer();
const art=await renderSquareArtwork(input,'representative');
const image=()=>({id:'image-one',type:'IMAGE',image_data:{name:art.name,caption:'grookai card artwork. Representative image; exact variant image pending.'}});
function harness({cached=false,ownerPhoto=false,timeout=false,finishFail=false,deduplicated=false}={}){
 const calls=[],providerCalls=[],images=new Map(cached?[['image-one',image()]]:[]);
 if(ownerPhoto)images.set('seller-photo',{id:'seller-photo',type:'IMAGE',image_data:{name:'my photograph'}});
 const item={id:'item',type:'ITEM',version:4,item_data:{name:offer.name,tax_ids:['tax'],modifier_list_info:[{modifier_list_id:'modifier'}],
  image_ids:ownerPhoto?['seller-photo']:[],variations:[{id:'variation',type:'ITEM_VARIATION',version:4,item_variation_data:{item_id:'item',name:offer.variationName,
   sku:`https://grookaivault.com/q/${gvvi}`,pricing_type:'FIXED_PRICING',price_money:{amount:200,currency:'USD'},track_inventory:true}}]}};
 const state={target:{id:'target',selected:true,item_id:'item',variation_id:'variation',last_synced_projection:squareDesiredProjection(offer)},offer,pendingOperation:null};
 let op,failFinish=finishFail;
 const rpc=async(action,data)=>{calls.push({action,data:structuredClone(data)});
  if(action==='prepare'){op={id:'operation',status:'prepared',target_id:'target',payload:data.payload,source_snapshot:data.sourceSnapshot,projection:data.projection};state.pendingOperation=op;return structuredClone(op);}
  if(action==='begin'){op.status='sending';return structuredClone(op);}
  if(action==='fail'){op.status=data.uncertain?'uncertain':'failed';return {};}
  if(action==='finish'||action==='recover_finish'){if(failFinish){failFinish=false;throw new SquareApiError('square_state_unavailable');}op.status='succeeded';state.pendingOperation=null;return {};}
  return {};
 };
 const client={item:async()=>structuredClone(item),image:async id=>structuredClone(images.get(id)),imagesByName:async()=>cached?[image()]:[],
  artworkImageMatches:async image=>deduplicated&&image?.id==='image-one',
  uploadArtwork:async(request,bytes,name)=>{providerCalls.push({method:'upload',request:structuredClone(request),bytes,name});assert.equal(calls.at(-1).action,'begin');
   const result=deduplicated?{id:'image-one',type:'IMAGE',image_data:{name:'existing merchant artwork',caption:'Original seller caption'}}:image();
   images.set('image-one',result);if(!deduplicated)item.item_data.image_ids=request.is_primary?['image-one',...item.item_data.image_ids]:[...item.item_data.image_ids,'image-one'];
   if(timeout){timeout=false;throw new SquareApiError('square_provider_unavailable',{uncertain:true});}return result;},
  upsert:async request=>{providerCalls.push({method:'upsert',request:structuredClone(request)});assert.equal(calls.at(-1).action,'begin');Object.assign(item,structuredClone(request.object));return {itemId:'item',variationId:'variation'};}};
 const run=(extra={})=>syncSquareArtwork({connection:{id:'connection'},context:{ownerId:'owner',connectionId:'connection',leaseToken:'lease',fence:1},
  client,rpc,state,requestId:'request',loadSource:async()=>art,enabled:true,...extra});
 return {run,calls,providerCalls,state,item,get operation(){return op;}};
}
test('artwork rendering is deterministic, keeps the whole card, and visibly labels representative imagery',async()=>{
 assert.deepEqual(await renderSquareArtwork(input,'representative'),art);
 const exact=await renderSquareArtwork(input,'exact');assert.notEqual(exact.sha256,art.sha256);
 assert.equal((await sharp(Buffer.from(art.fileBase64,'base64')).metadata()).height,436);
 assert.equal((await sharp(Buffer.from(exact.fileBase64,'base64')).metadata()).height,336);
 await assert.rejects(renderSquareArtwork(input,'blocked'));
});
test('image IO rejects private addresses, credentials, arbitrary proxies, redirects and untrusted origins',()=>{
 for(const value of ['http://assets.tcgdex.net/en/a','https://127.0.0.1/a','https://assets.tcgdex.net.evil.test/a','https://user:secret@assets.tcgdex.net/a',
  'https://grookaivault.com/api/square?secret=1','https://ycdxbpibncqcchqiihfz.supabase.co/storage/v1/object/sign/user-card-images/private'])assert.throws(()=>squareArtworkSourceUrl(value));
 assert.equal(squareArtworkSourceUrl('/api/canon/cards/GV-DEMO-1/image'),'https://grookaivault.com/api/canon/cards/GV-DEMO-1/image');
});
test('public artwork descriptors are exact-GVVI bound; missing images are a normal non-blocking outcome',async()=>{
 assert.equal(await loadSquareArtwork(gvvi,{fetchImpl:async()=>new Response(null,{status:404})}),null);
 await assert.rejects(loadSquareArtwork(gvvi,{fetchImpl:async()=>new Response(JSON.stringify({version:'SQUARE_CANONICAL_ARTWORK_V1',gvvi:'other',kind:'exact',url:'https://assets.tcgdex.net/a'}))}));
 const calls=[];const loaded=await loadSquareArtwork(gvvi,{fetchImpl:async(url,init)=>{calls.push({url,init});return calls.length===1?
  new Response(JSON.stringify({version:'SQUARE_CANONICAL_ARTWORK_V1',gvvi,kind:'representative',url:'https://assets.tcgdex.net/en/a/high.webp'})):
  new Response(input,{headers:{'content-type':'image/png'}});}});
 assert.equal(loaded.sha256,art.sha256);assert.ok(calls.every(c=>c.init.redirect==='error'));
});
test('upload bytes, source digest and exact provider request are durable before sending; repeat sync does not upload again',async()=>{
 const h=harness();assert.equal((await h.run()).status,'synced');assert.equal(h.operation.status,'succeeded');
 assert.equal(h.operation.payload.artwork.fileBase64,art.fileBase64);assert.equal(h.operation.payload.artwork.sha256,art.sha256);
 assert.equal(h.providerCalls[0].request.image.image_data.caption.includes(art.sha256),false);
 assert.equal((await h.run()).status,'current');assert.equal(h.providerCalls.length,1);
});
test('an accepted upload with a lost response is recovered by provider readback without another create',async()=>{
 const h=harness({timeout:true});await assert.rejects(h.run());assert.equal(h.operation.status,'uncertain');const saved=structuredClone(h.operation.payload);
 assert.equal((await h.run()).status,'reconciled');assert.equal(h.providerCalls.length,1);assert.deepEqual(h.operation.payload,saved);
});
test('a failure saving acceptance is uncertain; a process crash in sending also rereads before retry',async()=>{
 const h=harness({finishFail:true});await assert.rejects(h.run());assert.equal(h.operation.status,'uncertain');
 h.operation.status='sending';assert.equal((await h.run()).status,'reconciled');assert.equal(h.providerCalls.length,1);
});
test('shared artwork reuses the existing image; attach preserves taxes, modifiers, price, SKU and inventory settings',async()=>{
 const h=harness({cached:true}),before=structuredClone(h.item);await h.run();assert.equal(h.providerCalls[0].method,'upsert');
 const expected=structuredClone(before);expected.item_data.image_ids=['image-one'];assert.deepEqual(h.providerCalls[0].request.object,expected);
});
test('seller photos and their primary position are retained when adding canonical artwork',async()=>{
 const h=harness({ownerPhoto:true});await h.run();assert.equal(h.providerCalls[0].request.is_primary,false);assert.deepEqual(h.item.item_data.image_ids,['seller-photo','image-one']);
});
test('disabled/private/unselected targets do not fetch or publish artwork; missing canonical images do not mutate Square',async()=>{
 for(const extra of [{enabled:false},{state:{target:{selected:false}}},{state:{target:{selected:true},offer:null}}]){
  const h=harness();assert.equal((await h.run({...extra,loadSource:async()=>{throw Error('must not run');}})).status,'not_enabled');assert.equal(h.providerCalls.length,0);
 }
 const h=harness();assert.equal((await h.run({loadSource:async()=>null})).status,'unavailable');assert.equal(h.providerCalls.length,0);
});
test('foreign managed-field changes fail closed and persist a sanitized error',async()=>{
 const h=harness();h.item.item_data.name='seller changed name';await assert.rejects(h.run(),e=>e.code==='square_managed_fields_changed');
 assert.equal(h.providerCalls.length,0);assert.equal(h.calls.at(-1).action,'target_error');
});
test('a concurrent new asking price defers optional artwork until the catalog price is current',async()=>{
 const h=harness();h.state.offer={...offer,askingPriceAmount:'3.00'};assert.equal((await h.run()).status,'catalog_pending');assert.equal(h.providerCalls.length,0);assert.equal(h.calls.length,0);
});
test('different normalized bytes with the same source identity reuse the prior merchant image',async()=>{
 const h=harness({cached:true});const alternative={...art,fileBase64:Buffer.from('different platform rendering').toString('base64'),fileSha256:'different'};
 await h.run({loadSource:async()=>alternative});assert.equal(h.providerCalls.length,1);assert.equal(h.providerCalls[0].method,'upsert');
});
test('a verified deduplicated image with old metadata receives a separate durable attach operation without renaming seller artwork',async()=>{
 const h=harness({deduplicated:true,ownerPhoto:true});assert.equal((await h.run()).status,'synced');
 assert.deepEqual(h.providerCalls.map(c=>c.method),['upload','upsert']);assert.equal(h.calls.filter(c=>c.action==='prepare').length,2);assert.equal(h.calls.filter(c=>c.action==='finish').length,2);
 assert.deepEqual(h.item.item_data.image_ids,['seller-photo','image-one']);assert.equal((await h.run()).status,'current');assert.equal(h.providerCalls.length,2);
});
test('Square image upload uses bounded multipart with the fixed origin, API version and immutable idempotency key',async()=>{
 let call;const client=new SquareClient({environment:'sandbox',accessToken:'fixture-token',fetchImpl:async(url,init)=>{call={url:String(url),init};return new Response(JSON.stringify({image:image()}));}});
 const request={idempotency_key:'stable-key',object_id:'item',image:{type:'IMAGE',image_data:image().image_data}};
 await client.uploadArtwork(request,art.fileBase64,art.name);assert.equal(call.url,'https://connect.squareupsandbox.com/v2/catalog/images');
 assert.equal(call.init.headers['Content-Type'],undefined);assert.equal(call.init.redirect,'error');assert.equal(call.init.headers['Square-Version'],'2026-09-16');
 assert.deepEqual(JSON.parse(call.init.body.get('request')),request);assert.equal(await call.init.body.get('file').text(),Buffer.from(art.fileBase64,'base64').toString());
});
test('an artwork outage is durably failed after stock is ready; it cannot revoke the ready unit',async()=>{
 const owner='ab000000-0000-4000-8000-000000000001',connection='ab000000-0000-4000-8000-000000000002',target='ab000000-0000-4000-8000-000000000003',calls=[];
 const service=new SquareCommerceService({config:{catalogEnabled:true,commerceEnabled:true,artworkEnabled:true},
  catalog:{withConnection:async(a,b,fn)=>fn({connection:{auto_sync:true},context:{}}),sync:async()=>({status:'unchanged'}),syncArtwork:async()=>{calls.push('artwork');throw new SquareApiError('square_artwork_unavailable');}},
  rpc:async(action,data)=>{calls.push({action,data});if(action==='commerce_targets')return [{id:target,instance_id:target,selected:true,allocation_state:'active'}];return {};}});
 service.reconcile=async()=>({});service.enroll=async()=>({});service.stock=async()=>{calls.push('stock-ready');return {status:'ready'};};
 const result=await service.processConnection(owner,connection,{manual:true,focusInstanceId:target});assert.equal(result.focusStatus,'ready');assert.equal(result.failed,0);assert.equal(result.artworkFailures,1);
 assert.ok(calls.indexOf('stock-ready')<calls.indexOf('artwork'));const finish=calls.find(c=>c.action==='commerce_run_finish');assert.equal(finish.data.result.status,'failed');assert.equal(finish.data.result.errorCode,'square_artwork_unavailable');
});
test('image recovery completes the current asking-price update and never downgrades uncertain image writes',async()=>{
 const owner='ab000000-0000-4000-8000-000000000001',connectionId='ab000000-0000-4000-8000-000000000002',targetId='ab000000-0000-4000-8000-000000000003',requestId='ab000000-0000-4000-8000-000000000004';
 const oldOffer={...offer,ownerId:owner,selected:true,publicVendorOffer:true,available:true},newOffer={...oldOffer,askingPriceAmount:'3.00'},key=Buffer.alloc(32,7).toString('base64');
 const connection={id:connectionId,owner_id:owner,environment:'sandbox',merchant_id:'merchant',location_id:'location',lease_fence:1,refresh_status:'idle',
  token_ciphertext:sealSquareCredential({accessToken:'fixture-token',merchantId:'merchant',expiresAt:'2030-01-01T00:00:00.000Z'},key,{purpose:'tokens',environment:'sandbox',ownerId:owner,connectionId,bindingId:'merchant'})};
 const item={id:'item',type:'ITEM',version:2,item_data:{name:offer.name,image_ids:['image-one'],variations:[{id:'variation',type:'ITEM_VARIATION',version:2,item_variation_data:{item_id:'item',name:offer.variationName,sku:`https://grookaivault.com/q/${gvvi}`,pricing_type:'FIXED_PRICING',price_money:{amount:200,currency:'USD'}}}]}};
 const target={id:targetId,selected:true,item_id:'item',variation_id:'variation',last_synced_projection:squareDesiredProjection(oldOffer)};
 let pending={id:'old-artwork',target_id:targetId,status:'uncertain',source_snapshot:oldOffer,projection:squareDesiredProjection(oldOffer),payload:{artwork:{...art,version:'SQUARE_ARTWORK_V1',mode:'upload',imageIdsBefore:[]}}},priceWrites=0;
 const rpc=async(action,data)=>{
  if(action==='claim')return connection;
  if(action==='target')return {target,offer:newOffer,pendingOperation:pending};
  if(action==='recover_finish'){pending=null;return {};}
  if(action==='prepare'){pending={id:'price-operation',target_id:targetId,status:'prepared',source_snapshot:data.sourceSnapshot,projection:data.projection,payload:data.payload};return pending;}
  if(action==='begin'){pending.status='sending';return pending;}
  if(action==='finish'){target.last_synced_projection=pending.projection;pending=null;return {};}
  if(action==='fail'){pending.status=data.uncertain?'uncertain':'failed';return {};}
  return {};
 };
 const provider={item:async()=>structuredClone(item),image:async()=>image(),itemsForExactSku:async()=>[structuredClone(item)],uploadArtwork:async()=>{throw new SquareApiError('square_provider_unavailable',{uncertain:true});},upsert:async request=>{priceWrites++;Object.assign(item,structuredClone(request.object));return {itemId:'item',variationId:'variation'};}};
 const service=new SquareCatalogService({rpc,clientFactory:()=>provider,config:{environment:'sandbox',appId:'fixture-app',appSecret:'fixture-secret',encryptionKey:key,callbackUrl:'https://example.org/api/square/oauth/callback',catalogEnabled:true,artworkEnabled:false}});
 assert.equal((await service.sync(owner,connectionId,targetId,requestId)).status,'synced');assert.equal(priceWrites,1);assert.equal(item.item_data.variations[0].item_variation_data.price_money.amount,300);assert.deepEqual(item.item_data.image_ids,['image-one']);
 item.item_data.image_ids=[];
 pending={id:'new-artwork',target_id:targetId,status:'prepared',source_snapshot:newOffer,projection:squareDesiredProjection(newOffer),payload:{artwork:{...art,version:'SQUARE_ARTWORK_V1',mode:'upload',imageIdsBefore:[],request:{object_id:'item'}}}};
 await assert.rejects(service.sync(owner,connectionId,targetId,'ab000000-0000-4000-8000-000000000005'));
 assert.equal(pending.status,'uncertain');assert.equal(priceWrites,1);
});
