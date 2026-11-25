import test from 'node:test';
import assert from 'node:assert/strict';
import {loadReviewedPlayNormalAuthorityV1,freezeReviewedPlayNormalWarehouseAuthorityV1,reviewedPlayNormalFinishSignalV1}
  from '../../backend/warehouse/reviewed_play_normal_authority_v1.mjs';
import {assertWarehousePrintingAuthority} from '../../backend/warehouse/printing_authority_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

test('all reviewed positive Normal facts bind actual original source bytes across five sets',()=>{
  const loaded=loadReviewedPlayNormalAuthorityV1();
  assert.equal(loaded.index.targets.length,9);assert.equal(loaded.manifests.size,5);
  assert.equal(loaded.production_execution_authority,false);
  assert.equal([...loaded.manifests.values()].flatMap(m=>m.unresolved_variants).length,3);
});
test('each proposed printing binds its exact real warehouse candidate and parent',()=>{
  for(const target of loadReviewedPlayNormalAuthorityV1().index.targets) {
    const candidate_id='00000000-0000-4000-a000-000000000901';
    const bundle=freezeReviewedPlayNormalWarehouseAuthorityV1({productId:target.product_id,candidateId:candidate_id});
    const parent={...target.parent,set_code:target.set_code,game:'pokemon',language:'en'};
    assert.equal(assertWarehousePrintingAuthority(bundle,{target:bundle.target,parent}).execution_authorized,false);
    assert.throws(()=>assertWarehousePrintingAuthority(bundle,{target:{...bundle.target,finish_key:'reverse'},parent}),/target_mismatch/);
    assert.throws(()=>assertWarehousePrintingAuthority(bundle,{target:bundle.target,parent:{...parent,variant_key:null}}),/parent_mismatch/);
  }
});
test('rehashing a forged authority cannot convert card-front imagery into finish evidence',()=>{
  const bundle=freezeReviewedPlayNormalWarehouseAuthorityV1({productId:565473,candidateId:'00000000-0000-4000-a000-000000000901'});
  const pdf=bundle.artifacts.find(a=>a.ref==='official-series-six-checklist');
  pdf.base64=Buffer.from('forged source bytes').toString('base64');
  const {fingerprint,...body}=bundle;bundle.fingerprint=hash(body);
  assert.throws(()=>assertWarehousePrintingAuthority(bundle,{target:bundle.target,parent:{}}),/source_artifact_hash|artifact|sha256|hash/i);
});
test('products outside the reviewed registry cannot acquire an evidence bundle',()=>{
  assert.throws(()=>freezeReviewedPlayNormalWarehouseAuthorityV1({productId:1,candidateId:'00000000-0000-4000-a000-000000000901'}),/outside_scope/);
});
test('Normal classification requires the bounded source marker and exact printed identity',()=>{
  const {index}=loadReviewedPlayNormalAuthorityV1(),target=index.targets[0];
  const candidate={tcgplayer_id:String(target.product_id),claimed_identity_payload:{name:target.parent.name,
    set_code:target.set_code,printed_number:target.printed_number,variant_key:'play_pokemon_stamp'},
    reference_hints_payload:{reviewed_play_normal_finish:{version:'REVIEWED_PLAY_NORMAL_FINISH_INTAKE_V1',
      evidence_fingerprint:index.fingerprint,product_id:String(target.product_id),parent_id:target.parent.id,printing_id:target.printing.id}}};
  assert.equal(reviewedPlayNormalFinishSignalV1(candidate).finishHint,'normal');
  const forged=structuredClone(candidate);forged.reference_hints_payload.reviewed_play_normal_finish.parent_id=target.base_card_print_id;
  assert.throws(()=>reviewedPlayNormalFinishSignalV1(forged),/parent_changed/);
  assert.equal(reviewedPlayNormalFinishSignalV1({notes:'normal',claimed_identity_payload:{finish:'normal'}}),null);
});
