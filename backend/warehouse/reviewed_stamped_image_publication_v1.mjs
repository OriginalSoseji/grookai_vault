import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {operationsSha256V1 as hash} from '../operations/operations_control_plane_v1.mjs';
import {validateFounderOutcomeCommandV1,FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY} from '../operations/founder_outcome_workflow_v1.mjs';
import {REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,REVIEWED_STAMPED_IMAGE_CEILINGS_V1,
  validateReviewedStampedImagePublicationPlanV1,validateReviewedStampedImageOutcomeWorkflowV1,
  reviewedStampedImageCodeBindingV1,validateReviewedStampedImageSourceReleaseV1,
  assertReviewedStampedImageCommittedSourceV1} from '../operations/reviewed_stamped_image_outcome_v1.mjs';
import {prepareReviewedCardPlaneAssetV1,finalizeReviewedCardPlaneAssetV1} from './reviewed_card_plane_asset_v1.mjs';
import {prepareReviewedExistingChildImageV1} from './reviewed_existing_child_image_v1.mjs';
import {readReviewedPlayProgrammeSchemaV1} from './reviewed_play_normal_programme_v1.mjs';
import {assertWarehouseTransactionContextV1} from './transaction_context_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {fetchArtifacts,buildPromotionWritePlanSnapshot,createStageWithinTransaction} from './promotion_stage_worker_v1.mjs';
import {prepareWarehouseAtomicBatchV1,applyWarehouseAtomicBatchWithinTransactionV1,
  verifyWarehouseAtomicBatchReceiptV1} from './atomic_promotion_batch_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};

const targets=scope.targets,ids=targets.map(t=>t.candidate_id),parentIds=targets.map(t=>t.parent_id),childIds=targets.map(t=>t.printing_id);
const equal=(a,b,why)=>assert.equal(hash(a),hash(b),why);
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const json=async(c,sql,args=[])=>(await rows(c,sql,args)).map(r=>r.row);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const RECEIPT='REVIEWED_STAMPED_IMAGE_PUBLICATION_RECEIPT_V1';
export const REVIEWED_IMAGE_PUBLICATION_QUALIFICATION_DATABASES_V1=Object.freeze([
  'reviewed_image_publication_qualification_v1','reviewed_image_publication_qualification_v1_commit_loss',
  'reviewed_image_publication_qualification_v1_rollback_loss',
  'reviewed_image_publication_qualification_v2','reviewed_image_publication_qualification_v2_commit_loss',
  'reviewed_image_publication_qualification_v2_rollback_loss',
  'reviewed_image_publication_qualification_v3','reviewed_image_publication_qualification_v3_commit_loss',
  'reviewed_image_publication_qualification_v3_rollback_loss',
  'reviewed_image_publication_qualification_v4','reviewed_image_publication_qualification_v4_commit_loss',
  'reviewed_image_publication_qualification_v4_rollback_loss',
  'reviewed_image_publication_qualification_v5','reviewed_image_publication_qualification_v5_commit_loss',
  'reviewed_image_publication_qualification_v5_rollback_loss',
  'reviewed_image_publication_qualification_v6','reviewed_image_publication_qualification_v6_commit_loss',
  'reviewed_image_publication_qualification_v6_rollback_loss',
  'reviewed_image_publication_qualification_v7','reviewed_image_publication_qualification_v7_commit_loss',
  'reviewed_image_publication_qualification_v7_rollback_loss',
  'reviewed_image_publication_qualification_v8','reviewed_image_publication_qualification_v8_commit_loss',
  'reviewed_image_publication_qualification_v8_rollback_loss',
  'reviewed_image_publication_qualification_v9','reviewed_image_publication_qualification_v9_commit_loss',
  'reviewed_image_publication_qualification_v9_rollback_loss',
  'reviewed_image_publication_qualification_v10','reviewed_image_publication_qualification_v10_commit_loss',
  'reviewed_image_publication_qualification_v10_rollback_loss']);

export async function assertReviewedImageDatabaseV1(c,{qualification=false}={}){
  const actual=(await rows(c,"select current_database() name,current_setting('TimeZone') timezone"))[0];
  assert.equal(actual.timezone,'UTC','image_session_timezone_must_be_UTC');
  if(qualification){
    assert.ok(['127.0.0.1','localhost','::1'].includes(c.connectionParameters?.host),'qualification_loopback_required');
    assert.ok(REVIEWED_IMAGE_PUBLICATION_QUALIFICATION_DATABASES_V1.includes(actual.name),'owned_image_qualification_database_required');
  }else{
    assert.equal(actual.name,'postgres');
    const p=c.connectionParameters;
    assert.ok(p?.host=== 'db.ycdxbpibncqcchqiihfz.supabase.co'||
      (p?.host==='aws-1-us-east-2.pooler.supabase.com'&&p?.user==='postgres.ycdxbpibncqcchqiihfz'),'canonical_image_database_required');
    assert.equal(c.connection?.stream?.authorized,true,'image_verified_production_TLS_required');
    const sanity=(await rows(c,'select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits'))[0];
    assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
  }
}

export async function readReviewedImageStateV1(c,{lock=false}={}){
  const suffix=lock?' for update':'';
  const state={};
  for(const [key,table,column,values]of [
    ['candidates','canon_warehouse_candidates','id',ids],['evidence','canon_warehouse_candidate_evidence','candidate_id',ids],
    ['events','canon_warehouse_candidate_events','candidate_id',ids],['staging','canon_warehouse_promotion_staging','candidate_id',ids],
    ['parents','card_prints','id',parentIds],['children','card_printings','id',childIds],
    ['reviews','card_printing_truth_reviews','card_printing_id',childIds],['identities','card_print_identity','card_print_id',parentIds],
  ])state[key]=await json(c,`select to_jsonb(t)row from public.${table} t where ${column}=any($1::uuid[])order by id${suffix}`,[values]);
  for(const name of ['candidates','parents','children'])assert.equal(state[name].length,33,'exact33_'+name+'_required');
  return state;
}

// Hash scoped base-table rows inside PostgreSQL so bigint/numeric precision is
// retained. These are reads only, including owner, mapping and pricing rows.
export async function readReviewedImageProtectionV1(c){
  const relations=await rows(c,`select c.relname table_name,array_agg(a.attname::text order by a.attname)columns
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    where n.nspname='public'and c.relkind in('r','p')and a.atttypid='uuid'::regtype
    and a.attname in('card_print_id','card_printing_id')
    group by c.relname order by c.relname`);
  const result=[];
  for(const r of relations){
    assert.match(r.table_name,/^[a-z_][a-z0-9_]*$/);
    const predicates=r.columns.map(name=>{assert.ok(['card_print_id','card_printing_id'].includes(name));return `"${name}"=any($${name==='card_print_id'?1:2}::uuid[])`;});
    const args=[parentIds,childIds];
    const row=(await rows(c,`with frame as(select $1::uuid[]p,$2::uuid[]c),records as(
      select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')h from public."${r.table_name}" t
      where (${predicates.join(' or ')})${r.table_name==='card_printings'?'and not(t.id=any($2::uuid[]))':''})select count(*)::int rows,
      encode(sha256(convert_to(coalesce(string_agg(h,''order by h),''),'UTF8')),'hex')digest from records`,args))[0];
    result.push({table:r.table_name,columns:r.columns,...row});
  }
  return result;
}

async function metadataForState(c,state,item){
  const candidate=state.candidates.find(r=>r.id===item.candidate_id),parent=state.parents.find(r=>r.id===item.parent_id),child=state.children.find(r=>r.id===item.printing_id);
  const evidence=state.evidence.filter(r=>r.candidate_id===candidate.id&&r.evidence_slot==='front');assert.equal(evidence.length,1);
  assert.equal(item.prepared_asset.source_refs.front_evidence_id,evidence[0].id,'prepared_front_evidence_id_changed');
  assert.equal(item.prepared_asset.source_refs.front_storage_path,evidence[0].storage_path,'prepared_front_evidence_path_changed');
  const events=state.events.filter(r=>r.candidate_id===candidate.id);
  equal(events.map(e=>e.event_type).sort(),['NORMALIZATION_PARTIAL','STAMPED_CHILD_IMAGE_SOURCE_SUBMITTED_V1','CLASSIFICATION_COMPLETE','WAREHOUSE_REVIEW_READY'].sort(),'original_unconsumed_image_history_required');
  const classification=events.find(e=>e.event_type==='CLASSIFICATION_COMPLETE').metadata.classification_package;
  const ref=item.metadata.visual_review_reference;let review;
  if(ref.kind==='authenticated_founder_operations_decision'){
    const workItem=(await json(c,'select to_jsonb(t)row from public.founder_work_items t where id=$1',[ref.task_id]))[0];
    const decisions=await json(c,'select to_jsonb(t)row from public.founder_decisions t where work_item_id=$1 order by created_at,id',[ref.task_id]);
    assert.equal(decisions.length,1,'original_visual_decision_history_changed');assert.equal(decisions[0].id,ref.decision_id);
    review={kind:ref.kind,workItem,decision:decisions[0]};
  }else review={kind:ref.kind,recordBytes:Buffer.from(item.retained_chat_record_base64,'base64'),expectedSha256:ref.record_sha256};
  return prepareReviewedExistingChildImageV1({candidate,parent,child,truthReviews:state.reviews,frontEvidence:evidence[0],
    classificationPackage:classification,original:evidence[0].metadata_payload.original_image,review});
}

export async function prepareReviewedImagePublicationPlanV1(c,{sourceCommitSha,preparedAssets,metadataProposals,
  retainedChatRecords,preparedAt=new Date().toISOString(),expiresAt=new Date(Date.parse(preparedAt)+86400000).toISOString()}){
  const state=await readReviewedImageStateV1(c);assert.equal(state.staging.length,0,'original_candidates_must_have_no_stages');
  const schema=await readReviewedPlayProgrammeSchemaV1(c),protection=await readReviewedImageProtectionV1(c),items=[];
  assert.equal(preparedAssets.length,33);assert.equal(metadataProposals.length,33);
  for(const t of targets){
    const proposed=metadataProposals.find(p=>p.candidate_id===t.candidate_id),prepared=preparedAssets.find(p=>p.candidate_id===t.candidate_id);
    assert.ok(proposed&&prepared);const {buffer,...preparedAsset}=prepared;
    // Operator artifact conveniences are not part of the sealed preparer output.
    const assetKeys=['version','status','candidate_id','printing_id','source_refs','asset','frame_review','method','canonical_writes_authorized','preparation_fingerprint'];
    const item={candidate_id:t.candidate_id,parent_id:t.parent_id,printing_id:t.printing_id,
      prepared_asset:Object.fromEntries(assetKeys.map(key=>[key,preparedAsset[key]])),
      metadata:Object.fromEntries(['version','candidate_id','normalized_metadata_package','interpreter_package','canonical_target','visual_review_reference',
        'requires_separate_execution_approval','production_writes_authorized'].map(key=>[key,proposed[key]])),
      retained_chat_record_base64:retainedChatRecords?.[t.printing_gv_id]??null};
    equal(await metadataForState(c,state,item),item.metadata,'reviewed_metadata_or_current_identity_changed');items.push(item);
  }
  const body={version:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,project_ref:scope.project_ref,scope_fingerprint:scope.fingerprint,
    source_commit_sha:sourceCommitSha,code_binding:reviewedStampedImageCodeBindingV1(),prepared_at:preparedAt,expires_at:expiresAt,
    before_state_fingerprint:hash(state),schema_fingerprint:hash(schema),protection_fingerprint:hash(protection),items,ceilings:REVIEWED_STAMPED_IMAGE_CEILINGS_V1};
  const plan={...body,fingerprint:hash(body)};validateReviewedStampedImagePublicationPlanV1(plan);return plan;
}

export async function assertReviewedImagePlanBeforeV1(c,plan,{lock=false}={}){
  validateReviewedStampedImagePublicationPlanV1(plan);
  assert.equal(hash(await readReviewedPlayProgrammeSchemaV1(c)),plan.schema_fingerprint,'image_schema_changed');
  const state=await readReviewedImageStateV1(c,{lock});assert.equal(hash(state),plan.before_state_fingerprint,'image_before_state_changed');
  assert.equal(hash(await readReviewedImageProtectionV1(c)),plan.protection_fingerprint,'image_protected_references_changed');
  for(const i of plan.items)equal(await metadataForState(c,state,i),i.metadata,'image_review_or_identity_changed');
  return state;
}

async function download(sdk,path){const r=await sdk.storage.from('user-card-images').download(path);if(r.error)throw new Error('image_storage_download_failed:'+r.error.message);return Buffer.from(await r.data.arrayBuffer());}
export async function prepareReviewedImageStorageV1(sdk,plan,{upload=false}={}){
  validateReviewedStampedImagePublicationPlanV1(plan);assert.equal(typeof upload,'boolean');
  const bucket=await sdk.storage.getBucket('user-card-images');if(bucket.error)throw new Error(bucket.error.message);
  assert.equal(bucket.data?.public,false,'image_bucket_must_remain_private');const packages=[];let created=0,uploadAttempts=0,ambiguousReconciled=0;
  for(const i of plan.items){
    const p=i.prepared_asset,original=await download(sdk,p.source_refs.front_storage_path);
    const prepared=await prepareReviewedCardPlaneAssetV1({candidateId:i.candidate_id,printingId:i.printing_id,originalBuffer:original,
      expectedOriginal:p.asset,frameReview:p.frame_review,frontEvidence:{id:p.source_refs.front_evidence_id,candidate_id:i.candidate_id,
        evidence_slot:'front',storage_path:p.source_refs.front_storage_path,metadata_payload:{original_image:{...p.asset,
          path:p.source_refs.front_storage_path,mimeType:p.asset.mime_type}}}});
    const {buffer,...actual}=prepared;equal(actual,p,'image_preparation_changed');
    let result=await sdk.storage.from('user-card-images').download(p.asset.storage_path),disposition='existing_exact';
    if(result.error){
      assert.equal(String(result.error.statusCode??result.error.status),'404','image_storage_error_requires_reconciliation');
      assert.equal(upload,true,'derived_image_not_uploaded');
      // No retry after an ambiguous upload. The next independent read reconciles
      // its exact immutable bytes; nothing is ever overwritten or deleted.
      uploadAttempts++;
      const written=await sdk.storage.from('user-card-images').upload(p.asset.storage_path,buffer,{contentType:'image/jpeg',upsert:false});
      result=await sdk.storage.from('user-card-images').download(p.asset.storage_path);
      if(result.error)throw new Error('image_upload_requires_independent_reconciliation');
      if(!written.error){created++;disposition='created';}
      else ambiguousReconciled++;
    }
    const derived=Buffer.from(await result.data.arrayBuffer());
    const normalization=await finalizeReviewedCardPlaneAssetV1({prepared,downloadedBuffer:derived,
      storageReceipt:{bucket:'user-card-images',storage_path:p.asset.storage_path,upsert:false,disposition}});
    assert.equal(sha(await download(sdk,p.source_refs.front_storage_path)),p.asset.sha256,'original_evidence_changed_after_copy');
    packages.push({candidate_id:i.candidate_id,normalization_package:normalization});
  }
  assert.equal(packages.length,33);return {packages,created,upload_attempts:uploadAttempts,
    ambiguous_uploads_reconciled:ambiguousReconciled,verified:33,bytes:2381453};
}

export async function assertReviewedImageCommandV1(c,plan,{commandId,leaseToken,headSha},
  {stageKey='apply_reviewed_image_publication_v1',lock=true,qualification=false}={}){
  await assertReviewedImageDatabaseV1(c,{qualification});if(!qualification)assertReviewedStampedImageCommittedSourceV1(plan);
  const record=(await rows(c,`select to_jsonb(c)command,to_jsonb(d)decision,to_jsonb(w)item
    from public.operations_commands c join public.founder_decisions d on d.id=c.decision_id
    join public.founder_work_items w on w.id=c.work_item_id where c.id=$1 ${lock?'for update of c,w':''}`,[commandId]))[0];
  assert.ok(record,'actual_image_execution_command_required');const {command,decision,item}=record;
  validateFounderOutcomeCommandV1(command,{registry:FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,headSha});
  const authorized=validateReviewedStampedImageOutcomeWorkflowV1(command.frozen_scope.plan_payload.outcome_workflow,{headSha});
  assert.equal(authorized.fingerprint,plan.fingerprint,'command_image_plan_changed');
  validateReviewedStampedImageSourceReleaseV1(command.frozen_scope?.scope?.source_release,plan);
  assert.ok(['leased','running'].includes(command.status));assert.equal(command.lease_token,leaseToken);
  assert.equal(command.leased_by,FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY);
  assert.equal(command.attempt_count,1);assert.equal(command.max_attempts,1);assert.equal(Number(command.cost_ceiling_usd),0);
  assert.equal(item.command_policy?.execution_enabled,true);assert.equal(item.version,decision.expected_version);
  assert.equal(item.state,'running');assert.equal(item.command_policy.max_attempts,1);assert.equal(item.requires_recent_auth,true);
  assert.equal(item.plan_fingerprint,decision.expected_fingerprint);assert.equal(item.plan_fingerprint,command.plan_fingerprint);
  equal(item.plan_payload,command.frozen_scope.plan_payload,'actual_approved_outcome_changed');
  equal(item.scope,command.frozen_scope.scope,'actual_approved_scope_changed');
  equal(item.exclusions,command.frozen_scope.exclusions,'actual_approved_exclusions_changed');
  assert.equal(decision.work_item_id,item.id);assert.equal(decision.decision,'approve');assert.ok(!decision.note,'execution_approval_note_requires_reconciliation');
  assert.ok(Date.parse(command.lease_expires_at)>Date.now()&&Date.parse(command.execution_deadline_at)>Date.now()&&Date.parse(plan.expires_at)>Date.now(),'image_execution_authority_expired');
  assert.ok(Date.parse(decision.created_at)>=Date.parse(plan.prepared_at)&&Date.parse(decision.created_at)<=Date.now()+300000,'image_approval_outside_plan_window');
  assert.ok(Date.parse(command.execution_deadline_at)<=Date.parse(plan.expires_at));
  const stages=command.frozen_scope.plan_payload.outcome_workflow.stages,index=stages.findIndex(s=>s.stage_key===stageKey);
  assert.ok(index>=0,'registered_image_stage_required');
  const receipts=await json(c,'select to_jsonb(t)row from public.operations_outcome_workflow_stage_receipts t where command_id=$1 order by id',[commandId]);
  const active=receipts.filter(r=>r.stage_key===stageKey);
  assert.equal(active.length,1,'one_unconsumed_image_stage_attempt_required');assert.equal(active[0].status,'started');
  assert.equal(active[0].attempt_number,1);assert.equal(active[0].stage_index,index);
  assert.equal(active[0].stage_fingerprint,stages[index].stage_fingerprint);
  for(const previous of stages.slice(0,index)){
    const done=receipts.filter(r=>r.stage_key===previous.stage_key&&r.status==='succeeded');
    assert.equal(done.length,1,'previous_image_stage_not_completed');assert.equal(done[0].stage_fingerprint,previous.stage_fingerprint);
    assert.equal(done[0].result.reconciled,true);assert.equal(done[0].result.plan_fingerprint,plan.fingerprint);
    assert.ok(!receipts.some(r=>r.stage_key===previous.stage_key&&r.status==='failed'),'failed_image_stage_requires_reconciliation');
    if(previous.stage_key==='upload_reviewed_image_assets_v1'){
      assert.equal(done[0].result.verified,33);assert.ok(Number.isInteger(done[0].result.new_objects)&&done[0].result.new_objects>=0&&done[0].result.new_objects<=33);
      assert.equal(done[0].result.maximum_new_bytes,2381453);assert.equal(done[0].result.overwrite,false);
    }
  }
  if(stageKey==='apply_reviewed_image_publication_v1'){
    const rollback=receipts.filter(r=>r.stage_key==='rollback_reviewed_image_publication_v1'&&r.status==='succeeded');
    assert.equal(rollback.length,1,'completed_image_rollback_required');const proof=rollback[0].result;
    assert.equal(proof.reconciled,true);assert.equal(proof.rollback_executed,true);assert.equal(proof.images_exercised,33);
    assert.equal(proof.durable_domain_writes,0);assert.equal(proof.plan_fingerprint,plan.fingerprint);
    assert.equal(proof.code_fingerprint,plan.code_binding.fingerprint);
    const age=Date.now()-Date.parse(proof.checked_at);assert.ok(age>=-300000&&age<3600000,'fresh_under_one_hour_image_rollback_required');
  }
  const founders=await rows(c,`select distinct u.id from auth.users u join public.user_entitlements e
    on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email))where e.is_active and e.role='founder'`);
  assert.equal(founders.length,1);assert.equal(founders[0].id,decision.actor_user_id,'actual_image_founder_entitlement_required');
  return {command_id:command.id,decision_id:decision.id,actor_user_id:decision.actor_user_id,approved_at:decision.created_at,
    outcome_plan_fingerprint:command.plan_fingerprint};
}

async function prepareCandidate(c,i,normalization,plan,decision){
  await assertExecuteCanonWriteV1({execution_name:'reviewed_stamped_image_publication_v1',
    payload_snapshot:{candidate_id:i.candidate_id,image_plan_fingerprint:plan.fingerprint,command_id:decision.command_id},
    write_target:c,audit_target:c,ledger_target:c,transaction_control:'external',actor_type:'founder',actor_id:decision.actor_user_id,
    source_worker:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,source_system:'warehouse',
    contract_assertions:[{ok:plan.items.some(t=>t.candidate_id===i.candidate_id),contract_name:'INGESTION_PIPELINE_CONTRACT_V1',
      violation_type:'image_candidate_outside_approved_scope',reason:'The actual founder command authorizes these33 existing candidate image promotions.'},
      {ok:Boolean(decision.command_id&&decision.decision_id&&plan.items.length===33),contract_name:'REVIEWED_STAMPED_IMAGE_PUBLICATION_V1',
        violation_type:'actual_frozen_image_outcome_required',reason:'Image promotion requires the real, unexpired command and its exact frozen scope.'}],
    proofs:[{name:'actual_image_approval_roundtrip',contract_name:'INGESTION_PIPELINE_CONTRACT_V1',violation_type:'image_approval_readback_failed',
      async run(client){return {ok:(await rows(client,"select id from public.canon_warehouse_candidates where id=$1 and state='APPROVED_BY_FOUNDER'and founder_approved_by_user_id=$2 and founder_approved_at=$3",[i.candidate_id,decision.actor_user_id,decision.approved_at])).length===1};}}],
    async write(client){
      const metadata={worker:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,image_plan_fingerprint:plan.fingerprint,
        normalized_metadata_package:i.metadata.normalized_metadata_package,interpreter_package:i.metadata.interpreter_package,
        promotion_image_normalization_package:normalization,command_id:decision.command_id};
      assert.equal((await client.query(`insert into public.canon_warehouse_candidate_events(candidate_id,event_type,action,previous_state,next_state,actor_type,metadata)
        values($1,'PROMOTION_IMAGE_NORMALIZATION_READY','NORMALIZE_IMAGE','REVIEW_READY','REVIEW_READY','SYSTEM',$2::jsonb)`,[i.candidate_id,JSON.stringify(metadata)])).rowCount,1);
      assert.equal((await client.query(`update public.canon_warehouse_candidates set state='APPROVED_BY_FOUNDER',founder_approved_by_user_id=$2,
        founder_approved_at=$3,founder_approval_notes=$4,current_review_hold_reason=null where id=$1 and state='REVIEW_READY'and founder_approved_at is null and current_staging_id is null`,
      [i.candidate_id,decision.actor_user_id,decision.approved_at,'Actual Founder Operations image publication command '+decision.command_id])).rowCount,1);
      assert.equal((await client.query(`insert into public.canon_warehouse_candidate_events(candidate_id,event_type,action,previous_state,next_state,actor_user_id,actor_type,metadata)
        values($1,'FOUNDER_APPROVED','APPROVE','REVIEW_READY','APPROVED_BY_FOUNDER',$2,'FOUNDER',$3::jsonb)`,
      [i.candidate_id,decision.actor_user_id,JSON.stringify({...decision,image_plan_fingerprint:plan.fingerprint})])).rowCount,1);
    }});
  const a=await fetchArtifacts(c,i.candidate_id);
  const writePlan=await buildPromotionWritePlanSnapshot(c,{candidate:a.candidate,metadataExtraction:a.latestMetadataExtractionPackage,
    interpreterPackage:a.latestInterpreterPackage?.value,normalizationPackage:a.latestNormalizationPackage?.promotion_image_normalization_package,
    identityAuditPackage:a.latestIdentityAuditPackage?.value,classificationPackage:a.latestClassificationPackage?.value});
  assert.equal(writePlan.status,'READY','shared_image_write_plan_not_ready');
  for(const table of ['card_prints','card_printings'])assert.equal(writePlan.actions[table].action,'REUSE');
  assert.equal(writePlan.actions.image_fields.target_id,i.printing_id);
  const stage=await createStageWithinTransaction(c,a,writePlan,new Date().toISOString());assert.equal(stage.status,'applied');return stage.staging_id;
}

function withoutReceipt(state){return {...state,events:state.events.filter(e=>e.event_type!==RECEIPT)};}
async function assertImageAfter(c,plan,before,decision){
  const state=await readReviewedImageStateV1(c);
  equal(state.parents,before.parents,'parent_image_or_identity_changed');equal(state.evidence,before.evidence,'original_evidence_changed');
  equal(state.identities,before.identities,'existing_identity_registry_changed');equal(state.reviews,before.reviews,'existing_truth_reviews_changed');
  for(const i of plan.items){const actual=state.children.find(r=>r.id===i.printing_id),old=before.children.find(r=>r.id===i.printing_id);
    equal(actual,{...old,image_source:'identity',image_path:i.prepared_asset.asset.storage_path,image_status:'exact',
      image_note:'warehouse_candidate:'+i.candidate_id},'child_nonimage_fields_or_exact_path_changed');
    const candidate=state.candidates.find(r=>r.id===i.candidate_id);assert.equal(candidate.state,'PROMOTED');
    assert.equal(candidate.founder_approved_by_user_id,decision.actor_user_id);assert.equal(candidate.promoted_image_target_id,i.printing_id);
    const oldCandidate=before.candidates.find(r=>r.id===i.candidate_id);
    const allowed=new Set(['state','founder_approved_by_user_id','founder_approved_at','founder_approval_notes','current_review_hold_reason',
      'current_staging_id','updated_at','promotion_result_type','promoted_card_print_id','promoted_card_printing_id',
      'promoted_image_target_type','promoted_image_target_id','promoted_by_user_id','promoted_at']);
    equal(Object.keys(candidate).sort(),Object.keys(oldCandidate).sort(),'candidate_row_shape_changed');
    for(const key of Object.keys(oldCandidate))if(!allowed.has(key))equal(candidate[key],oldCandidate[key],'unapproved_candidate_field_changed:'+key);
  }
  for(const old of before.events)equal(state.events.find(r=>r.id===old.id),old,'original_warehouse_event_changed');
  assert.equal(state.staging.length,33);
  assert.equal(withoutReceipt(state).events.length-before.events.length,165,'exact_image_event_count_changed');
  assert.equal(hash(await readReviewedImageProtectionV1(c)),plan.protection_fingerprint,'protected_owner_mapping_price_or_other_rows_changed');
  assert.equal(hash(await readReviewedPlayProgrammeSchemaV1(c)),plan.schema_fingerprint,'image_precommit_schema_changed');
  return state;
}

export async function applyReviewedImagesWithinTransactionV1(c,{plan,authority,normalizationPackages,qualification=false,rehearsal=false}){
  validateReviewedStampedImagePublicationPlanV1(plan,{headSha:authority.headSha});
  await assertWarehouseTransactionContextV1(c,{serializable:true});await assertReviewedImageDatabaseV1(c,{qualification});
  assert.equal((await rows(c,'select pg_try_advisory_xact_lock(hashtext($1))acquired',[REVIEWED_STAMPED_IMAGE_PUBLICATION_V1]))[0].acquired,true,'competing_image_publication');
  const decision=await assertReviewedImageCommandV1(c,plan,authority,{stageKey:rehearsal?'rollback_reviewed_image_publication_v1':'apply_reviewed_image_publication_v1',qualification}),
    before=await assertReviewedImagePlanBeforeV1(c,plan,{lock:true});
  assert.equal(normalizationPackages.length,33);const stages=[];
  for(const i of plan.items){const n=normalizationPackages.find(p=>p.candidate_id===i.candidate_id)?.normalization_package;
    assert.equal(n?.status,'READY');assert.equal(n?.outputs?.normalized_front_storage_path,i.prepared_asset.asset.storage_path);
    assert.equal(n.candidate_id,i.candidate_id);equal(n.source_refs,i.prepared_asset.source_refs,'normalization_evidence_changed');
    equal(n.method,i.prepared_asset.method,'normalization_method_changed');assert.equal(n.outputs.normalized_back_storage_path,null);
    assert.equal(n?.identity_preservation?.derived_sha256,i.prepared_asset.asset.sha256);
    assert.equal(n.identity_preservation.original_sha256,i.prepared_asset.asset.sha256);
    for(const field of ['bytes','width','height'])assert.equal(n.identity_preservation[field],i.prepared_asset.asset[field]);
    assert.equal(n.quality.front_confidence,null);assert.equal(n.errors.length,0);
    stages.push(await prepareCandidate(c,i,n,plan,decision));}
  const atomicPlan=await prepareWarehouseAtomicBatchV1(c,{stageIds:stages,lock:true});
  for(const t of atomicPlan.targets){assert.equal(t.expected.mutation_type,'update_card_printing_identity_image','image_only_shared_mutation_required');}
  const execution=await applyWarehouseAtomicBatchWithinTransactionV1(c,atomicPlan);assert.equal(execution.results.length,33);
  const after=await assertImageAfter(c,plan,before,decision);
  const receipt={version:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,plan_fingerprint:plan.fingerprint,decision,
    before,atomic_plan:atomicPlan,atomic_receipt:execution.receipt,state_after_fingerprint:hash(withoutReceipt(after)),
    image_updates:33,new_events:166,new_stages:33,automatic_retry_allowed:false};
  await assertExecuteCanonWriteV1({execution_name:'reviewed_stamped_image_publication_v1',
    payload_snapshot:{image_plan_fingerprint:plan.fingerprint,command_id:decision.command_id,receipt_fingerprint:hash(receipt)},
    write_target:c,audit_target:c,ledger_target:c,transaction_control:'external',actor_type:'system_worker',actor_id:decision.actor_user_id,
    source_worker:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,source_system:'warehouse',
    contract_assertions:[{ok:execution.results.length===33&&receipt.plan_fingerprint===plan.fingerprint,contract_name:'REVIEWED_STAMPED_IMAGE_PUBLICATION_V1',
      violation_type:'incomplete_image_outcome_receipt',reason:'A durable image receipt requires all33 shared executions and exact preservation proofs.'}],
    proofs:[{name:'exact_image_receipt_roundtrip',contract_name:'REVIEWED_STAMPED_IMAGE_PUBLICATION_V1',violation_type:'image_receipt_roundtrip_failed',
      async run(client){const records=await json(client,'select to_jsonb(t)row from public.canon_warehouse_candidate_events t where candidate_id=$1 and event_type=$2',[ids[0],RECEIPT]);
        return {ok:records.length===1&&hash(records[0].metadata)===hash(receipt)};}}],
    async write(client){assert.equal((await client.query(`insert into public.canon_warehouse_candidate_events(candidate_id,event_type,action,previous_state,next_state,actor_type,metadata)
      values($1,$2,'VERIFY','PROMOTED','PROMOTED','SYSTEM',$3::jsonb)`,[ids[0],RECEIPT,JSON.stringify(receipt)])).rowCount,1);}});
  assert.equal((await readReviewedImageStateV1(c)).events.length-before.events.length,166);
  return receipt;
}

export async function verifyReviewedImagePublicationReceiptV1(c,{plan,commandId}){
  validateReviewedStampedImagePublicationPlanV1(plan);
  const records=await json(c,'select to_jsonb(t)row from public.canon_warehouse_candidate_events t where candidate_id=$1 and event_type=$2 order by id',[ids[0],RECEIPT]);
  assert.equal(records.length,1,'one_durable_image_receipt_required');const receipt=records[0].metadata;
  assert.equal(receipt.plan_fingerprint,plan.fingerprint);assert.equal(receipt.decision.command_id,commandId);
  const state=await assertImageAfter(c,plan,receipt.before,receipt.decision);
  assert.equal(hash(withoutReceipt(state)),receipt.state_after_fingerprint,'independent_image_state_readback_changed');
  await verifyWarehouseAtomicBatchReceiptV1(c,receipt.atomic_plan,receipt.atomic_receipt);
  return {reconciled:true,images:33,write_count:0,receipt_fingerprint:hash(receipt),plan_fingerprint:plan.fingerprint,automatic_retry_allowed:false};
}

async function assertIdle(c){let status;const fn=m=>{status=m.status;};c.connection.once('readyForQuery',fn);
  try{await c.query('select 1');}finally{c.connection.removeListener('readyForQuery',fn);}assert.equal(status,'I','dedicated_idle_image_client_required');}
export async function runReviewedImagePublicationTransactionV1({c,audit,plan,authority,normalizationPackages,
  mode='preflight',apply=false,qualification=false}){
  assert.ok(['preflight','rollback','apply','readback'].includes(mode));validateReviewedStampedImagePublicationPlanV1(plan);
  await assertIdle(c);await assertReviewedImageDatabaseV1(c,{qualification});
  if(mode==='readback')return verifyReviewedImagePublicationReceiptV1(c,{plan,commandId:authority.commandId});
  if(mode!=='preflight')assert.equal(apply,true,'explicit_image_transaction_apply_required');
  if(mode!=='preflight'){
    assert.ok(audit&&audit!==c,'independent_image_audit_client_required');await assertIdle(audit);await assertReviewedImageDatabaseV1(audit,{qualification});
    equal([c.connectionParameters.host,c.connectionParameters.port,c.connectionParameters.database],
      [audit.connectionParameters.host,audit.connectionParameters.port,audit.connectionParameters.database],'independent_image_database_changed');
    assert.notEqual((await rows(c,'select pg_backend_pid()id'))[0].id,(await rows(audit,'select pg_backend_pid()id'))[0].id,'independent_image_session_required');
  }
  let started=false,commitAttempted=false,committed=false,receipt=null;
  try{
    started=true;await c.query(mode==='preflight'?'begin isolation level repeatable read read only':'begin isolation level serializable');
    await c.query("set local lock_timeout='3s'");
    if(mode==='preflight')await assertReviewedImagePlanBeforeV1(c,plan);
    else receipt=await applyReviewedImagesWithinTransactionV1(c,{plan,authority,normalizationPackages,qualification,rehearsal:mode==='rollback'});
    if(mode==='apply'){commitAttempted=true;await c.query('commit');committed=true;started=false;}
    else{await c.query('rollback');started=false;}
    if(mode==='rollback'){
      assert.ok(audit,'independent_rollback_readback_required');await assertReviewedImagePlanBeforeV1(audit,plan);
      return {reconciled:true,rollback_executed:true,images_exercised:33,plan_fingerprint:plan.fingerprint,
        code_fingerprint:plan.code_binding.fingerprint,checked_at:new Date().toISOString(),durable_domain_writes:0};
    }
    if(mode==='apply'){
      assert.ok(audit,'independent_commit_readback_required');
      return await verifyReviewedImagePublicationReceiptV1(audit,{plan,commandId:authority.commandId});
    }
    return {reconciled:true,read_only:true,images:33};
  }catch(error){error.committed=committed;error.commit_uncertain=commitAttempted&&!committed;error.rollback_uncertain=false;error.automatic_retry_allowed=false;
    error.proposed_receipt=receipt;if(started)await c.query('rollback').catch(()=>{error.rollback_uncertain=true;});throw error;}
}

/** Recovery is read-only. It can recognize a committed receipt or prove a full
 * rehearsal rolled back; it never retries a canonical or Storage mutation. */
export async function reconcileReviewedImageTransactionV1({audit,plan,authority,mode,error,qualification=false}){
  assert.ok(['apply','rollback'].includes(mode));assert.equal(error?.automatic_retry_allowed,false);
  await assertIdle(audit);await assertReviewedImageDatabaseV1(audit,{qualification});
  validateReviewedStampedImagePublicationPlanV1(plan,{headSha:authority.headSha});
  await audit.query('begin isolation level repeatable read read only');
  try{
    let result;
    if(mode==='apply'){
      assert.ok(error.commit_uncertain||error.committed,'uncertain_or_committed_image_attempt_required');
      result=await verifyReviewedImagePublicationReceiptV1(audit,{plan,commandId:authority.commandId});
      result={...result,unknown_commit_reconciled:true,canonical_write_retry_performed:false};
    }else{
      const proposed=error.proposed_receipt;assert.equal(proposed?.plan_fingerprint,plan.fingerprint);
      assert.equal(proposed?.image_updates,33);assert.equal(proposed?.new_stages,33);
      assert.equal(hash(proposed.before),plan.before_state_fingerprint,'full_rehearsal_before_state_required');
      await assertReviewedImagePlanBeforeV1(audit,plan);
      result={reconciled:true,rollback_executed:true,images_exercised:33,plan_fingerprint:plan.fingerprint,
        code_fingerprint:plan.code_binding.fingerprint,checked_at:new Date().toISOString(),durable_domain_writes:0,
        rollback_acknowledgement_reconciled:true,canonical_write_retry_performed:false};
    }
    await audit.query('commit');return result;
  }catch(failure){await audit.query('rollback').catch(()=>{});throw failure;}
}
