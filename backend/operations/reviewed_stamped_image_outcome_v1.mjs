import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {operationsSha256V1 as hash} from './operations_control_plane_v1.mjs';
import {buildFounderOutcomeStageV1,buildFounderOutcomeWorkflowPlanV1,buildFounderOutcomeWorkItemV1,
  validateFounderOutcomeWorkflowPlanV1,FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1} from './founder_outcome_workflow_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};

export const REVIEWED_STAMPED_IMAGE_PUBLICATION_V1='REVIEWED_STAMPED_IMAGE_PUBLICATION_V1';
export const REVIEWED_STAMPED_IMAGE_WORKFLOW_KEY_V1='reviewed_stamped_image_publication_v1';
export const REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1=Object.freeze([
  'verify_reviewed_image_scope_v1','upload_reviewed_image_assets_v1',
  'rollback_reviewed_image_publication_v1','apply_reviewed_image_publication_v1']);
export const REVIEWED_STAMPED_IMAGE_CEILINGS_V1=Object.freeze({
  private_derived_objects:33,maximum_new_object_bytes:2381453,
  child_image_updates:33,candidate_updates:99,staging_inserts:33,staging_updates:66,
  warehouse_event_inserts:166,new_parents:0,new_printings:0,new_truth_reviews:0,
  original_evidence_updates:0,owner_writes:0,mapping_writes:0,price_writes:0,schema_writes:0,
  model_requests:0,cost_usd:0});
export const REVIEWED_STAMPED_CHAT_PINS_V1=Object.freeze({
  'GV-PK-SM1-11-LEAGUE-STAMP-RH':'38ad65e7116fbad98b76e8e1cc19fc32f8f6baa484a8c9682d30fc93af3f03e2',
  'GV-PK-XY11-65-LEAGUE-STAMP-RH':'6bf7e58c593231cb6be8e8d9a79a687d11ae575275bcc38a810827c3e0ba5882'});
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const equal=(a,b,message)=>assert.equal(hash(a),hash(b),message);
export function reviewedStampedImageCodeBindingV1(){
  const files=[
    'backend/operations/reviewed_stamped_image_outcome_v1.mjs',
    'backend/warehouse/reviewed_stamped_image_publication_v1.mjs',
    'scripts/workers/reviewed_stamped_image_outcome_handlers_v1.mjs',
    'scripts/workers/founder_outcome_workflow_executor_v1.mjs',
    'backend/operations/founder_outcome_workflow_v1.mjs',
    'backend/warehouse/reviewed_card_plane_asset_v1.mjs',
    'backend/warehouse/reviewed_existing_child_image_v1.mjs',
    'backend/warehouse/existing_child_image_interpreter_v1.mjs',
    'backend/warehouse/promotion_stage_worker_v1.mjs','backend/warehouse/promotion_executor_v1.mjs',
    'backend/warehouse/atomic_promotion_batch_v1.mjs','backend/warehouse/reviewed_play_normal_programme_v1.mjs',
    'backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/contract_scope_v1.mjs',
    'backend/lib/contracts/runtime_contract_catalog_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs',
    'backend/warehouse/transaction_context_v1.mjs',
    'docs/CONTRACT_INDEX.md','docs/contracts/REVIEWED_STAMPED_IMAGE_PUBLICATION_V1.md',
    'docs/catalog/reviewed_stamped_image_preparation_v1/index.json',
    'docs/catalog/reviewed_play_normal_nine_v1/warehouse-trigger-functions.json',
    'docs/catalog/stamp_identity_admission_hold_v1/index.json',
    '.github/workflows/operations-control-plane-maintenance.yml',
    'package-lock.json','backend/package-lock.json',
  ].sort().map(file=>({file,sha256:sha(fs.readFileSync(root+file))}));
  return {files,fingerprint:hash(files)};
}
export function assertReviewedStampedImageCommittedSourceV1(plan){
  const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:8000000});
  assert.equal(git(['rev-parse','HEAD']).toString().trim(),plan.source_commit_sha,'committed_image_source_revision_required');
  assert.equal(git(['status','--porcelain','--untracked-files=no']).toString().trim(),'','clean_tracked_image_source_required');
  for(const pin of plan.code_binding.files)assert.equal(sha(git(['show','HEAD:'+pin.file])),pin.sha256,'image_source_not_bound_to_commit:'+pin.file);
}
export function validateReviewedStampedImagePublicationPlanV1(plan,{headSha=null,checkSource=true}={}){
  assert.equal(plan?.version,REVIEWED_STAMPED_IMAGE_PUBLICATION_V1);
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'image_publication_plan_changed');
  assert.equal(plan.project_ref,'ycdxbpibncqcchqiihfz');
  assert.equal(plan.scope_fingerprint,scope.fingerprint);equal(plan.ceilings,REVIEWED_STAMPED_IMAGE_CEILINGS_V1,'image_write_ceilings_changed');
  assert.match(plan.source_commit_sha??'',/^[a-f0-9]{40}$/);
  if(headSha)assert.equal(plan.source_commit_sha,headSha,'image_source_commit_changed');
  if(checkSource)equal(plan.code_binding,reviewedStampedImageCodeBindingV1(),'image_producer_changed');
  const start=Date.parse(plan.prepared_at),end=Date.parse(plan.expires_at);
  assert.ok(Number.isFinite(start)&&end>start&&end-start<=86400000,'image_plan_window_invalid');
  for(const field of ['before_state_fingerprint','schema_fingerprint','protection_fingerprint'])assert.match(plan[field]??'',/^[a-f0-9]{64}$/);
  assert.equal(plan.items.length,33);assert.equal(new Set(plan.items.map(i=>i.candidate_id)).size,33);
  let phone=0,chat=0;
  for(const t of scope.targets){
    const i=plan.items.find(i=>i.candidate_id===t.candidate_id);assert.ok(i,'exact33_scope_required');
    assert.equal(i.printing_id,t.printing_id);assert.equal(i.parent_id,t.parent_id);
    assert.equal(i.metadata?.candidate_id,t.candidate_id);
    assert.equal(i.metadata?.interpreter_package?.proposed_action,'ENRICH_CARD_PRINTING_IMAGE');
    assert.equal(i.metadata?.production_writes_authorized,false);
    assert.equal(i.prepared_asset?.status,'PREPARED');
    assert.equal(i.prepared_asset?.candidate_id,t.candidate_id);assert.equal(i.prepared_asset?.printing_id,t.printing_id);
    assert.equal(i.prepared_asset.canonical_writes_authorized,false);
    assert.equal(i.prepared_asset.source_refs.front_storage_path,`warehouse-evidence/stamped-child-image-intake-v1/${t.printing_id}/${t.original.sha256}.jpg`);
    assert.equal(i.prepared_asset.source_refs.back_evidence_id,null);assert.equal(i.prepared_asset.source_refs.back_storage_path,null);
    assert.equal(i.prepared_asset.asset.bucket,'user-card-images');
    assert.equal(i.prepared_asset.asset.storage_path,`warehouse-derived/self-hosted-images-v1/reviewed-card-plane-v1/${t.printing_id}/${t.original.sha256}/front.jpg`);
    assert.equal(i.prepared_asset.frame_review.candidate_id,t.candidate_id);assert.equal(i.prepared_asset.frame_review.printing_id,t.printing_id);
    assert.equal(i.prepared_asset.frame_review.original_sha256,t.original.sha256);
    equal(Object.fromEntries(Object.keys(t.original).map(k=>[k,i.prepared_asset.asset[k]])),t.original,'image_original_changed');
    const {preparation_fingerprint,...assetBody}=i.prepared_asset;
    assert.equal(hash(assetBody),preparation_fingerprint,'prepared_image_fingerprint_changed');
    const ref=i.metadata.visual_review_reference;
    equal(i.metadata.normalized_metadata_package.provenance.review,ref,'human_review_provenance_changed');
    if(ref.kind==='retained_owner_chat_confirmation'){
      chat++;assert.equal(ref.record_sha256,REVIEWED_STAMPED_CHAT_PINS_V1[t.printing_gv_id],'sealed_chat_proof_changed');
      const bytes=Buffer.from(i.retained_chat_record_base64??'','base64');assert.equal(sha(bytes),ref.record_sha256);
    }else{phone++;assert.equal(ref.kind,'authenticated_founder_operations_decision');assert.equal(i.retained_chat_record_base64,null);}
  }
  assert.equal(phone,31);assert.equal(chat,2);
  return plan;
}
export function buildReviewedStampedImageOutcomeWorkflowV1(plan){
  validateReviewedStampedImagePublicationPlanV1(plan);
  const modes=['read_only','storage_write','canonical_write','publication'];
  const effects=[{publication_plan:plan,production_writes:0},
    {publication_plan_fingerprint:plan.fingerprint,immutable_private_objects:33,maximum_new_bytes:2381453,overwrite:false},
    {publication_plan_fingerprint:plan.fingerprint,full_transaction_rollback:true,durable_domain_writes:0},
    {publication_plan_fingerprint:plan.fingerprint,child_images:33,independent_readback:true,public_byte_verification:true}];
  return buildFounderOutcomeWorkflowPlanV1({workflowKey:REVIEWED_STAMPED_IMAGE_WORKFLOW_KEY_V1,
    automaticTransientRetry:false,stages:REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1.map((key,index)=>buildFounderOutcomeStageV1({
      stageKey:key,handlerKey:key,mode:modes[index],expectedEffects:effects[index],maxAttempts:1,
      exclusions:['No original image overwrite','No parent, printing identity, finish, review, owner, mapping, pricing or schema changes']})),
    terminalOutcome:{summary:'All 33 previously reviewed original fronts are attached to their existing Reverse printings, with exact private/public byte readback.',
      publication_plan_fingerprint:plan.fingerprint,child_images:33}});
}
export function validateReviewedStampedImageOutcomeWorkflowV1(workflow,{headSha=null}={}){
  validateFounderOutcomeWorkflowPlanV1(workflow,{registry:FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1});
  assert.equal(workflow.workflow_key,REVIEWED_STAMPED_IMAGE_WORKFLOW_KEY_V1);
  const plan=validateReviewedStampedImagePublicationPlanV1(workflow.stages[0]?.expected_effects?.publication_plan,{headSha});
  equal(workflow,buildReviewedStampedImageOutcomeWorkflowV1(plan),'image_outcome_stages_or_effects_changed');return plan;
}
export function validateReviewedStampedImageSourceReleaseV1(releaseEvidence,plan){
  assert.equal(releaseEvidence?.version,'REVIEWED_STAMPED_IMAGE_SOURCE_RELEASE_V1');
  assert.equal(releaseEvidence.source_commit_sha,plan.source_commit_sha);
  assert.equal(releaseEvidence.code_fingerprint,plan.code_binding.fingerprint);
  for(const key of ['normal_commit_passed','normal_push_passed','hosted_checks_passed','exact_source_review_passed','merged_source_checks_passed','deployed_readback_passed'])
    assert.equal(releaseEvidence[key],true,'image_source_release_gate_required:'+key);
  assert.match(releaseEvidence.evidence_sha256??'',/^[a-f0-9]{64}$/);
  return releaseEvidence;
}
export function buildReviewedStampedImageOutcomeWorkItemV1({plan,agentKey,releaseEvidence,evidence}){
  validateReviewedStampedImageSourceReleaseV1(releaseEvidence,plan);
  const item=buildFounderOutcomeWorkItemV1({workItemKey:'publish-reviewed-stamped-images:'+plan.fingerprint.slice(0,24),
    agentKey,title:'Publish the 33 reviewed stamped Reverse images',domain:'catalog',riskLevel:'high',
    summary:'Your 31 phone reviews and 2 chat confirmations identify these exact originals. Approve immutable private copies, a complete rollback rehearsal, then one atomic image-only publication and independent public verification. No model calls or paid processing.',
    scope:{printing_count:33,byte_identical:true,maximum_new_object_bytes:2381453,ceilings:plan.ceilings,
      source_release:releaseEvidence,review_meaning:'Authorizes bounded execution; previous visual reviews stay review-only.'},
    exclusions:['Original evidence and parent images','Canonical identities, finishes and truth reviews','All298 held parents','Ownership, mappings, prices and schema'],
    workflow:buildReviewedStampedImageOutcomeWorkflowV1(plan),sourceCommitSha:plan.source_commit_sha,evidence,
    costCeilingUsd:0,maxAttempts:1,createdAt:plan.prepared_at,expiresAt:plan.expires_at});
  return {...item,command_policy:{...item.command_policy,retry_policy:'no_automatic_retry_independent_reconciliation_only'}};
}
