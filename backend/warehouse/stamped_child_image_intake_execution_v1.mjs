// Exact33 raw/warehouse intake protocol. This does not classify, approve, normalize or promote.
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {recordValidationFailureV1} from '../lib/contracts/validate_write_v1.mjs';
import {VERSION, PROJECT, BUCKET, stampedChildImageManifestV1 as manifest, assertStampedChildImagePlanV1, assertStampedImageOriginalV1} from './stamped_child_image_intake_v1.mjs';

const tables = Object.freeze({raw:'raw_imports',candidate:'canon_warehouse_candidates',evidence:'canon_warehouse_candidate_evidence',event:'canon_warehouse_candidate_events'});
const same = (actual, expected, message) => assert.equal(hash(actual), hash(expected), message);
const qi = value => {assert.match(value, /^[a-z_][a-z0-9_]*$/);return '"' + value + '"';};
const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value ?? '');

export function assertStampedIntakeDatabaseV1(client, environment) {
  const p = client.connectionParameters;
  if (environment === 'owned_local') {
    assert.ok(['127.0.0.1','localhost','::1'].includes(p.host));
    assert.match(p.database, /^stamped_child_image_intake_33_qualification_[a-z0-9_]+$/);
  } else {
    assert.equal(environment, 'production');
    assert.equal(p.database, 'postgres');assert.equal(Number(p.port), 5432);
    assert.equal(p.ssl?.rejectUnauthorized, true);assert.equal(client.connection?.stream?.authorized, true);
    assert.ok((p.host === `db.${PROJECT}.supabase.co` && p.user === 'postgres') ||
      (p.host === 'aws-1-us-east-2.pooler.supabase.com' && p.user === `postgres.${PROJECT}`));
    assert.equal(p.application_name, 'stamped_child_image_intake_v1');
  }
}

export function assertStampedIntakeAuthorityV1({authority,plan,codeFingerprint,runId,mode,now,environment,rollbackReceipt,committedReceipt,storageReceipt}) {
  assertStampedChildImagePlanV1(plan);
  return assertStampedIntakeApprovalEnvelopeV1({authority,plan,codeFingerprint,runId,mode,now,environment,rollbackReceipt,committedReceipt,storageReceipt});
}

// Pure envelope checks are separately testable. This alone never grants a write:
// every executor/adapter calls the full frozen-plan validator above.
export function assertStampedIntakeApprovalEnvelopeV1({authority,plan,codeFingerprint,runId,mode,now,environment,rollbackReceipt,committedReceipt,storageReceipt}) {
  assert.equal(plan.codeFingerprint, codeFingerprint);
  assert.ok(['stage_raw','rollback','apply','replay'].includes(mode));
  if (environment !== 'owned_local') {
    assert.equal(environment, 'production');assert.ok(authority, 'Separate exact intake approval required');
    const {fingerprint,...body} = authority;same(hash(body), fingerprint, 'Authority changed');
    assert.equal(authority.version, 'STAMPED_CHILD_IMAGE_INTAKE_RELEASE_V1');assert.equal(authority.status, 'explicit_owner_approval');
    assert.equal(authority.projectRef, PROJECT);assert.equal(authority.planFingerprint, plan.fingerprint);
    assert.equal(authority.codeFingerprint, codeFingerprint);same(authority.scope, plan.proposedEffects, 'Write scope changed');
    assert.equal(authority.actorFingerprint, hash(plan.actor));assert.ok(authority.approvalRecordRef?.trim());
    same(authority.runs,plan.proposedRuns,'Named attempts differ from the prepared plan');
    assert.ok(authority.approvalText?.includes(plan.fingerprint) && authority.approvalText.includes(codeFingerprint));
    assert.equal(authority.runs.length, 4);assert.equal(new Set(authority.runs.map(r=>r.runId)).size,4);
    same(authority.runs.map(r=>r.mode), ['stage_raw','rollback','apply','replay']);
    assert.ok(authority.runs.every(r=>uuid(r.runId)));assert.ok(authority.runs.some(r=>r.runId===runId&&r.mode===mode));
    const start=Date.parse(authority.approvedAt),end=Date.parse(authority.expiresAt),at=Date.parse(now);
    assert.ok(Number.isFinite(at)&&start<=at&&at<end&&end>start&&end-start<=86400000,'Intake approval expired or invalid');
  }
  if (mode !== 'stage_raw') {
    assert.equal(storageReceipt?.pass,true,'Verified immutable raw Storage receipt required');assert.equal(storageReceipt.objects,33);
    assert.equal(storageReceipt.planFingerprint,plan.fingerprint);assert.equal(storageReceipt.codeFingerprint,codeFingerprint);
    assert.equal(storageReceipt.environment,environment);
    assert.equal(storageReceipt.immutable,true);assert.equal(storageReceipt.canonicalWrites,0);
    if(environment==='production')assert.ok(authority.runs.some(r=>r.mode==='stage_raw'&&r.runId===storageReceipt.runId));
  }
  if (mode === 'apply' || mode === 'replay') {
    assert.equal(rollbackReceipt?.pass,true);assert.equal(rollbackReceipt.mode,'rollback');assert.equal(rollbackReceipt.rollbackProven,true);
    assert.equal(rollbackReceipt.environment,environment);assert.equal(rollbackReceipt.planFingerprint,plan.fingerprint);assert.equal(rollbackReceipt.codeFingerprint,codeFingerprint);
    const age=Date.parse(now)-Date.parse(rollbackReceipt.finishedAt);assert.ok(age>=0&&age<3600000,'Matching rollback is stale');
    if (environment === 'production') assert.ok(authority.runs.some(r=>r.mode==='rollback'&&r.runId===rollbackReceipt.runId));
  }
  if (mode === 'replay') {
    assert.equal(committedReceipt?.pass,true);assert.equal(committedReceipt.mode,'apply');assert.equal(committedReceipt.committed,true);assert.equal(committedReceipt.commitUncertain,false);
    assert.equal(committedReceipt.environment,environment);assert.equal(committedReceipt.inserts,132);
    assert.equal(committedReceipt.planFingerprint,plan.fingerprint);assert.equal(committedReceipt.codeFingerprint,codeFingerprint);
    if (environment === 'production') assert.ok(authority.runs.some(r=>r.mode==='apply'&&r.runId===committedReceipt.runId));
  }
}

export async function readStampedIntakeSchemaV1(client) {
  const names=[...Object.values(tables),'contract_violations'],schema={};
  schema.columns=(await client.query('select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema=\'public\' and table_name=any($1::text[]) order by table_name,ordinal_position',[names])).rows;
  schema.constraints=(await client.query(`select c.relname table_name,k.conname,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,k.conname`,[names])).rows;
  schema.triggers=(await client.query(`select c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition,pg_get_functiondef(t.tgfoid) function_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) and not t.tgisinternal order by c.relname,t.tgname`,[names])).rows;
  return schema;
}

export async function readStampedIntakeRowsV1(client, plan) {
  const state={};
  for(const [key,table]of Object.entries(tables)){
    state[key]=(await client.query(`select id::text id,to_jsonb(t)::text row_json from public.${qi(table)} t where id=any($1::${key==='raw'?'bigint':'uuid'}[]) order by id`,[plan.rows.map(row=>row[key].id)])).rows;
  }
  return state;
}

export async function assertStampedIntakeProtectedStateV1(client, plan) {
  const ids=manifest.targets.map(t=>t.parentId),childIds=manifest.targets.map(t=>t.printingId);
  for(const[key,table,column,values]of[['parents','card_prints','id',ids],['children','card_printings','id',childIds],['identities','card_print_identity','card_print_id',ids]]){
    const rows=(await client.query(`select to_jsonb(t) row from public.${qi(table)} t where ${qi(column)}=any($1::uuid[])${key==='identities'?' and is_active':''} order by id`,[values])).rows.map(r=>r.row);
    same(rows,plan.before[key], 'Protected '+key+' changed');
  }
  const found=(await client.query(`select u.id user_id,e.role,e.is_active,encode(extensions.digest(jsonb_build_object('entitlement_id',e.id,'user_id',u.id,'role',e.role,'is_active',e.is_active)::text,'sha256'),'hex') entitlement_fingerprint from auth.users u join public.user_entitlements e on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email)) where u.id=$1 and e.is_active and e.role='founder'`,[plan.actor.userId])).rows;
  assert.equal(found.length,1);assert.equal(found[0].entitlement_fingerprint,plan.actor.entitlementFingerprint);
  const bucket=(await client.query('select id,public from storage.buckets where id=$1',[BUCKET])).rows;
  assert.equal(bucket.length,1);same(bucket[0],plan.before.bucket,'Private raw bucket changed');
  const competitors=(await client.query(`select id from public.canon_warehouse_candidates where submission_intent='MISSING_IMAGE' and id<>all($1::uuid[]) and(reference_hints_payload->>'card_gv_id'=any($2::text[]) or reference_hints_payload->>'printing_reference'=any($3::text[]))`,[plan.rows.map(r=>r.candidate.id),manifest.targets.map(t=>t.parentGvId),manifest.targets.flatMap(t=>[t.printingId,t.printingGvId])])).rows;
  assert.equal(competitors.length,0,'Another intake now requires diagnosis');
  same(await readStampedIntakeSchemaV1(client),plan.before.schema,'Intake schema changed');
}

export function assertStampedIntakeWrittenRowsV1(state, plan) {
  for(const key of Object.keys(tables)){
    assert.equal(state[key].length,33,'Incomplete '+key+' intake');
    for(const expected of plan.rows.map(r=>r[key])){
      const row=state[key].find(r=>r.id===String(expected.id));assert.ok(row,'Expected '+key+' row absent');
      const actual=JSON.parse(row.row_json);
      for(const[k,v]of Object.entries(expected))if(k!=='id')same(actual[k],v,'Written '+key+' field changed: '+k);
      if(key==='candidate')for(const field of ['founder_approved_by_user_id','founder_approved_at','founder_approval_notes','current_staging_id','identity_audit_status','identity_resolution','proposed_action_type','interpreter_decision','interpreter_reason_code','promoted_card_print_id','promoted_card_printing_id','promoted_image_target_id','promoted_by_user_id','promoted_at'])assert.equal(actual[field]??null,null,'Intake must not advance '+field);
    }
  }
}

async function persistFailure(client, context, error) {
  if(error.result?.violation_id)return {violationId:error.result.violation_id};
  const result=await recordValidationFailureV1({validation:{ok:false,contract_name:'STAMPED_CHILD_IMAGE_INTAKE_V1',violation_type:'stamped_child_image_intake_failed',severity:'hard_fail',reason:String(error.message).slice(0,500),payload_snapshot:{programme:VERSION,planFingerprint:context.plan.fingerprint,runId:context.runId,mode:context.mode,commitUncertain:error.commitUncertain??false}},execution_name:context.mode==='stage_raw'?'stamped_child_image_intake_storage_v1':'stamped_child_image_intake_sql_v1',actor_type:'system_worker',actor_id:context.plan.actor.userId,source_worker:VERSION,source_system:'warehouse',ledger_target:client});
  return {violationId:result.violation_id};
}

export async function executeStampedIntakeTransactionV1({client,auditClient,plan,context,revalidate,verifyStoredObjects}) {
  assertStampedIntakeDatabaseV1(client,context.environment);assertStampedIntakeDatabaseV1(auditClient,context.environment);
  assert.notEqual(client,auditClient,'Failure outcomes require an independent connection');
  assert.ok(typeof revalidate==='function'&&typeof verifyStoredObjects==='function');
  const bound={...context,plan},report={version:VERSION,environment:context.environment,mode:context.mode,runId:context.runId,planFingerprint:plan.fingerprint,codeFingerprint:context.codeFingerprint,pass:false,inserts:0,committed:false,commitUncertain:false};
  // An invalid/missing production decision must not create even a failure-ledger row.
  assertStampedIntakeAuthorityV1({...bound,now:new Date().toISOString()});
  const checkSource=async()=>assert.equal(await revalidate(),context.codeFingerprint,'Complete source changed');
  const checkStorage=async()=>{const proof=await verifyStoredObjects();assert.equal(proof?.pass,true);assert.equal(proof.objects,33);assert.equal(proof.productionWrites,0);};
  let transaction=false,commitAttempted=false;
  try{
    assertStampedIntakeAuthorityV1({...bound,now:new Date().toISOString()});
    assert.ok(['rollback','apply','replay'].includes(context.mode));
    await checkSource();await checkStorage();
    await client.query('begin isolation level serializable');transaction=true;
    assert.equal((await client.query('select pg_try_advisory_xact_lock(hashtext($1)) ok',[VERSION])).rows[0].ok,true,'Another intake owns the writer');
    await client.query('set local lock_timeout = \'3s\'');
    await client.query('select id from public.card_prints where id=any($1::uuid[]) for share',[manifest.targets.map(t=>t.parentId)]);
    await client.query('select id from public.card_printings where id=any($1::uuid[]) for share',[manifest.targets.map(t=>t.printingId)]);
    await client.query('select id from public.card_print_identity where id=any($1::uuid[]) for share',[plan.before.identities.map(t=>t.id)]);
    await client.query('select id from public.user_entitlements where is_active and role=\'founder\' and(user_id=$1 or(user_id is null and lower(email)=(select lower(email) from auth.users where id=$1))) for share',[plan.actor.userId]);
    await client.query('select id from storage.buckets where id=$1 for share',[BUCKET]);
    await assertStampedIntakeProtectedStateV1(client,plan);
    const before=await readStampedIntakeRowsV1(client,plan);
    if(context.mode==='replay'){
      assertStampedIntakeWrittenRowsV1(before,plan);same(before,context.committedReceipt.writeRows,'Previously committed intake changed');
    }else for(const rows of Object.values(before))assert.equal(rows.length,0,'Existing or partial intake requires independent diagnosis');
    await assertExecuteCanonWriteV1({execution_name:'stamped_child_image_intake_sql_v1',write_target:client,audit_target:client,ledger_target:auditClient,transaction_control:'external',actor_type:'system_worker',actor_id:plan.actor.userId,source_worker:VERSION,source_system:'warehouse',payload_snapshot:{programme:VERSION,planFingerprint:plan.fingerprint,runId:context.runId,mode:context.mode},contract_assertions:[{ok:true,contract_name:'STAMPED_CHILD_IMAGE_INTAKE_V1',violation_type:'scope_revalidated',reason:'Exact raw/warehouse-only source plan, real actor, original canonical rows and source schema were revalidated.'}],
      write:async connection=>{if(context.mode==='replay')return;for(const row of plan.rows)for(const[key,table]of Object.entries(tables)){
        const columns=Object.keys(row[key]),values=columns.map(c=>{const value=row[key][c];return value&&typeof value==='object'?JSON.stringify(value):value;});
        const result=await connection.query(`insert into public.${qi(table)} (${columns.map(qi).join(',')}) values (${columns.map((c,i)=>'$'+(i+1)+(row[key][c]&&typeof row[key][c]==='object'?'::jsonb':'')).join(',')})`,values);
        assert.equal(result.rowCount,1);report.inserts++;
      }},proofs:[{name:'exact_raw_intake_and_preserved_canon',contract_name:'STAMPED_CHILD_IMAGE_INTAKE_V1',violation_type:'intake_post_write_mismatch',run:async connection=>{assertStampedIntakeWrittenRowsV1(await readStampedIntakeRowsV1(connection,plan),plan);await assertStampedIntakeProtectedStateV1(connection,plan);return {ok:true};}}]});
    report.writeRows=await readStampedIntakeRowsV1(client,plan);
    assert.equal(report.inserts,context.mode==='replay'?0:132);
    await checkSource();await checkStorage();assertStampedIntakeAuthorityV1({...bound,now:new Date().toISOString()});
    if(context.mode==='rollback'){
      await client.query('rollback');transaction=false;
      for(const rows of Object.values(await readStampedIntakeRowsV1(client,plan)))assert.equal(rows.length,0);
      report.rollbackProven=true;
    }else{
      commitAttempted=true;await client.query('commit');transaction=false;report.committed=true;
    }
    report.pass=true;report.finishedAt=new Date().toISOString();return report;
  }catch(error){
    if(commitAttempted){error.commitUncertain=true;report.commitUncertain=true;}
    else if(transaction)await client.query('rollback').catch(()=>{error.rollbackUncertain=true;});
    try{error.audit=await persistFailure(auditClient,bound,error);}catch(auditError){error.auditPersistenceFailure=auditError.message;}
    error.automaticRetry=false;throw error;
  }
}

export async function stageStampedIntakeRawObjectsV1({plan,context,storage,guardClient,auditClient,revalidate,originals}) {
  assertStampedIntakeAuthorityV1({...context,plan,mode:'stage_raw',now:new Date().toISOString()});
  assert.equal(context.mode,'stage_raw');assert.ok(typeof revalidate==='function');
  assertStampedIntakeDatabaseV1(auditClient,context.environment);
  assertStampedIntakeDatabaseV1(guardClient,context.environment);assert.notEqual(guardClient,auditClient);
  assert.equal(storage.projectRef,context.environment==='owned_local'?'owned_local':PROJECT);
  assert.deepEqual(Object.keys(originals).sort(),manifest.targets.map(t=>t.printingId).sort());
  for(const target of manifest.targets)assertStampedImageOriginalV1(target,originals[target.printingId]);
  const receipt={version:VERSION,environment:context.environment,planFingerprint:plan.fingerprint,codeFingerprint:context.codeFingerprint,runId:context.runId,objects:0,pass:false,immutable:true,canonicalWrites:0};
  let guarded=false;
  try{
    assert.equal(await revalidate(),context.codeFingerprint);
    await guardClient.query('begin isolation level serializable');guarded=true;
    await guardClient.query('set local lock_timeout = \'3s\'');
    await guardClient.query('select id from public.card_prints where id=any($1::uuid[]) for share',[manifest.targets.map(t=>t.parentId)]);
    await guardClient.query('select id from public.card_printings where id=any($1::uuid[]) for share',[manifest.targets.map(t=>t.printingId)]);
    await guardClient.query('select id from public.card_print_identity where id=any($1::uuid[]) for share',[plan.before.identities.map(t=>t.id)]);
    await guardClient.query('select id from public.user_entitlements where is_active and role=\'founder\' and(user_id=$1 or(user_id is null and lower(email)=(select lower(email) from auth.users where id=$1))) for share',[plan.actor.userId]);
    await guardClient.query('select id from storage.buckets where id=$1 for share',[BUCKET]);
    await assertStampedIntakeProtectedStateV1(guardClient,plan);
    await assertExecuteCanonWriteV1({execution_name:'stamped_child_image_intake_storage_v1',write_target:storage,audit_target:storage,ledger_target:auditClient,transaction_control:'none',actor_type:'system_worker',actor_id:plan.actor.userId,source_worker:VERSION,source_system:'warehouse',payload_snapshot:{programme:VERSION,planFingerprint:plan.fingerprint,runId:context.runId,mode:context.mode},contract_assertions:[{ok:true,contract_name:'STAMPED_CHILD_IMAGE_INTAKE_V1',violation_type:'source_and_actor_revalidated',reason:'Exact immutable raw image objects and accountable real actor were verified; partial raw objects remain preserved, never overwritten or promoted.'}],
      write:async()=>{for(const row of plan.rows){
        assert.equal(await revalidate(),context.codeFingerprint);assertStampedIntakeAuthorityV1({...context,plan,mode:'stage_raw',now:new Date().toISOString()});
        const target=manifest.targets.find(t=>t.printingId===row.candidate.reference_hints_payload.printing_reference),bytes=originals[target.printingId];assertStampedImageOriginalV1(target,bytes);
        const result=await storage.upload(BUCKET,row.keys.storagePath,bytes,{contentType:'image/jpeg',upsert:false});
        assert.equal(result.path,row.keys.storagePath,'Immutable raw upload did not confirm its exact key');receipt.objects++;
      }},proofs:[{name:'immutable_raw_images_read_back',contract_name:'STAMPED_CHILD_IMAGE_INTAKE_V1',violation_type:'raw_image_readback_failed',run:async()=>{await verifyStampedIntakeRawObjectsV1({plan,storage});return {ok:true};}}]});
    assert.equal(await revalidate(),context.codeFingerprint);assertStampedIntakeAuthorityV1({...context,plan,mode:'stage_raw',now:new Date().toISOString()});
    await guardClient.query('commit');guarded=false;
    receipt.pass=true;receipt.finishedAt=new Date().toISOString();return receipt;
  }catch(error){
    if(guarded)await guardClient.query('rollback').catch(()=>{error.lockReleaseUncertain=true;});
    try{error.audit=await persistFailure(auditClient,{...context,plan},error);}catch(auditError){error.auditPersistenceFailure=auditError.message;}
    error.confirmedRawObjects=receipt.objects;error.rawStorageOutcomeRequiresDiagnosis=true;error.automaticRetry=false;throw error;
  }
}

export async function verifyStampedIntakeRawObjectsV1({plan,storage}) {
  assertStampedChildImagePlanV1(plan);
  for(const row of plan.rows){const target=manifest.targets.find(t=>t.printingId===row.candidate.reference_hints_payload.printing_reference);assertStampedImageOriginalV1(target,await storage.download(BUCKET,row.keys.storagePath));}
  return {pass:true,objects:33,productionWrites:0};
}
