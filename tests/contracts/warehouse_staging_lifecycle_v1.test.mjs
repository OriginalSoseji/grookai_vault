import test from 'node:test';
import assert from 'node:assert/strict';
import {createStageWithinTransaction,processCandidate,promotionStageExitCode} from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
import {processStage,applyMutation,promotionExecutorExitCode} from '../../backend/warehouse/promotion_executor_v1.mjs';

function harness({missingStage=false}={}) {
  const candidateId='33333333-3333-4333-8333-333333333333';
  const stageId='44444444-4444-4444-8444-444444444444';
  const actor='55555555-5555-4555-8555-555555555555';
  const at='2026-09-17T00:00:00Z';
  const artifact={candidate:{id:candidateId,state:'APPROVED_BY_FOUNDER',founder_approved_by_user_id:actor,founder_approved_at:at},
    evidenceRows:[],stagingRows:[],latestMetadataExtractionPackage:{normalized_metadata_package:{identity:{set_code:'test',name:'Fixture',printed_number:'1'}}},
    latestInterpreterPackage:{value:{status:'READY',proposed_action:'CREATE_CARD_PRINTING'}},
    latestNormalizationPackage:{promotion_image_normalization_package:{status:'READY'}},
    latestIdentityAuditPackage:{value:{identity_audit_status:'PRINTING_ONLY'}}};
  const plan={status:'READY',actions:{card_printings:{action:'CREATE',payload:{card_print_id:'11111111-1111-4111-8111-111111111111',finish_key:'holo'}}}};
  const calls=[];
  const client={async query(sql,args=[]) {
    const q=sql.replace(/\s+/g,' ').trim();calls.push({q,args});
    if(q.startsWith('insert into public.canon_warehouse_promotion_staging'))return {rows:[{id:stageId}],rowCount:1};
    if(q.startsWith('update public.canon_warehouse_candidates'))return {rows:[{id:candidateId}],rowCount:1};
    if(q.startsWith('insert into public.canon_warehouse_candidate_events'))return {rows:[],rowCount:1};
    if(q.startsWith('select execution_status')) {
      assert.deepEqual(args,[stageId],'Proof must resolve stage ID after insertion');
      return {rows:missingStage?[]:[{execution_status:'PENDING'}]};
    }
    if(q.startsWith('select current_staging_id'))return {rows:[{current_staging_id:stageId,state:'STAGED_FOR_PROMOTION'}]};
    if(q.startsWith('select count(*)'))return {rows:[{active_count:1}]};
    if(q.startsWith('insert into public.contract_'))return {rows:[{id:'local-proof-failure'}],rowCount:1};
    throw new Error('Unexpected query: '+q);
  }};
  return {client,artifact,plan,at,calls,stageId};
}

test('staging lifecycle passes its audit payload and checks the generated stage ID after insertion',async()=>{
  const f=harness();
  const result=await createStageWithinTransaction(f.client,f.artifact,f.plan,f.at);
  assert.equal(result.status,'applied');assert.equal(result.staging_id,f.stageId);
  assert.equal(f.calls.filter(x=>x.q.startsWith('insert into public.canon_warehouse_candidate_events')).length,1);
  assert.equal(f.calls.filter(x=>x.q.startsWith('select ')).length,3);
});

test('staging lifecycle cannot report success when its generated stage fails readback',async()=>{
  const f=harness({missingStage:true});
  await assert.rejects(createStageWithinTransaction(f.client,f.artifact,f.plan,f.at),/expected PENDING staging row/);
});

for(const mode of ['claim_commit_unknown','claim_rollback_unknown','execution_rollback_unknown','failure_recording_unavailable']) {
  test(`executor stops for reconciliation on ${mode}`,async()=>{
    let connections=0;
    const calls=[];
    const stage={id:'44444444-4444-4444-8444-444444444444',candidate_id:'33333333-3333-4333-8333-333333333333',
      approved_action_type:'CREATE_CARD_PRINTING',execution_status:'PENDING',execution_attempts:0,frozen_payload:{}};
    const pool={async connect() {
      const phase=++connections;
      return {release(){},async query(sql) {
        const q=sql.replace(/\s+/g,' ').trim();calls.push({phase,q});
        if(phase===2&&mode==='claim_rollback_unknown'&&q.startsWith('select'))throw new Error('claim read failed');
        if(phase===2&&mode==='claim_commit_unknown'&&q==='commit')throw new Error('lost claim commit response');
        if(phase===2&&mode==='claim_rollback_unknown'&&q==='rollback')throw new Error('lost claim rollback response');
        if(phase===3&&q.startsWith('begin'))throw new Error('execution connection failed');
        if(phase===3&&mode==='execution_rollback_unknown'&&q==='rollback')throw new Error('lost execution rollback response');
        if(phase===4)throw new Error('failure ledger unavailable');
        if(q.startsWith('select'))return {rows:[stage]};
        return {rows:[],rowCount:1};
      }};
    }};
    const result=await processStage(pool,stage.id,{dryRun:false,allowRetryOnFailed:false});
    assert.equal(result.status,'reconciliation_required');assert.equal(result.automatic_retry_allowed,false);
    assert.equal(connections,mode==='failure_recording_unavailable'?4:mode.startsWith('claim_')?2:3);
    assert.equal(calls.filter(x=>x.q.includes("execution_status = 'FAILED'")).length,0);
  });
}

test('staging unknown rollback returns reconciliation and releases the session lock',async()=>{
  const calls=[];
  const client={release(){calls.push('release');},async query(sql) {
    const q=sql.replace(/\s+/g,' ').trim();calls.push(q);
    if(q.includes('pg_try_advisory_lock'))return {rows:[{locked:true}]};
    if(q.includes('pg_advisory_unlock'))return {rows:[]};
    if(q==='begin')return {rows:[]};
    if(q==='rollback')throw new Error('rollback response lost');
    throw new Error('fixture read unavailable');
  }};
  const result=await processCandidate({async connect(){return client;}},'candidate',{dryRun:false});
  assert.equal(result.status,'reconciliation_required');assert.equal(result.rollback_uncertain,true);
  assert.equal(result.automatic_retry_allowed,false);
  assert.ok(calls.some(q=>q.includes('pg_advisory_unlock')));assert.equal(calls.at(-1),'release');
});

test('staging discards the pooled connection when releasing its advisory lock fails',async()=>{
  let discarded;
  const client={release(error){discarded=error;},async query(sql) {
    if(sql.includes('pg_try_advisory_lock'))return {rows:[{locked:true}]};
    if(sql.includes('pg_advisory_unlock'))throw new Error('unlock failed');
    if(sql==='begin'||sql==='rollback')return {rows:[]};
    throw new Error('fixture read unavailable');
  }};
  await assert.rejects(processCandidate({async connect(){return client;}},'candidate',{dryRun:false}),error=>{
    assert.equal(error.session_cleanup_uncertain,true);return true;
  });
  assert.equal(discarded?.message,'unlock failed');
});

for(const entity of ['card_print','card_printing'])for(const field of ['identity_image','image_url','image_alt_url']) {
  test(`${entity} ${field} retains its guarded image-only update`,async()=>{
    const id='11111111-1111-4111-8111-111111111111';
    const calls=[];
    const client={async query(sql,args){calls.push({sql,args});return {rows:[{id}],rowCount:1};}};
    const plan={result_type:'CANON_IMAGE_ENRICHED',mutation:{type:`update_${entity}_${field}`,[entity+'_id']:id,
      image_source:'identity',image_path:'fixture/image.jpg',image_url:'https://example.invalid/front.jpg',
      image_alt_url:'https://example.invalid/back.jpg',image_status:'exact',image_note:'fixture'}};
    const result=await applyMutation(client,plan);
    assert.equal(result.promoted_image_target_id,id);assert.equal(calls.length,1);
    assert.ok(calls[0].sql.includes(`update public.${entity}s`));
    assert.match(calls[0].sql,/is null/);assert.equal(calls[0].args[0],id);
    await assert.rejects(applyMutation({async query(){return {rows:[],rowCount:0};}},plan),/update_conflict/);
  });
}

for(const [name,exitCode,failures] of [
  ['staging',promotionStageExitCode,['failed','blocked','reconciliation_required']],
  ['executor',promotionExecutorExitCode,['failed','fatal','dry_run_failed_preflight','reconciliation_required']],
]) {
  test(`${name} CLI signals blocked or failed work to supervisors`,()=>{
    assert.equal(exitCode({results:[]}),0);
    assert.equal(exitCode({results:[{status:'applied'},{status:'dry_run'},{status:'skipped'},{status:'already_succeeded'}]}),0);
    for(const status of failures)assert.equal(exitCode({results:[{status:'applied'},{status}]}),1);
  });
}
