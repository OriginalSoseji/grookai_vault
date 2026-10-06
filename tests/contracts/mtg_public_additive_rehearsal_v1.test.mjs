import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildMtgCanonicalCandidateV1 } from '../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs';
import { buildMtgCanaryPayloadV1 } from '../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs';
import { buildMtgPublicAdditivePlanV1, assertMtgPublicAdditivePlanV1, mtgDigestV1 } from '../../scripts/audits/mtg_public_additive_plan_v1.mjs';
import { assertMtgRehearsalTargetV1 } from '../../scripts/audits/mtg_public_additive_rehearsal_v1.mjs';
import { MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1 } from '../../scripts/audits/mtg_canonical_catalog_set_promotion_contract_v1.mjs';

function fixture({ product = null } = {}) {
  const c = buildMtgCanonicalCandidateV1({id:'572feb8c-6976-40a8-8a34-b4db836cca56',oracle_id:'bdcb7aed-3595-4c7e-b9da-543e92de919a',
    name:'Reviewed print',lang:'en',games:['paper'],set_id:'d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea',set:'fra',set_name:'Reality Fracture',
    set_type:'expansion',released_at:'2026-10-02',collector_number:'101b',finishes:['nonfoil','foil'],tcgplayer_id:product});
  const draft = buildMtgCanaryPayloadV1({ candidates:[c],warehouseProducts:new Map(),sourceBulkSha256:'a'.repeat(64),
    stagingMigrationSha256:'b'.repeat(64),foundationMigrationSha256:'c'.repeat(64),repository:{commit_sha:'d'.repeat(40),branch:'test'} },
    { plan_version:'MTG_PUBLIC_ADDITIVE_REVIEW_DRAFT_V1',quality_flag:'mtg_catalog_review_draft' });
  const truth={version:'MTG_REALITY_FRACTURE_RELEASED_TRUTH_V1',production_authority:false,as_of:'2026-10-06',source_bulk_sha256:'a'.repeat(64),
    held_future_print_ids:[],sets:[{code:'fra',payload_fingerprint:draft.writer_payload_fingerprint,rows_sha256:mtgDigestV1(draft.rows),
      row_counts:Object.fromEntries(Object.entries(draft.rows).map(([k,v])=>[k,v.length])),finish_counts:{foil:1,normal:1},
      protected_printing_facts_sha256:mtgDigestV1([c.card.source_print_id+':foil',c.card.source_print_id+':normal'])}]};
  return {draft,truth};
}
const rehash = draft => { const {writer_payload_fingerprint,...core}=draft;draft.writer_payload_fingerprint=createHash('sha256').update(JSON.stringify(core)).digest('hex'); };

test('reviewed unpriced variant retains physical finishes without invented mappings',()=>{
  const {draft,truth}=fixture(),plan=buildMtgPublicAdditivePlanV1([draft],truth);
  assert.equal(plan.rows.card_printings.length,2);assert.equal(plan.rows.external_printing_mappings.length,0);
  assert.equal(plan.contract.required_release_status,'public');assert.equal(plan.contract.rollback_only,true);
  assert.equal(plan.contract.production_execution,false);assertMtgPublicAdditivePlanV1(plan);
  assert.equal(MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1.required_release_status,'hidden');
});
test('changed payload fails even after its own fingerprint is recalculated',()=>{
  const {draft,truth}=fixture();draft.rows.card_prints[0].name='Unreviewed';rehash(draft);
  assert.throws(()=>buildMtgPublicAdditivePlanV1([draft],truth),/Frozen payload changed/);
});
test('missing or duplicate set cannot masquerade as reviewed coverage',()=>{
  const {draft,truth}=fixture();assert.throws(()=>buildMtgPublicAdditivePlanV1([],truth));
  assert.throws(()=>buildMtgPublicAdditivePlanV1([draft,draft],{...truth,sets:[...truth.sets,...truth.sets]}));
});
test('held future UUID blocks even an otherwise intact frozen payload',()=>{
  const {draft,truth}=fixture();truth.held_future_print_ids=[draft.rows.card_prints[0].external_ids.scryfall];
  assert.throws(()=>buildMtgPublicAdditivePlanV1([draft],truth),/Future card/);
});
test('finish count and protected-fact changes both fail',()=>{
  for(const mutate of [t=>t.sets[0].finish_counts.normal=2,t=>t.sets[0].protected_printing_facts_sha256='0'.repeat(64)]){
    const {draft,truth}=fixture();mutate(truth);assert.throws(()=>buildMtgPublicAdditivePlanV1([draft],truth));
  }
});
test('source bulk mismatch and premature set release fail',()=>{
  const {draft,truth}=fixture();assert.throws(()=>buildMtgPublicAdditivePlanV1([draft],{...truth,source_bulk_sha256:'0'.repeat(64)}));
  assert.throws(()=>buildMtgPublicAdditivePlanV1([draft],{...truth,as_of:'2026-10-01'}));
});
test('post-plan mutation and widening commit boundary are rejected',()=>{
  const {draft,truth}=fixture(),plan=buildMtgPublicAdditivePlanV1([draft],truth);plan.rows.card_prints[0].name='Drift';
  assert.throws(()=>assertMtgPublicAdditivePlanV1(plan),/Plan mutated/);
  const another=structuredClone(buildMtgPublicAdditivePlanV1([draft],truth));another.contract.production_execution=true;
  const {plan_sha256,...core}=another;another.plan_sha256=mtgDigestV1(core);assert.throws(()=>assertMtgPublicAdditivePlanV1(another));
});
test('remote endpoints and wrong loopback port rejected before first query',async()=>{
  for(const parameters of [{host:'aws-1-us-east-2.pooler.supabase.com',port:5432},{host:'127.0.0.1',port:54330}]){
    let queried=false;await assert.rejects(()=>assertMtgRehearsalTargetV1({connectionParameters:{...parameters,database:'postgres',user:'postgres'},query:async()=>{queried=true;}}));assert.equal(queried,false);
  }
});
test('wrong server subnet, schema or transaction isolation rejects local target',async()=>{
  for(const override of [{address:'10.0.0.1'},{migrations:427},{workers:'8'},{isolation:'read committed'}]){
    const client={connectionParameters:{host:'127.0.0.1',port:55000,user:'postgres',database:'postgres'},query:async()=>({rows:[{address:'10.248.37.2',migrations:428,workers:'0',isolation:'serializable',...override}]})};
    await assert.rejects(()=>assertMtgRehearsalTargetV1(client));
  }
});
