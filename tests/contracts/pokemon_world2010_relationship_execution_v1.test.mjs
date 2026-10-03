import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildWorld2010RelationshipExecution,assertWorld2010RelationshipExecution,applyWorld2010RelationshipsLocal,assertWorld2010RelationshipPending} from '../../backend/catalog/pokemon_world2010_relationship_execution_v1.mjs';
import {loadSubsetOriginals} from '../../scripts/audits/pokemon_world2010_subset_ingress_v1.mjs';
import {stageWorld2010Relationships} from '../../scripts/audits/pokemon_world2010_relationship_execution_v1.mjs';
const root=process.env.CLASSIC_PROOF_INPUT_ROOT;
const plan=()=>JSON.parse(fs.readFileSync(root+'/world2010-relationship-execution-plan-v1/plan.json'));
test('relationship stager rejects apply unknown and duplicate switches before output',()=>{
  assert.throws(()=>stageWorld2010Relationships(['--apply=true']),/unique_offline/);
  assert.throws(()=>stageWorld2010Relationships(['--out-dir=a','--out-dir=b']),/unique_offline/);
  assert.throws(()=>stageWorld2010Relationships([]),/seven_explicit/);
});
test('whole92 package preserves parent UUIDs raw provenance all17holds and admits no finish',{skip:!root},()=>{
  const p=plan();assertWorld2010RelationshipExecution(p,loadSubsetOriginals());
  assert.equal(p.tables.card_print_identity.length,92);assert.equal(p.tables.card_print_identity_source_evidence.length,184);assert.equal(p.tables.external_mappings.length,92);
  assert.equal(p.held.length,17);assert.equal(p.human_signature,null);assert.equal(p.production_execution_authorized,false);
  assert.ok(p.tables.external_mappings.every(m=>m.source==='tcgcsv'&&m.meta.finish_authority===false));
  assert.deepEqual(new Set(p.tables.external_mappings.map(m=>m.card_print_id)),new Set(p.input.projection_inputs.review.qualified.map(q=>q.parent_id)));
});
for(const [label,mutate,reason] of [
  ['missing intent',i=>i.intent_id='',/fresh_execution_intent/],
  ['missing active identity',i=>i.active_cards.pop(),/whole92/],
  ['altered active evidence',i=>i.active_cards[0].source_count=1,/active_master_drift/],
  ['duplicate active identity',i=>i.active_cards[1]=i.active_cards[0],/active_master_drift/],
  ['missing SQL identity hash',i=>i.sql_hashes.pop(),/92/],
  ['duplicate SQL hash',i=>i.sql_hashes[1].hash=i.sql_hashes[0].hash,/sql_hash_collision/],
  ['invented normalization',i=>i.sql_hashes[0].normalized='wrong',/sql_normalization_drift/],
  ['unqualified original denominator',i=>i.projection_inputs.snapshot.parents[0].printed_total='999',/exact92_scope_required/],
])test(label+' rejects entire package',{skip:!root},()=>{const p=plan();mutate(p.input);assert.throws(()=>buildWorld2010RelationshipExecution(p.input,loadSubsetOriginals()),reason);});
for(const [label,mutate]of [
  ['numeric relabeled mapping',p=>{p.tables.external_mappings[0].source='tcgplayer';p.tables.external_mappings[0].external_id='479990';}],
  ['human signature',p=>p.human_signature='invented'],
  ['removed hold',p=>p.held.pop()],
  ['production authority',p=>p.production_execution_authorized=true],
])test(label+' cannot become execution authority',{skip:!root},()=>{const p=plan();mutate(p);assert.throws(()=>assertWorld2010RelationshipExecution(p,loadSubsetOriginals()),/relationship_package_replay_drift/);});
for(const [name,address,error]of [['postgres','127.0.0.1',/isolated_relationship_lab/],['grookai_world2010_subset_canonical_fake','192.0.2.1',/loopback_relationship_lab/]])
  test('local guard rejects '+name+' at '+address+' before locks/writes',{skip:!root},async()=>{let calls=0;await assert.rejects(()=>applyWorld2010RelationshipsLocal({query:async()=>{calls++;return{rows:[{name,address}]};}},plan(),loadSubsetOriginals()),error);assert.equal(calls,1);});
test('pending equality retains both journal IDs and bigint mapping IDs',()=>{
  const p={status:'verified',ledger_id:'9007199254740993',ingress:{ledger_id:'9007199254740995'},mappings:[{id:'9007199254740997'}]};
  assertWorld2010RelationshipPending(p,structuredClone(p));
  for(const mutate of [r=>r.ledger_id='9007199254740992',r=>r.ingress.ledger_id='9007199254740994',r=>r.mappings[0].id='9007199254740996']){const r=structuredClone(p);mutate(r);assert.throws(()=>assertWorld2010RelationshipPending(p,r),/pending_relationship_identity_drift/);}
});
