// Qualification prototype only. This module has no production execution mode.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildClassificationForCandidateV1,applyClassificationWithinTransactionV1} from './classification_worker_v1.mjs';
import {stampedChildImageManifestV1 as manifest,stampedChildImageIntakeKeysV1} from './stamped_child_image_intake_v1.mjs';
import {stampedChildImageIntakeCodeBindingV1} from './stamped_child_image_intake_code_binding_v1.mjs';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const VERSION='STAMPED_CHILD_CLASSIFICATION_LOCAL_V1';
const json=value=>JSON.parse(JSON.stringify(value));
const qi=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
const same=(a,b,message)=>assert.equal(hash(a),hash(b),message);
const ids=manifest.targets.map(t=>stampedChildImageIntakeKeysV1(t).candidateId);

export function stampedChildClassificationLocalCodeBindingV1(){
  const files=new Set(stampedChildImageIntakeCodeBindingV1().files.map(x=>x.file));
  const visited=new Set();
  function visit(file){
    if(visited.has(file))return;visited.add(file);files.add(file);
    const code=fs.readFileSync(path.join(root,file),'utf8');
    for(const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
      if(!match[1].startsWith('.'))continue;
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));
      assert.ok(!dependency.startsWith('../'));if(dependency.endsWith('.mjs'))visit(dependency);
    }
  }
  visit('backend/warehouse/stamped_child_classification_local_v1.mjs');
  for(const file of ['scripts/audits/stamped_child_classification_local_qualification_v1.mjs','tests/contracts/stamped_child_classification_local_v1.test.mjs','docs/contracts/STAMPED_CHILD_CLASSIFICATION_LOCAL_V1.md','docs/checkpoints/warehouse/STAMPED_CHILD_CLASSIFICATION_33_20261125.md'])files.add(file);
  const bindings=[...files].sort().map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
  return {files:bindings,fingerprint:hash(bindings)};
}

export async function assertStampedClassificationOwnedLocalV1(client){
  const p=client?.connectionParameters;
  assert.ok(p&&p.host==='127.0.0.1'&&Number(p.port)===5432,'Only owned loopback qualification is implemented');
  assert.match(p.database??'',/^stamped_child_classification_33_qualification_r[1-9][0-9]*(_commit_loss)?$/);
  const actual=(await client.query('select current_database() name,current_setting(\'server_version\') version')).rows[0];
  assert.equal(actual.name,p.database);assert.match(actual.version,/^17\./);
}

async function rows(client,table,column,values,type='uuid'){
  return (await client.query(`select to_jsonb(t) row from public.${qi(table)} t where ${qi(column)}=any($1::${type}[]) order by id`,[values])).rows.map(x=>x.row);
}

export async function readStampedClassificationLocalStateV1(client){
  const keys=manifest.targets.map(t=>stampedChildImageIntakeKeysV1(t));
  return {
    candidates:await rows(client,'canon_warehouse_candidates','id',ids),
    evidence:await rows(client,'canon_warehouse_candidate_evidence','candidate_id',ids),
    events:await rows(client,'canon_warehouse_candidate_events','candidate_id',ids),
    raw:await rows(client,'raw_imports','id',keys.map(x=>x.rawId),'bigint'),
    parents:(await client.query('select to_jsonb(t) row from public.card_prints t order by id')).rows.map(x=>x.row),
    children:(await client.query('select to_jsonb(t) row from public.card_printings t order by id')).rows.map(x=>x.row),
    identities:(await client.query('select to_jsonb(t) row from public.card_print_identity t order by id')).rows.map(x=>x.row),
    owners:(await client.query('select to_jsonb(t) row from public.owned_fixture_copies t order by id')).rows.map(x=>x.row),
  };
}

export function assertStampedClassificationBuildV1(target,build){
  assert.equal(build.candidate.id,stampedChildImageIntakeKeysV1(target).candidateId);
  assert.equal(build.candidate.state,'RAW');assert.equal(build.candidate.submission_intent,'MISSING_IMAGE');
  const s=build.classificationPackage,a=build.identityAuditPackage,r=a.routing;
  assert.equal(s.classification_status,'CLASSIFIED_READY');assert.equal(s.identity_resolution,'ATTACH_PRINTING');
  assert.equal(s.interpreter_decision,'CHILD');assert.equal(s.interpreter_reason_code,'EXISTING_CHILD_PRINTING');
  assert.equal(s.proposed_action_type,'ENRICH_CARD_PRINTING_IMAGE');assert.equal(a.identity_audit_status,'PRINTING_ONLY');
  for(const resolved of [r,s.resolver_summary,s.identity_resolution_package.action_payload]){
    assert.equal(resolved.matched_card_print_id,target.parentId);assert.equal(resolved.matched_card_printing_id,target.printingId);
  }
  assert.equal(r.finish_key,target.finishKey);assert.equal(build.candidateSummary.state,'REVIEW_READY');
  assert.deepEqual(build.writePlan.map(x=>[x.type,x.state??x.eventType]),[['candidate_update','NORMALIZED'],['event','NORMALIZATION_PARTIAL'],['candidate_update','CLASSIFIED'],['event','CLASSIFICATION_COMPLETE'],['candidate_update','REVIEW_READY'],['event','WAREHOUSE_REVIEW_READY']]);
  assert.equal(build.sourceBackedRawExtractionPackage,null);assert.equal(build.sourceBackedNormalizedMetadataPackage,null);
}

export async function prepareStampedClassificationLocalV1(client){
  await assertStampedClassificationOwnedLocalV1(client);
  await client.query('begin isolation level repeatable read read only');
  try{
    const before=await readStampedClassificationLocalStateV1(client);assert.equal(before.candidates.length,33);
    const builds=[];
    for(const target of manifest.targets){const build=json(await buildClassificationForCandidateV1(client,stampedChildImageIntakeKeysV1(target).candidateId));assertStampedClassificationBuildV1(target,build);builds.push(build);}
    const body={version:VERSION,database:client.connectionParameters.database,codeFingerprint:stampedChildClassificationLocalCodeBindingV1().fingerprint,manifestFingerprint:manifest.fingerprint,before,builds};
    await client.query('rollback');return {...body,fingerprint:hash(body)};
  }catch(error){await client.query('rollback');throw error;}
}

function assertPlan(plan){
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'Local plan changed');
  assert.equal(plan.version,VERSION);assert.equal(plan.manifestFingerprint,manifest.fingerprint);
  assert.equal(plan.codeFingerprint,stampedChildClassificationLocalCodeBindingV1().fingerprint,'Classification producer changed');
  assert.equal(plan.builds.length,33);for(let i=0;i<33;i++)assertStampedClassificationBuildV1(manifest.targets[i],plan.builds[i]);
}

export function assertStampedClassificationAfterV1(plan,after){
  for(const key of ['raw','evidence','parents','children','identities','owners'])same(after[key],plan.before[key],'Protected '+key+' changed');
  assert.equal(after.candidates.length,33);assert.equal(after.events.length,plan.before.events.length+99);
  for(const before of plan.before.candidates){
    const current=after.candidates.find(x=>x.id===before.id);assert.ok(current);
    const build=plan.builds.find(x=>x.candidate.id===before.id),step=build.writePlan.find(x=>x.type==='candidate_update'&&x.state==='CLASSIFIED');
    const expected={...before,state:'REVIEW_READY',interpreter_decision:step.interpreterDecision,interpreter_reason_code:step.interpreterReasonCode,interpreter_explanation:step.interpreterExplanation,interpreter_resolved_finish_key:step.interpreterResolvedFinishKey,needs_promotion_review:step.needsPromotionReview,proposed_action_type:step.proposedActionType,current_review_hold_reason:null,identity_audit_status:build.identityAuditPackage.identity_audit_status,identity_audit_reason_code:build.identityAuditPackage.reason_code,identity_resolution:build.classificationPackage.identity_resolution};
    assert.ok(new Date(current.updated_at)>=new Date(before.updated_at));expected.updated_at=current.updated_at;
    same(current,expected,'Unexpected candidate field mutation');
    for(const field of ['founder_approved_at','founder_approved_by_user_id','current_staging_id','promoted_at','promoted_image_target_id'])assert.equal(current[field]??null,null);
    const oldEvents=plan.before.events.filter(x=>x.candidate_id===before.id),newEvents=after.events.filter(x=>x.candidate_id===before.id&&!oldEvents.some(e=>e.id===x.id));
    assert.equal(newEvents.length,3);
    for(const planned of build.writePlan.filter(x=>x.type==='event')){
      const actual=newEvents.find(x=>x.event_type===planned.eventType);assert.ok(actual);
      assert.equal(actual.action,planned.action);assert.equal(actual.previous_state,planned.previousState);assert.equal(actual.next_state,planned.nextState);
      assert.equal(actual.actor_type,'SYSTEM');assert.equal(actual.actor_user_id,null);
      same(actual.metadata,{worker:'classification_worker_v1',system_note:planned.notes??null,...planned.metadata},'Event package changed');
      assert.equal(actual.staging_id??null,null);assert.ok(new Date(actual.created_at)>=new Date(before.updated_at));
      const original=oldEvents[0];assert.ok(original);
      same(actual,{...original,id:actual.id,event_type:planned.eventType,action:planned.action,previous_state:planned.previousState,next_state:planned.nextState,actor_user_id:null,actor_type:'SYSTEM',metadata:actual.metadata,created_at:actual.created_at},'Unexpected event field mutation');
    }
  }
  for(const original of plan.before.events)same(after.events.find(x=>x.id===original.id),original,'Existing source event changed');
}

export async function executeStampedClassificationLocalV1({client,auditClient,plan,mode,committedReceipt}){
  await assertStampedClassificationOwnedLocalV1(client);await assertStampedClassificationOwnedLocalV1(auditClient);
  assert.notEqual(client,auditClient);assert.equal(client.connectionParameters.database,auditClient.connectionParameters.database);
  assert.equal(plan.database,client.connectionParameters.database);assertPlan(plan);assert.ok(['rollback','apply','replay'].includes(mode));
  let active=false,commitAttempted=false;
  try{
    await client.query(mode==='replay'?'begin isolation level repeatable read read only':'begin isolation level serializable');active=true;
    if(mode==='replay'){
      assert.equal(committedReceipt?.committed,true);assert.equal(committedReceipt.planFingerprint,plan.fingerprint);
      const state=await readStampedClassificationLocalStateV1(client);assertStampedClassificationAfterV1(plan,state);same(state,committedReceipt.state,'Committed classification changed');
      await client.query('rollback');active=false;return {pass:true,mode,productionWrites:0,updates:0,inserts:0,committed:false,planFingerprint:plan.fingerprint};
    }
    assert.equal((await client.query('select pg_try_advisory_xact_lock(hashtext($1)) ok',[VERSION])).rows[0].ok,true,'Another classification owns this batch');
    await client.query("set local lock_timeout='2s'");
    same(await readStampedClassificationLocalStateV1(client),plan.before,'Local baseline changed');
    for(let i=0;i<33;i++){
      const target=manifest.targets[i],build=json(await buildClassificationForCandidateV1(client,ids[i]));assertStampedClassificationBuildV1(target,build);
      same(build,plan.builds[i],'Classification input or resolver changed');
      await applyClassificationWithinTransactionV1(client,build,{ledgerTarget:auditClient});
    }
    const state=await readStampedClassificationLocalStateV1(client);assertStampedClassificationAfterV1(plan,state);assertPlan(plan);
    if(mode==='rollback'){
      await client.query('rollback');active=false;same(await readStampedClassificationLocalStateV1(client),plan.before,'Rollback left durable classification rows');
      return {pass:true,mode,planFingerprint:plan.fingerprint,productionWrites:0,updates:99,inserts:99,committed:false,rollbackProven:true};
    }
    commitAttempted=true;await client.query('commit');active=false;
    return {pass:true,mode,planFingerprint:plan.fingerprint,productionWrites:0,updates:99,inserts:99,committed:true,state};
  }catch(error){
    if(commitAttempted){error.commitUncertain=true;error.automaticRetry=false;}
    if(active){try{await client.query('rollback');}catch{error.rollbackUncertain=true;error.automaticRetry=false;}}
    throw error;
  }
}
