import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {loadReviewedStampedReverseAuthorityV1} from '../warehouse/reviewed_stamped_reverse_authority_v1.mjs';

export const REVIEWED_STAMPED_REVERSE_REVIEW_V1='REVIEWED_STAMPED_REVERSE_REVIEW_V1';
export const REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1='REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1';
const root=fileURLToPath(new URL('../../',import.meta.url));
const scope='docs/catalog/reviewed_stamped_reverse_supported_v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const same=(a,b,why)=>assert.equal(hash(a),hash(b),why);
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);
}return value;};
const uuid=value=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const negative=value=>'-'+BigInt('0x'+hash(value).slice(0,15));
const sourceBytes=relative=>{
  assert.ok(relative.startsWith(scope+'/')&&!relative.includes('..')&&!relative.includes('\\'));
  const file=path.resolve(root,relative);assert.equal(fs.realpathSync(file),file);return fs.readFileSync(file);
};
const physical=loadReviewedStampedReverseAuthorityV1();
const products=JSON.parse(sourceBytes(scope+'/market-products.json'));
const review=JSON.parse(sourceBytes(scope+'/market-source-review.json'));
const retained=JSON.parse(sourceBytes(scope+'/retained-projection.json'));
for(const [value,pin]of [[products,'35f92cf4ee76c6c8fac3bcbe15edf4d8d876fe255a3215b5e6eb961b12ea1723'],
  [review,'8cd98a19d61b8b0d6b3f002f1b3de5909ac4ff2cf75cb0b7d8e1bbf853d2e987'],
  [retained,'76ba9f10f408fa2a9062d2adffe3c45a26eb12ab6037852db89fd0e6a3c99d6d']]){
  const {fingerprint,...body}=value;assert.equal(fingerprint,pin);assert.equal(hash(body),fingerprint);
}
assert.equal(products.physical_evidence_fingerprint,physical.index.fingerprint);
assert.equal(products.canonical_or_price_execution_authority,false);
assert.equal(products.products.length,53);assert.equal(products.unmapped_physical_targets.length,1);
assert.equal(review.registry_fingerprint,products.fingerprint);
assert.equal(review.production_authority,false);
assert.equal(review.primary_images_individually_inspected,51);
assert.equal(review.provider_image_absent,2);
assert.equal(review.observations.length,53);
assert.equal(new Set(products.products.map(p=>p.product_id)).size,53);
assert.equal(new Set(products.products.map(p=>p.printing_id)).size,53);
for(const product of products.products){
  const target=physical.index.targets.find(t=>t.printing.id===product.printing_id);
  assert.ok(target);assert.equal(product.parent_id,target.parent.id);assert.equal(product.category_id,3);
  assert.equal(product.physical_front_sha256,target.card_front_sha256);
  const observed=review.observations.find(o=>o.product_id===product.product_id);
  assert.ok(observed);assert.equal(observed.printing_id,target.printing.id);
  assert.equal(observed.physical_observation_sha256,hash(target.observation));
  assert.equal(observed.source_product_price_used_as_finish_proof,false);
  if(product.primary_image){
    assert.equal(product.primary_image.visually_inspected,true);
    assert.equal(sha(sourceBytes(product.primary_image.file)),product.primary_image.sha256);
    assert.equal(observed.primary_image_sha256,product.primary_image.sha256);
  }else{
    assert.ok([180461,233306].includes(product.product_id));assert.equal(product.provider_image_count,0);
    assert.equal(observed.provider_does_not_distribute_image,true);
  }
  if(product.product_id===188126){
    assert.equal(product.name,'Pichu - 45/106 [Platinum]');assert.equal(product.number,'045/100');
    assert.equal(product.coordinate_disagreement.physical_front_literal,'45/100');
  }else assert.equal(product.coordinate_disagreement,null);
}

export const REVIEWED_STAMPED_REVERSE_REPAIR_PRODUCTS_V1=Object.freeze({
  'GV-PK-XY11-104-STAFF-STAMP':'121228',
  'GV-PK-XY8-101-LEAGUE-STAMP':'107220',
});
const targets=physical.index.targets.map(t=>{
  const manifest=physical.manifests.get(t.set_code),product=products.products.find(p=>p.printing_id===t.printing.id)??null;
  const projection=retained.targets.find(p=>p.printing_id===t.printing.id);assert.ok(projection);
  assert.equal(projection.parent_id,t.parent.id);assert.equal(projection.is_provisional,false);
  for(const key of['provenance_source','provenance_ref'])assert.ok(typeof projection[key]==='string'&&projection[key].trim());
  const rawId=negative({version:REVIEWED_STAMPED_REVERSE_REVIEW_V1,manifest:manifest.fingerprint});
  const reviewRow={id:uuid({version:REVIEWED_STAMPED_REVERSE_REVIEW_V1,printing_id:t.printing.id,manifest:manifest.fingerprint}),
    card_printing_id:t.printing.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',
    reason:'Exact existing stamped version and Reverse surface supported by the reviewed Master scope; no complete-set claim.',
    evidence_sources_checked:manifest.authority.source_artifacts.map(s=>s.url_or_identifier),
    evidence_sources_for_finish:['stamped-front-'+t.printing.id],expected_finish_keys:['reverse'],
    evidence:{manifest_fingerprint:manifest.fingerprint,master_index_sha256:manifest.master_index_sha256,
      review_sha256:manifest.authority.review.sha256,card_print_id:t.parent.id,card_printing_id:t.printing.id,finish_key:'reverse',
      raw_import_id:rawId,physical_evidence_fingerprint:physical.index.fingerprint},
    source_report_path:`raw_imports:${rawId}|master-index:${manifest.fingerprint}`,
    reviewed_by:REVIEWED_STAMPED_REVERSE_REVIEW_V1,reviewed_at:physical.index.source_reviewed_at};
  return {parent:t.parent,set_code:t.set_code,printing:t.printing,retained_projection:projection,review:reviewRow,physical_raw_id:rawId,
    manifest_fingerprint:manifest.fingerprint,source_product:product,
    proposed_new_mapping_id:product?negative({version:REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1,parent_id:t.parent.id,product_id:product.product_id}):null,
    expected_wrong_product_id:REVIEWED_STAMPED_REVERSE_REPAIR_PRODUCTS_V1[t.parent.gv_id]??null};
});
assert.equal(targets.length,54);assert.equal(targets.filter(t=>t.source_product).length,53);
assert.equal(targets.filter(t=>t.expected_wrong_product_id).length,2);
assert.equal(new Set(targets.map(t=>t.review.id)).size,54);
assert.equal(new Set(targets.map(t=>t.physical_raw_id)).size,23);
const body={version:REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1,physical_evidence_fingerprint:physical.index.fingerprint,
  product_identity_fingerprint:products.fingerprint,product_review_fingerprint:review.fingerprint,targets,
  canonical_or_price_execution_authority:false};
export const REVIEWED_STAMPED_REVERSE_REGISTRY_V1=deepFreeze({...body,fingerprint:hash(body)});
export const REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1=Object.freeze(targets.filter(t=>t.source_product).map(t=>t.source_product.product_id).sort((a,b)=>a-b));

export function reviewedStampedReverseMappingMetadataV1(target,identity){
  const approved=targets.find(t=>t.parent.id===target?.parent?.id);assert.ok(approved?.source_product);
  same(target,approved,'reviewed_reverse_mapping_target_changed');
  assert.equal(identity.card_print_id,target.parent.id);assert.equal(identity.is_active,true);
  assert.equal(identity.identity_domain,target.parent.identity_domain);
  assert.equal(identity.id,target.retained_projection.identity_id);
  assert.match(identity.id??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  const p=target.source_product;
  return{mapping_method:REVIEWED_STAMPED_REVERSE_MARKET_LINKS_V1,
    derived_from:'reviewed_master_existing_stamped_printing',reference_registry_fingerprint:REVIEWED_STAMPED_REVERSE_REGISTRY_V1.fingerprint,
    physical_evidence_fingerprint:physical.index.fingerprint,source_product_identity_fingerprint:products.fingerprint,
    approved_printing_id:target.printing.id,approved_finish_key:'reverse',approved_identity_id:identity.id,
    approved_review_id:target.review.id,printing_manifest_fingerprint:target.manifest_fingerprint,
    printing_evidence_raw_id:target.physical_raw_id,source_group_id:p.group_id,source_product_id:p.product_id,
    source_product_name:p.name,source_product_number:p.number,source_subtype:'Reverse Holofoil',
    source_title_coordinate_disagreement:p.coordinate_disagreement};
}
