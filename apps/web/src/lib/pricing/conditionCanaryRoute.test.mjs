import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {createConditionCanaryHandlerV1,CANARY_VERSION} from '../../../../../backend/pricing/condition_pricing_canary_v1.mjs';
const source=fs.readFileSync(new URL('../../app/api/founder/condition-pricing/v1/route.ts',import.meta.url),'utf8');
const ID='11111111-1111-4111-8111-111111111111';
class NextResponse extends Response{cookies={getAll:()=>[],set:()=>{}};}
function route({user={id:'fixture-owner',email:'founder@example.invalid'},authError=null,founder=true}={}){
 let priceReads=0;const validatedTokens=[];
 const sandbox={exports:{},require:name=>{
  if(name==='next/server')return{NextResponse};
  if(name==='@/lib/supabase/server')return{createRouteHandlerClient:()=>({auth:{getUser:async token=>{validatedTokens.push(token);return{data:{user},error:authError};}}})};
  if(name==='@/lib/supabase/admin')return{createServerAdminClient:()=>({fixture:true})};
  if(name==='@/lib/entitlements/resolveServerUserEntitlement')return{resolveServerUserEntitlement:async()=>({capabilities:{canUseFounderTools:founder}})};
  if(name==='@/lib/pricing/conditionCanaryServer')return{createConditionCanaryHandlerV1,getConditionCanaryPriceV1:async(_client,selection)=>{priceReads++;return{version:CANARY_VERSION,status:'available',card_printing_id:selection.cardPrintingId,card_print_id:ID,condition:selection.condition,amount:3.19,pricing_lane:'reference',private_preview:true,source_label:'fixture',provider_updated_at:null,unavailable_reason:null};}};
  throw new Error('Unexpected route import');
 }};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return{get:headers=>sandbox.exports.GET(new Request(`http://localhost/api/founder/condition-pricing/v1?card_printing_id=${ID}&condition=NM`,{headers})),reads:()=>priceReads,tokens:()=>validatedTokens};
}
test('real route adapter rejects anonymous and collector sessions before private price reads',async()=>{
 for(const config of [{user:null},{founder:false},{authError:{message:'expired'}}]){const h=route(config);assert.ok([401,403].includes((await h.get()).status));assert.equal(h.reads(),0);}
});
test('malformed bearer cannot borrow a founder cookie session',async()=>{
 const h=route();assert.equal((await h.get({authorization:'Basic fixture'})).status,401);assert.equal(h.tokens().length,0);assert.equal(h.reads(),0);
});
test('SDK validates an explicit bearer and cookie auth remains supported',async()=>{
 const h=route();const result=await h.get({authorization:'Bearer fixture-token'});assert.equal(result.status,200);assert.equal(h.tokens()[0],'fixture-token');assert.equal(h.reads(),1);assert.equal(result.headers.get('cache-control'),'private, no-store');
 const cookie=route();assert.equal((await cookie.get()).status,200);assert.equal(cookie.tokens()[0],undefined);
});
