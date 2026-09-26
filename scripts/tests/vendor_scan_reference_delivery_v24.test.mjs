import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import { createReferenceDelivery, eligibleReferenceIds, hashReference, readBoundedResponse, validateReferenceIds, validateReferencePackets, validateSignedReferenceUrl, MAX_REFERENCE_BYTES, MAX_REFERENCE_TOTAL_BYTES } from '../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
const origin='https://hrtbjchobencariqclab.supabase.co', bytes=Buffer.from('pinned-image');
const row=i=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,gv_id:`GV-PK-TST-${i}`,image_path:`warehouse-derived/self-hosted-images-v1/test/${i}.webp`,sha256:hashReference(bytes)});
const rows=Array.from({length:12},(_,i)=>row(i)),byId=new Map(rows.map(r=>[r.id,r]));
const url=r=>origin+'/storage/v1/object/sign/user-card-images/'+r.image_path+'?token=test';
const signal=()=>new AbortController().signal;
test('unknown, duplicate and excessive requests cannot request storage',()=>{
 for(const ids of [[],[rows[0].id,rows[0].id],['../../secret'],Array(33).fill(rows[0].id),[row(999).id]])assert.throws(()=>validateReferenceIds(ids,byId));
 assert.deepEqual(validateReferenceIds([rows[0].id],byId),[rows[0]]);
});
test('reference locations must be exact signed pinned paths on the configured origin',()=>{
 assert.equal(validateSignedReferenceUrl(url(rows[0]),origin,rows[0].image_path),url(rows[0]));
 for(const u of [url(rows[0]).replace(origin,'https://example.org'),url(rows[1]),url(rows[0])+'&download=x',url(rows[0])+'#x',url(rows[0]).replace('https://','https://user:pass@')])assert.throws(()=>validateSignedReferenceUrl(u,origin,rows[0].image_path));
 assert.throws(()=>validateSignedReferenceUrl(url(rows[0]),origin,'warehouse-derived/self-hosted-images-v1/../private.webp'));
});
test('current visibility, exact bindings and active public printings are all required',()=>{
 const r=rows[0],current={...r,image_status:'exact',image_source:'identity'},p={id:row(77).id,card_print_id:r.id,printing_gv_id:r.gv_id+'-HOLO',finish_is_active:true};
 assert.deepEqual(eligibleReferenceIds([r],[current],[p]),[r.id]);
 for(const input of [[],[{...current,gv_id:'other'}],[{...current,image_path:rows[1].image_path}],[{...current,image_status:'blocked'}],[{...current,image_source:'external'}]])assert.deepEqual(eligibleReferenceIds([r],input,[p]),[]);
 for(const input of [[],[{...p,card_print_id:rows[1].id}],[{...p,printing_gv_id:null}],[{...p,finish_is_active:false}]])assert.deepEqual(eligibleReferenceIds([r],[current],input),[]);
});
test('hidden rows never reach signing or download',async()=>{
 const loader=createReferenceDelivery({byId,origin,authorize:async()=>[],sign:()=>assert.fail('Signed hidden image'),fetchImage:()=>assert.fail('Fetched hidden image')});
 assert.deepEqual(await loader([rows[0].id],{signal:signal()}),[]);
});
test('bounded delivery preserves IDs, pins bytes and allows only four concurrent downloads',async()=>{
 let active=0,peak=0;const loader=createReferenceDelivery({byId,origin,authorize:async r=>r.map(r=>r.id),sign:async r=>r.map(url),fetchImage:async(u,init)=>{
  assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'omit');active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return new Response(bytes,{headers:{'content-type':'image/webp'}});
 }});const packets=await loader(rows.map(r=>r.id),{signal:signal()});assert.equal(peak,4);assert.deepEqual(packets.map(p=>p.id),rows.map(r=>r.id));assert.ok(packets.every(p=>Buffer.from(p.bytes).equals(bytes)));
});
test('changed bytes, missing images, wrong types and storage redirects fail closed',async()=>{
 for(const response of [new Response('wrong',{headers:{'content-type':'image/webp'}}),new Response('missing',{status:404,headers:{'content-type':'image/webp'}}),new Response(bytes,{headers:{'content-type':'text/html'}}),new Response(null,{status:302,headers:{location:'https://example.org','content-type':'image/webp'}})]){
  const loader=createReferenceDelivery({byId,origin,authorize:async r=>r.map(r=>r.id),sign:async r=>r.map(url),fetchImage:async()=>response});await assert.rejects(loader([rows[0].id],{signal:signal()}));
 }
});
test('declared and streaming oversize bodies, empty bytes and cancellation are bounded',async()=>{
 await assert.rejects(readBoundedResponse(new Response('x',{headers:{'content-length':String(MAX_REFERENCE_BYTES+1)}}),MAX_REFERENCE_BYTES,signal()));
 await assert.rejects(readBoundedResponse(new Response(new Uint8Array(9)),8,signal()));
 await assert.rejects(readBoundedResponse(new Response(new Uint8Array()),8,signal()));
 let cancelled=false;const control=new AbortController(),stalled=new Response(new ReadableStream({cancel(){cancelled=true;}}));
 const pending=readBoundedResponse(stalled,8,control.signal);control.abort();await assert.rejects(pending);assert.equal(cancelled,true);
});
test('packet validation rejects changed, duplicate, unrequested and aggregate oversize data',()=>{
 const ids=rows.map(r=>r.id);assert.throws(()=>validateReferencePackets([{id:rows[0].id,bytes:Buffer.from('bad')}],ids,byId));
 assert.throws(()=>validateReferencePackets([{id:rows[0].id,bytes},{id:rows[0].id,bytes}],ids,byId));
 assert.throws(()=>validateReferencePackets([{id:row(99).id,bytes}],ids,byId));
 const big=Buffer.alloc(MAX_REFERENCE_BYTES),bigMap=new Map(rows.map(r=>[r.id,{...r,sha256:hashReference(big)}]));
 assert.ok(big.length*9>MAX_REFERENCE_TOTAL_BYTES);assert.throws(()=>validateReferencePackets(rows.slice(0,9).map(r=>({id:r.id,bytes:big})),ids,bigMap));
});
