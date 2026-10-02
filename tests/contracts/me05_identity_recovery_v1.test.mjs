import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateMe05RecoveryPlan,assertMe05RecoveryReadback,digest} from '../../backend/catalog/me05_identity_recovery_v1.mjs';
const plan=JSON.parse(fs.readFileSync(new URL('../../docs/audits/me05_identity_recovery_20261002/plan.json',import.meta.url)));
const facts=plan.evidence.map(e=>e.evidence_payload.master_fact).sort((a,b)=>a.key.localeCompare(b.key));
// Preserve actual Master order, which the review fingerprint binds.
const master=JSON.parse(fs.readFileSync(new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_cards_v1.json',import.meta.url))).cards.filter(c=>c.set_key==='me05');
const rehash=p=>{const {fingerprint,...body}=p;return {...body,fingerprint:digest(body)};};
test('reviewed complete set preserves 120 parents, 199 printings and original mappings',()=>{
  assert.equal(facts.length,120);validateMe05RecoveryPlan(plan,master);assertMe05RecoveryReadback(plan,plan.before);
});
for(const [label,mutate] of [
  ['missing parent',p=>p.before.parents.pop()],['existing identity',p=>p.before.identities.push(p.identities[0])],
  ['wrong language evidence',p=>p.before.set.source.new_set_release_ingestion_v1.target_key='abyss_eye_jp'],
  ['variant',p=>p.before.parents[0].variant_key='gamestop_stamp'],['duplicate identity',p=>p.identities[1]=p.identities[0]],
  ['unverified printing',p=>p.before.reviews[0].review_status='unverified'],['inactive source link',p=>p.before.mappings[0].active=false],
  ['evidence substitution',p=>p.evidence[0].evidence_payload.master_fact.card_name='Wrong'],
])test(`self-consistent package rejects ${label}`,()=>{const p=structuredClone(plan);mutate(p);assert.throws(()=>validateMe05RecoveryPlan(rehash(p),master));});
test('post-write proof requires only the declared changes and every unchanged image, number and child',()=>{
  const after=structuredClone(plan.before);after.set.identity_domain_default='pokemon_eng_standard';after.parents.forEach(p=>p.identity_domain='pokemon_eng_standard');
  after.identities=plan.identities.map(p=>({...p,created_at:'now',updated_at:'now'}));after.evidence=plan.evidence.map(p=>({...p,created_at:'now',updated_at:'now'}));
  assertMe05RecoveryReadback(plan,after,{after:true});
  for(const mutate of [a=>a.parents[0].gv_id='new-id',a=>a.parents[0].image_url='wrong',a=>a.printings.pop(),a=>a.mappings.pop(),a=>a.identities.pop(),a=>a.evidence.pop()]){
    const bad=structuredClone(after);mutate(bad);assert.throws(()=>assertMe05RecoveryReadback(plan,bad,{after:true}));
  }
  assert.throws(()=>assertMe05RecoveryReadback(plan,after));
});
