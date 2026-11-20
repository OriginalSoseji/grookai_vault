import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateFamilyContainment, supersededQueue } from '../../backend/catalog/jpn_xy4_family_containment_policy_v1.mjs';
import { assertFamilyState, runFamilyContainment } from '../../backend/catalog/jpn_xy4_family_containment_v1.mjs';
import { getContractScopeV1 } from '../../backend/lib/contracts/contract_scope_v1.mjs';
import { CANON_WRITE_EXECUTION_POLICIES_V1 } from '../../backend/lib/contracts/execute_canon_write_v1.mjs';
import { POST_WRITE_PROOF_MODES_V1 } from '../../backend/lib/contracts/run_post_write_proofs_v1.mjs';

const dir='docs/audits/jpn_xy4_family_containment_20261120/';
const read=(name)=>fs.readFileSync(dir+name);
const plan=validateFamilyContainment(read);
const stateFor=(rows)=>({
  parents:rows.map(r=>r.parent_before), identities:rows.flatMap(r=>r.identities_before),
  links:rows.flatMap(r=>r.links_before), evidence:rows.flatMap(r=>r.evidence_before),
  species:[...new Map(rows.map(r=>[r.species_before.id,r.species_before])).values()],
  queues:rows.flatMap(r=>r.queues_before),
});

test('frozen scope is 62 distinct source-verified approvals in seven bounded chunks',()=>{
  assert.equal(plan.rows.length,62);
  assert.deepEqual(Array.from({length:7},(_,i)=>plan.rows.slice(i*10,i*10+10).length),[10,10,10,10,10,10,2]);
  assert.equal(new Set(plan.rows.map(r=>r.target_queue_before.id)).size,62);
});
test('source and plan tampering fail before admission',()=>{
  assert.throws(()=>validateFamilyContainment(n=>n==='family-plan.json'?Buffer.concat([read(n),Buffer.from(' ')]):read(n)));
  const victim=`official-captures/${plan.rows[0].source.official_id}.html`;
  assert.throws(()=>validateFamilyContainment(n=>n===victim?Buffer.concat([read(n),Buffer.from(' ')]):read(n)));
});
test('full parent, identity, link, evidence and queue preimages are required',()=>{
  const rows=plan.rows.slice(0,10),pending=stateFor(rows);assert.equal(assertFamilyState(rows,pending,false),true);
  for(const [key,field,value] of [['parents','name','different'],['identities','source_name_raw','different'],['links','active',false],['evidence','active',false],['queues','family_link_promotion_allowed',false]]){
    const changed=structuredClone(pending);changed[key][0][field]=value;assert.throws(()=>assertFamilyState(rows,changed,false),key);
  }
  const applied=structuredClone(pending),byId=new Map(rows.map(r=>[r.target_queue_before.id,r]));
  applied.queues=applied.queues.map(q=>byId.has(q.id)?{...supersededQueue(byId.get(q.id)),updated_at:'later'}:q);
  assert.equal(assertFamilyState(rows,applied,true),true);
  applied.queues.find(q=>byId.has(q.id)).review_status='approved_for_family_link_promotion';assert.throws(()=>assertFamilyState(rows,applied,true));
});
test('mutating modes require the execution marker and an exact chunk',async()=>{
  for(const mode of ['rollback-proof','apply'])await assert.rejects(runFamilyContainment({mode,chunk:0}),/PROCEED_REQUIRED/);
  await assert.rejects(runFamilyContainment({mode:'inspect',chunk:7}),/XY4_CHUNK_INVALID/);
  await assert.rejects(runFamilyContainment({mode:'apply',approval:'PROCEED',chunk:7}),/XY4_CHUNK_INVALID/);
});
test('candidate scope is registered as an authoritative canon-affecting path',()=>{
  const name='catalog_jpn_xy4_family_containment_v1';
  assert.equal(getContractScopeV1(name).canon_affecting,true);
  assert.equal(CANON_WRITE_EXECUTION_POLICIES_V1[name].transaction_mode,'transactional_authoritative');
  assert.equal(POST_WRITE_PROOF_MODES_V1[name],'transactional_authoritative');
});
