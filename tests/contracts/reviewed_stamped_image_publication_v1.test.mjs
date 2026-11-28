import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsSha256V1 as hash} from '../../backend/operations/operations_control_plane_v1.mjs';
import {FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,buildFounderOutcomeStageV1,buildFounderOutcomeWorkflowPlanV1,
  validateFounderOutcomeWorkflowPlanV1} from '../../backend/operations/founder_outcome_workflow_v1.mjs';
import {REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,REVIEWED_STAMPED_IMAGE_CEILINGS_V1,
  REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1,reviewedStampedImageCodeBindingV1,
  validateReviewedStampedImagePublicationPlanV1,assertReviewedStampedImageCommittedSourceV1,
  validateReviewedStampedImageSourceReleaseV1} from '../../backend/operations/reviewed_stamped_image_outcome_v1.mjs';
import {createReviewedStampedImageOutcomeHandlersV1,reviewedImageDatabaseConfigV1,verifyReviewedImagePublicBytesV1,reviewedImagePublicFailureV1,reviewedImageStageFailureSummaryV1}
  from '../../scripts/workers/reviewed_stamped_image_outcome_handlers_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};
import {getContractScopeV1} from '../../backend/lib/contracts/contract_scope_v1.mjs';
import {getCanonWriteExecutionPolicyV1} from '../../backend/lib/contracts/execute_canon_write_v1.mjs';
import {getPostWriteProofModeV1} from '../../backend/lib/contracts/run_post_write_proofs_v1.mjs';

function seal(plan){for(const i of plan.items){const {preparation_fingerprint,...p}=i.prepared_asset;i.prepared_asset.preparation_fingerprint=hash(p);}
  const {fingerprint,...body}=plan;return {...body,fingerprint:hash(body)};}
function fixture(){return seal({version:REVIEWED_STAMPED_IMAGE_PUBLICATION_V1,project_ref:scope.project_ref,scope_fingerprint:scope.fingerprint,
  source_commit_sha:'1'.repeat(40),code_binding:reviewedStampedImageCodeBindingV1(),prepared_at:'2026-11-27T22:00:00Z',expires_at:'2026-11-28T22:00:00Z',
  before_state_fingerprint:'a'.repeat(64),schema_fingerprint:'b'.repeat(64),protection_fingerprint:'c'.repeat(64),ceilings:{...REVIEWED_STAMPED_IMAGE_CEILINGS_V1},
  items:scope.targets.map(t=>{const ref={kind:'authenticated_founder_operations_decision',task_id:'00000000-0000-4000-a000-000000000001'};
    return {candidate_id:t.candidate_id,parent_id:t.parent_id,printing_id:t.printing_id,retained_chat_record_base64:null,
      metadata:{candidate_id:t.candidate_id,interpreter_package:{proposed_action:'ENRICH_CARD_PRINTING_IMAGE'},production_writes_authorized:false,
        visual_review_reference:ref,normalized_metadata_package:{provenance:{review:ref}}},
      prepared_asset:{status:'PREPARED',candidate_id:t.candidate_id,printing_id:t.printing_id,canonical_writes_authorized:false,
        source_refs:{front_evidence_id:'00000000-0000-4000-a000-000000000002',
          front_storage_path:`warehouse-evidence/stamped-child-image-intake-v1/${t.printing_id}/${t.original.sha256}.jpg`,back_evidence_id:null,back_storage_path:null},
        asset:{...t.original,bucket:'user-card-images',storage_path:`warehouse-derived/self-hosted-images-v1/reviewed-card-plane-v1/${t.printing_id}/${t.original.sha256}/front.jpg`},
        frame_review:{candidate_id:t.candidate_id,printing_id:t.printing_id,original_sha256:t.original.sha256}}};})});}

test('registers only the four fixed image stages and instantiates their static implementations without I/O',()=>{
  const recipe=FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1.find(r=>r.workflow_key==='reviewed_stamped_image_publication_v1');
  assert.deepEqual(recipe.stage_handlers,REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1);assert.equal(recipe.max_stages,4);
  const handlers=createReviewedStampedImageOutcomeHandlersV1({headSha:'1'.repeat(40),outDir:'/unused',command:{id:'fixture-command'},leaseToken:'fixture-lease'});
  assert.deepEqual(Object.keys(handlers),REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1);
  assert.ok(Object.values(handlers).every(handler=>typeof handler==='function'));
});
test('image metadata and receipt writes have their own registered transactional scope and proofs',()=>{
  const execution='reviewed_stamped_image_publication_v1';
  assert.ok(getContractScopeV1(execution).active_contracts.includes('REVIEWED_STAMPED_IMAGE_PUBLICATION_V1'));
  assert.equal(getCanonWriteExecutionPolicyV1(execution).transaction_mode,'transactional_authoritative');
  assert.equal(getPostWriteProofModeV1(execution),'transactional_authoritative');
});
test('new registration retains generic prohibition on executable task input',()=>{
  const stages=REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1.map(key=>buildFounderOutcomeStageV1({stageKey:key,handlerKey:key,mode:'read_only',expectedEffects:{sql:'select 1'}}));
  const workflow=buildFounderOutcomeWorkflowPlanV1({workflowKey:'reviewed_stamped_image_publication_v1',stages,terminalOutcome:{summary:'fixture'}});
  assert.throws(()=>validateFounderOutcomeWorkflowPlanV1(workflow,{registry:FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1}),/prohibited/);
});
test('cannot relabel the two retained chat facts as new authenticated phone decisions',()=>{
  assert.throws(()=>validateReviewedStampedImagePublicationPlanV1(fixture()),/33 !== 31/);
});
for(const [name,change]of [
  ['expanded write ceiling',p=>{p.ceilings.child_image_updates=34;}],
  ['cost',p=>{p.ceilings.cost_usd=1;}],
  ['longer approval window',p=>{p.expires_at='2026-11-29T22:00:00Z';}],
  ['missing target',p=>{p.items.pop();}],
  ['duplicate candidate',p=>{p.items[1].candidate_id=p.items[0].candidate_id;}],
  ['different parent',p=>{p.items[0].parent_id='00000000-0000-4000-a000-000000000099';}],
  ['publication authority substituted for preparation',p=>{p.items[0].prepared_asset.canonical_writes_authorized=true;}],
  ['original evidence overwrite',p=>{p.items[0].prepared_asset.asset.storage_path=p.items[0].prepared_asset.source_refs.front_storage_path;}],
  ['different evidence source',p=>{p.items[0].prepared_asset.source_refs.front_storage_path='warehouse-evidence/unreviewed.jpg';}],
  ['public bucket',p=>{p.items[0].prepared_asset.asset.bucket='public-images';}],
  ['repainted pixels',p=>{p.items[0].prepared_asset.asset.sha256='0'.repeat(64);}],
  ['wrong technical review target',p=>{p.items[0].prepared_asset.frame_review.printing_id='00000000-0000-4000-a000-000000000099';}],
  ['inconsistent review provenance',p=>{p.items[0].metadata.normalized_metadata_package.provenance.review={kind:'inferred_approval'};}],
])test(`rejects rehashed plan with ${name}`,()=>{const p=fixture();change(p);assert.throws(()=>validateReviewedStampedImagePublicationPlanV1(seal(p)));});
test('producer changes stop execution even when the outer packet is rehashed',()=>{
  const p=fixture();p.code_binding.files[0].sha256='0'.repeat(64);assert.throws(()=>validateReviewedStampedImagePublicationPlanV1(seal(p)),/image_producer_changed/);
});
test('exact source revision remains mandatory',()=>{
  assert.throws(()=>validateReviewedStampedImagePublicationPlanV1(fixture(),{headSha:'2'.repeat(40)}),/image_source_commit_changed/);
  assert.throws(()=>assertReviewedStampedImageCommittedSourceV1({...fixture(),source_commit_sha:'0'.repeat(40)}),/committed_image_source_revision_required/);
});
test('a source release cannot be inferred from an image review',()=>{
  assert.throws(()=>validateReviewedStampedImageSourceReleaseV1({},fixture()));
  const p=fixture(),proof={version:'REVIEWED_STAMPED_IMAGE_SOURCE_RELEASE_V1',source_commit_sha:p.source_commit_sha,
    code_fingerprint:p.code_binding.fingerprint,evidence_sha256:'d'.repeat(64),normal_commit_passed:true,normal_push_passed:true,
    hosted_checks_passed:false,exact_source_review_passed:true,merged_source_checks_passed:true,deployed_readback_passed:true};
  assert.throws(()=>validateReviewedStampedImageSourceReleaseV1(proof,p),/image_source_release_gate_required:hosted_checks_passed/);
});
test('canonical PG configuration retains verified TLS and read-only audit sessions',()=>{
  const env={SUPABASE_DB_URL:'postgresql://postgres@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres'};
  const config=reviewedImageDatabaseConfigV1({readOnly:true,env});assert.equal(config.ssl.rejectUnauthorized,true);
  assert.match(config.options,/TimeZone=UTC/);assert.match(config.options,/default_transaction_read_only=on/);
  assert.throws(()=>reviewedImageDatabaseConfigV1({env:{...env,NODE_TLS_REJECT_UNAUTHORIZED:'0'}}),/insecure_tls_environment/);
  assert.throws(()=>reviewedImageDatabaseConfigV1({env:{SUPABASE_DB_URL:'postgresql://postgres@localhost:5432/postgres'}}),/wrong_database_project/);
});
test('public runner errors retain actionable codes without private assertion diffs or causes',()=>{
  const privateError=new Error('image_before_state_changed\nPRIVATE_REVIEW_DATA');privateError.private_snapshot={owner:'PRIVATE_OWNER'};
  const safe=reviewedImagePublicFailureV1('apply_reviewed_image_publication_v1',privateError);
  assert.equal(safe.failure_code,'image_before_state_changed');assert.equal(safe.cause,undefined);
  assert.equal(safe.private_snapshot,undefined);assert.doesNotMatch(safe.message+safe.stack+JSON.stringify(safe),/PRIVATE_/);
  const unknown=reviewedImagePublicFailureV1('PRIVATE_STAGE_INPUT',new Error('PRIVATE_SECRET_INPUT'));
  assert.equal(unknown.failure_code,'image_stage_reconciliation_required');assert.doesNotMatch(unknown.message,/PRIVATE_/);
});
test('registered handler validation failures are redacted before reaching public runner logs',async()=>{
  const handlers=createReviewedStampedImageOutcomeHandlersV1({headSha:'1'.repeat(40),outDir:'/unused',command:{id:'fixture-command'},leaseToken:'fixture-lease'});
  await assert.rejects(handlers.verify_reviewed_image_scope_v1({workflow:{version:'PRIVATE_PROPOSAL_INPUT'},stage:{}}),error=>
    error.name==='ReviewedImageOutcomeError'&&!/PRIVATE_/.test(error.message+error.stack)&&error.cause===undefined);
});

test('failed public reads after a confirmed commit retain committed state without another write',async()=>{
  let reads=0,error;try{await verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},
    {fetchImpl:async()=>{reads++;return new Response(null,{status:503});}});}catch(e){error=e;}
  assert.ok(error);assert.equal(reads,3);
  const summary=reviewedImageStageFailureSummaryV1({error,knownCommitted:true,planFingerprint:'a'.repeat(64)});
  assert.equal(summary.committed,true);assert.equal(summary.commit_uncertain,false);assert.equal(summary.automatic_retry_allowed,false);
});

test('independent receipt confirmation resolves uncertainty while preserving private failure data',()=>{
  const error=new Error('PRIVATE_NETWORK_DETAIL');error.commit_uncertain=true;error.proposed_receipt={owner:'PRIVATE_OWNER'};
  const unresolved=reviewedImageStageFailureSummaryV1({error,planFingerprint:'a'.repeat(64)});
  assert.equal(unresolved.committed,false);assert.equal(unresolved.commit_uncertain,true);
  const confirmed=reviewedImageStageFailureSummaryV1({error,knownCommitted:true,planFingerprint:'a'.repeat(64)});
  assert.equal(confirmed.committed,true);assert.equal(confirmed.commit_uncertain,false);
  assert.equal(confirmed.proposed_receipt_fingerprint,hash(error.proposed_receipt));assert.doesNotMatch(JSON.stringify(confirmed),/PRIVATE_/);
  const artifactFailure=new Error('PRIVATE_ARTIFACT_PATH');artifactFailure.committed=confirmed.committed;artifactFailure.commit_uncertain=confirmed.commit_uncertain;
  const publicFailure=reviewedImagePublicFailureV1('apply_reviewed_image_publication_v1',artifactFailure);
  assert.equal(publicFailure.committed,true);assert.equal(publicFailure.commit_uncertain,false);
  assert.match(publicFailure.message,/Database commit confirmed/);assert.doesNotMatch(JSON.stringify(publicFailure)+publicFailure.message,/PRIVATE_/);
});
test('public verification sends no service headers and fails on unavailable bytes',async()=>{
  let requests=0;await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},{fetchImpl:async(url,options)=>{
    requests++;assert.equal(url.origin,'https://grookaivault.com');assert.equal(options.headers,undefined);return new Response(null,{status:404});
  }}),/public_child_image_unavailable/);assert.equal(requests,1);
});
for(const location of ['https://example.invalid/image','https://grookaivault.com/private-evidence',
  'https://ycdxbpibncqcchqiihfz.supabase.co/storage/v1/object/sign/user-card-images/private.jpg',
  'http://grookaivault.com/api/canon/cards/'+scope.targets[0].printing_gv_id+'/image'])test(`rejects public image redirect outside canonical route: ${new URL(location).host}`,async()=>{
  let calls=0;await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},{fetchImpl:async()=>{
    calls++;return new Response(null,{status:302,headers:{location}});
  }}),/unexpected_public_image_redirect/);assert.equal(calls,1);
});
test('rejects transformed public image bytes',async()=>{
  await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},{fetchImpl:async()=>
    new Response(new Uint8Array(scope.targets[0].original.bytes),{status:200,headers:{'content-type':'image/jpeg'}})}),/public_child_image_bytes_changed/);
});
test('transient public reads retry within a fixed ceiling while a missing image stops immediately',async()=>{
  let calls=0;await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},{fetchImpl:async()=>{
    calls++;return new Response(null,{status:calls===1?503:404});
  }}),/public_child_image_unavailable/);assert.equal(calls,2);
  calls=0;await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:scope.targets[0].printing_id}]},{fetchImpl:async()=>{
    calls++;throw new TypeError('Synthetic network failure');
  }}),/Synthetic network failure/);assert.equal(calls,3);
});
test('unregistered printing IDs never produce a public request',async()=>{
  let calls=0;await assert.rejects(verifyReviewedImagePublicBytesV1({items:[{printing_id:'00000000-0000-4000-a000-000000000099'}]},
    {fetchImpl:async()=>{calls++;return new Response(null,{status:200});}}));assert.equal(calls,0);
});
