// Synthetic governed sealed metadata only. Caller must guard the isolated local lab.
// No image upload, source fetch or production connection occurs here.
import {randomUUID,createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
import assert from 'node:assert/strict';
export async function seedPortfolioSealedFixture(c,owner,day){
async function insert(table,row) {
  assert.match(table,/^[a-z_]+$/);
  const keys=Object.keys(row);
  return (await c.query(`insert into public.${table} (${keys.map(k=>`"${k}"`).join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,Object.values(row))).rows[0];
}
async function fixture(game,language='en',options={}) {
  const variant=randomUUID(),family=randomUUID(),candidate=randomUUID(),review=randomUUID(),mapping=randomUUID(),qualification=randomUUID(),release=randomUUID();
  const h=hash(variant); const sourceId=Number.parseInt(h.slice(0,11),16);
  await insert('sealed_product_families',{id:family,game_key:game,family_key:`fixture-${variant}`,canonical_name:`Fixture ${game} box`,manufacturer_name:'Fixture',identity_contract_version:'fixture',identity_fingerprint:hash(family)});
  await insert('sealed_product_variants',{id:variant,family_id:family,variant_key:'fixture',canonical_name:`Fixture ${game} box`,package_form:'booster_box',language_code:language,identity_contract_version:'fixture',identity_fingerprint:h});
  await insert('sealed_product_candidates',{id:candidate,source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_product_name:'Fixture',source_payload_hash:h,classifier_version:'fixture',classification:'sealed_candidate',confidence:1});
  await insert('sealed_product_candidate_reviews',{id:review,candidate_id:candidate,decision:'confirmed_sealed',promotion_authorized:true,reviewed_by:owner,review_contract_version:'fixture'});
  await insert('sealed_product_source_mappings',{id:mapping,variant_id:variant,candidate_id:candidate,review_id:review,source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_product_name:'Fixture',source_payload_hash:h,classifier_version:'fixture',mapping_contract_version:'fixture',mapping_fingerprint:hash(mapping)});
  await insert('sealed_product_pricing_lane_qualifications',{id:qualification,variant_id:variant,source_mapping_id:mapping,source_price_row_identity:qualification,source_subtype_name_normalized:'normal',observed_on:options.date??'2000-01-01',currency:'USD',qualification_status:'qualified_exact',source_observation_fingerprint:hash(qualification),qualification_contract_version:'fixture',qualification_evidence:{observation:{market_price:options.price??null}}});
  await insert('sealed_product_releases',{id:release,game_key:game,release_key:`fixture-${release}`,source_audit_producer_sha:'0'.repeat(40),source_sample_logical_hash:h,release_contract_version:'fixture',manifest_fingerprint:hash(release),expected_member_count:1,created_by:owner});
  const member=await insert('sealed_product_release_members',{release_id:release,variant_id:variant,source_mapping_id:mapping,qualification_id:qualification,member_fingerprint:hash(randomUUID())});
  await c.query("update public.sealed_product_releases set release_state='frozen',frozen_by=$2,frozen_at=now() where id=$1",[release,owner]);
  await c.query("insert into public.sealed_product_release_pointer(game_key,release_id,pointer_contract_version,changed_by) values($1,$2,'fixture',$3) on conflict(game_key) do update set release_id=excluded.release_id",[game,release,owner]);
  await c.query("update public.catalog_game_release_controls set release_status='signed_in' where game_code=$1",[game]);
  await c.query("insert into public.sealed_product_game_release_controls(game_key,release_status,release_version) values($1,'signed_in','fixture') on conflict(game_key) do update set release_status='signed_in'",[game]);
  if(options.image) {
    const evidence=randomUUID(),object=randomUUID(),assertion=randomUUID(),imageRelease=randomUUID(),fingerprint=hash(imageRelease);
    const image={image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,content_sha256:h};
    await insert('sealed_product_image_evidence',{id:evidence,game_key:game,variant_id:variant,source_mapping_id:mapping,source_release_member_id:member.id,
      source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_image_url:`https://tcgplayer-cdn.tcgplayer.com/product/${sourceId}_200w.jpg`,
      selected_source_role:'exact_front',retrieved_at:new Date(),http_status:200,...image,classification:'exact_image_ready',source_plan_fingerprint:fingerprint,coverage_fingerprint:fingerprint,evidence_contract_version:'fixture',evidence_fingerprint:hash(evidence)});
    await insert('sealed_product_image_objects',{id:object,game_key:game,storage_bucket:'user-card-images',object_path:`sealed/${game}/sha256/${h.slice(0,2)}/${h}.jpg`,...image,
      storage_readback_sha256:h,storage_verified_at:new Date(),object_contract_version:'fixture',object_fingerprint:hash(object)});
    await insert('sealed_product_variant_image_assertions',{id:assertion,game_key:game,variant_id:variant,source_mapping_id:mapping,image_evidence_id:evidence,image_object_id:object,assertion_contract_version:'fixture',assertion_fingerprint:hash(assertion)});
    await insert('sealed_product_image_releases',{id:imageRelease,game_key:game,release_key:`fixture-${imageRelease}`,source_price_release_id:release,source_audit_producer_sha:'0'.repeat(40),source_plan_fingerprint:fingerprint,coverage_fingerprint:fingerprint,release_contract_version:'fixture',manifest_fingerprint:fingerprint,expected_member_count:1,created_by:owner});
    const binding=(await c.query("select encode(extensions.digest(convert_to(jsonb_build_array('SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',$1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text)::text,'UTF8'),'sha256'),'hex') hash",[imageRelease,game,variant,assertion,hash(assertion),hash(evidence),hash(object)])).rows[0].hash;
    await insert('sealed_product_image_release_members',{image_release_id:imageRelease,game_key:game,variant_id:variant,image_assertion_id:assertion,member_fingerprint:binding});
    await c.query("update public.sealed_product_image_releases set release_state='frozen',frozen_at=now(),frozen_by=$2 where id=$1",[imageRelease,owner]);
    await c.query("insert into public.sealed_product_image_release_pointer(game_key,image_release_id,pointer_contract_version,changed_by) values($1,$2,'fixture',$3) on conflict(game_key) do update set image_release_id=excluded.image_release_id",[game,imageRelease,owner]);
  }
  return variant;
}
 return fixture('pokemon','en',{date:day,price:'50.25',image:true});
}