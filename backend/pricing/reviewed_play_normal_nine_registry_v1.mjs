import assert from 'node:assert/strict';
import products from '../../docs/catalog/reviewed_play_normal_nine_v1/market-products.json' with {type:'json'};
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {loadReviewedPlayNormalAuthorityV1,freezeReviewedPlayNormalWarehouseAuthorityV1,proposedReviewedPlayNormalIntakeIdV1}
  from '../warehouse/reviewed_play_normal_authority_v1.mjs';
import {expectedWarehousePrintingRowsV1} from '../warehouse/printing_admission_v1.mjs';

export const REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1='REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1';
const {fingerprint:productFingerprint,...productBody}=products;
assert.equal(productFingerprint,'85414864598cf3afc823bcf6001199904a8c81d05d7c15ae948ef606bf793076');
assert.equal(hash(productBody),productFingerprint);assert.equal(products.products.length,9);
const {index}=loadReviewedPlayNormalAuthorityV1();assert.equal(products.physical_evidence_fingerprint,index.fingerprint);
const targets=index.targets.map(t=>{
  const source=products.products.find(p=>p.product_id===t.product_id);assert.ok(source);
  assert.equal(source.number,t.printed_number);assert.equal(source.name,t.parent.name+' - '+t.printed_number);
  const candidateId=proposedReviewedPlayNormalIntakeIdV1(t.product_id);
  const authority=freezeReviewedPlayNormalWarehouseAuthorityV1({productId:t.product_id,candidateId});
  const expected=expectedWarehousePrintingRowsV1(authority);
  assert.equal(expected.child.id,t.printing.id);
  const mappingId=-(1000000000000+Number.parseInt(hash({version:REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1,
    parent:t.parent.id,product:t.product_id}).slice(0,12),16));assert.ok(Number.isSafeInteger(mappingId));
  return {product_id:t.product_id,source_product:source,parent:{id:t.parent.id,set_id:t.parent.set_id,set_code:t.set_code,
    game_id:t.parent_registry_admission.target.game_id,gv_id:t.parent.gv_id,name:t.parent.name,number:t.parent.printed_coordinate,
    identity_domain:t.parent.identity_domain,variant_key:t.parent.variant_key,printed_identity_modifier:t.parent.printed_identity_modifier},
    identity:{id:t.proposed_identity_id,...t.identity},printing:expected.child,review:expected.review,
    printing_evidence_raw_id:expected.raw.id,printing_authority_fingerprint:authority.fingerprint,
    printing_candidate_id:candidateId,manifest_fingerprint:authority.manifest.fingerprint,mapping_id:String(mappingId)};
});
assert.equal(new Set(targets.map(t=>t.parent.id)).size,9);assert.equal(new Set(targets.map(t=>t.mapping_id)).size,9);
const body={version:REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1,physical_evidence_fingerprint:index.fingerprint,
  product_identity_fingerprint:productFingerprint,category_id:3,group_id:22880,group_name:products.group_name,targets,
  proposed_new_rows_not_existing_records:true,canonical_or_price_execution_authority:false};
export const REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1=Object.freeze({...body,fingerprint:hash(body)});
export const REVIEWED_PLAY_NORMAL_NINE_PRODUCT_IDS_V1=Object.freeze(targets.map(t=>t.product_id).sort((a,b)=>a-b));
export function reviewedPlayNormalNineMappingMetadataV1(target) {
  const approved=targets.find(t=>t.product_id===target.product_id);assert.ok(approved);assert.deepEqual(target,approved);
  return {mapping_method:REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1,
    derived_from:'reviewed_raw_first_warehouse_parent_and_exact_printing',reference_registry_fingerprint:REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1.fingerprint,
    physical_evidence_fingerprint:index.fingerprint,source_product_identity_fingerprint:productFingerprint,
    approved_printing_id:target.printing.id,approved_finish_key:'normal',approved_identity_id:target.identity.id,
    approved_review_id:target.review.id,warehouse_printing_candidate_id:target.printing_candidate_id,
    warehouse_printing_authority_fingerprint:target.printing_authority_fingerprint,
    printing_manifest_fingerprint:target.manifest_fingerprint,printing_evidence_raw_id:target.printing_evidence_raw_id,
    source_group_id:22880,source_product_id:target.product_id,source_product_name:target.source_product.name,
    source_product_number:target.source_product.number,source_subtype:'Normal'};
}
