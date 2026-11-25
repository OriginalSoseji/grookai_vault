import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateMcd22Plan,classifyMcd22State} from '../../backend/catalog/mcd22_rarity_policy_v1.mjs';
const dir=new URL('../../docs/audits/promo_era_search_review_20261118/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir));
const plan=JSON.parse(read('mcd22-execution-plan.json')),candidate=read('mcd22-frozen-candidates.json');
const policy=read('mcd22_candidate_policy.mjs'),preflight=read('mcd22-preflight-v2.json');
test('frozen package replays all exact source-backed candidates',()=>{
 const rows=validateMcd22Plan(plan,candidate,policy,preflight);
 assert.equal(rows.length,15);assert.equal(classifyMcd22State(rows,rows.map(x=>x.input.parent),false),'pending');
 const applied=rows.map(x=>({...x.input.parent,rarity:'Promo'}));
 assert.equal(classifyMcd22State(rows,applied,true),'already_applied');
 assert.throws(()=>classifyMcd22State(rows,applied,false),/PARTIAL_OR_MISSING_RECEIPT/);
 assert.throws(()=>classifyMcd22State(rows,applied.map((p,i)=>i? p:{...p,artist:'wrong'}),true),/PARENT_DRIFT/);
});
test('modified scope, source, policy and partial application fail closed',()=>{
 assert.throws(()=>validateMcd22Plan({...plan,rows:plan.rows.slice(1)},candidate,policy,preflight),/PACKAGE_HASH/);
 assert.throws(()=>validateMcd22Plan(plan,Buffer.concat([candidate,Buffer.from(' ')]),policy,preflight),/PACKAGE_HASH/);
 assert.throws(()=>validateMcd22Plan(plan,candidate,Buffer.concat([policy,Buffer.from(' ')]),preflight),/PACKAGE_HASH/);
 const rows=validateMcd22Plan(plan,candidate,policy,preflight),parents=rows.map((x,i)=>i?x.input.parent:{...x.input.parent,rarity:'Promo'});
 assert.throws(()=>classifyMcd22State(rows,parents,false),/PARTIAL_OR_MISSING_RECEIPT/);
});
