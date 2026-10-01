import test from 'node:test';
import assert from 'node:assert/strict';
import {readWarehouseParentIdentity, assertWarehouseParentIdentity, verifyWarehouseParentIdentity} from '../../backend/warehouse/parent_identity_v1.mjs';
import {buildPromotionWritePlanSnapshot, buildFrozenPayload} from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
import {buildCreateCardPrintPlan, applyMutation, verifySucceededPrintingStage} from '../../backend/warehouse/promotion_executor_v1.mjs';

function fixture() {
  const setId='11111111-1111-4111-8111-111111111111', gameId='22222222-2222-4222-8222-222222222222';
  const candidate={id:'33333333-3333-4333-8333-333333333333',tcgplayer_id:'456093'};
  const set={set_id:setId,set_code:'swsh12',game:'pokemon',game_id:gameId,identity_domain:'pokemon_eng_standard',identity_model:'standard'};
  const metadataExtraction={normalized_metadata_package:{identity:{set_code:'swsh12',name:'Dragonite',printed_number:'131/195',number_plain:'131'},
    printed_modifier:{status:'READY',modifier_key:'gamestop_stamp'}}};
  const interpreterPackage={status:'READY',proposed_action:'CREATE_CARD_PRINT',canon_context:{variant_key:'gamestop_stamp'}};
  const state={set,parents:[],writes:[],queries:[],missingSet:false};
  const client={async query(sql,args=[]) {
    const q=sql.replace(/\s+/g,' ').trim();state.queries.push(q);
    if(q.includes('join public.games')) return {rows:state.missingSet?[]:[{...state.set}]};
    if(q.includes('from public.sets')) return {rows:state.missingSet?[]:[{id:setId,code:'swsh12',game:'pokemon',name:'Silver Tempest',printed_set_abbrev:'SIT'}]};
    if(q.startsWith('select to_jsonb(p) parent')) return {rows:state.parents.filter(p=>p.id===args[0]).map(parent=>({parent:{...parent}}))};
    if(q.includes('from public.card_prints')) return {rows:state.parents};
    if(q.startsWith('insert into public.card_prints')) {
      const keys=q.match(/card_prints \((.*?)\) values/)[1].split(',').map(s=>s.trim());
      const parent={id:'44444444-4444-4444-8444-444444444444',...Object.fromEntries(keys.map((key,i)=>[key,args[i]]))};
      state.parents.push(parent);state.writes.push(parent);return {rows:[{id:parent.id}],rowCount:1};
    }
    throw new Error('Unexpected query '+q);
  }};
  const stagePlan=()=>buildPromotionWritePlanSnapshot(client,{candidate,metadataExtraction,interpreterPackage,normalizationPackage:{status:'READY'}});
  const freeze=writePlan=>buildFrozenPayload({candidate,evidenceRows:[],metadataExtraction,interpreterPackage,writePlan,stagedAt:'2026-10-01T00:00:00Z'});
  const executePlan=payload=>buildCreateCardPrintPlan(client,{approved_action_type:'CREATE_CARD_PRINT'},candidate,payload,{});
  const target={set_id:setId,set_code:'swsh12',variant_key:'gamestop_stamp',printed_identity_modifier:'gamestop_stamp'};
  return {client,state,target,candidate,metadataExtraction,stagePlan,freeze,executePlan};
}

test('actual parent staging, freezing, planning and insert preserve explicit game/domain/stamp',async()=>{
  const f=fixture(), staged=await f.stagePlan();assert.equal(staged.status,'READY');
  assert.equal(staged.actions.card_prints.payload.identity_domain,'pokemon_eng_standard');
  const plan=await f.executePlan(f.freeze(staged));
  const result=await applyMutation(f.client,plan);
  const readback=await verifyWarehouseParentIdentity(f.client,result.promoted_card_print_id,plan.expected_parent);
  assert.equal(readback.gv_id,'GV-PK-SIT-131-GAMESTOP-STAMP');
  assert.equal(readback.printed_identity_modifier,'gamestop_stamp');
  assert.equal(f.state.parents[0].game_id,f.state.set.game_id);
  assert.ok(f.state.queries.some(q=>q.endsWith('for share of s,g')));
  assert.equal(f.state.writes.length,1);
});

for(const domain of [null,'pokemon','pokemon_jpn','mtg_eng_paper_print']) {
  test(`parent stage rejects unproven or unsupported set domain ${domain}`,async()=>{
    const f=fixture();f.state.set.identity_domain=domain;
    assert.equal((await f.stagePlan()).status,'BLOCKED');assert.equal(f.state.writes.length,0);
  });
}

test('unknown canonical set cannot produce a ready parent stage',async()=>{
  const f=fixture();f.state.missingSet=true;assert.equal((await f.stagePlan()).status,'BLOCKED');
});

for(const [field,value] of [['game','mtg'],['identity_model','reprint_anthology'],['game_id',null],['set_code','other']]) {
  test(`parent stage rejects invalid canonical ${field}`,async()=>{
    const f=fixture();f.state.set[field]=value;assert.equal((await f.stagePlan()).status,'BLOCKED');
  });
}

test('legacy parent stage without identity projection requires restaging',async()=>{
  const f=fixture(),payload=f.freeze(await f.stagePlan());delete payload.write_plan.parent_identity;
  await assert.rejects(f.executePlan(payload),/restage_required/);assert.equal(f.state.writes.length,0);
});

test('canonical domain drift after staging blocks execution',async()=>{
  const f=fixture(),payload=f.freeze(await f.stagePlan());f.state.set.identity_domain='pokemon_jpn';
  await assert.rejects(f.executePlan(payload),/language_unresolved/);assert.equal(f.state.writes.length,0);
});

test('canonical game ID drift after staging cannot be silently adopted',async()=>{
  const f=fixture(),payload=f.freeze(await f.stagePlan());f.state.set.game_id='55555555-5555-4555-8555-555555555555';
  await assert.rejects(f.executePlan(payload),/drift_restage_required/);
});

test('stamp modifier may not be omitted or relabeled as another retailer',async()=>{
  const f=fixture();await assert.rejects(readWarehouseParentIdentity(f.client,{...f.target,printed_identity_modifier:null}),/stamp_modifier_required/);
  await assert.rejects(readWarehouseParentIdentity(f.client,{...f.target,printed_identity_modifier:'eb_games_stamp'}),/modifier_mismatch/);
});

for(const field of ['identity_domain','game_id','printed_identity_modifier']) {
  test(`mutation cannot lose ${field} after planning`,async()=>{
    const f=fixture(),plan=await f.executePlan(f.freeze(await f.stagePlan()));delete plan.mutation[field];
    await assert.rejects(applyMutation(f.client,plan),/mutation_mismatch/);assert.equal(f.state.writes.length,0);
  });
  test(`parent readback catches missing ${field}`,async()=>{
    const f=fixture(),plan=await f.executePlan(f.freeze(await f.stagePlan()));const r=await applyMutation(f.client,plan);
    f.state.parents[0][field]=null;
    await assert.rejects(verifyWarehouseParentIdentity(f.client,r.promoted_card_print_id,plan.expected_parent),/readback_mismatch/);
  });
}

test('live set drift between plan and insert blocks the write',async()=>{
  const f=fixture(),plan=await f.executePlan(f.freeze(await f.stagePlan()));f.state.set.identity_domain=null;
  await assert.rejects(applyMutation(f.client,plan),/language_unresolved/);assert.equal(f.state.writes.length,0);
});

test('exact existing parent can be reused, but missing identity metadata cannot be a successful no-op',async()=>{
  const f=fixture(),payload=f.freeze(await f.stagePlan()),plan=await f.executePlan(payload);
  await applyMutation(f.client,plan);assert.equal((await f.executePlan(payload)).mutation.type,'card_print_existing_noop');
  f.state.parents[0].identity_domain=null;await assert.rejects(f.executePlan(payload),/readback_mismatch/);
});

test('base identities retain an explicit null printed modifier',async()=>{
  const f=fixture(),target={...f.target,variant_key:null,printed_identity_modifier:null};
  const frozen=await readWarehouseParentIdentity(f.client,target);
  assert.equal((await assertWarehouseParentIdentity(f.client,frozen,target)).printed_identity_modifier,null);
});

test('revisiting a succeeded parent stage verifies identity without replaying a write',async()=>{
  const f=fixture(),payload=f.freeze(await f.stagePlan()),plan=await f.executePlan(payload);
  const result=await applyMutation(f.client,plan);
  const stage={id:'stage',candidate_id:f.candidate.id,approved_action_type:'CREATE_CARD_PRINT',frozen_payload:payload};
  const candidate={...f.candidate,state:'PROMOTED',current_staging_id:stage.id,promoted_card_print_id:result.promoted_card_print_id};
  assert.equal((await verifySucceededPrintingStage(f.client,stage,candidate)).status,'already_succeeded');
  f.state.parents[0].identity_domain=null;
  const failed=await verifySucceededPrintingStage(f.client,stage,candidate);
  assert.equal(failed.status,'reconciliation_required');assert.equal(failed.automatic_retry_allowed,false);
  assert.equal(f.state.writes.length,1);
});
