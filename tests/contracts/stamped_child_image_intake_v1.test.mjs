import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {assertStampedIntakeDatabaseV1,assertStampedIntakeApprovalEnvelopeV1} from '../../backend/warehouse/stamped_child_image_intake_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {stampedChildImageManifestV1 as manifest, stampedChildImageIntakeKeysV1, assertStampedImageOriginalV1,
  readStampedImageSourceContextV1, assertStampedImageActorV1, assertStampedChildImageTargetsV1} from '../../backend/warehouse/stamped_child_image_intake_v1.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const actor = () => ({userId:'11111111-1111-4111-8111-111111111111',authUserId:'11111111-1111-4111-8111-111111111111',role:'founder',isActive:true,entitlementFingerprint:'a'.repeat(64)});
function before() {
  return {parents:manifest.targets.map(t => ({id:t.parentId,gv_id:t.parentGvId,name:t.printedName,number:t.printedNumber,number_plain:t.numberPlain,set_code:t.setCode,variant_key:t.variantKey})),
    children:manifest.targets.map(t => ({id:t.printingId,card_print_id:t.parentId,printing_gv_id:t.printingGvId,finish_key:t.finishKey,is_provisional:false,image_source:null,image_path:null,image_url:null,image_alt_url:null})),
    identities:manifest.targets.map(t => ({id:stampedChildImageIntakeKeysV1(t).candidateId,card_print_id:t.parentId,is_active:true,identity_domain:'pokemon_eng_standard'})),
    existingCandidates:[],existingRawReceipts:[],existingEvidence:[],existingEvents:[],existingObjects:[],bucket:{id:'user-card-images',public:false}};
}

test('the exact33 cohort retains distinct objects and explicit page/API provenance', () => {
  assert.equal(manifest.targets.length,33);
  assert.equal(new Set(manifest.targets.map(t=>t.originalSha256)).size,33);
  assert.equal(manifest.targets.filter(t=>t.sourceContext.kind==='source_page').length,10);
  assert.equal(manifest.targets.filter(t=>t.sourceContext.kind==='source_api').length,23);
  assert.ok(Object.isFrozen(manifest.targets[0].sourceContext));
});
test('source keys are stable and cannot share receipt, candidate, evidence, event or object identities', () => {
  const keys = manifest.targets.map(stampedChildImageIntakeKeysV1);
  for (const key of ['candidateId','evidenceId','eventId','rawId','storagePath']) assert.equal(new Set(keys.map(k=>k[key])).size,33,key);
  assert.equal(new Set(keys.flatMap(k=>[k.candidateId,k.evidenceId,k.eventId])).size,99);
  assert.deepEqual(keys,manifest.targets.map(t=>stampedChildImageIntakeKeysV1(copy(t))));
  for (const row of keys) {assert.ok(BigInt(row.rawId)<0n);assert.ok(BigInt(row.rawId)>=-(2n**63n));assert.ok(row.storagePath.endsWith('.jpg'));}
});
test('a source target cannot be swapped while retaining the cohort count', () => {
  const target = copy(manifest.targets[0]);target.parentId=manifest.targets[1].parentId;
  assert.throws(()=>stampedChildImageIntakeKeysV1(target));
});
test('a substituted provider image URL cannot acquire an approved object key', () => {
  const target = {...manifest.targets[0],sourceImage:'https://example.com/similar-card.jpg'};
  assert.throws(()=>stampedChildImageIntakeKeysV1(target));
});
test('a verified founder metadata record is accepted without manufacturing approval', () => {
  const value=actor();assert.equal(assertStampedImageActorV1(value),true);assert.equal(value.founderApproved,undefined);
});
for(const [label,change] of [
  ['no authenticated account',a=>{a.authUserId=null;}],['different authenticated account',a=>{a.authUserId='22222222-2222-4222-8222-222222222222';}],
  ['inactive entitlement',a=>{a.isActive=false;}],['collector entitlement',a=>{a.role='collector';}],['unbound entitlement',a=>{delete a.entitlementFingerprint;}],
]) test('rejects '+label,()=>{const value=actor();change(value);assert.throws(()=>assertStampedImageActorV1(value));});

test('all33 existing parent/child/standard identities and the private bucket may enter preparation',()=>assert.equal(assertStampedChildImageTargetsV1(before()),true));
for(const [label,change] of [
  ['missing parent',s=>s.parents.pop()],['missing child',s=>s.children.pop()],['duplicate parent masking another target',s=>{s.parents[1]=copy(s.parents[0]);}],
  ['changed literal number',s=>{s.parents[0].number='001';}],['changed stamped variant',s=>{s.parents[0].variant_key='normal';}],
  ['child under another parent',s=>{s.children[0].card_print_id=s.parents[1].id;}],['changed public child ID',s=>{s.children[0].printing_gv_id='different';}],
  ['Holo instead of Reverse',s=>{s.children[0].finish_key='holo';}],['provisional printing',s=>{s.children[0].is_provisional=true;}],
  ['inactive identity',s=>{s.identities[0].is_active=false;}],['another identity domain',s=>{s.identities[0].identity_domain='tcg_pocket_excluded';}],
  ['identity ambiguity at one parent',s=>{s.identities[1].card_print_id=s.identities[0].card_print_id;}],['public raw bucket',s=>{s.bucket.public=true;}],
  ['another bucket',s=>{s.bucket.id='public-card-images';}],
]) test('rejects '+label,()=>{const state=before();change(state);assert.throws(()=>assertStampedChildImageTargetsV1(state));});
for(const field of ['image_source','image_path','image_url','image_alt_url']) test('does not plan over an existing '+field,()=>{
  const state=before();state.children[0][field]='already-present';assert.throws(()=>assertStampedChildImageTargetsV1(state));
});
for(const field of ['existingCandidates','existingRawReceipts','existingEvidence','existingEvents','existingObjects']) test('requires diagnosis of '+field,()=>{
  const state=before();state[field].push({id:'existing'});assert.throws(()=>assertStampedChildImageTargetsV1(state));
  delete state[field];assert.throws(()=>assertStampedChildImageTargetsV1(state));
});
test('original byte substitution fails before any storage operation can exist',()=>{
  const target=manifest.targets[0];const bytes=Buffer.alloc(target.bytes);
  assert.notEqual(createHash('sha256').update(bytes).digest('hex'),target.originalSha256);
  assert.throws(()=>assertStampedImageOriginalV1(target,bytes));
  assert.throws(()=>assertStampedImageOriginalV1(target,Buffer.alloc(target.bytes-1)));
});
test('source pages cannot be replaced by a matching-looking snippet',()=>{
  const target=manifest.targets.find(t=>t.sourceContext.kind==='source_page');
  assert.throws(()=>readStampedImageSourceContextV1(target,Buffer.from('<html>Matching name and number</html>')));
});
test('API archives cannot be replaced by another post or reconstructed metadata',()=>{
  const target=manifest.targets.find(t=>t.sourceContext.kind==='source_api');
  assert.throws(()=>readStampedImageSourceContextV1(target,Buffer.from(JSON.stringify({id:target.sourceContext.sourcePostId,link:target.sourcePage}))));
});

test('owned qualification requires both loopback and a newly owned database namespace',()=>{
  const local={connectionParameters:{host:'127.0.0.1',database:'stamped_child_image_intake_33_qualification_r4'}};
  assert.doesNotThrow(()=>assertStampedIntakeDatabaseV1(local,'owned_local'));
  for(const change of [{host:'db.ycdxbpibncqcchqiihfz.supabase.co'},{database:'postgres'},{database:'stamped_child_image_intake_33_qualification_'}])assert.throws(()=>assertStampedIntakeDatabaseV1({connectionParameters:{...local.connectionParameters,...change}},'owned_local'));
});

test('production routing requires canonical identity, verified TLS and the named application',()=>{
  const p={host:'db.ycdxbpibncqcchqiihfz.supabase.co',database:'postgres',port:5432,user:'postgres',ssl:{rejectUnauthorized:true},application_name:'stamped_child_image_intake_v1'};
  const client=parameters=>({connectionParameters:parameters,connection:{stream:{authorized:true}}});
  assert.doesNotThrow(()=>assertStampedIntakeDatabaseV1(client(p),'production'));
  for(const change of [{host:'127.0.0.1'},{database:'other'},{port:6543},{user:'other'},{ssl:{rejectUnauthorized:false}},{application_name:'other'}])assert.throws(()=>assertStampedIntakeDatabaseV1(client({...p,...change}),'production'));
  assert.throws(()=>assertStampedIntakeDatabaseV1({...client(p),connection:{stream:{authorized:false}}},'production'));
});

function approvalFixture(){
  const codeFingerprint='a'.repeat(64),now='2026-11-25T08:00:00.000Z';
  const plan={fingerprint:'b'.repeat(64),codeFingerprint,actor:actor(),proposedEffects:{rawObjects:33,intakeRows:132},proposedRuns:['stage_raw','rollback','apply','replay'].map((mode,i)=>({mode,runId:`00000000-0000-4000-8000-00000000000${i}`}))};
  const authority={version:'STAMPED_CHILD_IMAGE_INTAKE_RELEASE_V1',status:'explicit_owner_approval',projectRef:'ycdxbpibncqcchqiihfz',planFingerprint:plan.fingerprint,codeFingerprint,scope:copy(plan.proposedEffects),actorFingerprint:hash(plan.actor),approvalRecordRef:'synthetic-decision.json',approvalText:plan.fingerprint+' '+codeFingerprint,runs:copy(plan.proposedRuns),approvedAt:'2026-11-25T07:00:00.000Z',expiresAt:'2026-11-26T07:00:00.000Z'};
  const seal=()=>{const{fingerprint,...body}=authority;authority.fingerprint=hash(body);};seal();
  return {input:{authority,plan,codeFingerprint,runId:plan.proposedRuns[0].runId,mode:'stage_raw',now,environment:'production'},seal};
}
test('an exact synthetic approval envelope passes only the pure envelope check',()=>assert.doesNotThrow(()=>assertStampedIntakeApprovalEnvelopeV1(approvalFixture().input)));
for(const[label,change]of[
  ['different project',a=>{a.projectRef='other';}],['different scope',a=>{a.scope.rawObjects=34;}],['different founder',a=>{a.actorFingerprint='c'.repeat(64);}],
  ['different source',a=>{a.codeFingerprint='c'.repeat(64);}],['different plan',a=>{a.planFingerprint='c'.repeat(64);}],['missing decision',a=>{a.approvalRecordRef='';}],
  ['different named attempt',a=>{a.runs[0].runId='11111111-1111-4111-8111-111111111111';}],['expired decision',a=>{a.expiresAt='2026-11-25T08:00:00.000Z';}],
  ['future decision',a=>{a.approvedAt='2026-11-25T09:00:00.000Z';}],['extended window',a=>{a.expiresAt='2026-11-26T08:00:00.000Z';}],['unbound approval text',a=>{a.approvalText='approved';}],
])test('approval envelope rejects '+label,()=>{const f=approvalFixture();change(f.input.authority);f.seal();assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(f.input));});
test('approval fingerprint tampering fails even when scope is unchanged',()=>{const f=approvalFixture();f.input.authority.fingerprint='f'.repeat(64);assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(f.input));});
test('apply and replay require exact storage, rollback freshness and a certain committed receipt',()=>{
  const f=approvalFixture(),i=f.input;i.mode='apply';i.runId=i.plan.proposedRuns[2].runId;
  assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(i));
  i.storageReceipt={pass:true,objects:33,planFingerprint:i.plan.fingerprint,codeFingerprint:i.codeFingerprint,environment:'production',immutable:true,canonicalWrites:0,runId:i.plan.proposedRuns[0].runId};
  i.rollbackReceipt={pass:true,mode:'rollback',rollbackProven:true,environment:'production',planFingerprint:i.plan.fingerprint,codeFingerprint:i.codeFingerprint,finishedAt:'2026-11-25T07:30:00.000Z',runId:i.plan.proposedRuns[1].runId};
  assert.doesNotThrow(()=>assertStampedIntakeApprovalEnvelopeV1(i));
  i.rollbackReceipt.finishedAt='2026-11-25T07:00:00.000Z';assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(i));i.rollbackReceipt.finishedAt='2026-11-25T07:30:00.000Z';
  i.mode='replay';i.runId=i.plan.proposedRuns[3].runId;assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(i));
  i.committedReceipt={pass:true,mode:'apply',committed:true,commitUncertain:false,environment:'production',inserts:132,planFingerprint:i.plan.fingerprint,codeFingerprint:i.codeFingerprint,runId:i.plan.proposedRuns[2].runId};
  assert.doesNotThrow(()=>assertStampedIntakeApprovalEnvelopeV1(i));i.committedReceipt.commitUncertain=true;assert.throws(()=>assertStampedIntakeApprovalEnvelopeV1(i));
});

test('the production CLI stops at argument and disabled-write gates before private source or database access',()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url)),script=path.join(root,'backend/warehouse/run_stamped_child_image_intake_v1.mjs');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stamped-image-cli-guards-'));
  const env={...process.env};for(const key of['ENABLE_STAMPED_CHILD_IMAGE_INTAKE_V1','STAMPED_CHILD_IMAGE_INTAKE_MODE','GROOKAI_PREFLIGHT_ACK','GV_USER_ACCESS_TOKEN','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_DB_URL'])delete env[key];
  env.DOTENV_CONFIG_PATH=path.join(tmp,'absent.env');
  const run=(args,extra={})=>spawnSync(process.execPath,[script,...args],{cwd:tmp,env:{...env,...extra},encoding:'utf8',timeout:30000,windowsHide:true});
  const help=run(['--help']);assert.equal(help.status,0);assert.match(help.stdout,/default writes disabled/);
  const noargs=run([]);assert.notEqual(noargs.status,0);assert.match(noargs.stderr,/Only --config/);
  const config=path.join(tmp,'guard.json');fs.writeFileSync(config,JSON.stringify({mode:'stage_raw',plan:path.join(tmp,'must-not-read-plan.json')}));
  const disabled=run(['--config',config]);assert.notEqual(disabled.status,0);assert.match(disabled.stderr,/writes are disabled/);
  const mode=run(['--config',config],{ENABLE_STAMPED_CHILD_IMAGE_INTAKE_V1:'true'});assert.notEqual(mode.status,0);assert.match(mode.stderr,/EXPLICIT/);
  const ack=run(['--config',config],{ENABLE_STAMPED_CHILD_IMAGE_INTAKE_V1:'true',STAMPED_CHILD_IMAGE_INTAKE_MODE:'EXPLICIT'});assert.notEqual(ack.status,0);assert.match(ack.stderr,/mechanical preflight gate/);
  fs.writeFileSync(config,JSON.stringify({mode:'stage_raw',arbitraryApply:true}));const unknown=run(['--config',config]);assert.notEqual(unknown.status,0);assert.match(unknown.stderr,/Unknown private-config field/);
  assert.deepEqual(fs.readdirSync(tmp),['guard.json']);
});
