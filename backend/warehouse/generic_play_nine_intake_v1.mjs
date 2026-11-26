// Exact-nine RAW intake qualification. Canonical execution remains in the
// existing warehouse executor; this module cannot approve or promote a card.
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {
  genericPlayStampEvidenceRegistryV2,
  adjudicateGenericPlayStampEvidenceV2,
  capturedGenericPlayStampEvidenceInputV2,
} from '../identity/generic_play_stamp_identity_evidence_v2.mjs';
import {evaluateExternalDiscoveryBridgeRowsV1, insertCandidate} from './external_discovery_to_warehouse_bridge_v1.mjs';
import {getSourceBackedIdentity} from './source_identity_contract_v1.mjs';
import {assertWarehouseTransactionContextV1} from './transaction_context_v1.mjs';

export const GENERIC_PLAY_NINE_INTAKE_V1 = 'GENERIC_PLAY_NINE_INTAKE_V1';
export const GENERIC_PLAY_NINE_QUALIFICATION_DATABASE = 'generic_play_nine_intake_qualification_v1';
const registry = genericPlayStampEvidenceRegistryV2();
const targets = [...registry.targets].sort((a,b)=>Number(a.product_id)-Number(b.product_id));
const sourceIds = new Map([
  ['565473','87c862d8-e22d-4301-88e6-f5522a8e6ebf'],
  ['565482','929ffee2-07dd-4570-8189-157a68745ab4'],
  ['565488','26eedc81-e174-45bf-9ab3-09cdbcc4e6bc'],
  ['577579','241965db-7ece-4e75-aa6a-2a489ad1a5ab'],
  ['619051','1758e2a3-5877-439a-b8bc-21f3f96b439e'],
  ['619068','8c624cc3-7a2d-4dde-a84b-6321bd5e6451'],
  ['619147','264e75aa-5027-4654-ad11-92d26af24f86'],
  ['619153','0637765d-c767-447b-a2eb-e68fef8a3428'],
  ['623656','4eadec18-0d87-4a46-989e-192aa91a1d6d'],
]);
const historicalIds = new Map([
  ['619068','dccffe38-99c2-4a84-85c0-b36cb4694d36'],
  ['619153','166e1d22-91e3-422d-b683-222c4875dcd6'],
]);
const sourceFields = ['id','source','raw_import_id','upstream_id','tcgplayer_id','set_id','name_raw','number_raw',
  'normalized_name','normalized_number_left','normalized_number_plain','normalized_printed_total',
  'has_slash_number','has_alpha_suffix_number','has_parenthetical_modifier','match_status','candidate_bucket',
  'classifier_version','resolved_set_code','card_print_id'];
const payloadFields = ['_external_id','_set_external_id','name','number','rarity','tcgplayerId','set_name'];
const project = (row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]??null]));
const sorted = rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const norm = value=>String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const ordinal = value=>String(Number(String(value??'').split('/')[0]));
const sourceCandidateId = row=>row.reference_hints_payload?.source_candidate_id??row.source_candidate_id;
const tag = row=>row.reference_hints_payload?.generic_play_nine_intake;
export function proposedGenericPlayNineIntakeIdV1(productId) {
  const product=String(productId);assert.ok(sourceIds.has(product),'reviewed_intake_product_required');
  const h=hash({version:GENERIC_PLAY_NINE_INTAKE_V1,source_candidate_id:sourceIds.get(product),
    evidence_registry:registry.fingerprint,role:'new_generic_stamp_parent_intake'});
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

// Only identity-bearing fields are used. Provider prices are deliberately absent
// from both the intake authority and the warehouse's carried source snapshot.
export function projectGenericPlayNineSourceRowV1(row) {
  const payload = value=>({
    ...project(value??{},payloadFields),
    variants: (value?.variants??[]).map(v=>project(v,['printing','condition','language'])),
    classification: {classification_reason:value?.classification?.classification_reason??null},
    _grookai_ingestion_v1: {classification_reason:value?._grookai_ingestion_v1?.classification_reason??null},
  });
  return {...project(row,sourceFields),payload:payload(row.payload),raw_payload:payload(row.raw_payload)};
}

// Internal operator frame: historical warehouse rows may contain private actor
// data. The plan retains their digests, never their notes or account fields.
export async function readGenericPlayNineIntakeFrameV1(client) {
  const products=targets.map(t=>String(t.product_id)),baseIds=targets.map(t=>t.base.id);
  const jsonRows=async(sql,params)=>(await client.query(sql,params)).rows.map(r=>r.row);
  const payload=alias=>`jsonb_build_object(${payloadFields.map(k=>`'${k}',${alias}->'${k}'`).join(',')},
    'variants',coalesce((select jsonb_agg(jsonb_build_object('printing',v->'printing','condition',v->'condition',
      'language',v->'language') order by ordinal) from jsonb_array_elements(coalesce(${alias}->'variants','[]'::jsonb))
      with ordinality variant(v,ordinal)),'[]'::jsonb),
    'classification',jsonb_build_object('classification_reason',${alias}->'classification'->'classification_reason'),
    '_grookai_ingestion_v1',jsonb_build_object('classification_reason',${alias}->'_grookai_ingestion_v1'->'classification_reason'))`;
  const sourceRows=(await client.query(`select ${sourceFields.map(k=>'edc.'+k).join(',')},
    ${payload('edc.payload')} payload,${payload('ri.payload')} raw_payload
    from public.external_discovery_candidates edc join public.raw_imports ri on ri.id=edc.raw_import_id
    where edc.source='justtcg' and ri.source='justtcg' and edc.tcgplayer_id=any($1::text[]) order by edc.id`,[products])).rows;
  const bases=await jsonRows('select to_jsonb(t) row from public.card_prints t where id=any($1::uuid[]) order by id',[baseIds]);
  const baseIdentities=await jsonRows('select to_jsonb(t) row from public.card_print_identity t where card_print_id=any($1::uuid[]) and is_active order by id',[baseIds]);
  const baseAliases=await jsonRows('select to_jsonb(t) row from public.card_print_identity_aliases t where legacy_card_print_id=any($1::uuid[]) or canonical_card_print_id=any($1::uuid[]) order by id',[baseIds]);
  const sets=await jsonRows('select to_jsonb(t) row from public.sets t where id=any($1::uuid[]) order by id',[[...new Set(targets.map(t=>t.base.set_id))]]);
  const scope=targets.map(t=>({name:norm(t.base.name),number:ordinal(t.base.number)}));
  const globalNameNumberParents=await jsonRows(`select distinct to_jsonb(t) row
    from jsonb_to_recordset($1::jsonb) wanted(name text,number text) join public.card_prints t
    on lower(btrim(regexp_replace(replace(replace(normalize(t.name,NFKC),chr(8217),chr(39)),chr(8216),chr(39)),'\\s+',' ','g')))=wanted.name
    and regexp_replace(split_part(t.number,'/',1),'^0+','')=wanted.number where t.game_id=any($2::uuid[])`,
    [JSON.stringify(scope),[...new Set(targets.map(t=>t.base.game_id))]]);
  const coordinateParents=await jsonRows(`select distinct to_jsonb(t) row from public.card_prints base
    join public.card_prints t on t.set_id=base.set_id and regexp_replace(split_part(t.number,'/',1),'^0+','')=
    regexp_replace(split_part(base.number,'/',1),'^0+','') where base.id=any($1::uuid[])`,[baseIds]);
  const intakes=await jsonRows(`select to_jsonb(t) row from public.canon_warehouse_candidates t
    where t.tcgplayer_id=any($1::text[]) or t.reference_hints_payload->>'source_candidate_id'=any($2::text[])
      or t.id=any($3::uuid[]) order by id`,
    [products,[...sourceIds.values()],products.map(proposedGenericPlayNineIntakeIdV1)]);
  return {sourceRows,bases,baseIdentities,baseAliases,sets,globalNameNumberParents,coordinateParents,intakes};
}

function historicalProof(row,target) {
  assert.equal(row.id,historicalIds.get(String(target.product_id)),'unexpected_historical_intake');
  assert.equal(String(row.tcgplayer_id),String(target.product_id),'historical_product_changed');
  assert.equal(sourceCandidateId(row),sourceIds.get(String(target.product_id)),'historical_source_changed');
  assert.equal(row.state,'PROMOTED','historical_state_changed');
  assert.equal(row.promoted_card_print_id,target.base.id,'historical_ordinary_parent_changed');
  assert.equal(row.promoted_card_printing_id??null,null,'historical_printing_link_changed');
  assert.equal(row.submission_type,'EXTERNAL_DISCOVERY_BRIDGE_V1','historical_type_changed');
  return {id:row.id,product_id:String(target.product_id),source_candidate_id:sourceCandidateId(row),
    promoted_card_print_id:row.promoted_card_print_id,row_sha256:hash(row)};
}

export function buildGenericPlayNineIntakePlanV1(frame) {
  assert.equal(frame.sourceRows.length,9,'exact_nine_source_rows_required');
  assert.equal(new Set(frame.sourceRows.map(r=>String(r.tcgplayer_id))).size,9,'duplicate_source_product');
  const rows=frame.sourceRows.map(projectGenericPlayNineSourceRowV1).sort((a,b)=>Number(a.tcgplayer_id)-Number(b.tcgplayer_id));
  const history=[],entries=[];
  for(const target of targets) {
    const product=String(target.product_id),row=rows.find(r=>r.tcgplayer_id===product);
    assert.ok(row,'missing_exact_source_product');
    assert.equal(row.id,sourceIds.get(product),'source_candidate_changed');
    assert.equal(row.source,'justtcg','source_provider_changed');
    assert.equal(row.card_print_id,null,'discovery_parent_link_changed');
    const base=frame.bases.find(b=>b.id===target.base.id);assert.ok(base,'canonical_base_missing');
    const aliases=frame.baseAliases.filter(a=>a.active&&(a.legacy_card_print_id===base.id||a.canonical_card_print_id===base.id));
    assert.ok(!aliases.some(a=>a.legacy_card_print_id===base.id),'outgoing_base_alias_requires_review');
    const parents=[...new Map([...frame.globalNameNumberParents.filter(p=>norm(p.name)===norm(base.name)&&ordinal(p.number)===ordinal(base.number)),
      ...frame.coordinateParents.filter(p=>p.set_id===base.set_id&&ordinal(p.number)===ordinal(base.number))].map(p=>[p.id,p])).values()];
    const generic=parents.filter(p=>['play_pokemon_stamp','prize_pack_stamp'].includes(p.variant_key)||
      ['play_pokemon_stamp','prize_pack_stamp'].includes(p.printed_identity_modifier));
    const result=adjudicateGenericPlayStampEvidenceV2({product_id:target.product_id,
      base:project(base,Object.keys(target.base)),
      active_base_identities:frame.baseIdentities.filter(i=>i.card_print_id===base.id&&i.is_active)
        .map(i=>project(i,Object.keys(target.base_identity))),approved_base_aliases:aliases,
      existing_generic_stamp_parent_ids:generic.map(p=>p.id),
      observation:capturedGenericPlayStampEvidenceInputV2(target.product_id).observation});
    assert.equal(result.status,'NEW_CANONICAL_REQUIRED','current_identity_evidence_not_ready');
    const old=frame.intakes.filter(r=>!tag(r)&&String(r.tcgplayer_id)===product);
    assert.equal(old.length,historicalIds.has(product)?1:0,'unreviewed_existing_intake');
    if(old.length)history.push(historicalProof(old[0],target));
    const set=frame.sets.find(s=>s.id===base.set_id);assert.ok(set,'canonical_set_missing');
    assert.equal(set.code,base.set_code,'canonical_set_code_changed');
    entries.push({batch_index:entries.length+1,source_external_id:row.upstream_id,source_set_id:row.set_id,
      name:base.name,candidate_name:base.name,printed_number:target.printed_number,
      number_plain:String(Number(target.printed_number.split('/')[0])),proposed_variant_key:'play_pokemon_stamp',
      governing_rule_source:'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V2',stamp_label:'Play! Pokémon',
      canonical_queue_key:base.id+':play_pokemon_stamp',effective_routed_set_code:base.set_code,
      effective_routed_set_name:set.name,effective_identity_space:base.identity_domain,
      underlying_base_proof_summary:{underlying_base_state:'PROVEN',live_base_card_print_id:base.id,
        live_base_set_code:base.set_code,live_base_name:base.name,live_base_number:base.number},
      target_base_resolution:{target_set_code:base.set_code,target_set_name:set.name,target_base_card_print_id:base.id},
      pre_intake_audit:{live_source_candidate_id:row.id,production_authority:false,registry_fingerprint:registry.fingerprint}});
  }
  const lookup={bySourceCandidateId:new Map(entries.map(e=>[e.pre_intake_audit.live_source_candidate_id,e]))};
  const evaluated=evaluateExternalDiscoveryBridgeRowsV1(rows,{canonicalSetCode:null,canonicalSetName:null,rowLevelRoutingRequired:true},lookup);
  assert.equal(evaluated.eligibleRows.length,9,'warehouse_bridge_not_exact_nine_ready');
  assert.equal(evaluated.blockedRows.length,0,'warehouse_bridge_blocked');
  const evidence={bases:sorted(frame.bases),baseIdentities:sorted(frame.baseIdentities),baseAliases:sorted(frame.baseAliases),
    sets:sorted(frame.sets),globalNameNumberParents:sorted(frame.globalNameNumberParents),coordinateParents:sorted(frame.coordinateParents)};
  const basis=hash({version:GENERIC_PLAY_NINE_INTAKE_V1,registry:registry.fingerprint,rows,evidence,history});
  const candidates=evaluated.eligibleRows.map(bridge=>{
    const product=String(bridge.tcgplayer_id),previous=history.find(h=>h.product_id===product);
    const candidate=structuredClone(bridge);
    candidate.planned_candidate_id=proposedGenericPlayNineIntakeIdV1(product);
    candidate.reference_hints_payload.generic_play_nine_intake={version:GENERIC_PLAY_NINE_INTAKE_V1,
      basis_sha256:basis,product_id:product,source_candidate_id:bridge.row.id,
      successor_of:previous?.id??null,successor_preserves_history:true,founder_approval_granted:false};
    candidate.notes=`${GENERIC_PLAY_NINE_INTAKE_V1}: reviewed generic Play! identity preparation; ${previous?'separate successor, preserving '+previous.id:'new intake'}; no founder approval or promotion.`;
    assert.equal(getSourceBackedIdentity(candidate).is_complete,true,'incomplete_source_backed_identity');
    return candidate;
  });
  const body={version:GENERIC_PLAY_NINE_INTAKE_V1,registry_fingerprint:registry.fingerprint,basis_sha256:basis,
    source_rows:rows,evidence,historical_intakes:history,candidates,
    expected_effects:{raw_warehouse_candidates:9,bridge_events:9,existing_row_updates:0,canonical_writes:0,
      printing_writes:0,mapping_writes:0,image_writes:0,owner_writes:0,founder_approvals:0,publication_writes:0}};
  const plan={...body,fingerprint:hash(body)};
  classifyGenericPlayNineIntakeStateV1(plan,frame);
  return plan;
}

export function assertGenericPlayNineIntakePlanV1(plan) {
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'intake_plan_fingerprint_changed');
  assert.equal(plan.version,GENERIC_PLAY_NINE_INTAKE_V1);
  // Structural checks are followed by a complete live-frame rebuild inside the
  // transaction. A hash alone is never accepted as execution authority.
  assert.equal(plan.registry_fingerprint,registry.fingerprint);
  assert.equal(plan.candidates.length,9);assert.equal(plan.historical_intakes.length,2);
  assert.deepEqual(plan.candidates.map(c=>c.tcgplayer_id).sort(),targets.map(t=>String(t.product_id)).sort());
  assert.equal(plan.expected_effects.canonical_writes,0);
  for(const candidate of plan.candidates) {
    const product=String(candidate.tcgplayer_id),t=targets.find(t=>String(t.product_id)===product);
    assert.equal(candidate.row.id,sourceIds.get(product));
    assert.equal(candidate.planned_candidate_id,proposedGenericPlayNineIntakeIdV1(product));
    assert.equal(candidate.claimed_identity_payload.variant_key,'play_pokemon_stamp');
    assert.equal(candidate.claimed_identity_payload.set_code,t.base.set_code);
    assert.equal(candidate.claimed_identity_payload.printed_number,t.printed_number);
    assert.equal(candidate.claimed_identity_payload.name,t.base.name);
    assert.equal(tag(candidate)?.successor_of,historicalIds.get(product)??null);
    assert.equal(tag(candidate)?.basis_sha256,plan.basis_sha256);
    assert.equal(tag(candidate)?.founder_approval_granted,false);
  }
}

export function classifyGenericPlayNineIntakeStateV1(plan,frame) {
  assertGenericPlayNineIntakePlanV1(plan);
  const scoped=frame.intakes;
  assert.ok(scoped.every(r=>sourceIds.has(String(r.tcgplayer_id))),'out_of_scope_intake_row');
  const historical=scoped.filter(r=>!tag(r));
  assert.equal(historical.length,2,'historical_intake_scope_changed');
  for(const proof of plan.historical_intakes) {
    const row=historical.find(r=>r.id===proof.id);assert.ok(row,'historical_intake_missing');
    assert.equal(hash(row),proof.row_sha256,'historical_intake_changed');
  }
  const own=scoped.filter(r=>tag(r));
  if(!own.length)return 'before';
  assert.equal(own.length,9,'partial_or_duplicate_intake_requires_reconciliation');
  assert.equal(new Set(own.map(r=>r.tcgplayer_id)).size,9,'duplicate_intake_requires_reconciliation');
  for(const candidate of plan.candidates) {
    const row=own.find(r=>r.tcgplayer_id===candidate.tcgplayer_id);assert.ok(row,'new_intake_missing');
    assert.equal(row.id,candidate.planned_candidate_id,'new_intake_uuid_proposal_changed');
    assert.equal(row.submission_type,'EXTERNAL_DISCOVERY_BRIDGE_V1','new_intake_type_changed');
    assert.equal(row.submission_intent,'MISSING_CARD','new_intake_intent_changed');
    assert.equal(row.intake_channel,'MANUAL','new_intake_channel_changed');
    assert.deepEqual(row.claimed_identity_payload,candidate.claimed_identity_payload,'new_intake_identity_changed');
    assert.deepEqual(row.reference_hints_payload,candidate.reference_hints_payload,'new_intake_evidence_changed');
    assert.equal(row.notes,candidate.notes,'new_intake_notes_changed');
    assert.equal(row.state,'RAW','intake_has_advanced_requires_independent_readback');
    for(const key of ['founder_approved_by_user_id','founder_approved_at','founder_approval_notes','current_staging_id',
      'promoted_card_print_id','promoted_card_printing_id','promoted_by_user_id','promoted_at',
      'interpreter_decision','interpreter_reason_code','proposed_action_type','identity_resolution'])
      assert.equal(row[key]??null,null,'intake_must_not_approve_stage_or_promote');
    assert.equal(row.needs_promotion_review??false,false,'intake_must_not_claim_review');
  }
  return 'after';
}

// Internal RAW-only composition core. A programme owns the transaction and its
// exact approval/outcome protocol. This never approves, stages or promotes a row.
export async function applyGenericPlayNineIntakeWithinTransactionV1(client,{plan,actorUserId}) {
  assertGenericPlayNineIntakePlanV1(plan);
  assert.match(actorUserId??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,'explicit_actor_required');
  await assertWarehouseTransactionContextV1(client,{serializable:true});
  await client.query("set local lock_timeout='3s'");
  const lock=(await client.query('select pg_try_advisory_xact_lock(hashtext($1)) acquired',[GENERIC_PLAY_NINE_INTAKE_V1])).rows[0];
  assert.equal(lock.acquired,true,'competing_intake_worker');
  await client.query('lock table public.canon_warehouse_candidates in share row exclusive mode');
  const before=await readGenericPlayNineIntakeFrameV1(client),fresh=buildGenericPlayNineIntakePlanV1(before);
  assert.equal(fresh.fingerprint,plan.fingerprint,'intake_source_or_protected_state_drift');
  const state=classifyGenericPlayNineIntakeStateV1(plan,before);let inserted=0;
  if(state==='before')for(const candidate of plan.candidates) {
    await insertCandidate(client,actorUserId,candidate,{candidateId:candidate.planned_candidate_id});inserted++;
  }
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,await readGenericPlayNineIntakeFrameV1(client)),'after');
  return {version:GENERIC_PLAY_NINE_INTAKE_V1,state:inserted?'after':state,inserted,
    founder_approvals:0,canonical_writes:0,transaction_owned_by_caller:true,plan_fingerprint:plan.fingerprint};
}

// This first qualification component deliberately exposes no production apply
// route. The real PostgreSQL driver and database are checked before BEGIN.
// A separately qualified canonical plan/ordinary owner decision is still needed.
export async function qualifyGenericPlayNineIntakeTransactionV1({client,plan,mode='preflight',actorUserId,readFrame}) {
  assert.ok(['preflight','rollback','apply','readback'].includes(mode),'unsupported_intake_mode');
  assertGenericPlayNineIntakePlanV1(plan);
  const parameters=client.connectionParameters;
  assert.ok(parameters&&['127.0.0.1','localhost','::1'].includes(parameters.host),'qualification_loopback_client_required');
  assert.ok([GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,'stamped_bulk_proposed_ids_qualification_v1'].includes(parameters.database),'qualification_database_required');
  assert.match(actorUserId??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,'explicit_actor_required');
  assert.equal(typeof readFrame,'function');
  let commitAttempted=false,committed=false,transactionStarted=false;
  try {
    assert.equal((await client.query('select current_database() name')).rows[0].name,parameters.database);
    transactionStarted=true;await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout='3s'");
    await client.query("set local statement_timeout='45s'");
    const lock=(await client.query('select pg_try_advisory_xact_lock(hashtext($1)) acquired',[GENERIC_PLAY_NINE_INTAKE_V1])).rows[0];
    assert.equal(lock.acquired,true,'competing_intake_worker');
    // Table locks also exclude older bridge implementations that do not know
    // this advisory key. No dedupe check may race an uncoordinated bridge insert.
    await client.query('lock table public.canon_warehouse_candidates in share row exclusive mode');
    const frame=await readFrame(client);
    const fresh=buildGenericPlayNineIntakePlanV1(frame);
    assert.equal(fresh.fingerprint,plan.fingerprint,'intake_source_or_protected_state_drift');
    const state=classifyGenericPlayNineIntakeStateV1(plan,frame);
    if(mode==='readback')assert.equal(state,'after','intake_not_committed');
    let inserted=0;
    if(['rollback','apply'].includes(mode)) {
      const result=await applyGenericPlayNineIntakeWithinTransactionV1(client,{plan,actorUserId});inserted=result.inserted;
      assert.equal(classifyGenericPlayNineIntakeStateV1(plan,await readFrame(client)),'after');
    }
    if(mode==='apply') {commitAttempted=true;await client.query('commit');committed=true;}
    else await client.query('rollback');
    transactionStarted=false;
    return {version:GENERIC_PLAY_NINE_INTAKE_V1,mode,state:inserted?'after':state,inserted,
      committed,rollback_proven:mode==='rollback'&&inserted===9,canonical_writes:0,founder_approvals:0,
      production_writes:0,plan_fingerprint:plan.fingerprint};
  } catch(error) {
    error.commit_uncertain=commitAttempted&&!committed;error.rollback_uncertain=false;error.committed=committed;
    if(transactionStarted&&!committed)await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});
    throw error;
  }
}
