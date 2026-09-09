import assert from 'node:assert/strict';
import {deterministicUuidV5} from './one_piece_canonical_import_staging_v1.mjs';
import {pokemonSealedHashV1 as hash,POKEMON_SEALED_REVIEWER_ID} from './pokemon_sealed_world_v1.mjs';
import {postgresJsonbArrayTextV1,imageReleaseManifestFingerprintV1} from './mtg_sealed_image_release_plan_v1.mjs';
export const POKEMON_SEALED_REFRESH_V1='POKEMON_SEALED_REFRESH_V1';
export const POKEMON_SEALED_SOURCE_CONTAINMENT_V1='POKEMON_SEALED_SOURCE_CONTAINMENT_V1';
export const POKEMON_SEALED_REFRESH_BASELINE='0bf7970b-842e-556c-9c6f-d541d1456212';
const uuid=value=>deterministicUuidV5(`pokemon:sealed:refresh:${value}`);
const stamp=(type,core,field)=>{const fp=hash({type,...core});return{id:uuid(`${type}:${fp}`),...core,[field]:fp};};
const pick=(row,keys)=>Object.fromEntries(keys.split(',').map(k=>[k,row[k]]));
export function buildPokemonSealedRefreshV1({baseline,source,prices,sync,today,producerCommit,pointers}){
  assert.ok(baseline.length>0&&baseline.length<=3000,'Refresh population outside envelope');
  assert.equal(new Set(baseline.map(r=>r.variant_id)).size,baseline.length,'Duplicate baseline variant');
  assert.match(producerCommit,/^[a-f0-9]{40}$/);
  const age=date=>(Date.parse(today)-Date.parse(date))/86400000;
  assert.ok(sync?.status==='completed'&&age(sync.observed_on)>=0&&age(sync.observed_on)<=2,'Source sync stale');
  const bySource=new Map(source.map(r=>[String(r.product_id),r]));
  assert.equal(bySource.size,source.length,'Duplicate source identity');
  const byPrice=new Map();for(const p of prices){const k=String(p.product_id);byPrice.set(k,[...(byPrice.get(k)??[]),p]);}
  const qualified=[],exclusions=[];
  for(const row of baseline){
    assert.equal(row.game_key,'pokemon');assert.ok([3,85].includes(Number(row.source_category_id)));
    const s=bySource.get(String(row.source_product_id));
    assert.equal(row.image_object.game_key,'pokemon');assert.equal(row.image_object.content_sha256,row.image_evidence.content_sha256);
    assert.equal(row.image_object.storage_readback_sha256,row.image_object.content_sha256);
    assert.equal(row.image_object.storage_bucket,'user-card-images');
    assert.match(row.image_object.object_path,/^sealed\/pokemon\/sha256\/[a-f0-9]{2}\/[a-f0-9]{64}\.(jpg|png|gif|webp)$/);
    for(const key of ['image_mime','image_width','image_height','image_bytes'])assert.equal(row.image_object[key],row.image_evidence[key]);
    if(!s?.source_active||s.payload_hash!==row.source_payload_hash||Number(s.category_id)!==Number(row.source_category_id)){
      exclusions.push({variant_id:row.variant_id,reason:'source_identity_not_currently_verified',
        policy:POKEMON_SEALED_SOURCE_CONTAINMENT_V1,source_product_id:row.source_product_id,
        expected_source_payload_hash:row.source_payload_hash,observed_source_payload_hash:s?.payload_hash??null,
        expected_source_category_id:row.source_category_id,observed_source_category_id:s?.category_id??null,
        source_active:s?.source_active??null});
      continue;
    }
    const normal=(byPrice.get(String(row.source_product_id))??[]).filter(p=>p.subtype_name_normalized==='normal');
    assert.ok(normal.length<=1,'Ambiguous Normal price');
    const p=normal[0],market=Number(p?.market_price);
    if(!p||p.market_price===null||!Number.isFinite(market)||market<=0||p.currency!=='USD'||!Number.isFinite(age(p.observed_on))||age(p.observed_on)<0||age(p.observed_on)>7){
      exclusions.push({variant_id:row.variant_id,reason:'missing_stale_or_invalid_exact_market_price'});continue;
    }
    assert.match(p.payload_hash,/^[a-f0-9]{64}$/);assert.ok(p.source_price_row_identity);
    const previous=Number(row.previous_market_price);
    assert.ok(previous>0&&market/previous<=3&&market/previous>=1/3,`Large price movement: ${row.variant_id}`);
    const q={variant_id:row.variant_id,source_mapping_id:row.source_mapping_id,
      source_price_row_identity:p.source_price_row_identity,source_subtype_name_normalized:'normal',observed_on:p.observed_on,
      currency:'USD',qualification_status:'qualified_exact',qualification_evidence:{policy:'tcgplayer_market_price_exact_product_v1',
        observation:{market_price:market,low_price:p.low_price===null?null:Number(p.low_price),source_price_row_identity:p.source_price_row_identity}},
      source_observation_fingerprint:p.payload_hash,qualification_contract_version:POKEMON_SEALED_REFRESH_V1,publication_authority:false};
    qualified.push({id:uuid(`qualification:${hash(q)}`),...q});
  }
  assert.ok(qualified.length>=Math.ceil(baseline.length*.95),'Coverage loss exceeds five percent');
  qualified.sort((a,b)=>a.id.localeCompare(b.id));
  const sourceFingerprint=hash({version:POKEMON_SEALED_REFRESH_V1,baseline:POKEMON_SEALED_REFRESH_BASELINE,
    qualified,producerCommit,sync_id:sync.id});
  const priceId=uuid(`price-release:${sourceFingerprint}`);
  const members=qualified.map(q=>{
    const core={release_id:priceId,variant_id:q.variant_id,source_mapping_id:q.source_mapping_id,qualification_id:q.id,qualification_status:'qualified_exact'};
    const fp=hash(core);return{id:uuid(`price-member:${fp}`),...core,member_fingerprint:fp};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const release={id:priceId,game_key:'pokemon',release_key:`pokemon-sealed-refresh-${sourceFingerprint.slice(0,20)}`,
    release_state:'draft',source_audit_producer_sha:producerCommit,source_sample_logical_hash:sourceFingerprint,
    release_contract_version:POKEMON_SEALED_REFRESH_V1,manifest_fingerprint:hash(members),expected_member_count:members.length,created_by:POKEMON_SEALED_REVIEWER_ID};
  const byVariant=new Map(baseline.map(r=>[r.variant_id,r]));
  const coverage=hash(members.map(m=>[m.variant_id,byVariant.get(m.variant_id).image_evidence.evidence_fingerprint]));
  const evidence=[],assertions=[];
  for(const member of members){
    const old=byVariant.get(member.variant_id);
    const core=pick(old.image_evidence,'game_key,variant_id,source_mapping_id,source_provider,source_category_id,source_group_id,source_product_id,source_image_url,selected_source_role,retrieved_at,http_status,image_mime,image_width,image_height,image_bytes,content_sha256,classification');
    assert.equal(core.variant_id,member.variant_id);assert.equal(core.source_mapping_id,member.source_mapping_id);
    const e=stamp('image-evidence',{...core,source_release_member_id:member.id,source_plan_fingerprint:sourceFingerprint,
      coverage_fingerprint:coverage,evidence_contract_version:'POKEMON_SEALED_REUSED_IMAGE_EVIDENCE_V1'},'evidence_fingerprint');
    evidence.push(e);
    assertions.push(stamp('image-assertion',{game_key:'pokemon',variant_id:member.variant_id,source_mapping_id:member.source_mapping_id,
      image_evidence_id:e.id,image_object_id:old.image_object.id,assertion_state:'exact_verified',
      assertion_contract_version:'POKEMON_SEALED_REUSED_IMAGE_ASSERTION_V1'},'assertion_fingerprint'));
  }
  const imageRelease={id:uuid(`image-release:${sourceFingerprint}`),game_key:'pokemon',release_key:`pokemon-sealed-refresh-images-${sourceFingerprint.slice(0,20)}`,
    release_state:'draft',source_price_release_id:priceId,source_audit_producer_sha:producerCommit,source_plan_fingerprint:sourceFingerprint,
    coverage_fingerprint:coverage,release_contract_version:'POKEMON_SEALED_IMAGE_REFRESH_V1',expected_member_count:assertions.length,created_by:POKEMON_SEALED_REVIEWER_ID};
  const evById=new Map(evidence.map(e=>[e.id,e]));
  const imageMembers=assertions.map(a=>{
    const fp=hash(postgresJsonbArrayTextV1(['SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',imageRelease.id,'pokemon',a.variant_id,a.id,
      a.assertion_fingerprint,evById.get(a.image_evidence_id).evidence_fingerprint,byVariant.get(a.variant_id).image_object.object_fingerprint]));
    return{id:uuid(`image-member:${fp}`),image_release_id:imageRelease.id,game_key:'pokemon',variant_id:a.variant_id,image_assertion_id:a.id,member_fingerprint:fp};
  });
  imageRelease.manifest_fingerprint=imageReleaseManifestFingerprintV1(imageRelease,imageMembers);
  const body={version:POKEMON_SEALED_REFRESH_V1,producer_commit:producerCommit,baseline_image_release:POKEMON_SEALED_REFRESH_BASELINE,
    source_fingerprint:sourceFingerprint,expected_pointers:pointers,source_sync:sync,exclusions,
    source_containment_policy:POKEMON_SEALED_SOURCE_CONTAINMENT_V1,
    prices:{qualifications:qualified,releases:[release],members},images:{evidence,assertions,releases:[imageRelease],release_members:imageMembers},
    boundaries:{identity_writes:0,storage_writes:0,visibility_writes:0,vault_writes:0,cross_game_writes:0,max_variants:3000,max_coverage_loss:.05,max_price_ratio:3}};
  return{...body,fingerprint:hash(body)};
}
