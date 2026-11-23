import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateTcgplayerMarketQualificationV1} from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';
import {evaluateTcgplayerMarketQualificationV2} from '../../backend/pricing/tcgplayer_market_publication_policy_v2.mjs';
import {evaluateTcgplayerMarketQualificationV3} from '../../backend/pricing/tcgplayer_market_publication_policy_v3.mjs';

const now=new Date('2026-11-20T06:00:00Z');
function candidate(category=68,overrides={}) {
 return {
  source_observation_id:'10000000-0000-4000-8000-000000000001',
  source_sync_run_id:'10000000-0000-4000-8000-000000000002',
  source_artifact_id:'10000000-0000-4000-8000-000000000003',
  source_artifact_hash:'retained-artifact-hash',source_row_hash:'retained-row-hash',
  source_artifact_byte_size:2048,source_price_row_identity:`${category}:454515:normal:2026-11-20`,
  source_product_id:454515,category_id:category,source_subtype_name:'Normal',normalized_finish_key:'normal',
  source_product_name:category===68?'Monkey.D.Luffy (Alternate Art)':'アメタマ',
  source_group_name:category===68?'Romance Dawn':'Sun & Moon Collection Moon',
  source_product_active:true,source_product_catalog_status:'current',
  source_sync_mode:'current_full_sync',source_sync_status:'completed',source_sync_failed_count:0,
  source_sync_finished_at:'2026-11-20T05:00:00Z',source_observed_on:'2026-11-20',
  source_mapping_count:1,card_print_mapping_count:1,card_printing_mapping_count:1,identity_domain_count:1,
  identity_domain:category===68?'one_piece_eng_print':'pokemon_jpn',
  card_print_id:'20000000-0000-4000-8000-000000000001',card_printing_id:'20000000-0000-4000-8000-000000000002',
  gv_id:'GV-EXACT-PARENT',printing_gv_id:'GV-EXACT-PARENT-NORMAL',finish_key:'normal',
  source_mapping_id:null,variant_assignment_id:null,
  cross_tcg_source_mapping_id:category===68?'12345':null,
  cross_tcg_printing_mapping_id:category===85?'30000000-0000-4000-8000-000000000001':null,
  mapping_method:'governed_cross_tcg_exact_finish_v2',variant_assignment_status:'exact_child_finish',
  variant_assignment_version:'CROSS_TCG_EXACT_FINISH_V2',has_printed_number_evidence:false,
  duplicate_product_row_count:1,currency:'USD',market_price:4.39,
  low_price:0.01,mid_price:9999,high_price:99999,direct_low_price:1,
  ...overrides,
 };
}

test('reviewed Play policy preserves complete old lane decisions and database-pinned policy versions',()=>{
 for(const category of [1,3,68,85])for(const fields of [{},{market_price:null},{market_price:0},{currency:'EUR'},{source_sync_failed_count:1},{card_print_mapping_count:2},{source_sync_finished_at:'2026-11-16T00:00:00Z'}]){
  const row=candidate(category,fields),result=evaluateTcgplayerMarketQualificationV3(row,{now});
  assert.deepEqual(result,evaluateTcgplayerMarketQualificationV2(row,{now}));
  assert.equal(result.policy_version,[68,85].includes(category)?'TCGPLAYER_MARKET_PUBLICATION_POLICY_V2':'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3');
 }
});

test('One Piece exact product/finish publishes without English Pokemon alternate-art exclusions',()=>{
 const row=candidate(),result=evaluateTcgplayerMarketQualificationV2(row,{now});
 assert.equal(result.decision,'publish');assert.equal(result.language_result,'english');
 assert.equal(result.policy_version,'TCGPLAYER_MARKET_PUBLICATION_POLICY_V2');
 assert.deepEqual(result.reason_codes,[]);assert.equal(row.market_price,4.39);
 assert.equal(evaluateTcgplayerMarketQualificationV1(row,{now}).eligible,false);
});
test('Japanese exact finish publishes as Japanese with its own mapping lineage',()=>{
 const result=evaluateTcgplayerMarketQualificationV2(candidate(85),{now});
 assert.equal(result.decision,'publish');assert.equal(result.language_result,'japanese');
 assert.equal(result.evidence.cross_tcg_source_mapping_id,null);
 assert.equal(result.evidence.cross_tcg_printing_mapping_id,'30000000-0000-4000-8000-000000000001');
});
test('missing, mixed and wrong-category source authority is withheld',()=>{
 for(const [category,fields] of [[68,{cross_tcg_source_mapping_id:null}],[85,{cross_tcg_printing_mapping_id:null}],[68,{cross_tcg_printing_mapping_id:'other'}],[85,{cross_tcg_source_mapping_id:'123'}],[68,{source_mapping_id:'123',variant_assignment_id:'other'}],[85,{identity_domain:'pokemon_eng_standard'}]]) {
  assert.equal(evaluateTcgplayerMarketQualificationV2(candidate(category,fields),{now}).eligible,false,JSON.stringify(fields));
 }
});
test('missing Market stays missing despite positive supporting prices; ambiguous finishes cannot publish',()=>{
 for(const fields of [{market_price:null},{market_price:0},{finish_key:'foil'},{normalized_finish_key:'masterball',finish_key:'masterball'},{card_printing_mapping_count:2},{source_mapping_count:2},{source_product_active:false},{source_sync_failed_count:1},{currency:'JPY'}]) {
  assert.equal(evaluateTcgplayerMarketQualificationV2(candidate(85,fields),{now}).eligible,false,JSON.stringify(fields));
 }
});
test('stale cross-TCG rows keep the existing delay and suppression behavior',()=>{
 const delayed=evaluateTcgplayerMarketQualificationV2(candidate(68,{source_sync_finished_at:'2026-11-18T16:00:00Z'}),{now});
 assert.equal(delayed.decision,'delay');assert.equal(delayed.eligible,false);
 const expired=evaluateTcgplayerMarketQualificationV2(candidate(85,{source_sync_finished_at:'2026-11-16T16:00:00Z'}),{now});
 assert.equal(expired.decision,'suppress_stale');assert.equal(expired.eligible,false);
});
test('old English Pokemon and MTG decisions remain byte-for-byte equivalent across positive and negative rows',()=>{
 for(const category of [1,3])for(const fields of [{},{market_price:null},{currency:'EUR'},{source_sync_failed_count:1},{card_print_mapping_count:2}]) {
  const row=candidate(category,{identity_domain:category===1?'mtg_eng_paper_print':'pokemon_eng_standard',source_mapping_id:'123',variant_assignment_id:'old-exact-assignment',has_printed_number_evidence:true,mapping_method:'deterministic_product_mapping',...fields});
  assert.deepEqual(evaluateTcgplayerMarketQualificationV2(row,{now}),evaluateTcgplayerMarketQualificationV1(row,{now}));
 }
});
