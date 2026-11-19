import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConditionPriceTargetV1,getConditionPriceV1,createConditionSourceCacheV1,createConditionPriceHandlerV1,CONDITION_PRICE_VERSION} from '../../backend/pricing/condition_pricing_read_model_v1.mjs';

const CHILD='11111111-1111-4111-8111-111111111111',PARENT='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333',NOW='2026-11-17T19:00:00Z';
const printing={id:CHILD,card_print_id:PARENT,finish_key:'normal',is_provisional:false,card_prints:{id:PARENT,identity_domain:'pokemon_eng_standard'}};
const review={card_printing_id:CHILD,active:true,review_status:'verified',public_visibility:'visible'};
const exact={id:'17',card_printing_id:CHILD,active:true,source:'tcgplayer_market',external_id:'99:normal'};
const parentMap={id:'18',card_print_id:PARENT,active:true,source:'tcgplayer',external_id:'99'};
const product={product_id:99,category_id:3,group_id:1394,source_active:true};
function db(overrides={}){
  const tables={card_printings:[printing],card_printing_truth_reviews:[review],external_printing_mappings:[],external_mappings:[parentMap],tcgcsv_source_products:[product],...overrides};
  return{from(table){assert.ok(tables[table],`Unexpected relation ${table}`);let rows=tables[table];const query={select(){return query;},eq(key,value){rows=rows.filter(row=>row[key]===value);return query;},in(key,values){rows=rows.filter(row=>values.includes(row[key]));return query;},limit(n){rows=rows.slice(0,n);return query;},async abortSignal(){return{data:rows,error:null};}};return query;}};
}
const sku=(condition,amount=10)=>({cnd:condition,var:'Normal',lng:'EN',mkt:amount});
const source=(rows={1:sku('NM',10),2:sku('LP',7.34)})=>({set_id:1394,updated:'2026-11-17T18:00:00Z',products:{99:rows},sku_count:Object.keys(rows).length});
const readSource=async()=>({source:source(),fetchedAt:NOW});
const price=condition=>getConditionPriceV1(db(),{cardPrintingId:CHILD,condition,now:NOW},{readSource});

test('source amounts are exact, condition-specific and never projected from NM',async()=>{
  assert.equal((await price('NM')).amount,10);assert.equal((await price('LP')).amount,7.34);
  const missing=await price('HP');assert.equal(missing.status,'unavailable');assert.equal(missing.amount,null);assert.equal(missing.currency,null);assert.equal(missing.currency_verified,false);
  await assert.rejects(price('nm'),/INVALID_EXACT_CONDITION/);
});
test('current reviewed Pokemon parent mapping and exact child mappings are supported',async()=>{
  assert.equal((await resolveConditionPriceTargetV1(db(),CHILD)).mapping_lane,'verified_parent_finish');
  const exactTarget=await resolveConditionPriceTargetV1(db({external_printing_mappings:[exact],external_mappings:[],card_printing_truth_reviews:[]}),CHILD);
  assert.equal(exactTarget.mapping_lane,'exact_printing');assert.equal(exactTarget.product_id,99);
  assert.equal((await resolveConditionPriceTargetV1(db({external_printing_mappings:[exact]}),CHILD)).mapping_lane,'exact_printing');
});
test('hidden, provisional, unreviewed parent and unsupported domains stop before source access',async()=>{
  for(const overrides of [{card_printing_truth_reviews:[]},{card_printing_truth_reviews:[{...review,public_visibility:'hidden_pending_review'}]},{card_printings:[{...printing,is_provisional:true}]},{card_printings:[{...printing,card_prints:{id:PARENT,identity_domain:'pokemon_pocket'}}]},{external_mappings:[{...parentMap,active:false}]}]){
    let calls=0;const result=await getConditionPriceV1(db(overrides),{cardPrintingId:CHILD,condition:'NM',now:NOW},{readSource:async()=>{calls++;return readSource();}});assert.equal(result.amount,null);assert.equal(calls,0);
  }
});
test('wrong category, unknown finish hints and malformed IDs do not become mapping authority',async()=>{
  for(const overrides of [{tcgcsv_source_products:[{...product,category_id:1}]},{external_mappings:[],external_printing_mappings:[{...exact,external_id:'99:unknown'}]},{external_mappings:[],external_printing_mappings:[{...exact,source:'tcgplayer',external_id:'99junk',meta:{source_subtype:'Normal'}}]},{external_mappings:[],external_printing_mappings:[{...exact,source:'tcgplayer',external_id:'99',meta:{}}]}])assert.equal(await resolveConditionPriceTargetV1(db(overrides),CHILD),null);
});
test('competing products, parents and sibling finish mappings are withheld',async()=>{
  assert.equal(await resolveConditionPriceTargetV1(db({external_mappings:[parentMap,{...parentMap,id:'19',external_id:'100'}],tcgcsv_source_products:[product,{...product,product_id:100}]}),CHILD),null);
  assert.equal(await resolveConditionPriceTargetV1(db({external_mappings:[parentMap,{...parentMap,id:'19',card_print_id:OTHER}]}),CHILD),null);
  assert.equal(await resolveConditionPriceTargetV1(db({external_printing_mappings:[{...exact,card_printing_id:OTHER}]}),CHILD),null);
  assert.equal(await resolveConditionPriceTargetV1(db({card_printings:[printing,{...printing,id:OTHER}]}),CHILD),null);
});
test('MTG exact finish remains separate from another parent for another finish',async()=>{
  const fixture=db({card_printings:[{...printing,card_prints:{id:PARENT,identity_domain:'mtg_eng_paper_print'}}],external_mappings:[],external_printing_mappings:[exact,{...exact,id:'19',card_printing_id:OTHER,external_id:'99:foil'}],tcgcsv_source_products:[{...product,category_id:1}]});
  assert.equal((await resolveConditionPriceTargetV1(fixture,CHILD)).language,'EN');
});
test('source validation preserves stale/missing/ambiguous/error boundaries',async()=>{
  const get=readSource=>getConditionPriceV1(db(),{cardPrintingId:CHILD,condition:'NM',now:NOW},{readSource});
  for(const raw of [source({1:sku('NM',null)}),source({1:sku('NM','10')}),source({1:sku('NM',10),2:sku('NM',12)}),{...source(),updated:'2026-11-10T18:00:00Z'},source({1:{...sku('NM'),lng:'JP'}})])assert.equal((await get(async()=>({source:raw,fetchedAt:NOW}))).amount,null);
  await assert.rejects(get(async()=>{throw new Error('source offline');}),/source offline/);
});
test('cache coalesces set requests, expires and retries failures without old-value fallback',async()=>{
  let calls=0,tick=Date.parse(NOW),fail=false;
  const cache=createConditionSourceCacheV1({clock:()=>tick,fetcher:async()=>{calls++;if(fail)throw new Error('offline');await new Promise(resolve=>setTimeout(resolve,10));return Response.json(source());}});
  const target={category_id:3,group_id:1394};
  await Promise.all([cache(target),cache(target)]);assert.equal(calls,1);await cache(target);assert.equal(calls,1);
  tick+=3600001;fail=true;await assert.rejects(cache(target),/offline/);fail=false;await cache(target);assert.equal(calls,3);
});
test('cache bounds stream size, envelope identity, counts and concurrent groups',async()=>{
  for(const config of [{maxBytes:20,fetcher:async()=>new Response('x'.repeat(25))},{fetcher:async()=>Response.json({...source(),set_id:5})},{fetcher:async()=>Response.json({...source(),sku_count:100})}])await assert.rejects(createConditionSourceCacheV1(config)({category_id:3,group_id:1394}));
  let release;const gate=new Promise(resolve=>release=resolve);const cache=createConditionSourceCacheV1({fetcher:async url=>{await gate;return Response.json({...source(),set_id:Number(url.split('/').at(-2))});}});
  const first=cache({category_id:3,group_id:1}),second=cache({category_id:3,group_id:2});
  await assert.rejects(cache({category_id:3,group_id:3}),/SOURCE_BUSY/);release();await Promise.all([first,second]);
});
const dto={version:CONDITION_PRICE_VERSION,status:'available',card_printing_id:CHILD,condition:'LP',amount:7.34,pricing_lane:'reference',source_label:'fixture',provider_updated_at:NOW};
const request=(query=`card_printing_id=${CHILD}&condition=LP`)=>new Request(`http://localhost/api/condition-pricing/v1?${query}`);
test('authenticated exact-only endpoint rejects unauthenticated/malformed requests before reading',async()=>{
  let reads=0;const read=async()=>{reads++;return dto;};
  assert.equal((await createConditionPriceHandlerV1({authorize:async()=>false,read})(request())).status,401);
  const handler=createConditionPriceHandlerV1({authorize:async()=>true,read});
  for(const query of [`card_printing_id=${CHILD}&condition=LP&condition=NM`,`card_printing_id=${CHILD}&card_printing_id=${OTHER}&condition=LP`,'card_printing_id=all&condition=NM'])assert.equal((await handler(request(query))).status,400);
  assert.equal(reads,0);
});
test('response allowlist strips provider datasets and rejects mismatched identities',async()=>{
  const handler=createConditionPriceHandlerV1({authorize:async()=>true,read:async()=>({...dto,raw:{secret:'fixture-private'}})});
  const response=await handler(request()),body=await response.json();assert.equal(response.status,200);assert.equal(body.pricing.amount,7.34);assert.equal(JSON.stringify(body).includes('fixture-private'),false);assert.equal(response.headers.get('cache-control'),'private, no-store');
  for(const read of [async()=>({...dto,condition:'NM'}),async()=>({...dto,card_printing_id:OTHER}),async()=>({...dto,amount:0}),async()=>{throw new Error('private diagnostic');}])assert.equal((await createConditionPriceHandlerV1({authorize:async()=>true,read})(request())).status,503);
});
