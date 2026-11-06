import test from 'node:test';import assert from 'node:assert/strict';
import {EbaySellerListingClient,EbaySellerApiError} from '../../backend/ebay/seller_client_v1.mjs';
const token='private-test-token-never-log-this';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});
const client=fetchImpl=>new EbaySellerListingClient({environment:'sandbox',accessToken:token,fetchImpl});

test('seller transport pins sandbox origin and disables redirects',async()=>{
  let captured;const api=client(async(url,options)=>{captured={url,options};return json({offerId:'12345'});});
  await api.getOffer('12345');assert.equal(captured.url.origin,'https://api.sandbox.ebay.com');assert.equal(captured.url.pathname,'/sell/inventory/v1/offer/12345');assert.equal(captured.options.redirect,'error');assert.equal(captured.options.headers.Authorization,'Bearer '+token);assert.equal(JSON.stringify(api),'{}');
});
test('provider identifiers and configuration cannot select another host or path',()=>{
  let requests=0;const api=client(async()=>{requests++;return json({});});
  for(const bad of ['../token','https://evil.test','x?token=secret','x/../../token','',null])assert.throws(()=>api.getOffer(bad),EbaySellerApiError);
  assert.throws(()=>new EbaySellerListingClient({environment:'https://evil.test',accessToken:token}));assert.throws(()=>api.getPolicies('../token'));assert.throws(()=>api.getOffersForSku('safe',-1));assert.equal(requests,0);
});
test('draft and quote never implicitly call publish',async()=>{
  const calls=[];const api=client(async(url,options)=>{calls.push({url:url.pathname,method:options.method,body:options.body&&JSON.parse(options.body)});return json(url.pathname.endsWith('/publish')?{listingId:'99999'}:{offerId:'12345'});});
  await api.putInventoryItem('gv_123',{product:{title:'Reviewed copy'}});await api.createOffer({sku:'gv_123'});await api.getListingFees('12345');
  assert.deepEqual(calls.map(v=>[v.method,v.url]),[['PUT','/sell/inventory/v1/inventory_item/gv_123'],['POST','/sell/inventory/v1/offer'],['POST','/sell/inventory/v1/offer/get_listing_fees']]);assert.deepEqual(calls[2].body,{offers:[{offerId:'12345'}]});assert.ok(!calls.some(v=>v.url.endsWith('/publish')));
  await api.publishOffer('12345');assert.equal(calls.at(-1).url,'/sell/inventory/v1/offer/12345/publish');
});
test('write timeout is uncertain and is never automatically replayed',async()=>{
  let calls=0;const api=client(async()=>{calls++;throw Error('transport includes '+token);});
  await assert.rejects(api.publishOffer('12345'),e=>e.code==='provider_result_uncertain'&&e.uncertain===true&&!JSON.stringify(e).includes(token));assert.equal(calls,1);
});
test('read-only POST quote failure does not imply listing publication',async()=>{
  const api=client(async()=>{throw Error(token);});await assert.rejects(api.getListingFees('12345'),e=>e.code==='provider_unavailable'&&e.uncertain===false);
});
test('provider error bodies and photos never enter public errors',async()=>{
  const photo='https://private.test/signed-photo?token=secret';const api=client(async()=>json({errors:[{errorId:25002,message:token,parameters:[photo]}]},400));
  await assert.rejects(api.createOffer({}),e=>e.code==='provider_request_rejected'&&e.errorIds[0]===25002&&!JSON.stringify(e).includes(token)&&!JSON.stringify(e).includes(photo));
});
test('rate limiting retains only a bounded retry delay',async()=>{
  const api=client(async()=>json({errors:[]},429,{'retry-after':'999999'}));await assert.rejects(api.getLocations(),e=>e.code==='provider_rate_limited'&&e.retryAfterSeconds===3600&&!e.uncertain);
  const noDelay=client(async()=>json({},429));await assert.rejects(noDelay.getLocations(),e=>e.retryAfterSeconds===null);
});
test('provider server error preserves write uncertainty',async()=>{
  const api=client(async()=>json({},500));await assert.rejects(api.createOffer({}),e=>e.uncertain&&e.code==='provider_result_uncertain');await assert.rejects(api.getOffer('12345'),e=>!e.uncertain&&e.code==='provider_unavailable');
});
test('malformed successful write response remains uncertain',async()=>{
  const api=client(async()=>new Response('not-json',{status:200}));await assert.rejects(api.publishOffer('12345'),e=>e.uncertain&&e.code==='provider_result_uncertain');
});
test('provider response size is bounded before decoding',async()=>{
  const api=client(async()=>new Response(new Uint8Array(2_000_001),{status:200}));await assert.rejects(api.getLocations(),e=>e.code==='provider_response_invalid'&&!e.uncertain);
});
test('empty or mismatched write success cannot fabricate an offer or listing receipt',async()=>{
  const api=client(async()=>json({}));await assert.rejects(api.createOffer({}),e=>e.code==='provider_result_uncertain'&&e.uncertain);await assert.rejects(api.publishOffer('12345'),e=>e.code==='provider_result_uncertain'&&e.uncertain);
});
test('withdraw without a definitive listing receipt remains uncertain even on HTTP 200', async () => {
  const api=client(async()=>json({warnings:[{errorId:123}]}));
  await assert.rejects(api.withdrawOffer('12345'),e=>e.code==='provider_result_uncertain'&&e.uncertain);
});
test('withdraw retains the listing identity for durable authority to match before releasing a copy', async () => {
  const api=client(async()=>json({listingId:'99999'}));
  assert.deepEqual(await api.withdrawOffer('12345'),{listingId:'99999'});
});
test('non-JSON authentication failure stays actionable without leaking provider text',async()=>{
  const api=client(async()=>new Response('<html>'+token+'</html>',{status:401}));await assert.rejects(api.publishOffer('12345'),e=>e.code==='seller_authorization_required'&&!e.uncertain&&!JSON.stringify(e).includes(token));
});
test('malformed local write payload is rejected before network access',async()=>{
  let calls=0;const api=client(async()=>{calls++;return json({});});for(const value of [undefined,null,[],true,'x']){assert.throws(()=>api.putInventoryItem('safe',value));await assert.rejects(api.createOffer(value),e=>e.code==='invalid_provider_payload'&&!e.uncertain);}assert.equal(calls,0);
});


test('full card-aspect dictionaries over 2 MB retain every value within the scoped 4 MB budget',async()=>{
  const values=Array.from({length:50_000},(_,i)=>({localizedValue:'Collector card printing '+i}));
  const body={aspects:[{localizedAspectName:'Card Name',aspectValues:values}]};
  const bytes=Buffer.byteLength(JSON.stringify(body));assert.ok(bytes>2_000_000&&bytes<4_000_000);
  const api=client(async()=>json(body));const result=await api.getCategoryAspects('0','183454');
  assert.equal(result.aspects[0].aspectValues.length,50_000);
  assert.deepEqual(result.aspects[0].aspectValues.at(-1),values.at(-1));
  await assert.rejects(api.getLocations(),e=>e.code==='provider_response_invalid'&&!e.uncertain);
  await assert.rejects(api.getCategorySuggestions('0','card'),e=>e.code==='provider_response_invalid'&&!e.uncertain);
});
test('card-aspect reads still reject responses above 4 MB and malformed JSON',async()=>{
  for(const body of [new Uint8Array(4_000_001),'not-json']){
    const api=client(async()=>new Response(body,{status:200}));
    await assert.rejects(api.getCategoryAspects('0','183454'),e=>e.code==='provider_response_invalid'&&!e.uncertain);
  }
});
test('empty successful reads cannot qualify metadata while empty write acknowledgements remain valid',async()=>{
  const api=client(async()=>new Response(null,{status:204}));
  await assert.rejects(api.getCategoryAspects('0','183454'),e=>e.code==='provider_response_invalid'&&!e.uncertain);
  await assert.rejects(api.getLocations(),e=>e.code==='provider_response_invalid'&&!e.uncertain);
  assert.equal(await api.putInventoryItem('safe',{product:{title:'Reviewed copy'}}),null);
});
