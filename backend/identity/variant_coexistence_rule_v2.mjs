import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {evaluateVariantCoexistenceV1} from './variant_coexistence_rule_v1.mjs';
import {genericPlayStampEvidenceRegistryV2,verifyGenericPlayStampSourceBytesV2} from './generic_play_stamp_identity_evidence_v2.mjs';

export const VARIANT_COEXISTENCE_RULE_V2='VARIANT_COEXISTENCE_RULE_V2';
const folder=fileURLToPath(new URL('../../docs/catalog/variant_coexistence_rule_v2/',import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.join(folder,'index.json')));
const {fingerprint,...body}=registry;
assert.equal(fingerprint,'5861772bbd3b8332e87296a8adcd8f43db52a48d2858c756cefae0d3541d929d');
assert.equal(hash(body),fingerprint);assert.equal(registry.targets.length,2);
assert.deepEqual(registry.targets.map(t=>t.play_product_id).sort((a,b)=>a-b),[565473,619051]);
const indexSha=createHash('sha256').update(fs.readFileSync(path.join(folder,'index.json'))).digest('hex');
const norm=s=>String(s??'').normalize('NFKC').trim().toLowerCase();
const number=s=>{const left=String(s??'').split('/')[0];return /^\d{1,3}$/.test(left)?String(Number(left)):null;};
const rule='GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V2';
export function verifyVariantCoexistenceSourceBytesV2({readBytes=f=>fs.readFileSync(path.join(folder,f))}={}){
 assert.equal(createHash('sha256').update(readBytes('index.json')).digest('hex'),indexSha);
 verifyGenericPlayStampSourceBytesV2();
 for(const t of registry.targets){assert.match(t.game_stop_photo.file,/^\d+\.original\.jpg$/);assert.equal(createHash('sha256').update(readBytes(t.game_stop_photo.file)).digest('hex'),t.game_stop_photo.sha256);assert.equal(t.game_stop_photo.game_stop_logo_observed,true);assert.equal(t.game_stop_photo.play_logo_observed,false);assert.equal(t.game_stop_photo.foil_pattern_adjudicated,false);}
 return{registry:fingerprint,originalSourceBytesExact:true,productionAuthority:false};
}

// Classification only. Fresh full identity/alias/owner/public-ID checks and the
// separately approved canonical executor remain downstream requirements.
export function evaluateVariantCoexistenceV2(input={}){
 const t=registry.targets.find(t=>String(t.play_product_id)===String(input.candidate?.tcgplayer_id));
 if(!t||input.sourceBackedIdentity?.variant_identity_rule!==rule)return evaluateVariantCoexistenceV1(input);
 const reject=reason=>({rule:VARIANT_COEXISTENCE_RULE_V2,allowed:false,reason_code:reason,production_authority:false});
 try{
  const proof=verifyVariantCoexistenceSourceBytesV2(),identity=input.sourceBackedIdentity,variant=input.candidateVariantIdentity;
  assert.equal(input.incomingVariantKey,'play_pokemon_stamp');assert.equal(identity.variant_key,'play_pokemon_stamp');assert.equal(identity.is_complete,true);assert.equal(identity.bridge_source,'external_discovery_bridge_v1');
  assert.equal(variant?.rule,rule);assert.equal(variant?.variant_key,'play_pokemon_stamp');assert.equal(variant?.status,'RESOLVED_STAMPED_IDENTITY');
  assert.equal(identity.set_code,t.set_code);assert.equal(identity.underlying_base_set_code,t.set_code);assert.equal(identity.underlying_base_card_print_id,t.base_id);assert.equal(identity.name,t.name);assert.equal(identity.printed_number,t.printed_number);assert.equal(number(identity.number_plain),t.number_plain);
  const baseProof=identity.underlying_base_proof_summary;assert.equal(baseProof?.underlying_base_state,'PROVEN');assert.equal(baseProof?.live_base_card_print_id,t.base_id);assert.equal(baseProof?.live_base_set_code,t.set_code);assert.equal(baseProof?.live_base_name,t.name);assert.equal(number(baseProof?.live_base_number),t.number_plain);
  const play=genericPlayStampEvidenceRegistryV2();assert.equal(play.fingerprint,t.play_evidence_registry);const target=play.targets.find(p=>p.product_id===t.play_product_id);assert.equal(target?.base.id,t.base_id);assert.equal(target?.base.gv_id,t.base_gv_id);assert.equal(target?.base.set_id,t.set_id);assert.equal(target?.printed_number,t.printed_number);
  const rows=input.normalizedRows,matches=input.matchingRows;assert.equal(rows?.length,2);assert.equal(matches?.length,2);assert.deepEqual(rows.map(r=>r.id).sort(),matches.map(r=>r.id).sort());assert.equal(new Set(rows.map(r=>r.id)).size,2);assert.ok(matches.every(r=>!r.alias_reason));
  const base=rows.find(r=>r.id===t.base_id),gameStop=rows.find(r=>r.id===t.game_stop_parent_id);assert.ok(base&&gameStop);assert.equal(norm(base.variant_key),'');assert.equal(base.gv_id,t.base_gv_id);assert.equal(gameStop.variant_key,'gamestop_stamp');assert.equal(gameStop.gv_id,t.game_stop_gv_id);assert.equal(String(gameStop.tcgplayer_id),t.game_stop_product_id);
  for(const row of rows){assert.equal(row.set_id,t.set_id);assert.equal(row.set_code,t.set_code);assert.equal(norm(row.name),norm(t.name));assert.equal(number(row.number_plain||row.number),t.number_plain);}
  return{rule:VARIANT_COEXISTENCE_RULE_V2,allowed:true,reason_code:'VARIANT_COEXISTENCE_ALLOWED',incoming_variant_key:'play_pokemon_stamp',variant_identity_rules:[rule],base_row_count:1,coexisting_variant_keys:['gamestop_stamp'],slot_row_ids:rows.map(r=>r.id),evidence:proof,classification_only:true,production_authority:false,printing_authority:false,hold_cleared:false};
 }catch{return reject('BOUNDED_GAMESTOP_PLAY_PROOF_NOT_EXACT');}
}
