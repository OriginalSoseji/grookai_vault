import test from 'node:test';import assert from 'node:assert/strict';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry,reviewedPlayNormalNineMappingMetadataV1}
  from '../../backend/pricing/reviewed_play_normal_nine_registry_v1.mjs';
import {resolveReviewedPlayNormalNinePublicationAuthorityV1 as authority}
  from '../../backend/pricing/reviewed_play_normal_nine_publication_authority_v1.mjs';
import {evaluateTcgplayerMarketQualificationV3_3 as previous} from '../../backend/pricing/tcgplayer_market_publication_policy_v3_3.mjs';
import {evaluateTcgplayerMarketQualificationV3_4 as qualify} from '../../backend/pricing/tcgplayer_market_publication_policy_v3_4.mjs';
const id='10000000-0000-4000-8000-000000000001',now=new Date('2026-11-25T20:00:00Z');
function fixture(t){const meta=reviewedPlayNormalNineMappingMetadataV1(t);return {
 source_observation_id:id,source_sync_run_id:id,source_artifact_id:id,source_artifact_hash:'actual-artifact-sha',source_artifact_byte_size:2048,
 source_price_row_identity:'actual-source-row',source_row_hash:'actual-source-sha',source_product_id:t.product_id,category_id:3,group_id:22880,
 source_group_name:registry.group_name,source_subtype_name:'Normal',normalized_finish_key:'normal',source_product_name:t.source_product.name,
 source_product_active:true,source_product_catalog_status:'current',has_printed_number_evidence:true,source_sync_mode:'current_full_sync',
 source_sync_status:'completed',source_sync_failed_count:0,source_sync_finished_at:'2026-11-24T23:45:58Z',source_observed_on:'2026-11-24',
 source_mapping_count:1,source_mapping_id:t.mapping_id,source_mapping_meta:meta,mapping_method:meta.mapping_method,
 card_print_mapping_count:1,card_printing_mapping_count:1,identity_domain_count:1,identity_domain:t.parent.identity_domain,
 card_print_id:t.parent.id,card_printing_id:t.printing.id,gv_id:t.parent.gv_id,printing_gv_id:t.printing.printing_gv_id,finish_key:'normal',
 variant_assignment_id:id,variant_assignment_status:'exact_child_finish',duplicate_product_row_count:1,currency:'USD',market_price:1.23,low_price:0.01,mid_price:999,
 set_id:t.parent.set_id,set_code:t.parent.set_code,canonical_name:t.parent.name,canonical_number:t.parent.number,variant_key:t.parent.variant_key,
 reviewed_printed_identity_modifier:t.parent.printed_identity_modifier,printing_is_provisional:false,printing_truth_verified:true,reviewed_identity_id:t.identity.id,
 reviewed_printing_provenance_source:t.printing.provenance_source,reviewed_printing_provenance_ref:t.printing.provenance_ref,
 reviewed_printing_created_by:t.printing.created_by,reviewed_source_extended_data:[{name:'Number',value:t.source_product.number}],
 reviewed_printing_truth_reviews:[structuredClone(t.review)]};}
test('all nine exact new Normal identities lift only the predecessor stamp scope exclusion',()=>{
 assert.equal(registry.targets.length,9);
 for(const target of registry.targets){const row=fixture(target);assert.deepEqual(previous(row,{now}).reason_codes,['special_variant_v1_1']);
  assert.ok(authority(row));const result=qualify(row,{now});assert.equal(result.decision,'publish');assert.equal(result.policy_version,'TCGPLAYER_MARKET_PUBLICATION_POLICY_V3');
  assert.equal(result.evidence.reviewed_play_normal_nine_authority.source_product_id,target.product_id);assert.equal(row.market_price,1.23);}
});
test('changed mapping, canonical identity, source product, physical review or evidence cannot acquire authority',()=>{
 const changes=[r=>r.source_mapping_id='1',r=>r.source_mapping_meta.approved_identity_id=id,r=>r.source_mapping_meta.approved_printing_id=id,
  r=>r.source_mapping_meta.reference_registry_fingerprint='forged',r=>r.source_mapping_meta.reviewed_invalidation={reason_code:'invalid'},
  r=>r.reviewed_identity_id=id,r=>r.reviewed_printing_provenance_ref='forged',r=>r.canonical_number='999',r=>r.canonical_name='wrong',
  r=>r.reviewed_source_extended_data[0].value='999/999',r=>r.source_product_name='Unstamped card',r=>r.printing_is_provisional=true,
  r=>r.reviewed_printing_truth_reviews[0].active=false,r=>r.reviewed_printing_truth_reviews[0].public_visibility='hidden_pending_review',
  r=>r.reviewed_printing_truth_reviews[0].evidence.review_sha256='forged',r=>r.reviewed_printing_truth_reviews[0].reviewed_at='invalid',
  r=>r.reviewed_printing_truth_reviews.push(structuredClone(r.reviewed_printing_truth_reviews[0]))];
 for(const target of registry.targets)for(const change of changes){const row=fixture(target);change(row);assert.equal(authority(row),null);assert.equal(qualify(row,{now}).eligible,false);}
});
test('zero/missing prices, stale source, source failures and duplicate ownership retain every original guard',()=>{
 for(const override of [{market_price:0},{market_price:null},{currency:'EUR'},{source_sync_status:'failed'},{source_artifact_id:null},
  {source_row_hash:null},{source_sync_finished_at:'2026-11-20T00:00:00Z'},{source_mapping_count:2},{card_print_mapping_count:2},
  {card_printing_mapping_count:2},{identity_domain_count:2},{duplicate_product_row_count:2},{variant_assignment_id:null}])
  assert.equal(qualify({...fixture(registry.targets[0]),...override},{now}).eligible,false,JSON.stringify(override));
});
test('unknown cards and all unreviewed foil finishes retain the complete predecessor result',()=>{
 for(const override of [{source_product_id:999999999},{source_subtype_name:'Holofoil',finish_key:'holo',normalized_finish_key:'holo'},
  {source_subtype_name:'Reverse Holofoil',finish_key:'reverse',normalized_finish_key:'reverse'},{category_id:1},{category_id:68},{category_id:85}]) {
  const row={...fixture(registry.targets[0]),...override};assert.deepEqual(qualify(row,{now}),previous(row,{now}));assert.equal(authority(row),null);
 }
});
