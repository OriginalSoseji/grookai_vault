import assert from 'node:assert/strict';
import {deterministicUuidV5} from './one_piece_canonical_import_staging_v1.mjs';
import {postgresJsonbArrayTextV1,imageReleaseManifestFingerprintV1} from './mtg_sealed_image_release_plan_v1.mjs';
import {pokemonSealedHashV1 as hash,POKEMON_SEALED_REVIEWER_ID,validatePokemonSealedWorldPlanV1} from './pokemon_sealed_world_v1.mjs';
import {imageHash,pokemonSealedObjectV1} from './pokemon_sealed_storage_v1.mjs';
const uuid=value=>deterministicUuidV5(`pokemon:sealed:${value}`);
const stamped=(type,core,field)=>{const fingerprint=hash({type,...core});return{id:uuid(`${type}:${fingerprint}`),...core,[field]:fingerprint};};
export function buildPokemonSealedImageReleaseV1({catalog,acquisition,acquisitionSummary,storage,storageSummary,producerCommit}){
  assert.equal(validatePokemonSealedWorldPlanV1(catalog).valid,true);
  assert.equal(storageSummary.passed,true);
  assert.equal(storage.length,storageSummary.expected);
  assert.equal(new Set(storage.map(r=>r.path)).size,storage.length);
  assert.equal(acquisition.length,catalog.payload.members.length);
  assert.equal(new Set(acquisition.map(r=>r.member_id)).size,acquisition.length);
  const results=new Map(acquisition.map(r=>[r.member_id,r]));
  const stored=new Map(storage.map(r=>[r.sha256,r]));
  const mappings=new Map(catalog.payload.mappings.map(r=>[r.id,r]));
  const coverage=hash(acquisition);
  const objects=new Map();
  const evidence=[];
  for(const member of catalog.payload.members){
    const r=results.get(member.id),mapping=mappings.get(member.source_mapping_id);
    assert.ok(r&&mapping,'Image/member reference missing');
    assert.equal(r.variant_id,member.variant_id);
    assert.equal(r.source_mapping_id,mapping.id);
    assert.equal(r.source_product_id,mapping.source_product_id);
    assert.equal(r.source_payload_hash,mapping.source_payload_hash);
    const eligible=r.status==='verified';
    if(eligible){
      const expected=pokemonSealedObjectV1(r),readback=stored.get(r.image.sha256);
      assert.ok(readback,'Missing Storage proof');assert.equal(readback.path,expected.path);
      assert.equal(readback.bytes,r.image.size_bytes);assert.equal(readback.event,'verified');
      if(!objects.has(r.image.sha256))objects.set(r.image.sha256,stamped('image-object',{
        game_key:'pokemon',storage_bucket:expected.bucket,object_path:expected.path,content_sha256:r.image.sha256,
        image_mime:r.image.content_type,image_width:r.image.width,image_height:r.image.height,image_bytes:r.image.size_bytes,
        storage_readback_sha256:readback.sha256,storage_verified_at:readback.verified_at,
        object_contract_version:'POKEMON_SEALED_IMAGE_OBJECT_V1'},'object_fingerprint'));
    }
    const sourceUrl=r.source_image_url??r.urls[0];
    assert.ok([
      `https://tcgplayer-cdn.tcgplayer.com/product/${r.source_product_id}_in_1000x1000.jpg`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${r.source_product_id}_200w.jpg`,
      `https://product-images.tcgplayer.com/fit-in/1000x1000/${r.source_product_id}.jpg`,
    ].includes(sourceUrl),'Unbound source image URL');
    evidence.push(stamped('image-evidence',{
      game_key:'pokemon',variant_id:r.variant_id,source_mapping_id:mapping.id,source_release_member_id:member.id,
      source_provider:'tcgplayer',source_category_id:mapping.source_category_id,source_group_id:mapping.source_group_id,
      source_product_id:r.source_product_id,source_image_url:sourceUrl,
      selected_source_role:eligible?'exact_source_product_package':null,
      retrieved_at:r.retrieved_at??acquisitionSummary.finished_at,http_status:eligible?200:null,
      image_mime:eligible?r.image.content_type:null,image_width:eligible?r.image.width:null,
      image_height:eligible?r.image.height:null,image_bytes:eligible?r.image.size_bytes:null,
      content_sha256:eligible?r.image.sha256:null,classification:eligible?'exact_image_ready':'missing_source_image',
      source_plan_fingerprint:catalog.plan_fingerprint_sha256,coverage_fingerprint:coverage,
      evidence_contract_version:'POKEMON_SEALED_IMAGE_EVIDENCE_V1'},'evidence_fingerprint'));
  }
  const assertions=evidence.filter(e=>e.classification==='exact_image_ready').map(e=>stamped('image-assertion',{
    game_key:'pokemon',variant_id:e.variant_id,source_mapping_id:e.source_mapping_id,image_evidence_id:e.id,
    image_object_id:objects.get(e.content_sha256).id,assertion_state:'exact_verified',
    assertion_contract_version:'POKEMON_SEALED_IMAGE_ASSERTION_V1'},'assertion_fingerprint'));
  assert.equal(objects.size,stored.size,'Unreferenced Storage objects');
  const release={id:uuid(`image-release:${catalog.payload.releases[0].id}:${coverage}`),game_key:'pokemon',
    release_key:`pokemon-sealed-images-${coverage.slice(0,20)}`,release_state:'draft',
    source_price_release_id:catalog.payload.releases[0].id,source_audit_producer_sha:producerCommit,
    source_plan_fingerprint:catalog.plan_fingerprint_sha256,coverage_fingerprint:coverage,
    release_contract_version:'POKEMON_SEALED_IMAGE_RELEASE_V1',expected_member_count:assertions.length,
    created_by:POKEMON_SEALED_REVIEWER_ID};
  const evidenceById=new Map(evidence.map(e=>[e.id,e]));
  const objectsById=new Map([...objects.values()].map(o=>[o.id,o]));
  const members=assertions.map(a=>{
    const fingerprint=imageHash(Buffer.from(postgresJsonbArrayTextV1(['SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',
      release.id,'pokemon',a.variant_id,a.id,a.assertion_fingerprint,evidenceById.get(a.image_evidence_id).evidence_fingerprint,
      objectsById.get(a.image_object_id).object_fingerprint])));
    return{id:uuid(`image-release-member:${fingerprint}`),image_release_id:release.id,game_key:'pokemon',
      variant_id:a.variant_id,image_assertion_id:a.id,member_fingerprint:fingerprint};
  });
  release.manifest_fingerprint=imageReleaseManifestFingerprintV1(release,members);
  const payload={evidence,objects:[...objects.values()],assertions,releases:[release],release_members:members};
  const body={version:'POKEMON_SEALED_IMAGE_RELEASE_V1',producer_commit:producerCommit,
    source_catalog_fingerprint:catalog.plan_fingerprint_sha256,source_storage_fingerprint:storageSummary.fingerprint,
    counts:Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,v.length])),payload};
  return{...body,fingerprint:hash(body)};
}
