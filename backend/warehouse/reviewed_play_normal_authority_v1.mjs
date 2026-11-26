import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash,printingCandidateId} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority} from '../catalog/master_index_printing_authority_v1.mjs';
import {freezeWarehousePrintingAuthority} from './printing_authority_v1.mjs';
import {proposedReviewedPlayParentIdV1} from './parent_registry_v1.mjs';
import {exactPrintingGvIdV1} from '../printing/printing_upsert_v1.mjs';

export const REVIEWED_PLAY_NORMAL_AUTHORITY_V1='REVIEWED_PLAY_NORMAL_AUTHORITY_V1';
const root=fileURLToPath(new URL('../../',import.meta.url));
const scope='docs/catalog/reviewed_play_normal_nine_v1';
const indexFingerprint='6748d694531a1276e77b8b4ec35815af3e9675c697f30c2e2fb4f22a348be867';
const setCounts=Object.freeze({sv04:1,sv05:3,sv06:2,sv07:2,sv6pt5:1});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function sourceBytes(relative) {
  assert.ok(typeof relative==='string'&&!relative.includes('\\')&&!relative.includes('..'));
  assert.ok(relative.startsWith('docs/catalog/'),'reviewed_source_path_required');
  const file=path.resolve(root,relative),real=fs.realpathSync(file);
  assert.equal(real,file,'reviewed_source_symlink_not_allowed');
  return fs.readFileSync(file);
}
const json=relative=>JSON.parse(sourceBytes(relative));

// This bounded adapter binds the original evidence bytes and new UUID proposals.
// It supplies evidence only; warehouse review/approval and live absence checks
// remain mandatory and are not inferred from a source manifest.
export function loadReviewedPlayNormalAuthorityV1() {
  const index=json(scope+'/index.json'),{fingerprint,...body}=index;
  assert.equal(fingerprint,indexFingerprint,'reviewed_play_index_changed');
  assert.equal(hash(body),fingerprint,'reviewed_play_index_fingerprint_changed');
  assert.equal(index.production_execution_authority,false);assert.equal(index.price_authority,false);
  assert.equal(index.whole_set_completion,false);assert.equal(index.targets.length,9);
  assert.equal(index.normal_facts,9);assert.equal(index.unspecified_foil_leads,3);
  assert.equal(sha(sourceBytes(index.official_checklist.file)),index.official_checklist.sha256);
  const manifests=new Map(),artifactsBySet=new Map();
  for(const [setCode,count]of Object.entries(setCounts)) {
    const manifest=json(`${scope}/sets/${setCode}.manifest.json`),artifacts=new Map();
    assert.equal(manifest.set_code,setCode);assert.equal(manifest.scope,'base_release');
    assert.deepEqual(manifest.expected,{parents:count,printings:count,finishes:{normal:count}});
    for(const ref of [manifest.master_index_ref,manifest.authority.review.ref]) {
      assert.ok(ref.startsWith('repo:'+scope+'/sets/'),'reviewed_scope_artifact_required');
      artifacts.set(ref,sourceBytes(ref.slice(5)));
    }
    for(const source of manifest.authority.source_artifacts) {
      const target=index.targets.find(t=>'play-front-'+t.product_id===source.ref);
      const file=source.ref==='official-series-six-checklist'?index.official_checklist.file:target?.card_front_file;
      assert.ok(file,'unreviewed_source_artifact');
      const bytes=sourceBytes(file);assert.equal(sha(bytes),source.sha256);
      if(target){assert.equal(source.evidence_role,'printed_identity_only_not_foil');assert.equal(sha(bytes),target.card_front_sha256);}
      artifacts.set(source.ref,bytes);
    }
    assertMasterPrintingAuthority(manifest,artifacts);
    assert.deepEqual(manifest.parents,index.targets.filter(t=>t.set_code===setCode).map(t=>t.parent));
    manifests.set(setCode,manifest);artifactsBySet.set(setCode,artifacts);
  }
  for(const target of index.targets) {
    assert.equal(target.rows_are_new_proposals_not_existing_canonical_objects,true);
    assert.equal(target.parent.id,proposedReviewedPlayParentIdV1(target.base_card_print_id));
    assert.equal(target.printing.id,printingCandidateId(target.printing));
    assert.equal(target.printing.card_print_id,target.parent.id);assert.equal(target.printing.finish_key,'normal');
    assert.equal(target.printing.printing_gv_id,exactPrintingGvIdV1(target.parent.gv_id,'normal'));
    const fact=manifests.get(target.set_code).printings.find(p=>p.card_print_id===target.parent.id);
    assert.equal(fact.printing_gv_id,target.printing.printing_gv_id);
    assert.ok(fact.evidence.every(e=>e.kind==='checked_checklist'&&e.source_ref==='official-series-six-checklist'));
  }
  return {index,manifests,artifactsBySet,production_execution_authority:false};
}

export function freezeReviewedPlayNormalWarehouseAuthorityV1({productId,candidateId}) {
  const {index,manifests,artifactsBySet}=loadReviewedPlayNormalAuthorityV1();
  const target=index.targets.find(t=>String(t.product_id)===String(productId));
  assert.ok(target,'reviewed_play_product_outside_scope');
  return freezeWarehousePrintingAuthority({manifest:manifests.get(target.set_code),
    artifacts:artifactsBySet.get(target.set_code),target:{candidate_id:candidateId,
      card_print_id:target.parent.id,finish_key:'normal',printing_gv_id:target.printing.printing_gv_id}});
}

export function proposedReviewedPlayNormalIntakeIdV1(productId) {
  const {index}=loadReviewedPlayNormalAuthorityV1();
  const target=index.targets.find(t=>String(t.product_id)===String(productId));
  assert.ok(target,'reviewed_finish_product_outside_scope');
  const h=hash({version:'REVIEWED_PLAY_NORMAL_FINISH_INTAKE_V1',product_id:String(target.product_id),
    parent_id:target.parent.id,printing_id:target.printing.id,official_checklist_sha256:index.official_checklist.sha256});
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

export function reviewedPlayNormalFinishSignalV1(candidate) {
  const marker=candidate?.reference_hints_payload?.reviewed_play_normal_finish;
  if(marker==null)return null;
  const {index}=loadReviewedPlayNormalAuthorityV1();
  assert.equal(marker.version,'REVIEWED_PLAY_NORMAL_FINISH_INTAKE_V1');
  assert.equal(marker.evidence_fingerprint,index.fingerprint,'reviewed_finish_evidence_changed');
  const target=index.targets.find(t=>String(t.product_id)===String(candidate.tcgplayer_id));
  assert.ok(target,'reviewed_finish_product_outside_scope');
  assert.equal(marker.product_id,String(target.product_id));
  assert.equal(marker.parent_id,target.parent.id,'reviewed_finish_parent_changed');
  assert.equal(marker.printing_id,target.printing.id,'reviewed_finish_printing_changed');
  const claimed=candidate.claimed_identity_payload;
  for(const [key,value]of Object.entries({name:target.parent.name,set_code:target.set_code,
    printed_number:target.printed_number,variant_key:'play_pokemon_stamp'}))
    assert.equal(claimed?.[key],value,'reviewed_finish_claim_changed:'+key);
  return {finishHint:'normal',differentIssuedVersion:false,finishOnly:true,representableFinish:true,
    evidence_fingerprint:index.fingerprint,parent_id:target.parent.id};
}
