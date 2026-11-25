// Offline, bounded printed-identity evidence. No DB, staging or execution API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

export const GENERIC_PLAY_STAMP_IDENTITY_RULE_V2='GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V2';
const folder=fileURLToPath(new URL('../../docs/catalog/generic_play_stamp_identity_evidence_v2/',import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.join(folder,'index.json')));
const review=JSON.parse(fs.readFileSync(path.join(folder,'review.json')));
const {fingerprint,...body}=registry,{fingerprint:reviewFingerprint,...reviewBody}=review;
const metadataPins=['index.json','review.json'].map(file=>({file,
  sha256:createHash('sha256').update(fs.readFileSync(path.join(folder,file))).digest('hex')}));
assert.equal(fingerprint,'7a9fac6bb539af6ba438d057d148f20be7ba3b79f848d1917267c212a4f935b5');
assert.equal(hash(body),fingerprint);assert.equal(hash(reviewBody),reviewFingerprint);
assert.equal(reviewFingerprint,registry.visual_review_fingerprint);
assert.equal(registry.targets.length,9);assert.equal(registry.source_bytes.length,14);
assert.equal(registry.original149_never_repeat,true);assert.equal(registry.old98_and32_programmes_remain_held,true);
const targets=new Map(registry.targets.map(t=>[t.product_id,t]));
assert.equal(targets.size,9);
const normalizeName=s=>String(s??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const ordinal=s=>{const first=String(s??'').split('/')[0];return /^\d{1,3}$/.test(first)?String(Number(first)):null;};
const equal=(a,b)=>hash({value:a})===hash({value:b});
const safeResult=(status,reasons,extra={})=>({version:GENERIC_PLAY_STAMP_IDENTITY_RULE_V2,status,reasons,
  evidence_only:true,automatic_promotion:false,production_authority:false,source_admission:false,
  canonical_writes:0,printing_writes:0,mapping_writes:0,alias_writes:0,owner_writes:0,
  hold_cleared:false,original149_never_repeat:true,...extra});

export const genericPlayStampEvidenceRegistryV2=()=>structuredClone(registry);
export function verifyGenericPlayStampSourceBytesV2({readBytes=file=>fs.readFileSync(path.join(folder,file))}={}){
  for(const pin of metadataPins)
    assert.equal(createHash('sha256').update(readBytes(pin.file)).digest('hex'),pin.sha256,'Evidence metadata changed: '+pin.file);
  for(const source of registry.source_bytes){
    assert.match(source.file,/^sources\/[a-zA-Z0-9_.-]+$/);
    assert.equal(createHash('sha256').update(readBytes(source.file)).digest('hex'),source.sha256,'Original evidence bytes changed: '+source.file);
  }
  return{registry_fingerprint:fingerprint,visual_review_fingerprint:reviewFingerprint,source_files:14,source_bytes_verified:true,production_authority:false};
}

// Series membership is distribution provenance, not a second stamp identity.
// The caller must supply current base/identity/alias/collision facts. A captured
// empty slot is never an execution-time uniqueness or owner-reference proof.
export function adjudicateGenericPlayStampEvidenceV2(input={},options={}){
  const target=targets.get(Number(input.product_id));
  if(!target)return safeResult('OUT_OF_SCOPE',['not_one_of_nine_frozen_targets']);
  let bytes;try{bytes=verifyGenericPlayStampSourceBytesV2(options);}catch{return safeResult('HOLD',['source_bytes_changed_or_missing']);}
  if(!equal(input.base,target.base))return safeResult('HOLD',['canonical_base_changed']);
  if(!Array.isArray(input.active_base_identities)||input.active_base_identities.length!==1||
     !equal(input.active_base_identities[0],target.base_identity)||input.active_base_identities[0].is_active!==true)
    return safeResult('HOLD',['active_base_identity_changed']);
  if(!Array.isArray(input.approved_base_aliases)||!equal(input.approved_base_aliases,target.approved_base_aliases)||
     input.approved_base_aliases.some(a=>a.active!==true||a.authority_status!=='approved'||a.canonical_card_print_id!==target.base.id))
    return safeResult('HOLD',['approved_base_alias_route_changed']);
  if(!Array.isArray(input.existing_generic_stamp_parent_ids))return safeResult('HOLD',['current_collision_evidence_missing']);
  if(input.existing_generic_stamp_parent_ids.length)
    return safeResult('EXISTING_CANONICAL_REQUIRES_RECONCILIATION',['generic_stamped_parent_already_exists']);
  const observation=review.observations.find(r=>r.product_id===target.product_id);
  if(!observation||!equal(input.observation,observation))return safeResult('HOLD',['printed_stamp_observation_changed']);
  if(observation.play_stamp_observed!==true||observation.explicit_series_marker_observed!==false||
     observation.more_specific_printed_stamp_observed!==false)
    return safeResult('HOLD',['generic_markerless_play_stamp_not_proven']);
  if(normalizeName(observation.printed_name)!==normalizeName(target.base.name)||
     ordinal(observation.printed_number)!==ordinal(target.base.number)||
     observation.printed_set_mark!==target.printed_set_mark||observation.image_sha256!==target.image_sha256)
    return safeResult('HOLD',['printed_base_and_stamp_coordinates_disagree']);
  if(target.base.identity_domain!=='pokemon_eng_standard'||target.base.variant_key||target.base.printed_identity_modifier)
    return safeResult('HOLD',['underlying_base_not_plain_english_identity']);
  return safeResult('NEW_CANONICAL_REQUIRED',[],{
    reason_code:'PRINTED_IDENTITY_DELTA_DETECTED',proposed_action:'CREATE_CARD_PRINT',
    canonical_tuple:{base_card_print_id:target.base.id,set_id:target.base.set_id,set_code:target.base.set_code,
      canonical_number:target.base.number,name:target.base.name,variant_key:'play_pokemon_stamp'},
    known_series_evidence:[...target.known_series_evidence],series_creates_separate_identity:false,
    all_series_membership_claimed_complete:false,card_printings_action:'NONE',
    public_id_assignment:'REQUIRES_GOVERNED_WAREHOUSE_MINTING',
    source_proof:bytes,existing_other_variants_must_be_preserved:true,
    required_before_execution:['Fresh global/base-alias collision and protected-state checks',
      'Governed warehouse bridge, classification, staging and deterministic public-ID validation',
      'Fully qualified bounded executor, exact owner decision, production rollback and independent readback'],
  });
}

// An offline inspection fixture only; not current database state or permission.
export function capturedGenericPlayStampEvidenceInputV2(productId){
  const t=targets.get(Number(productId));if(!t)return null;
  return{product_id:t.product_id,base:structuredClone(t.base),active_base_identities:[structuredClone(t.base_identity)],
    approved_base_aliases:structuredClone(t.approved_base_aliases),existing_generic_stamp_parent_ids:[],
    observation:structuredClone(review.observations.find(r=>r.product_id===t.product_id))};
}
