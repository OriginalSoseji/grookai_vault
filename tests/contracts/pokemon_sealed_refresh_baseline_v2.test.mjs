import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPokemonSealedBaselineV2 as load,validatePokemonSealedBaselineV2 as validate,reviewedPokemonSourceChangeV2 as reviewed} from '../../backend/pricing/pokemon_sealed_refresh_baseline_v2.mjs';
import {buildPokemonSealedRefreshV1 as build} from '../../backend/pricing/pokemon_sealed_refresh_v1.mjs';
import {deterministicUuidV5 as uuid} from '../../backend/pricing/one_piece_canonical_import_staging_v1.mjs';

function fixture(){
 const policy=load('anniversary-20260916'),sha='d'.repeat(64);
 const object={id:uuid('object'),game_key:'pokemon',storage_bucket:'user-card-images',object_path:`sealed/pokemon/sha256/dd/${sha}.jpg`,
 content_sha256:sha,storage_readback_sha256:sha,image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,object_fingerprint:'e'.repeat(64)};
 const baseline=Array.from({length:1730},(_,i)=>{
  const r=policy.source_reconciliations[i];const product=r?.source_product_id??9000000+i,variant=r?.variant_id??uuid(`expanded:${i}`),mapping=r?.source_mapping_id??uuid(`expanded-map:${i}`);
  return {game_key:'pokemon',baseline_image_release_id:policy.image_releases[i<1721?0:1].id,variant_id:variant,source_mapping_id:mapping,
   source_product_id:product,source_category_id:3,source_group_id:r?.source_group_id??7,source_payload_hash:r?.mapped_payload_hash??'a'.repeat(64),previous_market_price:10,image_object:object,
   image_evidence:{game_key:'pokemon',variant_id:variant,source_mapping_id:mapping,source_provider:'tcgplayer',source_category_id:3,source_group_id:r?.source_group_id??7,
   source_product_id:product,source_image_url:`https://tcgplayer-cdn.tcgplayer.com/product/${product}_200w.jpg`,selected_source_role:'exact_source_product_package',
   retrieved_at:'2026-09-07T00:00:00+00:00',http_status:200,image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,content_sha256:sha,classification:'exact_image_ready',evidence_fingerprint:'f'.repeat(64)}};
 });
 return {baseline,baselinePolicy:policy,source:baseline.map((r,i)=>({product_id:r.source_product_id,category_id:3,group_id:r.source_group_id,
 source_active:true,payload_hash:policy.source_reconciliations[i]?.current_payload_hash??r.source_payload_hash})),
 prices:baseline.map(r=>({product_id:r.source_product_id,source_price_row_identity:`price:${r.source_product_id}`,subtype_name_normalized:'normal',
 observed_on:'2026-09-16',currency:'USD',market_price:11,low_price:10,payload_hash:'b'.repeat(64)})),sync:{id:'sync',status:'completed',observed_on:'2026-09-16'},today:'2026-09-16',producerCommit:'c'.repeat(40),pointers:[]};
}
test('expanded policy binds exact immutable baseline manifests and refuses unreviewed edits',()=>{
 assert.equal(load(),null);assert.throws(()=>load('latest'));
 const p=load('anniversary-20260916');validate(p);
 const releases=p.image_releases.map(r=>({id:r.id,game_key:'pokemon',release_state:'frozen',expected_member_count:r.count,manifest_fingerprint:r.manifest}));
 validate(p,null,releases);releases[1].manifest_fingerprint='wrong';assert.throws(()=>validate(p,null,releases));
 const changed=structuredClone(p);changed.source_reconciliations[0].current_payload_hash='0'.repeat(64);assert.throws(()=>validate(changed));
});
test('entire old baseline plus new nine is required, not only currently published subset',()=>{
 const i=fixture();validate(i.baselinePolicy,i.baseline);
 assert.throws(()=>validate(i.baselinePolicy,i.baseline.slice(0,1658)),/population/);
 const rows=structuredClone(i.baseline);rows[1729]=rows[0];assert.throws(()=>validate(i.baselinePolicy,rows),/Duplicate/);
 rows[1729]=i.baseline[1729];rows[1729]={...rows[1729],baseline_image_release_id:i.baselinePolicy.image_releases[0].id};
 assert.throws(()=>validate(i.baselinePolicy,rows),/partition/);
});
test('reviewed hash transitions bind exact identity and never allow arbitrary future changes',()=>{
 const i=fixture(),row=i.baseline[0],source=i.source[0],policy=i.baselinePolicy;
 assert.ok(reviewed(policy,row,source));
 for(const patch of [{payload_hash:'0'.repeat(64)},{source_active:false},{category_id:85},{group_id:1},{product_id:1}])
 assert.equal(reviewed(policy,row,{...source,...patch}),null);
 for(const patch of [{variant_id:uuid('other')},{source_mapping_id:uuid('other')},{source_payload_hash:'0'.repeat(64)}])
 assert.equal(reviewed(policy,{...row,...patch},source),null);
 assert.equal(reviewed(null,row,source),null);
});
test('paired union records 27 reviewed receipts without rewriting mappings or image retrieval dates',()=>{
 const input=fixture(),before=structuredClone(input),plan=build(input);
 assert.equal(plan.prices.members.length,1730);assert.equal(plan.images.release_members.length,1730);
 assert.equal(plan.prices.qualifications.filter(q=>q.qualification_evidence.source_reconciliation).length,27);
 assert.ok(plan.images.evidence.every(e=>e.retrieved_at==='2026-09-07T00:00:00+00:00'));
 assert.equal(plan.boundaries.identity_writes,0);assert.equal(plan.boundaries.storage_writes,0);
 assert.deepEqual(input,before);assert.deepEqual(build(input),plan);
 input.source[0].payload_hash='0'.repeat(64);const excluded=build(input);
 assert.equal(excluded.prices.members.length,1729);assert.equal(excluded.images.release_members.length,1729);
 assert.equal(excluded.exclusions[0].reason,'source_identity_not_currently_verified');
});
