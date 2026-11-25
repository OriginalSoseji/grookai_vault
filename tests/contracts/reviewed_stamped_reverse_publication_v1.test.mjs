import test from'node:test';import assert from'node:assert/strict';
import{REVIEWED_STAMPED_REVERSE_REGISTRY_V1 as registry,reviewedStampedReverseMappingMetadataV1 as metadata}from'../../backend/pricing/reviewed_stamped_reverse_registry_v1.mjs';
import{resolveReviewedStampedReversePublicationAuthorityV1 as authority}from'../../backend/pricing/reviewed_stamped_reverse_publication_authority_v1.mjs';
import{evaluateTcgplayerMarketQualificationV3_4 as previous}from'../../backend/pricing/tcgplayer_market_publication_policy_v3_4.mjs';
import{evaluateTcgplayerMarketQualificationV3_5 as qualify}from'../../backend/pricing/tcgplayer_market_publication_policy_v3_5.mjs';
const id='10000000-0000-4000-8000-000000000001',now=new Date('2026-11-25T22:00:00Z'),targets=registry.targets.filter(t=>t.source_product);
function fixture(t){const p=t.source_product,r=t.retained_projection,meta=metadata(t,{id:r.identity_id,card_print_id:t.parent.id,is_active:true,identity_domain:t.parent.identity_domain});return{
 source_observation_id:id,source_sync_run_id:id,source_artifact_id:id,source_artifact_hash:'source-artifact-sha',source_artifact_byte_size:2048,
 source_price_row_identity:'source-row',source_row_hash:'source-sha',source_product_id:p.product_id,category_id:3,group_id:p.group_id,
 source_group_name:p.group_id===2374?'Miscellaneous Cards & Products':'League & Championship Cards',source_subtype_name:'Reverse Holofoil',normalized_finish_key:'reverse',source_product_name:p.name,
 source_product_active:true,source_product_catalog_status:'current',has_printed_number_evidence:true,source_sync_mode:'current_full_sync',
 source_sync_status:'completed',source_sync_failed_count:0,source_sync_finished_at:'2026-11-24T23:45:58Z',source_observed_on:'2026-11-24',
 source_mapping_count:1,source_mapping_id:r.mapping_id,source_mapping_meta:meta,mapping_method:meta.mapping_method,
 card_print_mapping_count:1,card_printing_mapping_count:1,identity_domain_count:1,identity_domain:t.parent.identity_domain,
 card_print_id:t.parent.id,card_printing_id:t.printing.id,gv_id:t.parent.gv_id,printing_gv_id:t.printing.printing_gv_id,finish_key:'reverse',
 variant_assignment_id:id,variant_assignment_status:'exact_child_finish',duplicate_product_row_count:1,currency:'USD',market_price:1.23,low_price:0.01,mid_price:999,
 set_id:t.parent.set_id,set_code:t.set_code,canonical_name:t.parent.name,canonical_number:t.parent.printed_coordinate,variant_key:t.parent.variant_key,
 reviewed_printed_identity_modifier:t.parent.printed_identity_modifier,printing_is_provisional:false,printing_truth_verified:true,reviewed_identity_id:r.identity_id,
 reviewed_printing_provenance_source:r.provenance_source,reviewed_printing_provenance_ref:r.provenance_ref,reviewed_printing_created_by:r.created_by,
 reviewed_source_extended_data:[{name:'Number',value:p.number}],reviewed_printing_truth_reviews:[structuredClone(t.review)]};}

test('all53 independently reviewed Reverse singles lift only their sole stamp or broad-group kind exclusion',()=>{
 for(const t of targets){const row=fixture(t);assert.ok(authority(row),t.parent.gv_id);const prior=previous(row,{now}),result=qualify(row,{now});
  assert.deepEqual(prior.reason_codes,[t.source_product.group_id===2374?'unsupported_product_kind':'special_variant_v1_1'],t.parent.gv_id);assert.equal(result.decision,'publish',t.parent.gv_id);
  assert.equal(result.policy_version,'TCGPLAYER_MARKET_PUBLICATION_POLICY_V3');assert.equal(row.market_price,1.23);}
});
test('changed identity, product, mapping, provenance or exact review never grants publication authority',()=>{
 const changes=[r=>r.source_mapping_id='1',r=>r.source_mapping_meta.approved_identity_id=id,r=>r.source_mapping_meta.approved_printing_id=id,
  r=>r.source_mapping_meta.reference_registry_fingerprint='forged',r=>r.source_mapping_meta.reviewed_invalidation={reason_code:'invalid'},
  r=>r.reviewed_identity_id=id,r=>r.reviewed_printing_provenance_ref='forged',r=>r.canonical_number='999',r=>r.canonical_name='wrong',
  r=>r.reviewed_source_extended_data[0].value='999/999',r=>r.source_product_name='Ordinary base card',r=>r.printing_is_provisional=true,
  r=>r.reviewed_printing_truth_reviews[0].active=false,r=>r.reviewed_printing_truth_reviews[0].public_visibility='hidden_pending_review',
  r=>r.reviewed_printing_truth_reviews[0].evidence.review_sha256='forged',r=>r.reviewed_printing_truth_reviews[0].reviewed_at='invalid',
  r=>r.reviewed_printing_truth_reviews.push(structuredClone(r.reviewed_printing_truth_reviews[0]))];
 for(const t of targets)for(const change of changes){const row=fixture(t);change(row);assert.equal(authority(row),null);assert.equal(qualify(row,{now}).eligible,false);}
});
test('null/zero quote, stale/failed source, missing lineage and ambiguous ownership preserve every guard',()=>{
 for(const t of targets)for(const patch of[{market_price:0},{market_price:null},{currency:'EUR'},{source_sync_status:'failed'},{source_artifact_id:null},
  {source_row_hash:null},{source_sync_finished_at:'2026-11-20T00:00:00Z'},{source_mapping_count:2},{card_print_mapping_count:2},
  {card_printing_mapping_count:2},{identity_domain_count:2},{duplicate_product_row_count:2},{variant_assignment_id:null}])
  assert.equal(qualify({...fixture(t),...patch},{now}).eligible,false,JSON.stringify(patch));
});
test('other versions, games and unreviewed product IDs preserve the complete predecessor result',()=>{
 for(const patch of[{source_product_id:588122},{source_product_id:170347},{source_product_id:557103},
  {source_subtype_name:'Normal',finish_key:'normal',normalized_finish_key:'normal'},
  {source_subtype_name:'Holofoil',finish_key:'holo',normalized_finish_key:'holo'},{category_id:1},{category_id:68},{category_id:85}]){
  const row={...fixture(targets[0]),...patch};assert.equal(authority(row),null);assert.deepEqual(qualify(row,{now}),previous(row,{now}));}
 const friends=fixture(targets.find(t=>t.source_product.product_id===557102));friends.market_price=null;
 assert.equal(qualify(friends,{now}).eligible,false,'The real null quote never becomes a price');
});
