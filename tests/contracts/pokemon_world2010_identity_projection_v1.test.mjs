import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DECKS, qualifyWorld2010Relationships } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { projectWorld2010Identities, assertWorld2010IdentityProjection, stageWorld2010IdentityArtifacts,
  observeWorld2010IdentityHashes } from '../../backend/catalog/pokemon_world2010_identity_projection_v1.mjs';
const root = process.env.CLASSIC_PROOF_INPUT_ROOT;
const originalFiles = ['a68083defbd62001e17b4f60.txt', 'de97c9c06a995c647c679837.txt', 'ffedc48138afc4348196f2a7.txt', '3f076026c787eb5af1c8e0f7.txt'];
function inputs() {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'world2010-live-existing-identity-v5/snapshot.json')));
  const originals = new Map(DECKS.map((d,i) => [d.code, fs.readFileSync(new URL('../../docs/audits/image_truth_v1/cache_wh18a_world_championship_sources_v1/' + originalFiles[i], import.meta.url))]));
  const baseline = { cardsArtifact: { cards: [{key:'prior|1|card',set_key:'prior'}] },
    setsArtifact: { sets: [{ key:'prior' }] }, printingsArtifact: { printings: [{key:'prior|holo',set_key:'prior'}] } };
  return { snapshot, originals, baseline, review: qualifyWorld2010Relationships(snapshot, originals, '2026-10-03T02:00:00Z') };
}
test('whole92 anthology projection preserves109 parents and100 reviews with17 explicit holds', {skip:!root}, () => {
  const f=inputs(), before=JSON.stringify(f.snapshot), p=projectWorld2010Identities(f);
  assert.equal(JSON.stringify(f.snapshot),before); assert.deepEqual(projectWorld2010Identities(f),p);
  assert.equal(p.cards.length,92); assert.equal(p.tables.card_print_identity_source_evidence.length,184);
  assert.equal(p.held.length,17); assert.equal(p.human_signature,null); assert.equal(p.execution_authorized,false);
  assert.deepEqual(Object.keys(p.tables),['card_print_identity','card_print_identity_source_evidence']);
  for(const card of p.cards){const parent=f.snapshot.parents.find(x=>x.id===card.existing_parent.card_print_id);
    assert.equal(card.card_number,parent.number);assert.equal(card.printed_total,parent.printed_total);
    assert.equal(card.existing_parent.gv_id,parent.gv_id);assert.equal(card.finish_key,null);assert.equal(card.finish_authority,false);
  }
  assert.ok(p.sets.every(s=>s.printed_total===null&&!s.complete&&s.admitted_identity_count+s.held_identity_count===s.expected_identity_count));
  const staged=stageWorld2010IdentityArtifacts(p,f);
  assert.deepEqual(staged.printingsArtifact,f.baseline.printingsArtifact);
  assert.deepEqual(staged.cardsArtifact.cards.slice(0,-92),f.baseline.cardsArtifact.cards);
  assert.equal(staged.setsArtifact.sets.length,5);
});
test('same source card in different decks retains distinct parent identity and keys', {skip:!root},()=>{
  const p=projectWorld2010Identities(inputs());
  const repeated=p.cards.filter(c=>c.card_name==='Bebe\'s Search');
  assert.ok(repeated.length>1);assert.equal(new Set(repeated.map(c=>c.key)).size,repeated.length);
  assert.equal(new Set(repeated.map(c=>c.existing_parent.card_print_id)).size,repeated.length);
  assert.ok(p.tables.card_print_identity.every(r=>r.identity_payload.variant_key_current==='world_championship_deck_replica'&&r.identity_key_hash===null));
});
for(const [name,change] of [
  ['changed original denominator',f=>{f.snapshot.parents.find(p=>p.name==='Unown Q').printed_total=24;}],
  ['changed review parent',f=>{f.review.qualified[0].parent_id=f.review.qualified[1].parent_id;}],
  ['held card removed',f=>{f.review.held.pop();}],
  ['historical finish changed',f=>{f.snapshot.printings[0].finish_key='holo';}],
  ['existing deck in active Master',f=>{f.baseline.setsArtifact.sets.push({key:DECKS[0].code});}],
  ['Master fact key collision',f=>{const p=projectWorld2010Identities(f);f.baseline.cardsArtifact.cards.push({key:p.cards[0].key,set_key:'other'});}],
]) test(name+' rejects the entire projection',{skip:!root},()=>{const f=inputs();change(f);assert.throws(()=>projectWorld2010Identities(f));});
test('replay rejects payload, UUID, approval and preserved-finish tampering',{skip:!root},()=>{
  const f=inputs(),p=projectWorld2010Identities(f);
  for(const change of [q=>{q.tables.card_print_identity[0].card_print_id=q.tables.card_print_identity[1].card_print_id;},
    q=>{q.tables.card_print_identity[0].identity_payload.printed_total=60;},q=>{q.execution_authorized=true;},
    q=>{q.human_signature='invented';},q=>{q.preservation.printings='0'.repeat(64);}]){
    const q=structuredClone(p);change(q);assert.throws(()=>assertWorld2010IdentityProjection(q,f),/replay_mismatch/);
  }
});
test('SQL observer refuses a writable transaction before any hash or collision query',{skip:!root},async()=>{
  const f=inputs(),p=projectWorld2010Identities(f),calls=[];
  const db={query:async sql=>{calls.push(sql);return{rows:[{transaction_read_only:'off'}]};}};
  await assert.rejects(()=>observeWorld2010IdentityHashes(db,p,f),/readonly_transaction_required/);
  assert.deepEqual(calls,['show transaction_read_only']);
});
