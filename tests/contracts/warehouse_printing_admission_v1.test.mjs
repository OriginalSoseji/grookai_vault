import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../fixtures/warehouse_printing_authority_v1.mjs';
import {freezeWarehousePrintingAuthority} from '../../backend/warehouse/printing_authority_v1.mjs';
import {prepareWarehousePrintingAdmission,applyWarehousePrintingAdmission,verifyWarehousePrintingAdmissionReadback}
  from '../../backend/warehouse/printing_admission_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {buildPromotionWritePlanSnapshot,buildFrozenPayload,buildComparableStagePayload,runPromotionStageWorkerV1}
  from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
import {buildCreateCardPrintingPlan,applyMutation,verifySucceededPrintingStage,runPromotionExecutorV1} from '../../backend/warehouse/promotion_executor_v1.mjs';

function harness() {
  const f=fixture(),bundle=freezeWarehousePrintingAuthority(f);
  const state={parent:{...f.parent,number:'1'},children:[],reviews:[],raw:[],footprint:'unchanged',schema:[],isolation:'serializable',
    writes:[],failAt:null,publicMissing:false};
  const client={async query(sql,args=[]) {
    const q=sql.replace(/\s+/g,' ').trim();
    if(q.startsWith('select current_setting'))return {rows:[{isolation:state.isolation,read_only:'off'}]};
    if(q.includes('to_jsonb(p) parent'))return {rows:[{parent:structuredClone(state.parent),game:state.parent.game,
      canonical_set_code:state.parent.set_code,set_game:state.parent.game}]};
    if(q.includes('to_jsonb(p) row from public.card_printings'))return {rows:state.children.map(row=>({row:structuredClone(row)}))};
    if(q.includes('to_jsonb(r) row from public.card_printing_truth_reviews'))return {rows:state.reviews.map(row=>({row:structuredClone(row)}))};
    if(q.includes("jsonb_build_object('id',r.id::text)"))return {rows:state.raw.map(row=>({row:structuredClone(row)}))};
    if(q.startsWith('select key from public.finish_keys'))return {rows:[{key:'holo'}]};
    if(q.includes('from information_schema.columns')||q.includes('from pg_constraint')||q.includes('from pg_indexes')||q.includes('from pg_rules'))return {rows:[]};
    if(q.includes('from pg_trigger'))return {rows:state.schema};
    if(q.startsWith('select pg_get_functiondef'))return {rows:[{definition:'synthetic local RPC'}]};
    if(q.startsWith('select count(*)::int rows'))return {rows:[{rows:0,digest:state.footprint}]};
    if(q.startsWith('select id,card_print_id,finish_key,printing_gv_id,finish_is_active'))return {rows:state.publicMissing?[]:
      state.children.map(row=>({id:row.id,card_print_id:row.card_print_id,finish_key:row.finish_key,printing_gv_id:row.printing_gv_id,finish_is_active:true}))};
    if(q.startsWith('insert into public.')) {
      const table=q.match(/^insert into public\.(\w+)/)[1];
      if(state.failAt===table)throw new Error(`fixture failure: ${table}`);
      state.writes.push(table);
      if(table==='raw_imports')state.raw.push({id:args[0],source:args[1],status:args[2],notes:args[3],payload:JSON.parse(args[4])});
      else if(table==='card_printings')state.children.push({...JSON.parse(args[0]),image_source:null,image_path:null,image_url:null,image_alt_url:null,image_status:null,image_note:null});
      else if(table==='card_printing_truth_reviews')state.reviews.push(JSON.parse(args[0]));
      else throw new Error('Unexpected write '+table);
      return {rows:[],rowCount:1};
    }
    throw new Error(`Unexpected SQL: ${q}`);
  }};
  return {...f,bundle,state,client};
}
const prepare=f=>prepareWarehousePrintingAdmission(f.client,f.bundle,f.target);
function stageInput(f) {return {candidate:{id:f.target.candidate_id,proposed_action_type:'CREATE_CARD_PRINTING',
  interpreter_resolved_finish_key:'holo'},metadataExtraction:{normalized_metadata_package:{identity:{set_code:'test',name:'Fixture',printed_number:'1'}}},
  interpreterPackage:{status:'READY',proposed_action:'CREATE_CARD_PRINTING',canon_context:{matched_card_print_id:f.target.card_print_id,finish_key:'holo'}},
  normalizationPackage:{status:'READY'},printingAuthority:f.bundle};}

test('admission writes raw evidence before exact child and review; repeat is zero writes',async()=>{
  const f=harness(),before=await prepare(f),beforeHash=hash(before);
  const result=await applyWarehousePrintingAdmission(f.client,before);
  assert.equal(result.created,true);
  assert.deepEqual(f.state.writes,['raw_imports','card_printings','card_printing_truth_reviews']);
  assert.equal(f.state.children[0].printing_gv_id,f.target.printing_gv_id);
  assert.deepEqual(f.state.raw[0].payload,f.bundle);
  assert.equal((await verifyWarehousePrintingAdmissionReadback(f.client,f.bundle,f.target,beforeHash)).exact_readback,true);
  const again=await applyWarehousePrintingAdmission(f.client,await prepare(f));
  assert.equal(again.created,false);assert.equal(f.state.writes.length,3);
});
test('real stage planner hands exact authority and snapshot fingerprint to real executor planner',async()=>{
  const f=harness(),input=stageInput(f);
  const plan=await buildPromotionWritePlanSnapshot(f.client,input);
  assert.equal(plan.status,'READY');assert.equal(plan.actions.card_printings.payload.printing_gv_id,f.target.printing_gv_id);
  const payload=buildFrozenPayload({...input,evidenceRows:[],writePlan:plan,stagedAt:'2026-09-17T00:00:00Z'});
  assert.equal(payload.approved_action_type,'CREATE_CARD_PRINTING');
  const stage={id:'44444444-4444-4444-8444-444444444444',approved_action_type:'CREATE_CARD_PRINTING'};
  const execution=await buildCreateCardPrintingPlan(f.client,stage,input.candidate,payload,{});
  const result=await applyMutation(f.client,execution);
  assert.equal(result.promoted_card_printing_id,f.state.children[0].id);
  const restaged=await buildPromotionWritePlanSnapshot(f.client,input);
  assert.equal(restaged.actions.card_printings.action,'REUSE');
  const reused=buildFrozenPayload({...input,evidenceRows:[],writePlan:restaged,stagedAt:'2026-09-17T00:00:00Z'});
  assert.equal(reused.approved_action_type,'CREATE_CARD_PRINTING');
  assert.notDeepEqual(buildComparableStagePayload(payload),buildComparableStagePayload(reused));
});
test('stage and executor both reject legacy payloads without Master Index evidence',async()=>{
  const f=harness(),input=stageInput(f);input.printingAuthority=null;
  assert.equal((await buildPromotionWritePlanSnapshot(f.client,input)).status,'BLOCKED');
  const payload={write_plan:{},candidate_summary:{interpreter_resolved_finish_key:'holo'},latest_interpreter_package:input.interpreterPackage};
  await assert.rejects(buildCreateCardPrintingPlan(f.client,{},input.candidate,payload,{}),/authority_required/);
  await assert.rejects(applyMutation(f.client,{mutation:{type:'insert_card_printing'}}),/unsupported_mutation_type/);
  await assert.rejects(applyMutation(f.client,{mutation:{type:'card_printing_existing_noop'}}),/unsupported_mutation_type/);
  assert.equal(f.state.writes.length,0);
});
for (const defect of ['parent_drift','dependency_drift','schema_drift','identity_collision','finish_collision','inactive_review',
  'missing_gvid','provisional','missing_provenance','adverse_review','review_binding','raw_collision','public_missing']) {
  test(`admission or retained readback fails closed for ${defect}`,async()=>{
    const f=harness(),before=await prepare(f);
    if(['parent_drift','dependency_drift','schema_drift','identity_collision','finish_collision'].includes(defect)) {
      if(defect==='parent_drift')f.state.parent.number='2';
      if(defect==='dependency_drift')f.state.footprint='changed';
      if(defect==='schema_drift')f.state.schema=[{table:'card_printings',name:'unreviewed',definition:'AFTER INSERT'}];
      if(defect==='identity_collision')f.state.children=[{...before.expected.child,card_print_id:'other'}];
      if(defect==='finish_collision')f.state.children=[{...before.expected.child,finish_key:'normal'}];
      await assert.rejects(applyWarehousePrintingAdmission(f.client,before));assert.equal(f.state.writes.length,0);
    } else {
      await applyWarehousePrintingAdmission(f.client,before);
      if(defect==='inactive_review')f.state.reviews[0].active=false;
      if(defect==='missing_gvid')f.state.children[0].printing_gv_id=null;
      if(defect==='provisional')f.state.children[0].is_provisional=true;
      if(defect==='missing_provenance')f.state.children[0].provenance_ref=null;
      if(defect==='adverse_review')f.state.reviews[0].review_status='unsupported';
      if(defect==='review_binding')f.state.reviews[0].evidence.manifest_fingerprint='wrong';
      if(defect==='raw_collision')f.state.raw[0].payload={};
      if(defect==='public_missing')f.state.publicMissing=true;
      await assert.rejects(verifyWarehousePrintingAdmissionReadback(f.client,f.bundle,f.target,hash(before)));
      assert.equal(f.state.writes.length,3);
    }
  });
}
test('postcommit readback compares frozen dependencies rather than two later matching reads',async()=>{
  const f=harness(),before=await prepare(f);await applyWarehousePrintingAdmission(f.client,before);
  f.state.footprint='later_change';
  await assert.rejects(verifyWarehousePrintingAdmissionReadback(f.client,f.bundle,f.target,hash(before)),/frozen_preflight_drift/);
});
test('unknown legacy identity domain cannot be assumed English',async()=>{
  const f=harness();f.state.parent.identity_domain='pokemon';
  await assert.rejects(prepare(f),/language_unresolved/);assert.equal(f.state.writes.length,0);
});
test('writer requires the caller serializable transaction',async()=>{
  const f=harness(),before=await prepare(f);f.state.isolation='read committed';
  await assert.rejects(applyWarehousePrintingAdmission(f.client,before),/serializable_transaction_required/);
  assert.equal(f.state.writes.length,0);
});
test('a succeeded warehouse stage must still pass exact readback; no blind already-succeeded shortcut',async()=>{
  const f=harness(),input=stageInput(f),plan=await buildPromotionWritePlanSnapshot(f.client,input);
  const payload=buildFrozenPayload({...input,evidenceRows:[],writePlan:plan,stagedAt:'2026-09-17T00:00:00Z'});
  const before=await prepare(f),result=await applyWarehousePrintingAdmission(f.client,before);
  const stage={id:'44444444-4444-4444-8444-444444444444',candidate_id:f.target.candidate_id,
    approved_action_type:'CREATE_CARD_PRINTING',execution_status:'SUCCEEDED',frozen_payload:payload};
  const candidate={...input.candidate,state:'PROMOTED',current_staging_id:stage.id,promoted_card_printing_id:result.id};
  assert.equal((await verifySucceededPrintingStage(f.client,stage,candidate)).status,'already_succeeded');
  f.state.footprint='changed';
  const drift=await verifySucceededPrintingStage(f.client,stage,candidate);
  assert.equal(drift.status,'reconciliation_required');assert.equal(drift.automatic_retry_allowed,false);
  assert.equal(f.state.writes.length,3);
});
test('legacy succeeded rows lacking authority do not become verified by their status',async()=>{
  const f=harness(),stage={id:'44444444-4444-4444-8444-444444444444',candidate_id:f.target.candidate_id,
    approved_action_type:'CREATE_CARD_PRINTING',execution_status:'SUCCEEDED',frozen_payload:{candidate_id:f.target.candidate_id,write_plan:{}}};
  const candidate={id:f.target.candidate_id,state:'PROMOTED',current_staging_id:stage.id};
  const result=await verifySucceededPrintingStage(f.client,stage,candidate);
  assert.equal(result.status,'reconciliation_required');assert.equal(f.state.writes.length,0);
});
test('admission cannot silently add image evidence through defaults or side effects',async()=>{
  const f=harness(),before=await prepare(f);await applyWarehousePrintingAdmission(f.client,before);
  f.state.children[0].image_status='exact';
  await assert.rejects(verifyWarehousePrintingAdmissionReadback(f.client,f.bundle,f.target,hash(before)),/unexpected_image_write/);
});
for (const [name,run] of [['staging',runPromotionStageWorkerV1],['execution',runPromotionExecutorV1]]) {
  for (const input of [{dryRun:false},{apply:false,dryRun:false},{apply:'false'},{apply:1}]) {
    test(`${name} cannot activate writes with ${JSON.stringify(input)}`,async()=>{
      await assert.rejects(run(input),/explicit apply: true/);
    });
  }
}
