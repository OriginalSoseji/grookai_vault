// Exact33 classification protocol. No image, approval, staging or canonical writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {recordValidationFailureV1} from '../lib/contracts/validate_write_v1.mjs';
import {buildClassificationForCandidateV1,applyClassificationWithinTransactionV1} from './classification_worker_v1.mjs';
import {assertStampedClassificationBuildV1,assertStampedClassificationAfterV1,stampedChildClassificationLocalCodeBindingV1} from './stamped_child_classification_local_v1.mjs';
import {PROJECT,BUCKET,assertStampedChildImagePlanV1,stampedChildImageManifestV1 as manifest,stampedChildImageIntakeKeysV1} from './stamped_child_image_intake_v1.mjs';
import {readStampedIntakeSchemaV1,readStampedIntakeRowsV1,assertStampedIntakeWrittenRowsV1} from './stamped_child_image_intake_execution_v1.mjs';

export const VERSION='STAMPED_CHILD_CLASSIFICATION_V1';
export const EFFECTS=Object.freeze({candidateRowsUpdated:33,candidateUpdateStatements:99,eventInserts:99,failureLedgerRowsMaximum:3,rawWrites:0,evidenceWrites:0,parentWrites:0,printingWrites:0,identityWrites:0,reviewWrites:0,ownerWrites:0,imageWrites:0,storageWrites:0,mappingWrites:0,priceWrites:0,stagingWrites:0,founderApprovalWrites:0,schemaWrites:0,sequenceCalls:0});
const root=fileURLToPath(new URL('../../',import.meta.url)),json=x=>JSON.parse(JSON.stringify(x));
const same=(a,b,message)=>assert.equal(hash(a),hash(b),message);
const qi=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
const keys=manifest.targets.map(stampedChildImageIntakeKeysV1),ids=keys.map(x=>x.candidateId);
const uuid=s=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s??'');

export function reserveStampedClassificationDirectoryV1(directory,intent){
  fs.mkdirSync(path.dirname(directory),{recursive:true});fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory,'intent.json'),JSON.stringify(intent,null,2)+'\n',{flag:'wx'});
}

export function stampedChildClassificationCodeBindingV1(){
  const files=new Set(stampedChildClassificationLocalCodeBindingV1().files.map(x=>x.file));
  for(const file of ['backend/warehouse/stamped_child_classification_v1.mjs','backend/warehouse/run_stamped_child_classification_v1.mjs','scripts/audits/stamped_child_classification_controller_qualification_v1.mjs','tests/contracts/stamped_child_classification_v1.test.mjs','docs/contracts/STAMPED_CHILD_CLASSIFICATION_V1.md','scripts/preflight_gate.ps1','scripts/git/pre-commit','scripts/git/pre-push'])files.add(file);
  const bindings=[...files].sort().map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
  return {files:bindings,fingerprint:hash(bindings)};
}

export function assertStampedClassificationDatabaseV1(client,environment){
  const p=client.connectionParameters;assert.equal(Number(p.port),5432);
  if(environment==='owned_local'){
    assert.equal(p.host,'127.0.0.1');assert.match(p.database??'',/^stamped_child_classification_33_controller_r[1-9][0-9]*(_commit_loss)?$/);return;
  }
  assert.equal(environment,'production');assert.equal(p.database,'postgres');assert.equal(p.ssl?.rejectUnauthorized,true);
  assert.equal(client.connection?.stream?.authorized,true);assert.equal(p.application_name,'stamped_child_classification_v1');
  assert.ok((p.host===`db.${PROJECT}.supabase.co`&&p.user==='postgres')||(p.host==='aws-1-us-east-2.pooler.supabase.com'&&p.user===`postgres.${PROJECT}`));
}

export function assertStampedClassificationAuthorityV1({authority,plan,codeFingerprint,runId,mode,now,environment,rollbackReceipt,committedReceipt}){
  assert.equal(plan.codeFingerprint,codeFingerprint);assert.ok(['rollback','apply','replay'].includes(mode));
  if(environment!=='owned_local'){
    assert.equal(environment,'production');assert.ok(authority,'Separate exact classification approval required');
    const {fingerprint,...body}=authority;assert.equal(hash(body),fingerprint,'Classification authority changed');
    assert.equal(authority.version,VERSION);assert.equal(authority.status,'explicit_owner_approval');
    assert.equal(authority.projectRef,PROJECT);assert.equal(authority.planFingerprint,plan.fingerprint);assert.equal(authority.codeFingerprint,codeFingerprint);
    same(authority.scope,EFFECTS,'Classification scope changed');same(authority.runs,plan.proposedRuns,'Named classification attempts changed');
    assert.equal(authority.actorFingerprint,hash(plan.actor));assert.ok(authority.approvalRecordRef?.trim());
    assert.ok(authority.approvalText?.includes(plan.fingerprint)&&authority.approvalText.includes(codeFingerprint));
    const start=Date.parse(authority.approvedAt),end=Date.parse(authority.expiresAt),at=Date.parse(now);
    assert.ok(Number.isFinite(at)&&start<=at&&at<end&&end>start&&end-start<=86400000,'Classification decision expired or invalid');
  }
  same(plan.proposedRuns.map(x=>x.mode),['rollback','apply','replay']);assert.equal(new Set(plan.proposedRuns.map(x=>x.runId)).size,3);
  assert.ok(plan.proposedRuns.every(x=>uuid(x.runId)));assert.ok(plan.proposedRuns.some(x=>x.mode===mode&&x.runId===runId));
  if(mode!=='rollback'){
    assert.equal(rollbackReceipt?.pass,true);assert.equal(rollbackReceipt.rollbackProven,true);assert.equal(rollbackReceipt.mode,'rollback');
    for(const k of ['environment','codeFingerprint'])assert.equal(rollbackReceipt[k],k==='environment'?environment:codeFingerprint);
    assert.equal(rollbackReceipt.planFingerprint,plan.fingerprint);assert.equal(rollbackReceipt.updates,99);assert.equal(rollbackReceipt.inserts,99);
    assert.ok(plan.proposedRuns.some(x=>x.mode==='rollback'&&x.runId===rollbackReceipt.runId));
    const age=Date.parse(now)-Date.parse(rollbackReceipt.finishedAt);assert.ok(age>=0&&age<3600000,'Matching rollback is stale');
  }
  if(mode==='replay'){
    assert.equal(committedReceipt?.pass,true);assert.equal(committedReceipt.committed,true);assert.equal(committedReceipt.commitUncertain,false);
    assert.equal(committedReceipt.environment,environment);assert.equal(committedReceipt.codeFingerprint,codeFingerprint);
    assert.equal(committedReceipt.planFingerprint,plan.fingerprint);assert.equal(committedReceipt.updates,99);assert.equal(committedReceipt.inserts,99);
    assert.ok(plan.proposedRuns.some(x=>x.mode==='apply'&&x.runId===committedReceipt.runId));
  }
}

async function selected(client,table,column,values,{literal=false,type='uuid'}={}){
  const expression=literal?'to_jsonb(t)::text':'to_jsonb(t)';
  return (await client.query(`select ${expression} row from public.${qi(table)} t where ${qi(column)}=any($1::${type}[]) order by id`,[values])).rows.map(x=>x.row);
}

export async function readStampedClassificationStateV1(client,actor){
  const parentIds=manifest.targets.map(x=>x.parentId),state={};
  state.candidates=await selected(client,'canon_warehouse_candidates','id',ids);
  state.evidence=await selected(client,'canon_warehouse_candidate_evidence','candidate_id',ids);
  state.events=await selected(client,'canon_warehouse_candidate_events','candidate_id',ids);
  state.raw=await selected(client,'raw_imports','id',keys.map(x=>x.rawId),{literal:true,type:'bigint'});
  state.parents=await selected(client,'card_prints','id',parentIds);
  state.children=await selected(client,'card_printings','card_print_id',parentIds);
  state.identities=await selected(client,'card_print_identity','card_print_id',parentIds);
  const childIds=state.children.map(x=>x.id),identityIds=state.identities.map(x=>x.id);
  state.reviews=await selected(client,'card_printing_truth_reviews','card_printing_id',childIds,{literal:true});
  state.foreignKeys=(await client.query(`select ns.nspname schema_name,t.relname table_name,nt.nspname target_schema,tt.relname target_table,k.conname,
    array(select a.attname::text from unnest(k.conkey)with ordinality u(n,i)join pg_attribute a on a.attrelid=k.conrelid and a.attnum=u.n order by u.i) columns,
    array(select a.attname::text from unnest(k.confkey)with ordinality u(n,i)join pg_attribute a on a.attrelid=k.confrelid and a.attnum=u.n order by u.i) target_columns
    from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class tt on tt.oid=k.confrelid join pg_namespace nt on nt.oid=tt.relnamespace
    where k.contype='f' and k.confrelid in('public.card_prints'::regclass,'public.card_printings'::regclass,'public.card_print_identity'::regclass)order by ns.nspname,t.relname,k.conname`)).rows;
  assert.ok(state.foreignKeys.every(k=>k.columns.length===1&&k.target_columns.length===1&&k.target_columns[0]==='id'),'Unhandled composite canonical reference');
  const byRelation=new Map(),byTarget={card_prints:parentIds,card_printings:childIds,card_print_identity:identityIds};
  for(const fk of state.foreignKeys){const key=fk.schema_name+'.'+fk.table_name;if(!byRelation.has(key))byRelation.set(key,[]);byRelation.get(key).push(fk);}
  state.owners=[];
  for(const [relation,fks] of byRelation){
    const condition=fks.map((k,i)=>`t.${qi(k.columns[0])}=any($${i+1}::uuid[])`).join(' or ');
    const digest=(await client.query(`select count(*)::int rows,encode(extensions.digest(coalesce(string_agg(encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex'),'' order by to_jsonb(t)::text),''),'sha256'),'hex') sha256 from ${qi(fks[0].schema_name)}.${qi(fks[0].table_name)} t where ${condition}`,fks.map(k=>byTarget[k.target_table]))).rows[0];
    state.owners.push({relation,...digest});
  }
  const schemas=['public','grookai_square','grookai_inventory','grookai_vendor_pricing','storage'];state.security={};
  state.security.schemas=(await client.query('select nspname,nspacl::text from pg_namespace where nspname=any($1::text[])order by nspname',[schemas])).rows;
  state.security.relations=(await client.query("select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1::text[])and c.relkind in('r','p','v','m','S','f')order by n.nspname,c.relname",[schemas])).rows;
  state.security.columns=(await client.query('select table_schema,table_name,column_name,ordinal_position,column_default,is_nullable,data_type,udt_schema,udt_name from information_schema.columns where table_schema=any($1::text[])order by table_schema,table_name,ordinal_position',[schemas])).rows;
  state.security.columnGrants=(await client.query('select n.nspname,c.relname,a.attname,a.attacl::text from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1::text[])and a.attnum>0 and not a.attisdropped and a.attacl is not null order by n.nspname,c.relname,a.attnum',[schemas])).rows;
  state.security.policies=(await client.query('select * from pg_policies where schemaname=any($1::text[])order by schemaname,tablename,policyname',[schemas])).rows;
  state.security.functions=(await client.query("select n.nspname,p.oid::regprocedure::text signature,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=any($1::text[])and p.prokind in('f','p')order by n.nspname,p.oid::regprocedure::text",[schemas])).rows;
  state.security.views=(await client.query("select n.nspname,c.relname,pg_get_viewdef(c.oid,true) definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1::text[])and c.relkind in('v','m')order by n.nspname,c.relname",[schemas])).rows;
  state.schema=await readStampedIntakeSchemaV1(client);
  state.bucket=(await client.query('select id,public,file_size_limit,allowed_mime_types from storage.buckets where id=$1',[BUCKET])).rows;
  state.actor=(await client.query(`select u.id user_id,e.id entitlement_id,e.role,e.is_active from auth.users u join public.user_entitlements e on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email)) where u.id=$1 and e.is_active and e.role='founder' order by e.id`,[actor.userId])).rows;
  assert.equal(state.actor.length,1);assert.equal(state.actor[0].user_id,actor.userId);assert.equal(state.bucket.length,1);assert.equal(state.bucket[0].public,false);
  return state;
}

export function assertStampedClassificationPlanV1(plan){
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'Classification plan changed');
  assert.equal(plan.version,VERSION);assert.equal(plan.projectRef,PROJECT);assert.equal(plan.manifestFingerprint,manifest.fingerprint);
  same(plan.proposedEffects,EFFECTS);assert.equal(plan.builds.length,33);assert.equal(plan.before.candidates.length,33);assert.equal(plan.before.events.length,33);assert.equal(plan.before.raw.length,33);assert.equal(plan.before.evidence.length,33);
  same(plan.proposedRuns.map(x=>x.mode),['rollback','apply','replay']);assert.equal(new Set(plan.proposedRuns.map(x=>x.runId)).size,3);assert.ok(plan.proposedRuns.every(x=>uuid(x.runId)));
  assert.match(plan.intakePlanFingerprint??'',/^[a-f0-9]{64}$/);assert.match(plan.intakeRowsFingerprint??'',/^[a-f0-9]{64}$/);
  for(let i=0;i<33;i++)assertStampedClassificationBuildV1(manifest.targets[i],plan.builds[i]);
  for(const c of plan.before.candidates){assert.ok(ids.includes(c.id));assert.equal(c.state,'RAW');assert.equal(c.submitted_by_user_id,plan.actor.userId);for(const f of ['founder_approved_at','founder_approved_by_user_id','current_staging_id','promoted_at'])assert.equal(c[f]??null,null);}
}

export async function prepareStampedClassificationV1({client,actor,proposedRuns,codeFingerprint,environment,intakePlan,intakeReceipt}){
  assertStampedClassificationDatabaseV1(client,environment);assert.equal(codeFingerprint,stampedChildClassificationCodeBindingV1().fingerprint);
  assertStampedChildImagePlanV1(intakePlan);same(actor,intakePlan.actor,'Accountable original intake actor changed');
  assert.equal(intakeReceipt.pass,true);assert.equal(intakeReceipt.committed,true);assert.equal(intakeReceipt.inserts,132);assert.equal(intakeReceipt.planFingerprint,intakePlan.fingerprint);
  await client.query('begin isolation level repeatable read read only');
  try{
    const intakeRows=await readStampedIntakeRowsV1(client,intakePlan);assertStampedIntakeWrittenRowsV1(intakeRows,intakePlan);same(intakeRows,intakeReceipt.writeRows,'Actual original132 intake rows changed');
    const before=await readStampedClassificationStateV1(client,actor),builds=[];
    for(const target of manifest.targets){const build=json(await buildClassificationForCandidateV1(client,stampedChildImageIntakeKeysV1(target).candidateId));assertStampedClassificationBuildV1(target,build);builds.push(build);}
    const body={version:VERSION,projectRef:PROJECT,manifestFingerprint:manifest.fingerprint,codeFingerprint,observedAt:new Date().toISOString(),actor,before,builds,proposedRuns,proposedEffects:EFFECTS,intakePlanFingerprint:intakePlan.fingerprint,intakeRowsFingerprint:hash(intakeRows)};
    const plan={...body,fingerprint:hash(body)};assertStampedClassificationPlanV1(plan);await client.query('rollback');return plan;
  }catch(error){await client.query('rollback');throw error;}
}

export function assertStampedClassificationCommittedStateV1(plan,state){
  assertStampedClassificationAfterV1(plan,state);
  for(const key of ['reviews','foreignKeys','security','schema','bucket','actor'])same(state[key],plan.before[key],'Protected '+key+' changed');
}

export async function executeStampedClassificationV1({client,auditClient,plan,context,revalidate,verifyRawObjects}){
  assertStampedClassificationPlanV1(plan);assertStampedClassificationDatabaseV1(client,context.environment);assertStampedClassificationDatabaseV1(auditClient,context.environment);assert.notEqual(client,auditClient);
  const bound={...context,plan},check=()=>assertStampedClassificationAuthorityV1({...bound,now:new Date().toISOString()});check();
  const ledgerRows=async()=>(await auditClient.query("select id,payload_snapshot from public.contract_violations where payload_snapshot->>'programme'=$1 and payload_snapshot->>'planFingerprint'=$2 order by id",[VERSION,plan.fingerprint])).rows;
  const previousFailures=await ledgerRows();assert.ok(previousFailures.length<3,'Classification failure budget exhausted');assert.equal(previousFailures.filter(x=>x.payload_snapshot?.runId===context.runId).length,0,'A failed classification attempt is consumed');
  const source=async()=>{assert.equal(await revalidate(),plan.codeFingerprint,'Classification source changed');};
  const originals=async()=>{const proof=await verifyRawObjects();assert.equal(proof.pass,true);assert.equal(proof.objects,33);assert.equal(proof.storageWrites,0);};
  let active=false,commitAttempted=false;
  const receipt={version:VERSION,environment:context.environment,mode:context.mode,runId:context.runId,planFingerprint:plan.fingerprint,codeFingerprint:plan.codeFingerprint,pass:false,committed:false,commitUncertain:false,updates:0,inserts:0,automaticRetry:false};
  try{
    await source();await originals();await client.query(context.mode==='replay'?'begin isolation level repeatable read read only':'begin isolation level serializable');active=true;
    if(context.mode==='replay'){
      assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');
      const state=await readStampedClassificationStateV1(client,plan.actor);assertStampedClassificationCommittedStateV1(plan,state);same(state,context.committedReceipt.state,'Committed classification changed');
      await client.query('rollback');active=false;
    }else{
      assert.equal((await client.query('select pg_try_advisory_xact_lock(hashtext($1)) ok',[VERSION])).rows[0].ok,true,'Another classification owns this batch');
      await client.query("set local lock_timeout='3s'");
      same(await readStampedClassificationStateV1(client,plan.actor),plan.before,'Classification baseline changed');
      for(let i=0;i<33;i++){
        const build=json(await buildClassificationForCandidateV1(client,ids[i]));assertStampedClassificationBuildV1(manifest.targets[i],build);same(build,plan.builds[i],'Classification inputs changed');
        await applyClassificationWithinTransactionV1(client,build,{ledgerTarget:auditClient,executionContext:{programme:VERSION,planFingerprint:plan.fingerprint,runId:context.runId,mode:context.mode}});receipt.updates+=3;receipt.inserts+=3;
      }
      const state=await readStampedClassificationStateV1(client,plan.actor);assertStampedClassificationCommittedStateV1(plan,state);await source();await originals();check();
      if(context.mode==='rollback'){
        await client.query('rollback');active=false;same(await readStampedClassificationStateV1(client,plan.actor),plan.before,'Rollback left classification rows');receipt.rollbackProven=true;
      }else{
        commitAttempted=true;await client.query('commit');active=false;receipt.committed=true;receipt.state=state;
      }
    }
    await source();check();receipt.pass=true;receipt.finishedAt=new Date().toISOString();return receipt;
  }catch(error){
    error.automaticRetry=false;if(commitAttempted)error.commitUncertain=true;
    if(active){try{await client.query('rollback');}catch{error.rollbackUncertain=true;}}
    try{
      if(error.result?.violation_id)error.violationId=error.result.violation_id;
      else {const failures=await ledgerRows();assert.ok(failures.length<3);assert.equal(failures.filter(x=>x.payload_snapshot?.runId===context.runId).length,0);const r=await recordValidationFailureV1({validation:{ok:false,contract_name:'STAMPED_CHILD_CLASSIFICATION_V1',violation_type:'stamped_child_classification_failed',severity:'hard_fail',reason:String(error.message).slice(0,500),payload_snapshot:{programme:VERSION,planFingerprint:plan.fingerprint,runId:context.runId,mode:context.mode,commitUncertain:error.commitUncertain??false}},execution_name:'classification_apply_write_plan_v1',actor_type:'system_worker',source_worker:VERSION,source_system:'warehouse',ledger_target:auditClient});error.violationId=r.violation_id;}
    }catch(auditError){error.auditPersistenceFailure=String(auditError.message).slice(0,500);}
    throw error;
  }
}
