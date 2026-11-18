import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargets, normalizeGroup, selectConditionReference, hash } from '../../backend/pricing/tcgtracking_condition_reference_v1.mjs';
import {getStagedConditionReferencesV1} from '../../backend/pricing/tcgtracking_condition_reference_reader_v1.mjs';
import {projectScopedUpstream} from '../../backend/pricing/tcgtracking_condition_reference_projection_v1.mjs';

const time='2026-11-17T18:00:00Z';
const target=(overrides={})=>({category_id:3,group_id:1394,product_id:83481,card_print_id:'parent-a',card_printing_id:'child-a',finish_key:'holo',identity_domain:'pokemon_eng_standard',mapping_lane:'exact_printing',mapping_source:'tcgplayer_market',mapping_id:'mapping-a',...overrides});
const sku=(overrides={})=>({cnd:'NM',var:'Holofoil',lng:'EN',mkt:3.19,...overrides});
const response=(rows)=>({set_id:1394,updated:time,sku_count:Object.values(rows).reduce((sum,group)=>sum+Object.keys(group).length,0),products:rows});
const normalize=(data,targets=[{...target(),language:'EN'}])=>normalizeGroup({response:data,targets,categoryId:3,groupId:1394,fetchedAt:'2026-11-17T19:00:00Z'});

test('source price survives unchanged and HP/DMG inversion is preserved',()=>{
 const result=normalize(response({'83481':{'1':sku({cnd:'HP',mkt:0.89}),'2':sku({cnd:'DMG',mkt:1.42})}}));
 assert.deepEqual(result.rows.map(row=>row.market_price),[0.89,1.42]);
 assert.ok(result.rows.every(row=>row.app_visible===false&&row.needs_review&&row.currency===null));
 assert.equal(selectConditionReference(result.rows,{cardPrintingId:'child-a',condition:'LP',now:time}).status,'unavailable');
});
test('null, zero, numeric strings and negative amounts cannot become prices',()=>{
 for(const value of [null,0,'3.19',-1,NaN]) assert.equal(normalize(response({'83481':{'1':sku({mkt:value})}})).priced_count,0);
});
test('finish and language never fall back to a sibling printing',()=>{
 const result=normalize(response({'83481':{'1':sku({var:'Reverse Holofoil'}),'2':sku({lng:'JP'}),'3':sku({var:'1st Edition Holofoil'})}}));
 assert.equal(result.priced_count,0);assert.equal(result.withheld.no_exact_existing_mapping,2);assert.equal(result.withheld.unsupported_provider_finish,1);
});
test('two product SKUs for a condition of one canonical printing are withheld',()=>{
 const result=normalize(response({'83481':{'1':sku()},'83482':{'2':sku()}}),[{...target(),language:'EN'},{...target({product_id:83482}),language:'EN'}]);
 assert.equal(result.priced_count,0);assert.equal(result.withheld.ambiguous_exact_condition_skus,2);
});
test('conflicting existing mappings do not pick an arbitrary child',()=>{
 const resolved=resolveTargets([target(),target({card_printing_id:'child-b'})]);assert.equal(resolved.targets.length,0);assert.equal(resolved.withheld.length,2);
});
test('a child mapped to multiple source products remains held across groups',()=>{
 const resolved=resolveTargets([target(),target({product_id:83482,group_id:1400})]);assert.equal(resolved.targets.length,0);assert.equal(resolved.withheld[0].reason,'multiple_source_products_for_printing');
});
test('MTG product can retain a different parent and child per exact finish',()=>{
 const resolved=resolveTargets([target({category_id:1,identity_domain:'mtg_eng_paper_print',finish_key:'normal'}),target({category_id:1,identity_domain:'mtg_eng_paper_print',finish_key:'foil',card_print_id:'parent-b',card_printing_id:'child-b'})]);
 assert.equal(resolved.targets.length,2);assert.equal(resolved.targets[1].card_print_id==='parent-b'||resolved.targets[0].card_print_id==='parent-b',true);
});
test('old and invalid provider timestamps produce no candidates',()=>{
 for(const updated of ['2026-01-01T00:00:00Z','invalid','2027-01-01T00:00:00Z']) assert.equal(normalize({...response({'83481':{'1':sku()}}),updated}).priced_count,0);
});
test('source count and set mismatches fail closed',()=>{
 assert.throws(()=>normalize({...response({'83481':{'1':sku()}}),sku_count:3}),/COUNT_MISMATCH/);
 assert.throws(()=>normalize({...response({'83481':{'1':sku()}}),set_id:42}),/SET_OR_SHAPE_MISMATCH/);
});
test('same SKU reused across products fails instead of duplicating money',()=>assert.throws(()=>normalize(response({'83481':{'1':sku()},'83482':{'1':sku()}})),/DUPLICATE_SKU/));
test('an unknown condition cannot silently become Near Mint',()=>{
 const rows=normalize(response({'83481':{'1':sku()}})).rows;assert.equal(selectConditionReference(rows,{cardPrintingId:'child-a',condition:null,now:time}).status,'unavailable');
});
test('reference reads expire and deterministic hashing ignores object key ordering',()=>{
 const rows=normalize(response({'83481':{'1':sku()}})).rows;
 assert.equal(selectConditionReference(rows,{cardPrintingId:'child-a',condition:'NM',now:time}).market_price,3.19);
 assert.equal(selectConditionReference(rows,{cardPrintingId:'child-a',condition:'NM',now:'2026-11-19T18:00:00Z'}).status,'unavailable');
 assert.equal(hash({b:1,a:2}),hash({a:2,b:1}));
});
function clientFor(data,error=null){const client={from(table){assert.equal(table,'raw_imports');return client;},select(){return client;},eq(){return client;},like(){return client;},order(){return client;},limit(){return client;},async abortSignal(){return{data,error};}};return client;}
test('private reader returns the selected condition without borrowing NM',async()=>{
 const normalized=normalize(response({'83481':{'1':sku()}}));
 const result=await getStagedConditionReferencesV1(clientFor([{id:42,version:'TCGTRACKING_CONDITION_REFERENCE_V1',normalized}]),{categoryId:3,groupId:1394,requests:[{cardPrintingId:'child-a',condition:'NM'},{cardPrintingId:'child-a',condition:'LP'}],now:time});
 assert.equal(result[0].market_price,3.19);assert.equal(result[0].raw_import_id,42);assert.equal(result[1].status,'unavailable');assert.equal(result[1].market_price,undefined);
});
test('read failures stay errors and cannot fall back to another source',async()=>{
 await assert.rejects(getStagedConditionReferencesV1(clientFor(null,{code:'57014'}),{categoryId:3,groupId:1394,requests:[{cardPrintingId:'child-a',condition:'NM'}],now:time}),/READ_FAILED/);
 await assert.rejects(getStagedConditionReferencesV1(clientFor([]),{categoryId:3,groupId:1394,requests:Array(501).fill({})}),/INVALID_BOUNDED/);
});
test('database projection retains scoped null prices and excludes unrelated languages/products',()=>{
 const input=response({'83481':{'1':sku({mkt:null}),'2':sku({lng:'JP'}),'3':sku({var:'Reverse Holofoil'})},'83482':{'4':sku()}});
 const projected=projectScopedUpstream(input,[{...target(),language:'EN'}]);
 assert.deepEqual(Object.keys(projected.products),['83481']);assert.deepEqual(Object.keys(projected.products['83481']),['1']);assert.equal(projected.products['83481']['1'].mkt,null);assert.equal(projected._projection.retained_sku_count,1);assert.equal(projected.sku_count,4);assert.equal(input.products['83481']['2'].lng,'JP');
});
