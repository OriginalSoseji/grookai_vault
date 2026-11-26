import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import hold from '../../docs/catalog/stamp_identity_admission_hold_v1/index.json' with {type:'json'};
import {buildExecutionPlan,claimStageWithinTransactionV1,executeClaimedStageWithinTransactionV1}
  from './promotion_executor_v1.mjs';
import {verifyWarehouseParentRegistryV1} from './parent_registry_v1.mjs';
import {prepareWarehouseSetInvariantsV1,assertWarehouseSetInvariantsV1} from './set_invariants_v1.mjs';
import {assertWarehouseTransactionContextV1} from './transaction_context_v1.mjs';

export const WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1='WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1';
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const held=new Set(hold.candidate_pairs.flatMap(pair=>[pair.play.id,pair.prize.id]));
const {fingerprint:holdFingerprint,...holdBody}=hold;
assert.equal(holdFingerprint,'1c088dd83c399900a1526037f270dd47547bf3ce7c2da17b57b22ea491b80c92');
assert.equal(hash(holdBody),holdFingerprint);assert.equal(held.size,298);
const json=value=>JSON.parse(JSON.stringify(value));
const digest=value=>hash(json(value));
function assertNoHeldReference(value) {
  if(typeof value==='string')assert.ok(!held.has(value),'stamp_identity_hold_requires_separate_governed_reconciliation');
  else if(Array.isArray(value))value.forEach(assertNoHeldReference);
  else if(value&&typeof value==='object')Object.values(value).forEach(assertNoHeldReference);
}
function exactIds(ids) {
  assert.ok(Array.isArray(ids)&&ids.length>0,'explicit_nonempty_stage_scope_required');
  ids.forEach(id=>assert.match(id,uuid,'valid_stage_uuid_required'));
  assert.equal(new Set(ids).size,ids.length,'duplicate_stage_scope');return [...ids].sort();
}
async function state(client,ids,{lock=false}={}) {
  const rows=(await client.query(`select to_jsonb(s) stage,to_jsonb(c) candidate
    from public.canon_warehouse_promotion_staging s join public.canon_warehouse_candidates c on c.id=s.candidate_id
    where s.id=any($1::uuid[]) order by s.id ${lock?'for update of s,c':''}`,[exactIds(ids)])).rows;
  assert.equal(rows.length,ids.length,'exact_stage_and_candidate_scope_required');
  assert.equal(new Set(rows.map(row=>row.candidate.id)).size,ids.length,'one_stage_per_candidate_required');
  return rows;
}
function expectation(plan) {
  return {mutation_fingerprint:digest(plan.mutation),result_type:plan.result_type,
    parent:plan.expected_parent??null,mutation_type:plan.mutation.type,registry:plan.mutation.parent_registry_admission??null};
}
function dependencyKey(plan) {
  if(plan.mutation.type==='insert_card_print')return 'new_parent:'+plan.mutation.gv_id;
  if(plan.mutation.type==='reviewed_printing_admission')return 'printing_parent:'+plan.mutation.admission.target.card_print_id;
  // Existing parent/printing targets may not be updated twice in one snapshot.
  const link=plan.result_linkage??{};
  return link.promoted_card_printing_id?'printing:'+link.promoted_card_printing_id:
    link.promoted_card_print_id?'parent:'+link.promoted_card_print_id:null;
}

// Plans consume already approved, frozen warehouse stages. They never create
// founder decisions, rewrite a candidate or convert missing evidence to truth.
export async function prepareWarehouseAtomicBatchV1(client,{stageIds,lock=false}) {
  const rows=await state(client,stageIds,{lock}),targets=[],keys=new Set(),executions=[];
  for(const {stage,candidate}of rows) {
    assert.equal(stage.execution_status,'PENDING','pending_unconsumed_stage_required');
    assert.equal(Number(stage.execution_attempts),0,'unconsumed_stage_attempt_required');
    assert.equal(candidate.state,'STAGED_FOR_PROMOTION');
    const approval=stage.frozen_payload?.founder_approval;
    assert.equal(stage.founder_approved_by_user_id,candidate.founder_approved_by_user_id,'candidate_stage_approver_changed');
    assert.equal(approval?.founder_approved_by_user_id,stage.founder_approved_by_user_id,'payload_stage_approver_changed');
    assert.equal(Date.parse(stage.founder_approved_at),Date.parse(candidate.founder_approved_at),'candidate_stage_approval_time_changed');
    assert.equal(Date.parse(approval?.founder_approved_at),Date.parse(stage.founder_approved_at),'payload_stage_approval_time_changed');
    const approvals=(await client.query(`select to_jsonb(e) row from public.canon_warehouse_candidate_events e
      where candidate_id=$1 and event_type='FOUNDER_APPROVED' and actor_type='FOUNDER' order by id`,[candidate.id])).rows.map(r=>r.row);
    assert.ok(approvals.some(e=>e.actor_user_id===stage.founder_approved_by_user_id),'matching_explicit_founder_actor_required');
    assertNoHeldReference(stage.frozen_payload);
    const execution=await buildExecutionPlan(client,stage,candidate),key=dependencyKey(execution);
    executions.push(execution);
    if(execution.mutation.type==='insert_card_print')assert.ok(execution.mutation.parent_registry_admission,
      'bulk_new_parent_requires_active_registry_admission');
    if(key){assert.ok(!keys.has(key),'dependent_stages_require_separate_internal_batch');keys.add(key);}
    targets.push({stage_id:stage.id,candidate_id:candidate.id,stage_before:stage,
      candidate_before:candidate,candidate_before_fingerprint:digest(candidate),approval_events_fingerprint:digest(approvals),expected:expectation(execution)});
  }
  const set_profiles=await prepareWarehouseSetInvariantsV1(client,executions);
  const body={version:WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1,stage_ids:rows.map(row=>row.stage.id),targets,set_profiles,
    founder_approval_created:false,held_identity_scope_excluded:true};
  return {...body,fingerprint:digest(body)};
}
export function assertWarehouseAtomicBatchPlanV1(plan) {
  const {fingerprint,...body}=plan;assert.equal(fingerprint,digest(body),'atomic_batch_plan_fingerprint_changed');
  assert.equal(plan.version,WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1);assert.deepEqual(exactIds(plan.stage_ids),plan.stage_ids);
  assert.equal(plan.targets.length,plan.stage_ids.length);assert.equal(plan.founder_approval_created,false);
  assert.equal(plan.held_identity_scope_excluded,true);
  assert.ok(Array.isArray(plan.set_profiles),'warehouse_set_profiles_required');
  assert.deepEqual(plan.targets.map(t=>t.stage_id),plan.stage_ids);
  assert.equal(new Set(plan.targets.map(t=>t.candidate_id)).size,plan.targets.length);
  for(const target of plan.targets){assert.match(target.candidate_id,uuid);assert.equal(digest(target.candidate_before),target.candidate_before_fingerprint);
    assertNoHeldReference(target.stage_before.frozen_payload);}
}

// Use a dedicated pg Client. Detect a caller's existing transaction before
// BEGIN so a rollback here can never roll back unrelated caller work.
async function assertIdle(client) {
  assert.ok(client.connection&&typeof client.connection.once==='function','real_dedicated_pg_client_required');
  let status;const listener=message=>{status=message.status;};client.connection.once('readyForQuery',listener);
  try{await client.query('select 1');}finally{client.connection.removeListener('readyForQuery',listener);}
  assert.equal(status,'I','dedicated_idle_pg_client_required');
}
async function receiptState(client,plan) {
  await assertWarehouseSetInvariantsV1(client,plan.set_profiles,{after:true});
  const rows=await state(client,plan.stage_ids),targets=[];
  for(const {stage,candidate}of rows) {
    const expected=plan.targets.find(t=>t.stage_id===stage.id);
    assert.equal(stage.execution_status,'SUCCEEDED');assert.equal(Number(stage.execution_attempts),1);
    assert.equal(candidate.state,'PROMOTED');assert.equal(candidate.current_staging_id,stage.id);
    assert.equal(candidate.promotion_result_type,expected.expected.result_type);
    const stageChanges=new Set(['execution_status','execution_attempts','last_error','last_attempted_at','executed_at']);
    const candidateChanges=new Set(['state','promotion_result_type','promoted_card_print_id','promoted_card_printing_id',
      'promoted_image_target_type','promoted_image_target_id','promoted_by_user_id','promoted_at','current_review_hold_reason','updated_at']);
    for(const [actual,before,allowed]of [[stage,expected.stage_before,stageChanges],[candidate,expected.candidate_before,candidateChanges]]) {
      assert.deepEqual(Object.keys(actual).sort(),Object.keys(before).sort(),'batch_row_shape_changed');
      for(const key of Object.keys(before))if(!allowed.has(key))assert.deepEqual(actual[key],before[key],'batch_unexpected_existing_field_changed:'+key);
    }
    assert.equal(candidate.promoted_by_user_id,stage.founder_approved_by_user_id,'batch_promoted_actor_changed');
    assert.equal(Date.parse(candidate.promoted_at),Date.parse(stage.executed_at),'batch_execution_time_changed');
    const approvals=(await client.query(`select to_jsonb(e) row from public.canon_warehouse_candidate_events e
      where candidate_id=$1 and event_type='FOUNDER_APPROVED' and actor_type='FOUNDER' order by id`,[candidate.id])).rows.map(r=>r.row);
    assert.equal(digest(approvals),expected.approval_events_fingerprint,'batch_original_approval_events_changed');
    const parentId=candidate.promoted_card_print_id,printingId=candidate.promoted_card_printing_id;
    const parent=parentId?(await client.query('select to_jsonb(t) row from public.card_prints t where id=$1',[parentId])).rows[0]?.row:null;
    const printing=printingId?(await client.query('select to_jsonb(t) row from public.card_printings t where id=$1',[printingId])).rows[0]?.row:null;
    if(expected.expected.parent) {
      assert.ok(parent,'committed_parent_missing');
      for(const key of ['set_id','set_code','game_id','identity_domain','variant_key','printed_identity_modifier','name','number','gv_id','tcgplayer_id'])
        assert.equal(parent[key],expected.expected.parent[key],'committed_parent_identity_drift:'+key);
    }
    if(printingId)assert.ok(printing,'committed_printing_missing');
    const registry=expected.expected.registry?await verifyWarehouseParentRegistryV1(client,parentId,expected.expected.registry):null;
    targets.push({stage_id:stage.id,candidate_id:candidate.id,stage_fingerprint:digest(stage),candidate_fingerprint:digest(candidate),
      parent_id:parentId,parent_fingerprint:parent?digest(parent):null,printing_id:printingId,printing_fingerprint:printing?digest(printing):null});
    if(registry)Object.assign(targets.at(-1),{registry_identity_id:registry.id,registry_identity_fingerprint:digest(registry)});
  }
  const body={version:WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1,plan_fingerprint:plan.fingerprint,targets};
  return {...body,fingerprint:digest(body)};
}
export async function verifyWarehouseAtomicBatchReceiptV1(client,plan,receipt) {
  assertWarehouseAtomicBatchPlanV1(plan);
  const {fingerprint,...body}=receipt;assert.equal(fingerprint,digest(body),'atomic_batch_receipt_changed');
  assert.equal(receipt.plan_fingerprint,plan.fingerprint);
  assert.deepEqual(await receiptState(client,plan),receipt,'atomic_batch_independent_readback_changed');
  return {exact:true,stages:plan.stage_ids.length,plan_fingerprint:plan.fingerprint};
}

export async function applyWarehouseAtomicBatchWithinTransactionV1(client,plan) {
  assertWarehouseAtomicBatchPlanV1(plan);
  await assertWarehouseTransactionContextV1(client,{serializable:true});
  const fresh=await prepareWarehouseAtomicBatchV1(client,{stageIds:plan.stage_ids,lock:true});
  assert.equal(fresh.fingerprint,plan.fingerprint,'atomic_batch_before_state_or_plan_changed');
  const results=[];
  for(const target of plan.targets) {
    const claim=await claimStageWithinTransactionV1(client,target.stage_id);
    assert.equal(claim.claimed,true,'atomic_batch_stage_claim_failed');
    const execution=await executeClaimedStageWithinTransactionV1(client,target.stage_id,claim.attemptNumber);
    assert.deepEqual(expectation(execution.plan),target.expected,'atomic_batch_mutation_plan_changed');
    assert.equal(execution.mutationResult.result_type,target.expected.result_type,'atomic_batch_unexpected_noop_or_result');
    results.push({stage_id:target.stage_id,candidate_id:target.candidate_id,...execution.mutationResult});
  }
  return {results,receipt:await receiptState(client,plan),transaction_owned_by_caller:true};
}

export async function runWarehouseAtomicBatchV1({client,plan,mode='preflight',apply=false,committedReceipt=null}) {
  assert.ok(['preflight','rollback','apply','readback'].includes(mode),'unsupported_atomic_batch_mode');
  assertWarehouseAtomicBatchPlanV1(plan);
  if(['rollback','apply'].includes(mode))assert.equal(apply,true,'explicit_boolean_apply_required');
  if(mode==='readback')assert.ok(committedReceipt,'exact_committed_receipt_required');
  await assertIdle(client);
  let started=false,commitAttempted=false,committed=false,receipt=null;
  try {
    if(committedReceipt) {
      started=true;await client.query('begin isolation level repeatable read read only');
      await verifyWarehouseAtomicBatchReceiptV1(client,plan,committedReceipt);
      await client.query('rollback');started=false;
      return {version:WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1,mode,status:'already_applied',executed:0,committed:false,
        receipt:committedReceipt,receipt_is_committed:true,automatic_retry_allowed:false,plan_fingerprint:plan.fingerprint};
    }
    // BEGIN may reach PostgreSQL before its acknowledgement is lost. The
    // dedicated client was idle, so rollback is safe even if BEGIN throws.
    started=true;
    await client.query(mode==='preflight'?'begin isolation level repeatable read read only':'begin isolation level serializable');
    if(mode!=='preflight') {
      await client.query("set local lock_timeout='3s'");
      const locked=(await client.query('select pg_try_advisory_xact_lock(hashtext($1)) acquired',[WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1])).rows[0];
      assert.equal(locked.acquired,true,'competing_atomic_promotion_batch');
    }
    const fresh=await prepareWarehouseAtomicBatchV1(client,{stageIds:plan.stage_ids,lock:mode!=='preflight'});
    assert.equal(fresh.fingerprint,plan.fingerprint,'atomic_batch_before_state_or_plan_changed');
    let results=[];
    if(mode!=='preflight') {
      const execution=await applyWarehouseAtomicBatchWithinTransactionV1(client,plan);
      results=execution.results;receipt=execution.receipt;
    }
    if(mode==='apply'){commitAttempted=true;await client.query('commit');committed=true;}
    else await client.query('rollback');
    started=false;
    return {version:WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1,mode,committed,
      rollback_executed:mode==='rollback',executed:results.length,results,receipt,
      receipt_is_committed:committed,automatic_retry_allowed:false,plan_fingerprint:plan.fingerprint};
  } catch(error) {
    error.committed=committed;error.commit_uncertain=commitAttempted&&!committed;error.rollback_uncertain=false;
    error.proposed_receipt=receipt;error.automatic_retry_allowed=false;
    if(started&&!committed)await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});
    throw error;
  }
}
