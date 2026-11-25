import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {EFFECTS,VERSION,assertStampedClassificationAuthorityV1,assertStampedClassificationDatabaseV1} from '../../backend/warehouse/stamped_child_classification_v1.mjs';

function fixture(mode='rollback'){
 const codeFingerprint='a'.repeat(64),plan={fingerprint:'b'.repeat(64),codeFingerprint,actor:{userId:randomUUID()},proposedRuns:['rollback','apply','replay'].map(mode=>({mode,runId:randomUUID()}))};
 const now=new Date().toISOString(),start=new Date(Date.now()-1000).toISOString(),end=new Date(Date.now()+60000).toISOString();
 const body={version:VERSION,status:'explicit_owner_approval',projectRef:'ycdxbpibncqcchqiihfz',planFingerprint:plan.fingerprint,codeFingerprint,scope:EFFECTS,runs:plan.proposedRuns,actorFingerprint:hash(plan.actor),approvalRecordRef:'private-owner-decision.json',approvalText:plan.fingerprint+' '+codeFingerprint,approvedAt:start,expiresAt:end};
 return {plan,authority:{...body,fingerprint:hash(body)},codeFingerprint,runId:plan.proposedRuns.find(x=>x.mode===mode).runId,mode,now,environment:'production'};
}
const reseal=x=>{const {fingerprint,...body}=x;return {...body,fingerprint:hash(body)};};
test('exact three-attempt classification decision validates',()=>assert.doesNotThrow(()=>assertStampedClassificationAuthorityV1(fixture())));
for(const [name,change] of [
 ['missing authority',x=>{x.authority=null;}],
 ['widened image scope',x=>{x.authority.scope={...EFFECTS,imageWrites:1};x.authority=reseal(x.authority);}],
 ['wrong producer',x=>{x.codeFingerprint='c'.repeat(64);}],
 ['different plan',x=>{x.authority.planFingerprint='c'.repeat(64);x.authority=reseal(x.authority);}],
 ['unnamed attempt',x=>{x.runId=randomUUID();}],
 ['expired decision',x=>{x.now=new Date(Date.now()+120000).toISOString();}],
 ['extended approval window',x=>{x.authority.expiresAt=new Date(Date.now()+90000000).toISOString();x.authority=reseal(x.authority);}],
 ['changed actor',x=>{x.plan.actor.userId=randomUUID();}],
 ['missing rollback',x=>{x.mode='apply';x.runId=x.plan.proposedRuns[1].runId;}],
])test('classification stops on '+name,()=>{const x=fixture();change(x);assert.throws(()=>assertStampedClassificationAuthorityV1(x));});
test('apply requires a matching production rollback under one hour old',()=>{
 const x=fixture('apply');x.rollbackReceipt={pass:true,rollbackProven:true,mode:'rollback',environment:'production',codeFingerprint:x.codeFingerprint,planFingerprint:x.plan.fingerprint,updates:99,inserts:99,runId:x.plan.proposedRuns[0].runId,finishedAt:x.now};
 assert.doesNotThrow(()=>assertStampedClassificationAuthorityV1(x));
 x.rollbackReceipt.finishedAt=new Date(Date.now()-3601000).toISOString();assert.throws(()=>assertStampedClassificationAuthorityV1(x));
});
test('replay cannot treat an uncertain apply as committed success',()=>{
 const x=fixture('replay');x.rollbackReceipt={pass:true,rollbackProven:true,mode:'rollback',environment:'production',codeFingerprint:x.codeFingerprint,planFingerprint:x.plan.fingerprint,updates:99,inserts:99,runId:x.plan.proposedRuns[0].runId,finishedAt:x.now};
 x.committedReceipt={pass:true,committed:true,commitUncertain:true,environment:'production',codeFingerprint:x.codeFingerprint,planFingerprint:x.plan.fingerprint,updates:99,inserts:99,runId:x.plan.proposedRuns[1].runId};
 assert.throws(()=>assertStampedClassificationAuthorityV1(x));x.committedReceipt.commitUncertain=false;assert.doesNotThrow(()=>assertStampedClassificationAuthorityV1(x));
});
for(const p of [
 {host:'127.0.0.1',port:5432,database:'postgres'},
 {host:'127.0.0.1',port:5432,database:'stamped_child_image_intake_33_qualification_r4'},
 {host:'aws-1-us-east-2.pooler.supabase.com',port:5432,database:'postgres'},
])test('controller rejects wrong owned-local database '+p.database+' '+p.host,()=>assert.throws(()=>assertStampedClassificationDatabaseV1({connectionParameters:p},'owned_local')));
test('operator CLI disables production writes before missing plan/source can be reached',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-classification-disabled-')),config=path.join(dir,'private.json');
 fs.writeFileSync(config,JSON.stringify({mode:'apply'}));const env={...process.env};
 for(const key of Object.keys(env))if(/SUPABASE|TOKEN|SECRET|CLASSIFICATION|PREFLIGHT_ACK/.test(key))delete env[key];
 const result=spawnSync(process.execPath,['backend/warehouse/run_stamped_child_classification_v1.mjs','--config',config],{cwd:process.cwd(),env,encoding:'utf8',windowsHide:true});
 assert.equal(result.status,1);assert.match(result.stderr,/Classification writes are disabled/);
});
