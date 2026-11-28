import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import {createBackendClient} from '../../backend/supabase_backend_client.mjs';
import {pokemonTcgplayerMappingDatabaseConfigV1} from '../../backend/operations/pokemon_tcgplayer_mapping_outcome_v1.mjs';
import {validateReviewedStampedImageOutcomeWorkflowV1,REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1} from '../../backend/operations/reviewed_stamped_image_outcome_v1.mjs';
import {assertReviewedImageDatabaseV1,assertReviewedImageCommandV1,assertReviewedImagePlanBeforeV1,
  prepareReviewedImageStorageV1,runReviewedImagePublicationTransactionV1} from '../../backend/warehouse/reviewed_stamped_image_publication_v1.mjs';
import {reconcileReviewedImageTransactionV1} from '../../backend/warehouse/reviewed_stamped_image_publication_v1.mjs';
import {createHash} from 'node:crypto';
import {operationsSha256V1} from '../../backend/operations/operations_control_plane_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const {Client}=pg;
const publicFailureCodes=new Set(['image_before_state_changed','image_protected_references_changed','image_schema_changed',
  'image_preparation_changed','image_bucket_must_remain_private','derived_image_not_uploaded','image_storage_error_requires_reconciliation',
  'image_upload_requires_independent_reconciliation','original_evidence_changed_after_copy','image_execution_authority_expired',
  'image_approval_outside_plan_window','actual_image_execution_command_required','previous_image_stage_not_completed',
  'one_unconsumed_image_stage_attempt_required','completed_image_rollback_required','fresh_under_one_hour_image_rollback_required',
  'actual_image_founder_entitlement_required','actual_approved_outcome_changed','command_image_plan_changed','competing_image_publication',
  'public_child_image_unavailable','public_child_image_bytes_changed','public_child_image_media_type_changed','unexpected_public_image_redirect',
  'public_image_read_attempts_exhausted','normalization_evidence_changed','normalization_method_changed','image_producer_changed',
  'image_publication_plan_changed','canonical_image_database_required','image_verified_production_TLS_required']);
function failureCode(error){const first=String(error?.message??'').split('\n')[0].split(':')[0].trim();
  return publicFailureCodes.has(first)?first:'image_stage_reconciliation_required';}
export function reviewedImageStageFailureSummaryV1({error,planFingerprint,knownCommitted=false}){
  return {error_code:failureCode(error),committed:knownCommitted||error.committed===true,
    commit_uncertain:!knownCommitted&&error.commit_uncertain===true,rollback_uncertain:error.rollback_uncertain===true,
    independent_reconciliation_code:error.independent_reconciliation_error?failureCode({message:error.independent_reconciliation_error}):null,
    automatic_retry_allowed:false,plan_fingerprint:planFingerprint,
    proposed_receipt_fingerprint:error.proposed_receipt?operationsSha256V1(error.proposed_receipt):null};
}
export function reviewedImagePublicFailureV1(stageKey,error){
  const safeStage=REVIEWED_STAMPED_IMAGE_STAGE_KEYS_V1.includes(stageKey)?stageKey:'registered_image_stage';
  const state=error.committed===true?'Database commit confirmed. ':error.commit_uncertain===true?'Database commit uncertain. ':'';
  const safe=new Error(`Reviewed image stage ${safeStage} stopped: ${failureCode(error)}. ${state}Independent reconciliation is required.`);
  safe.name='ReviewedImageOutcomeError';safe.failure_code=failureCode(error);
  safe.committed=error.committed===true;safe.commit_uncertain=error.commit_uncertain===true;return safe;
}
async function publicImageResponse(route,fetchImpl){
  for(let attempt=0;attempt<3;attempt++){
    try{
      let response=await fetchImpl(route,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});
      if([301,302,307,308].includes(response.status)){
        const location=new URL(response.headers.get('location'),route);
        assert.ok(location.protocol==='https:'&&['grookaivault.com','www.grookaivault.com'].includes(location.hostname)&&
          location.pathname===route.pathname&&!location.search&&!location.username&&!location.password&&!location.port,'unexpected_public_image_redirect');
        response=await fetchImpl(location,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
      }
      if([429,500,502,503,504].includes(response.status)&&attempt<2)continue;
      return response;
    }catch(error){if(attempt===2||!['TypeError','AbortError','TimeoutError'].includes(error.name))throw error;}
  }
  throw new Error('public_image_read_attempts_exhausted');
}

export function reviewedImageDatabaseConfigV1({readOnly=false,env=process.env}={}){
  const config=pokemonTcgplayerMappingDatabaseConfigV1(env.SUPABASE_DB_URL,{mode:readOnly?'dry_run':'apply',env});
  return {...config,application_name:'reviewed-stamped-image-publication-v1',
    options:'-c TimeZone=UTC'+(readOnly?' -c default_transaction_read_only=on':'')};
}
export async function verifyReviewedImagePublicBytesV1(plan,{fetchImpl=fetch}={}){
  let verified=0;
  for(const item of plan.items){
    // A fixed canonical route, with no service credential or signed evidence URL.
    // GVID comes from the source-bound scope, not from executable plan input.
    const target=scope.targets.find(t=>t.printing_id===item.printing_id);assert.ok(target);
    const route=new URL('https://grookaivault.com/api/canon/cards/'+encodeURIComponent(target.printing_gv_id)+'/image');
    const response=await publicImageResponse(route,fetchImpl);
    assert.equal(response.status,200,'public_child_image_unavailable:'+target.printing_gv_id);
    assert.ok(response.headers.get('content-type')?.startsWith('image/jpeg'),'public_child_image_media_type_changed');
    const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,target.original.bytes);
    assert.equal(sha(bytes),target.original.sha256,'public_child_image_bytes_changed');verified++;
  }
  return {public_byte_verified:verified,service_credentials_sent_to_public_route:false};
}

/** Static registered handlers. No shell, SQL, endpoint or worker path comes from a task. */
export function createReviewedStampedImageOutcomeHandlersV1({headSha,outDir,command,leaseToken}){
  const authority={headSha,commandId:command.id,leaseToken};
  const validate=workflow=>validateReviewedStampedImageOutcomeWorkflowV1(workflow,{headSha});
  async function connect(readOnly){const c=new Client(reviewedImageDatabaseConfigV1({readOnly}));
    try{await c.connect();await assertReviewedImageDatabaseV1(c);return c;}catch(error){await c.end().catch(()=>{});throw error;}}
  function sdk(){
    const url=process.env.PROD_SUPABASE_URL??process.env.SUPABASE_URL;
    assert.equal(new URL(url).origin,'https://ycdxbpibncqcchqiihfz.supabase.co');
    assert.ok(!process.env.GV_USER_ACCESS_TOKEN,'system_image_storage_client_required');
    process.env.SUPABASE_URL=url;return createBackendClient();
  }
  async function readAuthority(c,plan,stageKey){
    await c.query('begin isolation level repeatable read read only');
    try{await assertReviewedImageCommandV1(c,plan,authority,{stageKey,lock:false});await c.query('commit');}
    catch(error){await c.query('rollback').catch(()=>{});throw error;}
  }
  async function save(name,value){await fs.mkdir(outDir,{recursive:true});
    await fs.writeFile(path.join(outDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
  async function transact(workflow,stageKey,mode){
    const plan=validate(workflow),readOnly=mode==='preflight',c=await connect(readOnly);let audit,knownCommitted=false;
    try{
      await readAuthority(c,plan,stageKey);
      const storage=await prepareReviewedImageStorageV1(sdk(),plan);
      if(!readOnly)audit=await connect(true);
      const result=await runReviewedImagePublicationTransactionV1({c,audit,plan,authority,mode,
        apply:!readOnly,normalizationPackages:storage.packages});
      if(mode==='apply')knownCommitted=true;
      if(mode==='apply')Object.assign(result,await verifyReviewedImagePublicBytesV1(plan));
      await save(stageKey+'.json',result);return result;
    }catch(error){
      if((mode==='apply'&&error.commit_uncertain)||(mode==='rollback'&&error.proposed_receipt)){
        const independent=await connect(true);
        try{
          const recovered=await reconcileReviewedImageTransactionV1({audit:independent,plan,authority,mode,error});
          if(mode==='apply')knownCommitted=true;
          if(mode==='apply')Object.assign(recovered,await verifyReviewedImagePublicBytesV1(plan));
          await save(stageKey+'-recovered.json',recovered);return recovered;
        }catch(reconciliationError){error.independent_reconciliation_error=reconciliationError.message;}
        finally{await independent.end().catch(()=>{});}
      }
      const failure=reviewedImageStageFailureSummaryV1({error,knownCommitted,planFingerprint:plan.fingerprint});
      error.committed=failure.committed;error.commit_uncertain=failure.commit_uncertain;
      try{await save(stageKey+'-failure.json',failure);}
      catch(artifactError){artifactError.committed=failure.committed;artifactError.commit_uncertain=failure.commit_uncertain;throw artifactError;}
      throw error;}
    finally{await c.end().catch(()=>{});if(audit)await audit.end().catch(()=>{});}
  }
  const handlers={
    async verify_reviewed_image_scope_v1({workflow,stage}){
      const plan=validate(workflow),c=await connect(true);
      try{await readAuthority(c,plan,stage.stage_key);await c.query('begin isolation level repeatable read read only');
        await assertReviewedImagePlanBeforeV1(c,plan);await c.query('commit');
        return {reconciled:true,plan_fingerprint:plan.fingerprint,read_only:true,images:33};
      }finally{await c.end().catch(()=>{});}
    },
    async upload_reviewed_image_assets_v1({workflow,stage}){
      const plan=validate(workflow),c=await connect(true);
      try{await readAuthority(c,plan,stage.stage_key);await c.query('begin isolation level repeatable read read only');
        await assertReviewedImagePlanBeforeV1(c,plan);await c.query('commit');
        const assets=await prepareReviewedImageStorageV1(sdk(),plan,{upload:true});
        const result={reconciled:true,plan_fingerprint:plan.fingerprint,verified:assets.verified,
          new_objects:assets.upload_attempts,confirmed_new_objects:assets.created,
          ambiguous_uploads_reconciled:assets.ambiguous_uploads_reconciled,
          maximum_new_bytes:assets.bytes,overwrite:false};await save(stage.stage_key+'.json',result);return result;
      }finally{await c.end().catch(()=>{});}
    },
    rollback_reviewed_image_publication_v1:({workflow,stage})=>transact(workflow,stage.stage_key,'rollback'),
    apply_reviewed_image_publication_v1:({workflow,stage})=>transact(workflow,stage.stage_key,'apply'),
  };
  // This runner is hosted in a public repository. Do not expose private review,
  // candidate or receipt bodies through logs, error causes or upload artifacts.
  return Object.freeze(Object.fromEntries(Object.entries(handlers).map(([key,handler])=>[key,async input=>{
    try{return await handler(input);}catch(error){throw reviewedImagePublicFailureV1(key,error);}
  }])));
}
