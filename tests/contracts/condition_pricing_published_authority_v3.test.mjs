import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublishedConditionTargetV3,resolveSourceBoundOnePieceTargetV3} from '../../backend/pricing/condition_pricing_published_authority_v3.mjs';
import {getConditionPriceV1} from '../../backend/pricing/condition_pricing_read_model_v1.mjs';
const CHILD='11111111-1111-4111-8111-111111111111',PARENT='22222222-2222-4222-8222-222222222222',PROOF='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444';
const printing={id:CHILD,card_print_id:PARENT,finish_key:'normal',is_provisional:false,card_prints:{id:PARENT,identity_domain:'pokemon_eng_standard'}};
const price={pricing_scope:'card_printing',card_print_id:PARENT,card_printing_id:CHILD,finish_key:'normal',status:'available',freshness:'fresh',currency:'USD',source_name:'tcgplayer',market_close:999,is_from_price:false,provenance_id:PROOF};
const snapshot={provenance_id:PROOF,publication_set_id:'generation',run_id:'run',publication_state:'published',freshness_state:'fresh',card_print_id:PARENT,card_printing_id:CHILD,finish_key:'normal',source_subtype_name:'Normal',source_product_id:99,source_mapping_id:'parent-map',mtg_printing_mapping_id:null};
const parentMap={id:'parent-map',source:'tcgplayer',external_id:'99',active:true,card_print_id:PARENT};
function db(overrides={},records=[price]){
 const tables={card_printings:[printing],card_printing_truth_reviews:[],market_price_current_publication:[{singleton:true,publication_set_id:'generation',run_id:'run'}],market_price_publication_snapshots:[snapshot],tcgcsv_source_products:[{product_id:99,category_id:3,group_id:1394,source_active:true}],external_printing_mappings:[],external_mappings:[parentMap],...overrides};
 const query=initial=>{let rows=initial;const q={select(){return q;},eq(key,value){rows=rows.filter(row=>row[key]===value);return q;},in(key,values){rows=rows.filter(row=>values.includes(row[key]));return q;},limit(n){rows=rows.slice(0,n);return q;},async abortSignal(){return{data:rows,error:null};}};return q;};
 return{from(table){assert.ok(tables[table],`Unexpected relation ${table}`);return query(tables[table]);},rpc(name,args){assert.equal(name,'get_market_pricing_read_model_v1');assert.deepEqual(args,{p_card_print_ids:null,p_card_printing_ids:[CHILD]});return query(records);}};
}
test('current exact publication qualifies an otherwise unreviewed existing Pokemon printing',async()=>{
 const target=await resolvePublishedConditionTargetV3(db(),CHILD);
 assert.equal(target.mapping_lane,'published_exact_printing');assert.equal(target.product_id,99);assert.equal(target.mapping_id,PROOF);
 const result=await getConditionPriceV1(db(),{cardPrintingId:CHILD,condition:'LP',now:'2026-11-19T12:00:00Z'},{readSource:async()=>({fetchedAt:'2026-11-19T12:00:00Z',source:{set_id:1394,updated:'2026-11-19T11:00:00Z',sku_count:1,products:{99:{7:{cnd:'LP',var:'Normal',lng:'EN',mkt:7.34}}}}})});
 assert.equal(result.status,'available');assert.equal(result.amount,7.34);assert.notEqual(result.amount,price.market_close);
});
test('parent prices, old generations and mismatched provenance never qualify',async()=>{
 for(const record of [{...price,pricing_scope:'parent'},{...price,is_from_price:true},{...price,status:'unavailable'},{...price,freshness:'stale'},{...price,card_printing_id:OTHER},{...price,provenance_id:OTHER}])assert.equal(await resolvePublishedConditionTargetV3(db({},[record]),CHILD),null);
 assert.equal(await resolvePublishedConditionTargetV3(db({market_price_current_publication:[{singleton:true,publication_set_id:'new',run_id:'new'}]}),CHILD),null);
 assert.equal(await resolvePublishedConditionTargetV3(db({market_price_publication_snapshots:[snapshot,{...snapshot,provenance_id:OTHER,source_product_id:100}]}),CHILD),null);
});
test('provisional, hidden, wrong-domain and unsupported finish rows stay unavailable',async()=>{
 for(const overrides of [{card_printings:[{...printing,is_provisional:true}]},{card_printings:[{...printing,finish_key:'masterball'}]},{card_printings:[{...printing,card_prints:{id:PARENT,identity_domain:'tcg_pocket_excluded'}}]},{card_printing_truth_reviews:[{card_printing_id:CHILD,active:true,public_visibility:'hidden_pending_review'}]}])assert.equal(await resolvePublishedConditionTargetV3(db(overrides),CHILD),null);
});
test('publication cannot override inactive mappings, competing products or another child owner',async()=>{
 for(const overrides of [{external_mappings:[{...parentMap,active:false}]},{external_mappings:[parentMap,{...parentMap,id:'other',card_print_id:OTHER}]},{external_mappings:[parentMap,{...parentMap,id:'other',external_id:'100'}]},{external_printing_mappings:[{id:'other',active:true,source:'tcgplayer_market',external_id:'99:normal',card_printing_id:OTHER}]},{external_printing_mappings:[{id:'other',active:true,source:'tcgplayer_market',external_id:'100:normal',card_printing_id:CHILD}]},{tcgcsv_source_products:[{product_id:99,category_id:68,group_id:1394,source_active:true}]}])assert.equal(await resolvePublishedConditionTargetV3(db(overrides),CHILD),null);
});
test('a valid exact MTG finish keeps its own child mapping and does not borrow another parent',async()=>{
 const mapping={id:'finish-map',active:true,source:'tcgplayer_market',external_id:'99:normal',card_printing_id:CHILD};
 const overrides={card_printings:[{...printing,card_prints:{id:PARENT,identity_domain:'mtg_eng_paper_print'}}],external_mappings:[],external_printing_mappings:[mapping],market_price_publication_snapshots:[{...snapshot,source_mapping_id:null,mtg_printing_mapping_id:'finish-map'}],tcgcsv_source_products:[{product_id:99,category_id:1,group_id:1,source_active:true}]};
 assert.equal((await resolvePublishedConditionTargetV3(db(overrides),CHILD)).category_id,1);
 assert.equal(await resolvePublishedConditionTargetV3(db({...overrides,external_printing_mappings:[{...mapping,active:false}]}),CHILD),null);
});

const opPrinting={...printing,provenance_source:'ONE_PIECE_EXACT_PRODUCT_PRINTING_REPAIR_20260919',provenance_ref:`raw_imports:-7|master-index:${'a'.repeat(64)}`,card_prints:{id:PARENT,identity_domain:'one_piece_eng_print',variant_key:'tcgplayer_product_99',external_ids:{tcgplayer:'99'},number:'OP01-003'}};
const opMapping={...parentMap,meta:{mapping_authority:'exact_durable_source_product_with_official_number_name',promotion_plan_version:'ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1',durable_staging_row_id:PROOF,source_group_id:3188}};
const opProduct={product_id:99,category_id:68,group_id:3188,source_active:true,catalog_metadata_status:'current',extended_data:[{name:'Number',value:'OP01-003'}]};
const opTables={card_printings:[opPrinting],card_print_identity:[{card_print_id:PARENT,identity_domain:'one_piece_eng_print',is_active:true}],external_mappings:[opMapping],tcgcsv_source_products:[opProduct],tcgcsv_source_groups:[{group_id:3188,category_id:68,source_active:true,catalog_metadata_status:'current'}]};
test('One Piece reuses the original governed product and finish assertion without a new mapping',async()=>{
 const target=await resolveSourceBoundOnePieceTargetV3(db(opTables,[]),CHILD);
 assert.equal(target.product_id,99);assert.equal(target.group_id,3188);assert.equal(target.mapping_lane,'governed_one_piece_product_finish');
 const value=await getConditionPriceV1(db(opTables,[]),{cardPrintingId:CHILD,condition:'LP',now:'2026-11-19T12:00:00Z'},{readSource:async()=>({fetchedAt:'2026-11-19T12:00:00Z',source:{set_id:3188,updated:'2026-11-19T11:00:00Z',sku_count:1,products:{99:{7:{cnd:'LP',var:'Normal',lng:'EN',mkt:0.13}}}}})});
 assert.equal(value.status,'available');assert.equal(value.amount,0.13);
});
test('a product marker or a parent mapping alone cannot qualify One Piece',async()=>{
 for(const changes of [{card_printings:[{...opPrinting,provenance_source:'unreviewed_import'}]},{card_printings:[{...opPrinting,provenance_ref:'unbound'}]},{card_printings:[{...opPrinting,card_prints:{...opPrinting.card_prints,external_ids:{tcgplayer:'100'}}}]},{external_mappings:[{...opMapping,meta:{}}]},{external_mappings:[{...opMapping,meta:{...opMapping.meta,durable_staging_row_id:'not-a-uuid'}}]},{card_print_identity:[]}])assert.equal(await resolveSourceBoundOnePieceTargetV3(db({...opTables,...changes},[]),CHILD),null);
});
test('changed source numbers/groups, duplicate finish children and competing owners are withheld',async()=>{
 for(const changes of [{tcgcsv_source_products:[{...opProduct,extended_data:[{name:'Number',value:'OP01-004'}]}]},{tcgcsv_source_products:[{...opProduct,group_id:3189}]},{tcgcsv_source_groups:[]},{card_printings:[opPrinting,{...opPrinting,id:OTHER}]},{external_mappings:[opMapping,{...opMapping,id:'other',card_print_id:OTHER}]},{external_printing_mappings:[{id:'other',card_printing_id:OTHER,source:'tcgplayer',external_id:'99',active:true,meta:{}}]}])assert.equal(await resolveSourceBoundOnePieceTargetV3(db({...opTables,...changes},[]),CHILD),null);
});

test('One Piece fallback cannot revive competing products mapped to the requested child',async()=>{
 const mappings=[99,100].map(id=>({id:String(id),card_printing_id:CHILD,source:'tcgplayer_market',external_id:`${id}:normal`,active:true}));
 const tables={...opTables,external_printing_mappings:mappings,tcgcsv_source_products:[opProduct,{...opProduct,product_id:100}]};
 assert.equal(await resolveSourceBoundOnePieceTargetV3(db(tables,[]),CHILD),null);
 const result=await getConditionPriceV1(db(tables,[]),{cardPrintingId:CHILD,condition:'NM'},{readSource:async()=>{throw Error('Ambiguous products must not fetch a condition price');}});
 assert.equal(result.status,'unavailable');assert.equal(result.unavailable_reason,'exact_mapping_unavailable');
 for(const external_id of ['100','100:foil','99:foil']){
  const source=external_id.includes(':')?'tcgplayer_market':'tcgplayer';
  assert.equal(await resolveSourceBoundOnePieceTargetV3(db({...opTables,external_printing_mappings:[{id:'other',card_printing_id:CHILD,source,external_id,active:true}]},[]),CHILD),null);
 }
});
