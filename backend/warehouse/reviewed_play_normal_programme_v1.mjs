import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import effects from '../../docs/catalog/reviewed_play_normal_nine_v1/warehouse-trigger-functions.json' with {type:'json'};
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {assertWarehouseTransactionContextV1} from './transaction_context_v1.mjs';
import {readGenericPlayNineIntakeFrameV1,buildGenericPlayNineIntakePlanV1,applyGenericPlayNineIntakeWithinTransactionV1}
  from './generic_play_nine_intake_v1.mjs';
import {insertCandidate} from './external_discovery_to_warehouse_bridge_v1.mjs';
import {buildCandidateArtifacts,buildPackages,applyClassificationWithinTransactionV1} from './classification_worker_v1.mjs';
import {fetchArtifacts,buildPromotionWritePlanSnapshot,createStageWithinTransaction} from './promotion_stage_worker_v1.mjs';
import {prepareWarehouseAtomicBatchV1,applyWarehouseAtomicBatchWithinTransactionV1} from './atomic_promotion_batch_v1.mjs';
import {prepareWarehouseSetInvariantsV1,assertWarehouseSetInvariantsV1} from './set_invariants_v1.mjs';
import {buildReviewedPlayNormalFinishIntakesV1} from './reviewed_play_normal_finish_intake_v1.mjs';
import {loadReviewedPlayNormalAuthorityV1,freezeReviewedPlayNormalWarehouseAuthorityV1} from './reviewed_play_normal_authority_v1.mjs';
import {expectedWarehousePrintingRowsV1} from './printing_admission_v1.mjs';
import {freezeReviewedPlayParentRegistryV1} from './parent_registry_v1.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry} from '../pricing/reviewed_play_normal_nine_registry_v1.mjs';
import {readReviewedPlayNormalNineSourceV1,readReviewedPlayNormalNineMappingSchemaV1,buildReviewedPlayNormalNinePriceLinkPlanV1,
  reviewedPlayNormalNineCodeBindingV1,applyReviewedPlayNormalNinePriceLinksWithinTransactionV1}
  from '../pricing/reviewed_play_normal_nine_price_links_v1.mjs';

export const REVIEWED_PLAY_NORMAL_PROGRAMME_V1='REVIEWED_PLAY_NORMAL_PROGRAMME_V1';
export const PROGRAMME_QUALIFICATION_DATABASE_V1='stamped_bulk_programme_qualification_v1';
export const PROGRAMME_QUALIFICATION_DATABASES_V1=Object.freeze([PROGRAMME_QUALIFICATION_DATABASE_V1,'stamped_bulk_programme_release_qualification_v1']);
const root=fileURLToPath(new URL('../../',import.meta.url));
const same=(a,b,why)=>assert.equal(hash(a),hash(b),why);
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const targets=registry.targets,parentIds=targets.map(t=>t.parent.id),childIds=targets.map(t=>t.printing.id);
const auditId='-'+BigInt('0x'+hash({version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,registry:registry.fingerprint}).slice(0,15));
const expected={warehouse_candidates:18,warehouse_stages:18,warehouse_events:144,parents:9,active_identities:9,
  printings:9,verified_reviews:9,parent_price_links:9,raw_receipts:11};
const {fingerprint:effectsFingerprint,...effectsBody}=effects;
assert.equal(effectsFingerprint,'ecdcd531f5f219dd7269daa8ce959a5d99fd8f4c0cf034ac908fca625e6e4d52');
assert.equal(hash(effectsBody),effectsFingerprint);

export async function readReviewedPlayProgrammeSchemaV1(c) {
  const names=effects.tables.map(t=>'public.'+t);
  const triggers=(await rows(c,`select cl.relname relation,t.tgname name,t.tgtype::int type,t.tgenabled enabled,
    pg_get_triggerdef(t.oid,true)definition,pg_get_functiondef(t.tgfoid)function_definition from pg_trigger t
    join pg_class cl on cl.oid=t.tgrelid where t.tgrelid=any($1::regclass[])and not t.tgisinternal order by cl.relname,t.tgname`,[names]))
    .map(t=>({...t,function_sha256:createHash('sha256').update(t.function_definition).digest('hex')}));
  same(triggers,effects.triggers,'warehouse_recursive_trigger_effects_changed');
  const schema={triggers,columns:await rows(c,"select table_name,column_name,data_type,udt_name,is_nullable,column_default,is_identity,is_generated,generation_expression from information_schema.columns where table_schema='public'and table_name=any($1::text[])order by table_name,ordinal_position",[effects.tables]),
    constraints:await rows(c,"select c.relname relation,k.conname name,pg_get_constraintdef(k.oid,true)definition from pg_constraint k join pg_class c on c.oid=k.conrelid where k.conrelid=any($1::regclass[])order by 1,2",[names]),
    indexes:await rows(c,"select tablename,indexname,indexdef from pg_indexes where schemaname='public'and tablename=any($1::text[])order by 1,2",[effects.tables]),
    rules:await rows(c,"select schemaname,tablename,rulename,definition from pg_rules where schemaname='public'and tablename=any($1::text[])order by 1,2,3",[effects.tables]),
    security:await rows(c,"select relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner)owner,relacl::text acl from pg_class where oid=any($1::regclass[])order by relname",[names]),
    policies:await rows(c,"select *from pg_policies where schemaname='public'and tablename=any($1::text[])order by tablename,policyname",[effects.tables]),
    nested_set_identity_function:(await rows(c,"select pg_get_functiondef('public.resolve_set_identity_model(uuid)'::regprocedure)definition"))[0]};
  assert.equal(schema.rules.length,0);assert.ok(!/\b(insert\s+into|delete\s+from|update\s+\w+\s+set|execute)\b/i.test(schema.nested_set_identity_function.definition),
    'nested_set_identity_effect_requires_review');return schema;
}
function prospectiveExecutions() {
  const {index,manifests}=loadReviewedPlayNormalAuthorityV1();
  return targets.flatMap(t=>{
    const original=index.targets.find(p=>p.product_id===t.product_id),bundle=freezeReviewedPlayNormalWarehouseAuthorityV1({productId:t.product_id,candidateId:t.printing_candidate_id});
    const expectedRows=expectedWarehousePrintingRowsV1(bundle);
    return [{mutation:{type:'insert_card_print',parent_registry_admission:original.parent_registry_admission}},
      {mutation:{type:'reviewed_printing_admission',admission:{parent:{set_id:t.parent.set_id},bundle:{manifest:manifests.get(t.parent.set_code)},
        target:{finish_key:'normal'},expected:expectedRows,existing:null}}}];
  });
}
export async function prepareReviewedPlayNormalProgrammePlanV1(c,{preparedAt=new Date().toISOString()}={}) {
  const intake=buildGenericPlayNineIntakePlanV1(await readGenericPlayNineIntakeFrameV1(c)),finishIntakes=buildReviewedPlayNormalFinishIntakesV1(intake);
  const schema=await readReviewedPlayProgrammeSchemaV1(c),source=await readReviewedPlayNormalNineSourceV1(c),mappingSchema=await readReviewedPlayNormalNineMappingSchemaV1(c);
  const priceLinks=buildReviewedPlayNormalNinePriceLinkPlanV1({source,schema:mappingSchema,preparedAt});
  const physical=loadReviewedPlayNormalAuthorityV1().index;
  for(const t of physical.targets) {
    const proposed=intake.candidates.find(c=>c.tcgplayer_id===String(t.product_id));
    const actual=await freezeReviewedPlayParentRegistryV1(c,{candidate:{...proposed,id:proposed.planned_candidate_id},parent:t.parent_registry_admission.target});
    same(actual,t.parent_registry_admission,'programme_current_identity_projection_changed');
  }
  const candidateIds=[...intake.candidates,...finishIntakes].map(c=>c.planned_candidate_id);
  assert.equal((await rows(c,'select id from public.canon_warehouse_candidates where id=any($1::uuid[])',[candidateIds])).length,0,'new_programme_warehouse_uuid_collision');
  assert.equal((await rows(c,'select id from public.card_prints where id=any($1::uuid[])or gv_id=any($2::text[])',[parentIds,targets.map(t=>t.parent.gv_id)])).length,0,'new_programme_parent_uuid_or_public_id_collision');
  assert.equal((await rows(c,'select id from public.card_printings where id=any($1::uuid[])or printing_gv_id=any($2::text[])',[childIds,targets.map(t=>t.printing.printing_gv_id)])).length,0,'new_programme_printing_uuid_or_public_id_collision');
  assert.equal((await rows(c,'select id from public.external_mappings where id=any($1::bigint[])or(source=\'tcgplayer\'and external_id=any($2::text[]))',[targets.map(t=>t.mapping_id),targets.map(t=>String(t.product_id))])).length,0,'programme_mapping_collision');
  assert.equal((await rows(c,'select id from public.raw_imports where id=any($1::bigint[])',[[auditId,priceLinks.audit_raw_id,...targets.map(t=>t.printing_evidence_raw_id)]])).length,0,'programme_audit_collision');
  const profiles=await prepareWarehouseSetInvariantsV1(c,prospectiveExecutions(),{parentMappingAdditions:targets.map(t=>({set_id:t.parent.set_id,id:t.mapping_id}))});
  const body={version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,project_ref:'ycdxbpibncqcchqiihfz',registry_fingerprint:registry.fingerprint,
    prepared_at:preparedAt,intake,finish_intakes:finishIntakes,candidate_ids:candidateIds,schema,schema_fingerprint:hash(schema),price_links:priceLinks,
    set_profiles:profiles,expected,audit_raw_id:auditId,code_fingerprint:priceLinks.code_binding.fingerprint,
    existing_rows_updated:0,existing_uuid_reassigned:false,publication_activation:false,held_identity_clearance:false};
  return {...body,fingerprint:hash(body)};
}
function assertPlan(plan) {
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint);assert.equal(plan.version,REVIEWED_PLAY_NORMAL_PROGRAMME_V1);
  assert.equal(plan.project_ref,'ycdxbpibncqcchqiihfz');assert.equal(plan.registry_fingerprint,registry.fingerprint);same(plan.expected,expected,'programme_scope_changed');
  assert.equal(plan.existing_rows_updated,0);assert.equal(plan.existing_uuid_reassigned,false);assert.equal(plan.publication_activation,false);assert.equal(plan.held_identity_clearance,false);
  assert.equal(plan.audit_raw_id,auditId);same(buildReviewedPlayNormalFinishIntakesV1(plan.intake),plan.finish_intakes,'printing_raw_scope_changed');
  assert.equal(plan.code_fingerprint,plan.price_links.code_binding.fingerprint,'programme_producer_binding_changed');
}
async function assertDecision(c,plan,decision,{qualification,releaseGate}) {
  assert.equal(decision?.version,'REVIEWED_PLAY_NORMAL_PROGRAMME_OWNER_DECISION_V1');assert.equal(decision.decision,'approved');
  assert.equal(decision.programme_plan_fingerprint,plan.fingerprint);assert.equal(decision.code_fingerprint,plan.code_fingerprint);
  assert.match(decision.actor_user_id??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  const at=Date.parse(decision.approved_at),until=Date.parse(decision.expires_at);
  assert.ok(Number.isFinite(at)&&Number.isFinite(until)&&at<=Date.now()+300000&&until>Date.now()&&until-at<=24*3600000,'programme_decision_expired_or_invalid');
  assert.match(decision.owner_evidence_sha256??'',/^[a-f0-9]{64}$/);
  if(qualification) {
    assert.ok(['127.0.0.1','localhost','::1'].includes(c.connectionParameters?.host));
    assert.ok(PROGRAMME_QUALIFICATION_DATABASES_V1.includes((await rows(c,'select current_database()name'))[0].name),'owned_programme_qualification_database_required');
    assert.equal(decision.actual_owner_decision,false);assert.equal(decision.actor_user_id,'00000000-0000-4000-a000-000000000901');
  }else {
    assert.equal(decision.actual_owner_decision,true,'explicit_real_owner_programme_decision_required');
    const parameters=c.connectionParameters;
    assert.ok(String(parameters?.host).includes('ycdxbpibncqcchqiihfz')||String(parameters?.user).endsWith('.ycdxbpibncqcchqiihfz'),'canonical_project_connection_required');
    assert.equal(c.connection?.stream?.authorized,true,'verified_production_tls_required');
    const sanity=(await rows(c,'select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits'))[0];
    assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
    const founder=(await rows(c,`select count(*)::int n,bool_and(actor.id=$1::uuid)matches from (
      select distinct u.id from auth.users u join public.user_entitlements e on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email))
      where e.is_active and e.role='founder')actor`,[decision.actor_user_id]))[0];
    assert.equal(founder.n,1);assert.equal(founder.matches,true,'actual_founder_entitlement_required');
    assert.equal(releaseGate?.version,'REVIEWED_PLAY_NORMAL_PROGRAMME_SOURCE_RELEASE_V1');assert.equal(releaseGate.code_fingerprint,plan.code_fingerprint);
    for(const key of ['normal_commit_passed','normal_push_passed','hosted_checks_passed','exact_head_review_passed','merged_source_checks_passed','deployed_readback_passed'])assert.equal(releaseGate[key],true,'whole_source_release_gate_required:'+key);
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    assert.equal(git(['rev-parse','HEAD']),releaseGate.execution_commit);assert.equal(git(['status','--porcelain','--untracked-files=no']),'');
  }
}
async function approve(c,candidateId,plan,decision) {
  await assertExecuteCanonWriteV1({execution_name:'warehouse_programme_founder_approval_v1',payload_snapshot:{candidate_id:candidateId,
    programme_fingerprint:plan.fingerprint,owner_evidence_sha256:decision.owner_evidence_sha256},write_target:c,audit_target:c,ledger_target:c,
    transaction_control:'external',actor_type:'founder',actor_id:decision.actor_user_id,source_worker:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,source_system:'warehouse',
    contract_assertions:[{ok:plan.candidate_ids.includes(candidateId),contract_name:'INGESTION_PIPELINE_CONTRACT_V1',violation_type:'candidate_outside_programme',reason:'One explicit programme decision binds each internal candidate approval.'}],
    proofs:[{name:'exact_programme_approval_roundtrip',contract_name:'INGESTION_PIPELINE_CONTRACT_V1',violation_type:'approval_readback_failed',
      async run(client){const found=await rows(client,"select id from public.canon_warehouse_candidates where id=$1 and state='APPROVED_BY_FOUNDER'and founder_approved_by_user_id=$2 and founder_approved_at=$3",[candidateId,decision.actor_user_id,decision.approved_at]);return {ok:found.length===1};}}],
    async write(client){assert.equal((await client.query("update public.canon_warehouse_candidates set state='APPROVED_BY_FOUNDER',founder_approved_by_user_id=$2,founder_approved_at=$3,founder_approval_notes=$4,current_review_hold_reason=null where id=$1 and state='REVIEW_READY'and founder_approved_at is null",[candidateId,decision.actor_user_id,decision.approved_at,'Explicit consolidated programme '+plan.fingerprint])).rowCount,1);
      assert.equal((await client.query("insert into public.canon_warehouse_candidate_events(candidate_id,event_type,action,previous_state,next_state,actor_user_id,actor_type,metadata)values($1,'FOUNDER_APPROVED','APPROVE','REVIEW_READY','APPROVED_BY_FOUNDER',$2,'FOUNDER',$3::jsonb)",
        [candidateId,decision.actor_user_id,JSON.stringify({programme_fingerprint:plan.fingerprint,owner_evidence_sha256:decision.owner_evidence_sha256,actual_owner_decision:decision.actual_owner_decision})])).rowCount,1);}});
}
async function prepareCandidates(c,candidates,plan,decision,{printing=false}={}) {
  const stages=[];
  for(const proposed of candidates) {
    const artifact=await buildCandidateArtifacts(c,proposed.planned_candidate_id);assert.equal(artifact.candidate.state,'RAW');
    const packages=await buildPackages(c,artifact);assert.equal(packages.candidateSummary.state,'REVIEW_READY');
    assert.equal(packages.classificationPackage.proposed_action_type,printing?'CREATE_CARD_PRINTING':'CREATE_CARD_PRINT');
    await applyClassificationWithinTransactionV1(c,packages);await approve(c,proposed.planned_candidate_id,plan,decision);
    const actual=await fetchArtifacts(c,proposed.planned_candidate_id);
    const authority=printing?freezeReviewedPlayNormalWarehouseAuthorityV1({productId:proposed.tcgplayer_id,candidateId:proposed.planned_candidate_id}):null;
    const writePlan=await buildPromotionWritePlanSnapshot(c,{candidate:actual.candidate,metadataExtraction:actual.latestMetadataExtractionPackage,
      interpreterPackage:actual.latestInterpreterPackage?.value,normalizationPackage:actual.latestNormalizationPackage?.promotion_image_normalization_package,
      identityAuditPackage:actual.latestIdentityAuditPackage?.value,classificationPackage:actual.latestClassificationPackage?.value,printingAuthority:authority});
    assert.equal(writePlan.status,'READY');const stage=await createStageWithinTransaction(c,actual,writePlan,new Date().toISOString());
    assert.equal(stage.status,'applied');stages.push(stage.staging_id);
  }
  return prepareWarehouseAtomicBatchV1(c,{stageIds:stages,lock:true});
}
async function newRecordDigests(c,plan,{includeProgrammeAudit=true}={}) {
  const rawIds=[...targets.map(t=>t.printing_evidence_raw_id),plan.price_links.audit_raw_id,...(includeProgrammeAudit?[auditId]:[])];
  const scopes=[['canon_warehouse_candidates','id',plan.candidate_ids],['canon_warehouse_promotion_staging','candidate_id',plan.candidate_ids],
    ['canon_warehouse_candidate_events','candidate_id',plan.candidate_ids],['card_prints','id',parentIds],['card_print_identity','card_print_id',parentIds],
    ['card_printings','card_print_id',parentIds],['card_printing_truth_reviews','card_printing_id',childIds],
    ['external_mappings','id',targets.map(t=>t.mapping_id)],['raw_imports','id',rawIds]];
  const result=[];
  for(const [table,column,ids]of scopes) {
    const type=['raw_imports','external_mappings'].includes(table)?'bigint':'uuid';
    const records=await rows(c,`select t.id::text id,to_jsonb(t)row from public.${table} t where ${column}=any($1::${type}[])order by t.id`,[ids]);
    result.push({table,count:records.length,records:records.map(r=>({id:r.id,sha256:hash(r.row)}))});
  }
  const count=table=>result.find(r=>r.table===table).count;
  assert.equal(count('canon_warehouse_candidates'),18);assert.equal(count('canon_warehouse_promotion_staging'),18);
  assert.equal(count('canon_warehouse_candidate_events'),144);
  for(const table of ['card_prints','card_print_identity','card_printings','card_printing_truth_reviews','external_mappings'])assert.equal(count(table),9);
  assert.equal(count('raw_imports'),includeProgrammeAudit?11:10);return result;
}
export async function applyReviewedPlayNormalProgrammeWithinTransactionV1(c,{plan,decision,qualification=false,releaseGate=null}) {
  assertPlan(plan);await assertWarehouseTransactionContextV1(c,{serializable:true});await assertDecision(c,plan,decision,{qualification,releaseGate});
  same(reviewedPlayNormalNineCodeBindingV1(),plan.price_links.code_binding,'programme_source_changed');
  for(const name of ['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1',REVIEWED_PLAY_NORMAL_PROGRAMME_V1])
    assert.equal((await rows(c,'select pg_try_advisory_xact_lock(hashtext($1))acquired',[name]))[0].acquired,true,'programme_competing_writer');
  same(await readReviewedPlayProgrammeSchemaV1(c),plan.schema,'programme_schema_changed');
  const fresh=await prepareReviewedPlayNormalProgrammePlanV1(c,{preparedAt:plan.prepared_at});same(fresh,plan,'programme_before_state_changed');
  await applyGenericPlayNineIntakeWithinTransactionV1(c,{plan:plan.intake,actorUserId:decision.actor_user_id});
  const parentPlan=await prepareCandidates(c,plan.intake.candidates,plan,decision);
  const parentResult=await applyWarehouseAtomicBatchWithinTransactionV1(c,parentPlan);assert.equal(parentResult.results.length,9);
  for(const candidate of plan.finish_intakes)await insertCandidate(c,decision.actor_user_id,candidate,{candidateId:candidate.planned_candidate_id});
  const printingPlan=await prepareCandidates(c,plan.finish_intakes,plan,decision,{printing:true});
  const printingResult=await applyWarehouseAtomicBatchWithinTransactionV1(c,printingPlan);assert.equal(printingResult.results.length,9);
  const links=await applyReviewedPlayNormalNinePriceLinksWithinTransactionV1(c,{plan:plan.price_links,actorUserId:decision.actor_user_id});assert.equal(links.mappings,9);
  await assertWarehouseSetInvariantsV1(c,plan.set_profiles,{after:true});
  const records=await newRecordDigests(c,plan,{includeProgrammeAudit:false});
  const payload={version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,
    expected,owner_evidence_sha256:decision.owner_evidence_sha256,actual_owner_decision:decision.actual_owner_decision,records_fingerprint:hash(records),
    parent_internal_plan:parentPlan.fingerprint,printing_internal_plan:printingPlan.fingerprint,price_link_plan:plan.price_links.fingerprint};
  assert.equal((await c.query("insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,'processed',$3,$4::jsonb)",
    [auditId,REVIEWED_PLAY_NORMAL_PROGRAMME_V1,'Consolidated reviewed parent/identity/Normal/product-link programme; no existing row or stored price changes.',JSON.stringify(payload)])).rowCount,1);
  same(await readReviewedPlayProgrammeSchemaV1(c),plan.schema,'programme_precommit_schema_changed');
  await assertWarehouseSetInvariantsV1(c,plan.set_profiles,{after:true});
  const body={version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,plan_fingerprint:plan.fingerprint,records:await newRecordDigests(c,plan),
    expected,set_profile_fingerprints:plan.set_profiles.map(p=>p.fingerprint),price_source_fingerprint:plan.price_links.source_fingerprint};
  return {...body,fingerprint:hash(body),transaction_owned_by_caller:true};
}

export async function verifyReviewedPlayNormalProgrammeReceiptV1(c,{plan,receipt}) {
  assertPlan(plan);const {fingerprint,transaction_owned_by_caller,...body}=receipt;assert.equal(hash(body),fingerprint);assert.equal(receipt.plan_fingerprint,plan.fingerprint);
  same(await newRecordDigests(c,plan),receipt.records,'programme_independent_record_readback_changed');
  await assertWarehouseSetInvariantsV1(c,plan.set_profiles,{after:true});return {exact:true,write_count:0,automatic_retry_allowed:false};
}

export async function runReviewedPlayNormalProgrammeV1({client:c,plan,decision=null,mode='preflight',qualification=false,
  releaseGate=null,rollbackReceipt=null,committedReceipt=null,beforeCommit=async()=>{}}) {
  assertPlan(plan);assert.ok(['preflight','rollback','apply','readback'].includes(mode));
  let ready;const listen=m=>{ready=m.status;};assert.ok(c.connection&&typeof c.connection.once==='function','dedicated_real_pg_client_required');
  c.connection.once('readyForQuery',listen);try{await c.query('select 1');}finally{c.connection.removeListener('readyForQuery',listen);}
  assert.equal(ready,'I','dedicated_idle_programme_client_required');
  if(mode==='apply'&&!committedReceipt) {
    assert.equal(rollbackReceipt?.version,REVIEWED_PLAY_NORMAL_PROGRAMME_V1);assert.equal(rollbackReceipt.mode,'rollback');
    assert.equal(rollbackReceipt.plan_fingerprint,plan.fingerprint);assert.equal(rollbackReceipt.code_fingerprint,plan.code_fingerprint);
    assert.equal(rollbackReceipt.rollback_proven,true,'matching_actual_whole_programme_rollback_required');
  }
  let started=false,commitSent=false,committed=false,proposedReceipt=null;
  try {
    started=true;await c.query(mode==='preflight'||committedReceipt||mode==='readback'?
      'begin isolation level repeatable read read only':'begin isolation level serializable');
    await c.query("set local lock_timeout='3s'");
    if(committedReceipt) {
      await verifyReviewedPlayNormalProgrammeReceiptV1(c,{plan,receipt:committedReceipt});await c.query('rollback');started=false;
      return {version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,mode,status:'already_applied',write_count:0,committed:false,
        plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,receipt:committedReceipt,automatic_retry_allowed:false};
    }
    assert.notEqual(mode,'readback','exact_committed_receipt_required');
    if(mode==='preflight') {
      same(await prepareReviewedPlayNormalProgrammePlanV1(c,{preparedAt:plan.prepared_at}),plan,'programme_preflight_drift');
      await c.query('rollback');started=false;
      return {version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,mode,status:'prepared',write_count:0,committed:false,
        plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,automatic_retry_allowed:false};
    }
    proposedReceipt=await applyReviewedPlayNormalProgrammeWithinTransactionV1(c,{plan,decision,qualification,releaseGate});
    if(mode==='apply'){await beforeCommit(proposedReceipt);commitSent=true;await c.query('commit');committed=true;}
    else await c.query('rollback');started=false;
    if(mode==='rollback')same(await prepareReviewedPlayNormalProgrammePlanV1(c,{preparedAt:plan.prepared_at}),plan,'programme_rollback_not_exact');
    return {version:REVIEWED_PLAY_NORMAL_PROGRAMME_V1,mode,status:committed?'committed':'rolled_back',committed,
      plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,rollback_proven:mode==='rollback',
      receipt:proposedReceipt,receipt_is_committed:committed,automatic_retry_allowed:false};
  }catch(error) {
    error.committed=committed;error.commit_uncertain=commitSent&&!committed;error.rollback_uncertain=false;
    error.proposed_receipt=proposedReceipt;error.automatic_retry_allowed=false;
    if(started&&!committed)await c.query('rollback').catch(()=>{error.rollback_uncertain=true;});throw error;
  }
}
