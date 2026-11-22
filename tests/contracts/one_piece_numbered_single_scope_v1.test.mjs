import assert from'node:assert/strict';import test from'node:test';import fs from'node:fs';
import{classifyTcgplayerMarketProductScopeV2 as before,classifyTcgplayerMarketProductScopeV2_1 as after,governedOnePieceSingleCardEvidenceV1 as proof}from'../../backend/pricing/tcgplayer_market_product_scope_v1.mjs';
import{evaluateTcgplayerMarketQualificationV2 as qualify}from'../../backend/pricing/tcgplayer_market_publication_policy_v2.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../fixtures/pricing/numbered_singles_v1/one_piece_five_candidates.json',import.meta.url))).rows;
const now=new Date('2026-11-22T23:00:00Z');
for(const row of rows)test('actual numbered single admits its exact quote: '+row.source_product_id,()=>{
 assert.equal(before(row).in_scope,false);assert.equal(before(row).reason_code,'unsupported_product_kind');
 const actual=after(row);assert.equal(actual.in_scope,true);assert.equal(actual.policy_version,'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2_1');assert.equal(actual.governed_single_card_evidence.source_product_id,row.source_product_id);
 const decision=qualify(row,{now});assert.equal(decision.decision,'publish');assert.deepEqual(decision.reason_codes,[]);assert.equal(decision.evidence.governed_single_card_evidence.printed_number,proof(row).printed_number);assert.equal(Number(row.market_price)>0,true);assert.equal(row.has_printed_number_evidence,false,'Do not mutate the upstream source flag');
});
test('missing, duplicate or non-card official fields retain the packaged-product hold',()=>{
 const base=rows[0],fields=base.source_product_extended_data;
 for(const data of[null,[],fields.filter(f=>f.name!=='Number'),fields.filter(f=>f.name!=='CardType'),[...fields,fields.find(f=>f.name==='Number')],[...fields,fields.find(f=>f.name==='CardType')],fields.map(f=>f.name==='CardType'?{...f,value:'Sealed Product'}:f),fields.map(f=>f.name==='Number'?{...f,value:'810000000000'}:f)]){const row={...base,source_product_extended_data:data};assert.equal(proof(row),null);assert.deepEqual(after(row),before(row));}
});
test('governed category, unique lineage, active identity and exact finish are mandatory',()=>{
 const base=rows[0];for(const patch of[
  {category_id:3},{category_id:85},{identity_domain:'pokemon_eng_standard'},{mapping_method:'name_match'},
  {source_mapping_count:2},{card_print_mapping_count:2},{card_printing_mapping_count:0},{identity_domain_count:2},
  {cross_tcg_source_mapping_id:null},{cross_tcg_printing_mapping_id:'other'},
  {source_mapping_id:1},{variant_assignment_id:'other'},{edition_assignment_id:'other'},{gym_edition_assignment_id:'other'},{mtg_printing_mapping_id:'other'},
  {variant_assignment_status:'candidate'},{variant_assignment_version:'old'},
  {card_print_id:'guessed'},{card_printing_id:'guessed'},{gv_id:''},{printing_gv_id:''},
  {finish_key:'foil'},{normalized_finish_key:'foil'},{source_subtype_name:'Foil'},
  {source_product_active:false},{source_product_catalog_status:'missing'},
  {source_product_id:0},{group_id:0},{source_mapping_meta:{}},
  {source_mapping_meta:{...base.source_mapping_meta,source_group_id:1}},
  {source_mapping_meta:{...base.source_mapping_meta,mapping_authority:'unreviewed'}},
  {source_mapping_meta:{...base.source_mapping_meta,promotion_plan_version:'other'}},
  {source_mapping_meta:{...base.source_mapping_meta,durable_staging_row_id:null}},
 ]){const row={...base,...patch};assert.equal(proof(row),null,JSON.stringify(patch));assert.deepEqual(after(row),before(row));}
});
test('a real numbered single still cannot invent a price, publish stale evidence or use conflicting finishes',()=>{
 for(const patch of[{market_price:null},{market_price:0},{source_sync_failed_count:1},{source_sync_status:'running'},{currency:'JPY'},{finish_key:'holo'},{source_sync_finished_at:'2026-11-19T00:00:00Z'}]){assert.equal(qualify({...rows[0],...patch},{now}).eligible,false,JSON.stringify(patch));}
});
test('ordinary singles and earlier Pokemon, Magic and Japanese scope results stay exact',()=>{
 for(const category of[1,3,68,85])for(const name of['Ordinary Card','A Card (Cosmo Holo)','Booster Box','Premium Card Collection','Sealed Starter Deck']){const row={...rows[0],category_id:category,source_product_name:name,source_mapping_meta:null};assert.deepEqual(after(row),before(row));}
 const ordinary={...rows[0],source_product_name:'Monkey.D.Luffy'};assert.deepEqual(after(ordinary),before(ordinary));
});
