import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as corrections from '../../apps/web/src/lib/sales/saleCostCorrections.mjs';
import {correctionFixture,correctionOwner} from '../fixtures/sale_cost_correction_cases_v1.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),origin='http://127.0.0.1:35130';
const source=fs.readFileSync(new URL('../../apps/web/src/app/api/sales/cost-corrections/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(options={}){
 const f=correctionFixture(),calls=[],exports={};
 const client={auth:{getUser:async()=>({data:{user:options.signedOut?null:{id:correctionOwner}}})},rpc:async(name,params)=>{
  calls.push({name,params});if(options.code)return{error:{code:options.code}};
  if(Object.hasOwn(options,'result'))return{data:options.result};
  return{data:name.endsWith('available_v1')?true:name.endsWith('read_v1')?[f.state]:name.endsWith('history_v1')?[f.outcome]:f.outcome};
 }};
 vm.runInNewContext(compiled,{exports,JSON,TextEncoder,process:{env:{GV_VENDOR_COST_CORRECTIONS_V1:options.off?'0':'1'}},require:name=>{
  if(name==='next/server')return{NextResponse:{json:(body,init)=>({body:JSON.parse(JSON.stringify(body)),...init})}};
  if(name==='@/lib/supabase/server')return{createServerComponentClient:async()=>client};
  if(name==='@/lib/getSiteOrigin')return{getSiteOrigin:()=>origin};
  if(name==='@/lib/sales/saleCostCorrections.mjs')return corrections;
  throw Error('Unexpected dependency '+name);
 }});
 return{f,calls,post:(body={},headers={origin})=>exports.POST({headers:{get:k=>headers[k]??null},text:async()=>options.raw??JSON.stringify({ownerId:correctionOwner,mode:'apply',request:f.outcome.request,...body})})};
}
for(const mode of ['apply','recover','cancel'])test('private exact correction route '+mode,async()=>{
 const h=harness(),r=await h.post({mode});assert.equal(r.status,200);assert.equal(r.body.ownerId,correctionOwner);assert.deepEqual(r.body.outcome,h.f.outcome);assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,`vendor_sale_cost_correction_${mode}_v1`);assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].params)),{p_request:h.f.outcome.request});assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.headers.Vary,'Cookie, Authorization');
});
for(const mode of ['recover','cancel'])test(mode+' remains usable with entry off',async()=>{
 const h=harness({off:true}),r=await h.post({mode});assert.equal(r.status,200);assert.equal(h.calls.length,1);
});
test('new entry and availability default off',async()=>{
 const h=harness({off:true});assert.equal((await h.post()).status,404);assert.equal(h.calls.length,0);
 const r=await h.post({mode:'available',request:undefined});assert.equal(r.status,200);assert.equal(r.body.enabled,false);assert.equal(h.calls.length,0);
});
test('owner, origin and authentication are enforced before private RPC',async()=>{
 for(const kind of ['owner','origin','signedOut']){const h=harness({signedOut:kind==='signedOut'}),r=await h.post(kind==='owner'?{ownerId:h.f.receipt.id}:{},{origin:kind==='origin'?'https://wrong.invalid':origin});assert.ok([401,403,409].includes(r.status));assert.equal(h.calls.length,0);}
});
test('null read is unresolved and cannot acknowledge apply or cancel',async()=>{
 const r=await harness({result:null}).post({mode:'recover'});assert.equal(r.status,200);assert.equal(r.body.outcome,null);
 for(const mode of ['apply','cancel'])assert.equal((await harness({result:null}).post({mode})).status,503);
});
test('exact cancellation is accepted but altered request and foreign outcome are refused',async()=>{
 const f=correctionFixture(),cancelled={...f.outcome,status:'cancelled',revision:null,source:null};assert.equal((await harness({result:cancelled}).post({mode:'cancel'})).status,200);
 for(const alter of [o=>o.request.reason+=' changed',o=>o.ownerId=f.receipt.id,o=>o.revision='2',o=>o.recordedAt='invalid']){const bad=structuredClone(f.outcome);alter(bad);assert.equal((await harness({result:bad}).post()).status,503);}
});
test('bounded private state reads require a complete owner-bound result',async()=>{
 const h=harness({off:true}),body={mode:'read',request:undefined,receiptIds:[h.f.receipt.id]};const r=await h.post(body);assert.equal(r.status,200);assert.deepEqual(r.body.states,[h.f.state]);
 assert.equal((await harness({result:[]}).post(body)).status,503);
 for(const receiptIds of [[],Array(101).fill(h.f.receipt.id),[h.f.receipt.id,h.f.receipt.id.toUpperCase()],['bad']]){const bad=harness();assert.equal((await bad.post({...body,receiptIds})).status,400);assert.equal(bad.calls.length,0);}
});
test('history is private, scoped and cursor bounded',async()=>{
 const h=harness(),body={mode:'history',request:undefined,receiptId:h.f.receipt.id,lineIndex:1,beforeRevision:null};const r=await h.post(body);assert.equal(r.status,200);assert.equal(r.body.history.length,1);
 for(const extra of [{lineIndex:50},{lineIndex:-1},{beforeRevision:'0'},{beforeRevision:'9223372036854775808'},{receiptId:'bad'}])assert.equal((await harness().post({...body,...extra})).status,400);
 assert.equal((await harness().post({...body,lineIndex:0})).status,503);
});
for(const code of ['PT409','22023','55000','42501','XX000'])test('RPC failure retains uncertain state: '+code,async()=>{const h=harness({code}),r=await h.post();assert.ok([409,503].includes(r.status));assert.equal(Object.hasOwn(r.body,'outcome'),false);assert.equal(Object.hasOwn(r.body,'rejected'),false);});
test('malformed, oversized and extra fields cannot reach mutation',async()=>{
 for(const options of [{raw:'bad'},{raw:' '.repeat(70001)}]){const h=harness(options);assert.equal((await h.post()).status,400);assert.equal(h.calls.length,0);}
 const h=harness();for(const body of [{mode:'delete'},{extra:true},{request:{...h.f.outcome.request,reason:''}}])assert.equal((await h.post(body)).status,400);assert.equal(h.calls.length,0);
});
