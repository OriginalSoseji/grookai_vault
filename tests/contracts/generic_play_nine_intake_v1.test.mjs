import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildGenericPlayNineIntakePlanV1,classifyGenericPlayNineIntakeStateV1,
  qualifyGenericPlayNineIntakeTransactionV1,projectGenericPlayNineSourceRowV1}
  from '../../backend/warehouse/generic_play_nine_intake_v1.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('../fixtures/generic_play_nine_intake_v1.json',import.meta.url)));
function after(plan,frame) {
  frame.intakes.push(...plan.candidates.map(c=>({id:c.planned_candidate_id,
    tcgplayer_id:c.tcgplayer_id,state:'RAW',intake_channel:'MANUAL',submission_type:'EXTERNAL_DISCOVERY_BRIDGE_V1',
    submission_intent:'MISSING_CARD',notes:c.notes,claimed_identity_payload:c.claimed_identity_payload,
    reference_hints_payload:c.reference_hints_payload})));
  return frame;
}
test('all nine reviewed stamp identities use the existing bridge; exactly two have separate successors',()=>{
  const frame=fixture(),before=structuredClone(frame),plan=buildGenericPlayNineIntakePlanV1(frame);
  assert.equal(plan.candidates.length,9);assert.deepEqual(frame,before);
  assert.deepEqual(plan.candidates.filter(c=>c.reference_hints_payload.generic_play_nine_intake.successor_of)
    .map(c=>c.tcgplayer_id),['619068','619153']);
  const carmine=plan.candidates.find(c=>c.tcgplayer_id==='623656');
  assert.equal(carmine.claimed_identity_payload.printed_number,'145/167');
  assert.equal(carmine.reference_hints_payload.source_card_snapshot.original_discovery_number_fields.number_raw,'103/131');
  const night=plan.candidates.find(c=>c.tcgplayer_id==='619147');
  assert.equal(night.claimed_identity_payload.printed_number,'061/064');
  assert.equal(plan.expected_effects.founder_approvals,0);assert.equal(plan.expected_effects.canonical_writes,0);
});
test('price changes do not become physical identity authority or leak into carried source snapshots',()=>{
  const frame=fixture(),a=buildGenericPlayNineIntakePlanV1(frame);
  for(const row of frame.sourceRows)for(const key of ['payload','raw_payload']) {
    row[key].marketPrice=999999;row[key].variants.forEach(v=>{v.price=999999;});
  }
  const b=buildGenericPlayNineIntakePlanV1(frame);assert.deepEqual(b,a);
  assert.ok(!JSON.stringify(a).includes('999999'));
  assert.ok(!JSON.stringify(projectGenericPlayNineSourceRowV1(frame.sourceRows[0])).includes('999999'));
});
test('scope order does not change the frozen plan',()=>{
  const frame=fixture(),a=buildGenericPlayNineIntakePlanV1(frame);
  frame.sourceRows.reverse();frame.bases.reverse();frame.sets.reverse();frame.coordinateParents.reverse();
  assert.equal(buildGenericPlayNineIntakePlanV1(frame).fingerprint,a.fingerprint);
});
const defects={
  missing_source:f=>f.sourceRows.pop(),
  duplicate_source:f=>{f.sourceRows[1]=structuredClone(f.sourceRows[0]);},
  different_discovery_id:f=>{f.sourceRows[0].id='00000000-0000-4000-a000-000000000002';},
  different_provider:f=>{f.sourceRows[0].source='other';},
  discovery_parent_attached:f=>{f.sourceRows[0].card_print_id=f.bases[0].id;},
  base_drift:f=>{f.bases[0].name='Different card';},
  inactive_base_identity:f=>{f.baseIdentities[0].is_active=false;},
  alias_drift:f=>{f.baseAliases[0].active=false;},
  new_generic_parent:f=>{f.coordinateParents.push({...f.bases[0],id:'00000000-0000-4000-a000-000000000003',variant_key:'play_pokemon_stamp'});},
  generic_parent_in_another_set:f=>{f.globalNameNumberParents.push({...f.bases[0],id:'00000000-0000-4000-a000-000000000004',set_id:'00000000-0000-4000-a000-000000000005',variant_key:'prize_pack_stamp'});},
  historical_missing:f=>f.intakes.pop(),
  historical_not_promoted:f=>{f.intakes[0].state='RAW';},
  historical_wrong_parent:f=>{f.intakes[0].promoted_card_print_id=f.bases[0].id;},
  historical_child_attached:f=>{f.intakes[0].promoted_card_printing_id='00000000-0000-4000-a000-000000000006';},
  unreviewed_old_intake:f=>{f.intakes.push({...f.intakes[0],id:'00000000-0000-4000-a000-000000000007'});},
};
for(const [name,mutate]of Object.entries(defects))test(`intake stops before any write on ${name}`,()=>{
  const frame=fixture();mutate(frame);assert.throws(()=>buildGenericPlayNineIntakePlanV1(frame));
});
test('complete exact RAW readback is replayable; a partial or duplicate batch is a reconciliation stop',()=>{
  const frame=fixture(),plan=buildGenericPlayNineIntakePlanV1(frame);
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,frame),'before');after(plan,frame);
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,frame),'after');
  assert.equal(buildGenericPlayNineIntakePlanV1(frame).fingerprint,plan.fingerprint);
  const partial=structuredClone(frame);partial.intakes.pop();assert.throws(()=>classifyGenericPlayNineIntakeStateV1(plan,partial),/partial_or_duplicate/);
  const duplicate=structuredClone(frame);duplicate.intakes[3]=structuredClone(duplicate.intakes[2]);
  assert.throws(()=>classifyGenericPlayNineIntakeStateV1(plan,duplicate),/duplicate_intake/);
});
test('historical notes and unknown metadata are protected by whole-row digests',()=>{
  const frame=fixture(),plan=buildGenericPlayNineIntakePlanV1(frame);
  frame.intakes[0].notes='Changed historical note';
  assert.throws(()=>classifyGenericPlayNineIntakeStateV1(plan,frame),/historical_intake_changed/);
  assert.ok(!JSON.stringify(plan).includes('Synthetic preserved historical intake fixture'));
});
for(const field of ['founder_approved_by_user_id','founder_approved_at','current_staging_id','promoted_card_print_id','promoted_card_printing_id'])
  test(`RAW intake cannot claim ${field}`,()=>{
    const frame=fixture(),plan=buildGenericPlayNineIntakePlanV1(frame);after(plan,frame);frame.intakes[2][field]='changed';
    assert.throws(()=>classifyGenericPlayNineIntakeStateV1(plan,frame),/must_not_approve_stage_or_promote/);
  });
test('qualification has no production write route, even when the caller supplies a matching plan',async()=>{
  const plan=buildGenericPlayNineIntakePlanV1(fixture());let calls=0;
  for(const connectionParameters of [{host:'production.example',database:'postgres'},{host:'127.0.0.1',database:'postgres'}]) {
    const client={connectionParameters,query:async()=>{calls++;throw Error('must not query');}};
    await assert.rejects(qualifyGenericPlayNineIntakeTransactionV1({client,plan,mode:'apply'}),/qualification_(loopback_client|database)_required/);
  }
  assert.equal(calls,0);
});
test('new RAW UUID proposals are stable and cannot replace an existing UUID on readback',()=>{
  const frame=fixture(),plan=buildGenericPlayNineIntakePlanV1(frame);
  assert.equal(new Set(plan.candidates.map(c=>c.planned_candidate_id)).size,9);
  after(plan,frame);frame.intakes[2].id='00000000-0000-4000-a000-000000000001';
  assert.throws(()=>classifyGenericPlayNineIntakeStateV1(plan,frame),/uuid_proposal_changed/);
});
