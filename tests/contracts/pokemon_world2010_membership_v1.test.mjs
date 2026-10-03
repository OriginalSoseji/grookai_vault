import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { projectionHash } from '../../backend/catalog/pokemon_world2010_identity_projection_v1.mjs';
import { assertWorld2010MasterMembership } from '../../backend/catalog/pokemon_world2010_membership_v1.mjs';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('../../docs/audits/english_master_index_completion_v1/world2010_membership_20261002/candidate.json', import.meta.url)));
const inputs = () => ({ ...structuredClone(fixture), availabilityArtifact: {}, manualReviewArtifact: {}, conflictsArtifact: {}, finishBlockerClosure: {} });
const rehash = p => { const { fingerprint, ...body } = p; p.fingerprint = projectionHash(body); };
const futureFinishes = f => { f.printingsArtifact.printings = f.cardsArtifact.cards.map(c => ({ ...c,
  key: c.key + '|normal', fact_type: 'printing_finish', finish_key: 'normal', source_kinds: ['collector_reference','human_fixture'] })); };

test('whole109 membership retains every held source ID and reason across all outputs', () => {
  const f = inputs(), result = buildArtifacts(f), rows = result.setMatrix.sets;
  assert.equal(rows.reduce((n,r) => n+r.card_identity.total_working_facts,0),92);
  assert.equal(rows.reduce((n,r) => n+r.card_identity.expected_membership,0),109);
  const expected = f.setsArtifact.sets.flatMap(s=>s.anthology_membership.held).sort((a,b)=>a.product_id.localeCompare(b.product_id));
  const check = rows => assert.deepEqual(rows.sort((a,b)=>a.product_id.localeCompare(b.product_id)),expected);
  check(result.sourceGapQueue.queue.filter(q=>q.lane==='anthology_identity_membership_review').flatMap(q=>q.reviews));
  check(result.sourceWorklist.worklist.flatMap(w=>w.held_identity_reviews));
  check(result.masterAdmissibleExport.anthology_memberships.flatMap(p=>p.held));
  check(rows.map(setManifestRow).flatMap(r=>r.anthology_membership.held));
  assert.equal(result.sourceWorklist.worklist.reduce((n,w)=>n+w.card_identity_gap_count,0),17);
  assert.ok(rows.every(r=>r.completion.status==='anthology_identity_membership_incomplete' && !r.completion.master_index_complete));
  assert.ok(rows.every(r=>r.completion.card_identity_master_admissible_percent<100));
  assert.ok(rows.map(setManifestRow).every(r=>r.shard_refs===null && r.cards.gap_count>0));
});

test('future exact finishes cannot erase membership holds or grant publication', () => {
  const f=inputs(); futureFinishes(f);
  const r=buildArtifacts(f);
  assert.equal(r.setMatrix.sets.reduce((n,s)=>n+s.printings.master_admissible,0),92);
  assert.ok(r.setMatrix.sets.every(s=>s.printings.identities_without_printing_evidence===0));
  assert.equal(r.sourceGapQueue.queue.filter(q=>q.lane==='anthology_identity_membership_review').reduce((n,q)=>n+q.gap_count,0),17);
  assert.ok(r.setMatrix.sets.map(setManifestRow).every(s=>s.shard_refs===null));
});

test('admissible identity export preserves original denominators, UUIDs and GV-IDs', () => {
  const f=inputs(), exported=buildArtifacts(f).masterAdmissibleExport.cards;
  for (const c of f.cardsArtifact.cards) {
    const e=exported.find(e=>e.key===c.key);
    assert.deepEqual(e.existing_parent,c.existing_parent);assert.equal(e.printed_total,c.printed_total);
  }
  assert.ok(f.setsArtifact.sets.every(s=>s.printed_total===null));
});

for (const [name, mutate] of [
  ['removed profile',f=>{delete f.setsArtifact.sets[0].anthology_membership;}],
  ['removed configuration with retained cards',f=>{f.setsArtifact.sets.shift();}],
  ['duplicated deck',f=>{f.setsArtifact.sets.push(structuredClone(f.setsArtifact.sets[0]));}],
  ['deleted admitted member',f=>{f.cardsArtifact.cards.pop();}],
  ['duplicated admitted member',f=>{f.cardsArtifact.cards.push(structuredClone(f.cardsArtifact.cards[0]));}],
  ['changed original denominator',f=>{f.cardsArtifact.cards[0].printed_total=60;}],
  ['changed source provenance',f=>{f.cardsArtifact.cards[0].source_evidence[1].source_key='tcgplayer';}],
  ['membership used as denominator',f=>{f.setsArtifact.sets[0].printed_total=32;}],
  ['changed hold reason with recomputed self hash',f=>{const p=f.setsArtifact.sets[0].anthology_membership;p.held[0].reasons=['resolved'];rehash(p);}],
  ['removed hold with recomputed counts and hash',f=>{const s=f.setsArtifact.sets[0],p=s.anthology_membership;p.held.pop();p.held_identity_count--;p.expected_identity_count--;s.held_identity_count--;s.expected_identity_count--;rehash(p);}],
  ['unknown printing identity',f=>{futureFinishes(f);f.printingsArtifact.printings[0].card_name='Invented';}],
]) test(name+' fails the whole candidate',()=>{const f=inputs();mutate(f);assert.throws(()=>buildArtifacts(f));});

test('publication independently rejects stripped or rewritten profiles and forged completeness',()=>{
  const rows=buildArtifacts(inputs()).setMatrix.sets;
  for(const row of rows){
    const fake=structuredClone(row);fake.completion.status='complete_master_index_set';fake.completion.master_index_complete=true;
    assert.equal(setManifestRow(fake).shard_refs,null);
    delete fake.anthology_membership;assert.throws(()=>setManifestRow(fake),/profile_required/);
  }
});

test('profile stage and ordinary completion preserve independent unrelated set output',()=>{
  const f=inputs(),prior={key:'synthetic-unrelated',set_name:'Unrelated'};
  const baseline={setsArtifact:{sets:[prior]},cardsArtifact:{cards:[]},printingsArtifact:{printings:[]},availabilityArtifact:{},manualReviewArtifact:{},conflictsArtifact:{},finishBlockerClosure:{}};
  f.setsArtifact.sets.push(prior);
  assert.deepEqual(buildArtifacts(f).setMatrix.sets.find(s=>s.set_key===prior.key),buildArtifacts(baseline).setMatrix.sets[0]);
  assertWorld2010MasterMembership(f);
});
