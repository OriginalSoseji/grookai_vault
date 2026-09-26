import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCustomImport,readImportBody} from '../../apps/web/src/lib/stores/customProductImportHttp.ts';
import {createCustomImport,readCustomImport} from '../../apps/web/src/lib/stores/customProductImportService.ts';
import {CUSTOM_IMPORT_MAX_BYTES} from '../../apps/web/src/lib/stores/customProductImport.ts';
const id='12345678-1234-1234-1234-123456789abc',origin='http://127.0.0.1:18440',url=origin+'/api/stores/owner/import';
const request=(body,headers={})=>new Request(url,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body});
test('origin, media type, method and duplicate GET parameters fail before client access',async()=>{
 let accessed=0;const deps={origin,client:async()=>{accessed++;throw Error('unexpected');}};
 for(const [req,status] of [[request('{}',{origin:'https://foreign.invalid'}),403],[request('{}',{'content-type':'text/plain'}),415],[new Request(url,{method:'DELETE'}),405],[new Request(url+'?id='+id+'&id='+id),400]])assert.equal((await handleCustomImport(req,deps)).status,status);
 assert.equal(accessed,0);
});
test('stream size is bounded without trusting content-length and cancels excess bytes',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(CUSTOM_IMPORT_MAX_BYTES+1025));},cancel(){cancelled=true;}});
 await assert.rejects(readImportBody(new Request(url,{method:'POST',body:stream,duplex:'half'})),e=>e.status===413);assert.equal(cancelled,true);
 await assert.rejects(readImportBody(request('{}',{'content-length':'999999999'})),e=>e.status===413);
});
test('malformed JSON and invalid UTF8 cannot reach the mutation boundary',async()=>{
 await assert.rejects(readImportBody(request('{')),e=>e.status===400);
 await assert.rejects(readImportBody(new Request(url,{method:'POST',body:new Uint8Array([255])})),e=>e.status===400);
});
test('unauthenticated reads and writes stop before any SQL access',async()=>{
 let touched=false;const client={auth:{getUser:async()=>({data:{user:null},error:null})},from:()=>{touched=true;},rpc:()=>{touched=true;}};
 await assert.rejects(readCustomImport(client,id),e=>e.status===401);
 await assert.rejects(createCustomImport(client,{id,rows:[{title:'a',available_quantity:1}]}),e=>e.status===401);assert.equal(touched,false);
});
test('unexpected request properties and forged receipt identity are rejected',async()=>{
 const client={auth:{getUser:async()=>({data:{user:{id}},error:null})},rpc:async()=>({data:{id:'foreign',product_ids:[id],created_at:new Date().toISOString()},error:null})};
 await assert.rejects(createCustomImport(client,{id,rows:[{title:'a',available_quantity:1}],ownerId:id}),e=>e.status===400);
 await assert.rejects(createCustomImport(client,{id,rows:[{title:'a',available_quantity:1}]}),e=>e.status===503);
});
test('SQL conflict and grant denials preserve recoverable HTTP semantics',async()=>{
 for(const [code,status] of [['PT409',409],['42501',403],['22023',400],['08006',503]]) {
  const client={auth:{getUser:async()=>({data:{user:{id}},error:null})},rpc:async()=>({data:null,error:{code}})};
  const response=await handleCustomImport(request(JSON.stringify({id,rows:[{title:'a',available_quantity:1}]})),{origin,client:async()=>client});
  assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie, Authorization');
 }
});
test('successful RPC requires an independent owner-RLS receipt readback',async()=>{
 let reads=0;const row={id,product_ids:['22345678-1234-1234-1234-123456789abc'],created_at:'2026-09-19T12:00:00+00:00'};
 const query={select:()=>query,eq:(key,value)=>{assert.equal(key,'id');assert.equal(value,id);return query;},maybeSingle:async()=>{reads++;return {data:row,error:null};}};
 const client={auth:{getUser:async()=>({data:{user:{id}},error:null})},rpc:async()=>({data:row,error:null}),from:table=>{assert.equal(table,'vendor_store_custom_imports');return query;}};
 const receipt=await createCustomImport(client,{id,rows:[{title:'a',available_quantity:1}]});assert.deepEqual(receipt.productIds,row.product_ids);assert.equal(reads,1);
 query.maybeSingle=async()=>({data:null,error:null});await assert.rejects(createCustomImport(client,{id,rows:[{title:'a',available_quantity:1}]}),e=>e.status===503);
});
