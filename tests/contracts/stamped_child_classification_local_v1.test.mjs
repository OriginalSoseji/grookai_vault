import test from 'node:test';
import assert from 'node:assert/strict';
import {applyClassificationWithinTransactionV1} from '../../backend/warehouse/classification_worker_v1.mjs';
import {assertStampedClassificationOwnedLocalV1} from '../../backend/warehouse/stamped_child_classification_local_v1.mjs';

for(const [name,parameters] of [
  ['production',{host:'aws-1-us-east-2.pooler.supabase.com',port:5432,database:'postgres'}],
  ['old retained lab',{host:'127.0.0.1',port:5432,database:'stamped_child_image_intake_33_qualification_r4'}],
  ['unowned local database',{host:'127.0.0.1',port:5432,database:'postgres'}],
  ['wrong port',{host:'127.0.0.1',port:5433,database:'stamped_child_classification_33_qualification_r1'}],
])test(`local classifier rejects ${name} before SQL`,async()=>{
  let queries=0;
  await assert.rejects(assertStampedClassificationOwnedLocalV1({connectionParameters:parameters,async query(){queries++;throw Error('Must not query');}}));
  assert.equal(queries,0);
});

test('local classifier verifies the actual database rather than trusting connection options',async()=>{
  await assert.rejects(assertStampedClassificationOwnedLocalV1({connectionParameters:{host:'127.0.0.1',port:5432,database:'stamped_child_classification_33_qualification_r1'},async query(){return {rows:[{name:'postgres',version:'17.6'}]};}}));
});

test('shared classification writer leaves transaction ownership with its caller',async()=>{
  let state='RAW';const calls=[];
  const client={async query(sql,args=[]){
    const q=sql.replace(/\s+/g,' ').trim();calls.push(q);
    if(q.startsWith('select id, state'))return {rows:[{id:'33333333-3333-4333-8333-333333333333',state}]};
    if(q.startsWith('select max(created_at)'))return {rows:[{latest_evidence_at:null}]};
    if(q.startsWith('update public.canon_warehouse_candidates')){state=args[1];return {rows:[],rowCount:1};}
    if(q.startsWith('insert into public.canon_warehouse_candidate_events'))return {rows:[],rowCount:1};
    if(q.startsWith('select state'))return {rows:[{state}]};
    throw Error('Unexpected query: '+q);
  }};
  const build={candidate:{id:'33333333-3333-4333-8333-333333333333'},latestEvidenceAt:null,identityAuditPackage:{identity_audit_status:'PRINTING_ONLY',reason_code:'EXISTING_CHILD_PRINTING'},classificationPackage:{identity_resolution:'ATTACH_PRINTING'},writePlan:[{type:'candidate_update',state:'NORMALIZED'},{type:'event',eventType:'NORMALIZATION_PARTIAL',action:'NORMALIZE',previousState:'RAW',nextState:'NORMALIZED',metadata:{}},{type:'candidate_update',state:'CLASSIFIED'},{type:'event',eventType:'CLASSIFICATION_COMPLETE',action:'CLASSIFY',previousState:'NORMALIZED',nextState:'CLASSIFIED',metadata:{}},{type:'candidate_update',state:'REVIEW_READY'},{type:'event',eventType:'WAREHOUSE_REVIEW_READY',action:'QUEUE_REVIEW',previousState:'CLASSIFIED',nextState:'REVIEW_READY',metadata:{}}]};
  await applyClassificationWithinTransactionV1(client,build);
  assert.equal(state,'REVIEW_READY');assert.equal(calls.filter(x=>x.startsWith('update ')).length,3);assert.equal(calls.filter(x=>x.startsWith('insert ')).length,3);
  assert.equal(calls.some(x=>/^(begin|commit|rollback)/i.test(x)),false);
});
