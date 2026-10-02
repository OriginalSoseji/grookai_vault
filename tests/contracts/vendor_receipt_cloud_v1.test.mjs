import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';
import {CLOUD_BOOK_LIMIT,receiptRpcTransport,openCloudReceiptBook,parseCloudWrite} from '../../apps/web/src/lib/receipts/receiptCloud.mjs';
import {emptyBook,saveSale,createReceipt} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const customer={name:'Buyer',email:'buyer@fixture.invalid',phone:'',notes:'Private',wants:'Eevee'};
const nextBook=()=>saveSale(emptyBook(),createReceipt({storeName:'Fixture',customer,confirmed:true,method:'Cash',items:[{description:'Card',quantity:'1',price:'10'}],discount:'0',tax:'0',note:''},randomUUID(),new Date().toISOString()),customer,randomUUID());
const ok=data=>Response.json(data);

test('lost save response retries the exact mutation ID and expected revision',async()=>{
 const writes=[];let stored={revision:0,book:emptyBook()};
 const client=await openCloudReceiptBook(async(_,init)=>{
  if(!init.method)return ok(stored);
  const body=JSON.parse(init.body);writes.push(body);
  if(writes.length===1){stored={revision:1,book:body.book};throw Error('Response lost');}
  return ok(stored);
 });
 const book=nextBook();await assert.rejects(()=>client.save(book),/Retry/);await client.save(book);
 assert.deepEqual(writes[0],writes[1]);assert.equal(writes[1].revision,0);
});
test('a stale writer never retries automatically or changes the expected revision',async()=>{
 let writes=0;const client=await openCloudReceiptBook(async(_,init)=>{
  if(!init.method)return ok({revision:4,book:emptyBook()});writes++;assert.equal(JSON.parse(init.body).revision,4);return new Response('',{status:409});
 });
 await assert.rejects(()=>client.save(nextBook()),/Another device/);assert.equal(writes,1);
});
test('a successful save advances the revision for the next receipt',async()=>{
 const revisions=[];const client=await openCloudReceiptBook(async(_,init)=>{
  if(!init.method)return ok({revision:2,book:emptyBook()});const body=JSON.parse(init.body);revisions.push(body.revision);return ok({revision:body.revision+1,book:body.book});
 });
 const book=nextBook();await client.save(book);await client.save({...book,storeName:'New seller label'});assert.deepEqual(revisions,[2,3]);
});
test('invalid reply and logout never acknowledge a saved receipt',async()=>{
 for(const response of [new Response('',{status:401}),ok({revision:999,book:emptyBook()})]){
  const client=await openCloudReceiptBook(async(_,init)=>init.method?response:ok({revision:0,book:emptyBook()}));await assert.rejects(()=>client.save(nextBook()));
 }
});
test('cloud request validates revision, request identity and canonical receipt totals',()=>{
 const input={revision:0,requestId:randomUUID(),book:nextBook()};assert.equal(parseCloudWrite(input).book.receipts.length,1);
 for(const patch of [x=>x.revision=-1,x=>x.revision=0.5,x=>x.requestId='bad',x=>x.book.receipts[0].receipt.totalMinor++]){
  const bad=structuredClone(input);patch(bad);assert.throws(()=>parseCloudWrite(bad));
 }
});

test('SDK transport preserves RPC authorization, signals and account binding',async()=>{
 let actor='owner',stored={revision:0,book:emptyBook()};const calls=[];
 const sdk={auth:{getSession:async()=>({data:{session:actor?{user:{id:actor}}:null}})},rpc:(name,args)=>({abortSignal:async signal=>{
  assert.ok(signal instanceof AbortSignal);calls.push({name,args});
  if(name==='vendor_receipt_book_save_v1')stored={revision:args.p_revision+1,book:args.p_book};
  return {data:stored,error:null};
 }})};
 const book=await openCloudReceiptBook(receiptRpcTransport(sdk));await book.save(nextBook());
 assert.deepEqual(calls.map(c=>c.name),['vendor_receipt_book_read_v1','vendor_receipt_book_save_v1']);
 assert.deepEqual(Object.keys(calls[1].args).sort(),['p_book','p_request_id','p_revision']);
 actor='other';await assert.rejects(()=>book.save(nextBook()),/sign in again/);assert.equal(calls.length,2);
 actor=null;await assert.rejects(()=>openCloudReceiptBook(receiptRpcTransport(sdk)),/sign in again/);
});

test('SDK application conflicts are surfaced without retrying the RPC',async()=>{
 let calls=0;const sdk={auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},rpc:name=>({abortSignal:async()=>{
  calls++;return name.endsWith('read_v1')?{data:{revision:0,book:emptyBook()},error:null}:{data:null,error:{code:'PT409'}};
 }})};
 const book=await openCloudReceiptBook(receiptRpcTransport(sdk));await assert.rejects(()=>book.save(nextBook()),/Another device/);assert.equal(calls,2);
});

test('SDK status-zero lost replies keep the same request ID for an explicit retry',async()=>{
 const writes=[];let stored={revision:0,book:emptyBook()};
 const sdk={auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},rpc:(name,args)=>({abortSignal:async()=>{
  if(name.endsWith('read_v1'))return {data:stored,error:null};
  writes.push(args);stored={revision:1,book:args.p_book};
  return writes.length===1?{status:0,data:null,error:{code:'',message:'Failed to fetch'}}:{data:stored,error:null};
 }})};
 const book=await openCloudReceiptBook(receiptRpcTransport(sdk)),next=nextBook();
 await assert.rejects(()=>book.save(next),/Retry/);await book.save(next);assert.deepEqual(writes[0],writes[1]);
});

test('receipt proof mode accepts only its isolated API and rejects combined modes',()=>{
 for(const [url,extra,allowed] of [
  ['http://127.0.0.1:64701',{},true],
  ['https://ycdxbpibncqcchqiihfz.supabase.co',{},false],
  ['http://127.0.0.1:54321',{},false],
  ['http://127.0.0.1:64701',{NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true'},false],
  ['http://127.0.0.1:64701',{NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST:'true'},false],
 ]) {
  const script=`import {assertCollectorStagingTarget} from './apps/web/src/lib/collectorStaging.mjs';assertCollectorStagingTarget(${JSON.stringify(url)});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST:'true',...extra},encoding:'utf8'});
  assert.equal(result.status===0,allowed);
 }
 assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST:'true'}),/test modes/);
});

test('near-limit canonical books validate independently of RPC request metadata',()=>{
 const book=emptyBook();
 for(let i=0;i<5000;i++)book.customers.push({id:randomUUID(),name:'Buyer',email:'',phone:'',wants:'',notes:'',updatedAt:'2026-10-02T00:00:00.000Z'});
 let remaining=CLOUD_BOOK_LIMIT-1-Buffer.byteLength(JSON.stringify(book));
 for(const customer of book.customers){const count=Math.min(2000,remaining);customer.notes='a'.repeat(count);remaining-=count;}
 assert.equal(remaining,0);
 const input={revision:42,requestId:randomUUID(),book};
 const wire=JSON.stringify(input);assert.ok(Buffer.byteLength(wire)>CLOUD_BOOK_LIMIT);assert.ok(Buffer.byteLength(wire)<CLOUD_BOOK_LIMIT+1024);
 assert.equal(Buffer.byteLength(JSON.stringify(parseCloudWrite(input).book)),CLOUD_BOOK_LIMIT-1);
 // A multibyte string can be below the character limit but exceed the byte cap.
 book.customers.at(-1).wants='é'.repeat(10);
 assert.throws(()=>parseCloudWrite(input),/too large/);
});
