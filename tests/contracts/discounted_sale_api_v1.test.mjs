import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as discount from '../../apps/web/src/lib/sales/discountedSale.mjs';
import {discountRequest,discountReceipt} from '../fixtures/discounted_sale_cases_v1.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',origin='http://127.0.0.1:34830';
const source=fs.readFileSync(new URL('../../apps/web/src/app/api/sales/desk/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const ack=()=>({version:1,request:structuredClone(discountRequest),receipt:discountReceipt()});
const cancellation=()=>({version:1,request:structuredClone(discountRequest),status:'cancelled'});
function harness(options={}){
 const calls=[],exports={};
 const client={auth:{getUser:async()=>({data:{user:options.signedOut?null:{id:owner}}})},rpc:async(name,params)=>{
  calls.push({name,params});
  if(name==='vendor_sales_discount_entry_available_v1')return options.capabilityError?{error:{code:options.capabilityError}}:{data:options.enabled??true};
  if(name.endsWith('available_v1'))return{data:true};
  return options.rpcError?{error:{code:options.rpcError}}:{data:Object.hasOwn(options,'result')?options.result:ack()};
 }};
 vm.runInNewContext(compiled,{exports,URL,require:name=>{
  if(name==='next/server')return{NextResponse:{json:(body,init)=>({body:JSON.parse(JSON.stringify(body)),...init})}};
  if(name==='@/lib/supabase/server')return{createServerComponentClient:async()=>client};
  if(name==='@/lib/getSiteOrigin')return{getSiteOrigin:()=>origin};
  if(name.endsWith('/discountedSale.mjs'))return discount;
  return{};
 }});
 return{calls,post:(change={},headers={origin})=>exports.POST({headers:{get:k=>headers[k]??null},text:async()=>JSON.stringify({action:'discounted-sale',owner,...structuredClone(discountRequest),...change})}),
  session:()=>exports.GET({nextUrl:new URL(origin+'/api/sales/desk')})};
}
for(const [action,rpc] of [['discounted-sale','vendor_sales_cart_complete_v6'],['recover-discounted-sale','vendor_sales_cart_read_v3'],['cancel-discounted-sale','vendor_sales_cart_cancel_v1']]){
 test('actual route dispatches exact private payload for '+action,async()=>{
  const h=harness(),r=await h.post({action});assert.equal(r.status,200);assert.equal(r.body.owner,owner);assert.deepEqual(r.body.result,ack());
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,rpc);assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].params)),{p_request_id:discountRequest.id,p_cart:discountRequest.cart});
  assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.headers.Vary,'Cookie, Authorization');
 });
 for(const code of ['22023','PT409','42501','23514','XX000'])test(action+' error '+code+' cannot authorize clearing',async()=>{
  const h=harness({rpcError:code}),r=await h.post({action});assert.equal(r.body.rejected,false);assert.equal(r.status,409);
 });
}
for(const action of ['recover-discounted-sale','cancel-discounted-sale'])test(action+' accepts only exact durable cancellation',async()=>{
 const good=await harness({result:cancellation()}).post({action});assert.equal(good.status,200);assert.deepEqual(good.body.result,cancellation());
 const changed=cancellation();changed.request.cart.items[0].instanceId=owner;
 const bad=await harness({result:changed}).post({action});assert.equal(bad.status,503);assert.equal(bad.body.rejected,false);
});
test('empty recovery stays unresolved; empty completion/cancellation cannot succeed',async()=>{
 const read=await harness({result:null}).post({action:'recover-discounted-sale'});assert.equal(read.status,200);assert.equal(read.body.result,null);
 for(const action of ['discounted-sale','cancel-discounted-sale']){const r=await harness({result:null}).post({action});assert.equal(r.status,503);assert.equal(r.body.rejected,false);}
});
for(const mismatch of ['copy','note','discount','receipt','status'])test('route rejects mismatched '+mismatch+' outcome',async()=>{
 const result=ack();
 if(mismatch==='copy')result.request.cart.items[0].instanceId=owner;
 if(mismatch==='note')result.request.cart.note='changed';
 if(mismatch==='discount')result.request.cart.discountMinor=21;
 if(mismatch==='receipt')result.receipt.totalMinor=1;
 if(mismatch==='status')result.status='cancelled';
 const r=await harness({result}).post();assert.equal(r.status,503);assert.equal(r.body.rejected,false);
});
test('wrong owner, origin or signed-out context never reaches cancellation',async()=>{
 for(const kind of ['owner','origin','signed-out']){
  const h=harness({signedOut:kind==='signed-out'}),r=await h.post({action:'cancel-discounted-sale',...(kind==='owner'?{owner:discountRequest.id}:{})},{origin:kind==='origin'?'https://wrong.invalid':origin});
  assert.ok([401,403,409].includes(r.status));assert.equal(h.calls.length,0);
 }
});
test('invalid saved cart cannot reach any new authority',async()=>{
 for(const action of ['discounted-sale','recover-discounted-sale','cancel-discounted-sale']){
  const h=harness(),r=await h.post({action,cart:{...discountRequest.cart,discountMinor:-1}});assert.equal(r.status,400);assert.equal(r.body.rejected,false);assert.equal(h.calls.length,0);
 }
});
test('entry capability depends on new recovery boundary; missing defaults off',async()=>{
 assert.equal((await harness({enabled:false}).session()).body.discounts,false);
 assert.equal((await harness({capabilityError:'PGRST202'}).session()).body.discounts,false);
 assert.equal((await harness().session()).body.discounts,true);
 assert.equal((await harness({capabilityError:'XX000'}).session()).status,503);
});
