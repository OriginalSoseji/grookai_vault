import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {createConditionPriceHandlerV1,CONDITION_PRICE_VERSION} from '../../../../../backend/pricing/condition_pricing_read_model_v1.mjs';
const source=fs.readFileSync(new URL('../../app/api/condition-pricing/v1/route.ts',import.meta.url),'utf8');
const ID='11111111-1111-4111-8111-111111111111';
class NextResponse extends Response{cookies={getAll:()=>[],set:()=>{}};}
function route({user={id:'ordinary-collector'},authError=null}={}){
 let reads=0;const tokens=[];
 const sandbox={exports:{},require:name=>{
  if(name==='next/server')return{NextResponse};
  if(name==='@/lib/supabase/server')return{createRouteHandlerClient:()=>({auth:{getUser:async token=>{tokens.push(token);return{data:{user},error:authError};}}})};
  if(name==='@/lib/supabase/admin')return{createServerAdminClient:()=>({fixture:true})};
  if(name==='@/lib/pricing/conditionPriceServer')return{createConditionPriceHandlerV1,getConditionPriceV1:async(_client,selection)=>{reads++;return{version:CONDITION_PRICE_VERSION,status:'available',card_printing_id:selection.cardPrintingId,condition:selection.condition,amount:3.19,pricing_lane:'reference',source_label:'fixture',provider_updated_at:null,unavailable_reason:null};}};
  throw new Error('Unexpected route import');
 }};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return{get:headers=>sandbox.exports.GET(new Request(`http://localhost/api/condition-pricing/v1?card_printing_id=${ID}&condition=NM`,{headers})),reads:()=>reads,tokens:()=>tokens};
}
test('ordinary signed-in collector gets condition price; anonymous and expired sessions cannot read',async()=>{
 const collector=route();assert.equal((await collector.get()).status,200);assert.equal(collector.reads(),1);
 for(const config of [{user:null},{authError:{message:'expired'}}]){const h=route(config);assert.equal((await h.get()).status,401);assert.equal(h.reads(),0);}
});
test('explicit malformed bearer cannot borrow cookies; valid bearer is SDK validated',async()=>{
 const invalid=route();assert.equal((await invalid.get({authorization:'Basic fixture'})).status,401);assert.equal(invalid.tokens().length,0);assert.equal(invalid.reads(),0);
 const bearer=route();const result=await bearer.get({authorization:'Bearer fixture-token'});assert.equal(result.status,200);assert.equal(bearer.tokens()[0],'fixture-token');assert.equal(result.headers.get('cache-control'),'private, no-store');
});
