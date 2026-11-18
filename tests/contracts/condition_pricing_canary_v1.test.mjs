import test from 'node:test';import assert from 'node:assert/strict';
import {getConditionCanaryCatalogV1,getConditionCanaryPriceV1,createConditionCanaryHandlerV1,CANARY_VERSION} from '../../backend/pricing/condition_pricing_canary_v1.mjs';
import {SOURCE,STAGED_STATUS,VERSION} from '../../backend/pricing/tcgtracking_condition_reference_v1.mjs';
const CHILD='11111111-1111-4111-8111-111111111111',PARENT='22222222-2222-4222-8222-222222222222',NOW='2026-11-17T19:00:00Z';
const sourceRow=condition=>({card_print_id:PARENT,card_printing_id:CHILD,category_id:3,group_id:1394,finish_key:'normal',language:'EN',source:SOURCE,pricing_lane:'reference',app_visible:false,mapping_lane:'verified_parent_finish',mapping_source:'tcgplayer',mapping_id:'17',product_id:99,condition,market_price:condition==='NM'?10:8.5,provider_updated_at:'2026-11-17T18:00:00Z'});
function fixture(overrides={}){
 const tables={raw_imports:[{id:42,source:SOURCE,status:STAGED_STATUS,notes:`${VERSION}:3:1394:fixture`,version:VERSION,kind:'condition_price_reference_group_v1',lane:'reference',visible:false,normalized:{rows:[sourceRow('NM'),sourceRow('LP')]}}],card_printings:[{id:CHILD,card_print_id:PARENT,finish_key:'normal',is_provisional:false,printing_gv_id:'fixture-printing',card_prints:{id:PARENT,name:'Fixture card',number:'117',gv_id:'fixture-parent',set_code:'bw6',identity_domain:'pokemon_eng_standard'}}],card_printing_truth_reviews:[{card_printing_id:CHILD,active:true,review_status:'verified',public_visibility:'visible'}],external_mappings:[{id:'17',active:true,source:'tcgplayer',external_id:'99',card_print_id:PARENT}],external_printing_mappings:[],...overrides};
 return{from(table){let rows=tables[table];if(!rows)throw new Error('Unexpected table');const query={select(){return query;},eq(key,value){rows=rows.filter(row=>row[key]===value);return query;},in(key,values){rows=rows.filter(row=>values.map(String).includes(String(row[key])));return query;},like(){return query;},order(){return query;},limit(n){rows=rows.slice(0,n);return query;},async abortSignal(){return{data:rows,error:null};}};return query;}};
}
test('exact conditions preserve source amounts and missing conditions stay unavailable',async()=>{
 const client=fixture();assert.equal((await getConditionCanaryCatalogV1(client)).length,1);
 assert.equal((await getConditionCanaryPriceV1(client,{cardPrintingId:CHILD,condition:'NM',now:NOW})).amount,10);
 assert.equal((await getConditionCanaryPriceV1(client,{cardPrintingId:CHILD,condition:'LP',now:NOW})).amount,8.5);
 const missing=await getConditionCanaryPriceV1(client,{cardPrintingId:CHILD,condition:'HP',now:NOW});assert.equal(missing.status,'unavailable');assert.equal(missing.amount,null);assert.equal(missing.currency,null);
});
test('inactive mapping, wrong parent, hidden and provisional printing cannot enter the canary',async()=>{
 assert.equal((await getConditionCanaryCatalogV1(fixture({external_mappings:[]}))).length,0);
 assert.equal((await getConditionCanaryCatalogV1(fixture({external_mappings:[{id:'17',active:true,source:'tcgplayer',external_id:'99',card_print_id:'wrong-parent'}]}))).length,0);
 assert.equal((await getConditionCanaryCatalogV1(fixture({card_printing_truth_reviews:[{card_printing_id:CHILD,active:true,review_status:'verified',public_visibility:'hidden_pending_review'}]}))).length,0);
 assert.equal((await getConditionCanaryCatalogV1(fixture({card_printings:[{id:CHILD,is_provisional:true}]}))).length,0);
});
test('source-set and parent-set identity must both match the bounded canary',async()=>{
 const badRow={...sourceRow('NM'),group_id:42};const client=fixture({raw_imports:[{id:42,source:SOURCE,status:STAGED_STATUS,version:VERSION,kind:'condition_price_reference_group_v1',lane:'reference',visible:false,normalized:{rows:[badRow]}}]});assert.equal((await getConditionCanaryCatalogV1(client)).length,0);
 const absent=await getConditionCanaryPriceV1(fixture(),{cardPrintingId:PARENT,condition:'NM',now:NOW});assert.equal(absent,null);
});
test('stale prices remain unavailable and public/promoted receipts are rejected',async()=>{
 const stale=await getConditionCanaryPriceV1(fixture(),{cardPrintingId:CHILD,condition:'NM',now:'2026-11-20T19:00:00Z'});assert.equal(stale.status,'unavailable');assert.equal(stale.amount,null);
 await assert.rejects(getConditionCanaryCatalogV1(fixture({raw_imports:[{source:SOURCE,status:STAGED_STATUS,version:VERSION,kind:'condition_price_reference_group_v1',lane:'reference',visible:true,normalized:{rows:[]}}]})),/RECEIPT_INVALID/);
});
const dto={version:CANARY_VERSION,status:'available',card_printing_id:CHILD,card_print_id:PARENT,condition:'NM',amount:10,source_label:'TCGPlayer condition reference via TCGTracking',provider_updated_at:NOW,unavailable_reason:null,pricing_lane:'reference',private_preview:true};
const request=(suffix=`card_printing_id=${CHILD}&condition=NM`,method='GET')=>new Request(`http://localhost/api/founder/condition-pricing/v1?${suffix}`,{method});
test('anonymous and ordinary collector requests cannot invoke the private reader',async()=>{
 for(const [access,status]of [[{authenticated:false,founder:false},401],[{authenticated:true,founder:false},403]]){let reads=0;const handler=createConditionCanaryHandlerV1({authorize:async()=>access,read:async()=>{reads++;return dto;}});const result=await handler(request());assert.equal(result.status,status);assert.equal(reads,0);assert.equal(result.headers.get('cache-control'),'private, no-store');}
});
test('malformed, duplicate or unsupported selections stop before data access',async()=>{
 let reads=0;const handler=createConditionCanaryHandlerV1({authorize:async()=>({authenticated:true,founder:true}),read:async()=>{reads++;return dto;}});
 for(const query of [`card_printing_id=wrong&condition=NM`,`card_printing_id=${CHILD}&condition=nm`,`card_printing_id=${CHILD}&condition=NM&condition=LP`,`card_printing_id=${CHILD}&card_printing_id=${PARENT}&condition=NM`])assert.equal((await handler(request(query))).status,400);
 assert.equal((await handler(request(undefined,'POST'))).status,405);assert.equal(reads,0);
});
test('successful response allowlist excludes raw payloads and vendor tables',async()=>{
 const handler=createConditionCanaryHandlerV1({authorize:async()=>({authenticated:true,founder:true}),read:async()=>({...dto,raw_payload:{secret:'fixture-sensitive'},upstream:{large:'dataset'}})});
 const result=await handler(request());const body=await result.json();assert.equal(result.status,200);assert.equal(body.pricing.amount,10);assert.equal(body.pricing.currency_verified,false);assert.equal(JSON.stringify(body).includes('fixture-sensitive'),false);assert.equal(JSON.stringify(body).includes('dataset'),false);
});
test('backend errors, mismatched identities and unavailable amounts never become fallback prices',async()=>{
 for(const read of [async()=>{throw new Error('private DB detail');},async()=>({...dto,condition:'LP'}),async()=>({...dto,card_printing_id:PARENT}),async()=>({...dto,amount:0})]){const result=await createConditionCanaryHandlerV1({authorize:async()=>({authenticated:true,founder:true}),read})(request());assert.equal(result.status,503);assert.equal((await result.text()).includes('private DB detail'),false);}
 const missing=await createConditionCanaryHandlerV1({authorize:async()=>({authenticated:true,founder:true}),read:async()=>null})(request());assert.equal(missing.status,404);
 const unavailable=await createConditionCanaryHandlerV1({authorize:async()=>({authenticated:true,founder:true}),read:async()=>({...dto,status:'unavailable',amount:999})})(request());assert.equal((await unavailable.json()).pricing.amount,null);
});
