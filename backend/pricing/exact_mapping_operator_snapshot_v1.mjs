// Pure admission of a separately trusted fixed operator capture. No IO, Git,
// credentials, review creation, or execution approval. Caller supplies trust pins.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertMasterMappingBatchAuthority} from './master_index_mapping_authority_v1.mjs';
import {validateTcgplayerExactMappingCandidateForApplyV1,validateTcgplayerExactMappingLiveTargetV1} from './tcgplayer_market_exact_mapping_apply_policy_v1.mjs';
import {jungleSourcePayloadHashV1 as payloadHash} from './jungle_edition_source_review_v1.mjs';
export const MAPPING_OPERATOR_SNAPSHOT_MODE_V1='reviewed_operator_snapshot_v1';
export const MAPPING_OPERATOR_CAPTURE_VERSION_V2='FIXED_OPERATOR_ME05_MAPPING_PREFLIGHT_INPUTS_V2';
export const MAPPING_OPERATOR_SCOPE_V1=Object.freeze({setId:'6f0ede4b-c59a-5b22-ac0f-d0bd6ed2b6c4',setCode:'me05',game:'pokemon',sourceGroupId:24688,sourceCategoryId:3,productIdMin:704758,productIdMax:704877,expectedProducts:120});
const PROJECT='ycdxbpibncqcchqiihfz',MAX_AGE=86400000;
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v),null,2)+'\n';
const uuid=v=>assert.match(v??'',/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/,'snapshot_uuid_required');
function pin(bytes,expected){assert.ok(Buffer.isBuffer(bytes),'snapshot_original_bytes_required');assert.match(expected??'',/^[a-f0-9]{64}$/,'snapshot_trusted_hash_required');assert.equal(sha(bytes),expected,'snapshot_hash_mismatch');}
function rows(bytes){return bytes.toString('utf8').split(/\r?\n/).filter(x=>x.trim()).map(x=>JSON.parse(x));}
function unique(values,key){assert.ok(Array.isArray(values),'snapshot_array_required');const map=new Map();for(const row of values){assert.ok(row&&row[key]!==undefined&&row[key]!==null&&!map.has(row[key]),'snapshot_duplicate_or_missing_id');map.set(row[key],row);}return map;}
function exactSet(a,b,message){assert.deepEqual([...a].sort(),[...b].sort(),message);}
function time(v){assert.equal(typeof v,'string');assert.match(v,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/,'snapshot_utc_time_required');const n=Date.parse(v);assert.ok(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'snapshot_time_invalid');return n;}
function age(v,now){const n=time(v);assert.ok(Number.isSafeInteger(now)&&now>=n&&now-n<=MAX_AGE,'snapshot_stale_or_future');return n;}
function pointer(row,trusted,now){
  assert.ok(row,'snapshot_pointer_required');
  for(const [field,key] of [['run_id','runId'],['publication_set_id','publicationSetId'],['source_sync_run_id','sourceSyncRunId']]){uuid(trusted[key]);assert.equal(row[field],trusted[key],'snapshot_pointer_changed');}
  assert.equal(row.run_mode,'production');assert.ok(['published','verified'].includes(row.state));
  assert.equal(row.publication_state,'published');assert.equal(row.reconciliation_state,'reconciled');
  assert.equal(row.source_status,'completed');assert.equal(row.sync_mode,'current_full_sync');assert.equal(row.source_failed_count,0);
  assert.ok(age(row.source_finished_at,now)<=age(row.completed_at,now),'snapshot_time_order');
  assert.equal(row.pointer_snapshot.singleton,true);
  assert.equal(row.pointer_snapshot.run_id,trusted.runId);assert.equal(row.pointer_snapshot.publication_set_id,trusted.publicationSetId);
}
function validateSiblings(observations,decisions,population,source,runId,scope){
  const obs=unique(observations,'id'),byObs=unique(decisions,'source_observation_id');unique(decisions,'decision_id');
  exactSet(obs.keys(),byObs.keys(),'snapshot_sibling_census_mismatch');
  const byProduct=unique(population,'source_product_id');
  for(const o of obs.values()){
    assert.ok(byProduct.has(o.product_id),'snapshot_observation_outside_scope');uuid(o.id);
    assert.equal(o.category_id,scope.sourceCategoryId);assert.equal(o.group_id,scope.sourceGroupId);
    assert.equal(o.last_seen_run_id,source.id);assert.equal(o.observed_on,source.observed_on);
    assert.equal(o.currency,'USD');assert.match(o.payload_hash??'',/^[a-f0-9]{64}$/);
    assert.ok(o.raw_payload&&payloadHash(o.raw_payload)===o.payload_hash,'snapshot_observation_payload_hash');
    assert.equal(o.raw_payload.productId,o.product_id);assert.equal(o.raw_payload.subTypeName,o.subtype_name);
    const d=byObs.get(o.id);uuid(d.decision_id);
    assert.equal(d.run_id,runId);assert.equal(d.source_sync_run_id,source.id);
    assert.equal(d.source_product_id,o.product_id);assert.equal(d.source_subtype_name,o.subtype_name);
    assert.equal(d.source_price_row_identity,o.source_price_row_identity);assert.ok(typeof o.source_price_row_identity==='string'&&o.source_price_row_identity.length>0);
    assert.equal(d.currency,o.currency);assert.equal(d.source_row_hash,o.payload_hash);
    assert.equal(d.product_scope_result,'in_scope','snapshot_unsupported_sibling');
    assert.equal(d.primary_reason,'missing_active_source_mapping','snapshot_unsupported_sibling');
    assert.equal(d.decision,'quarantine','snapshot_unsupported_sibling');
  }
  for(const c of population){const siblings=observations.filter(o=>o.product_id===c.source_product_id);
    assert.ok(siblings.length>0,'snapshot_product_without_observations');
    exactSet(siblings.map(o=>o.id),c.supporting_gap_observation_ids,'snapshot_unreviewed_sibling');
    assert.equal(c.supporting_gap_row_count,siblings.length);
    exactSet(new Set(siblings.map(o=>o.subtype_name)),c.source_subtypes,'snapshot_subtypes_changed');
  }
}

export function assertMappingOperatorSnapshotV1({captureBytes,populationBytes,selectedBytes,authorityBytes,trusted,now=Date.now()}){
  for(const [name,value] of Object.entries({capture:captureBytes,population:populationBytes,selected:selectedBytes,authority:authorityBytes}))pin(value,trusted?.[`${name}Sha256`]);
  for(const key of ['collectorSha256','sqlSha256','caSha256'])assert.match(trusted[key]??'',/^[a-f0-9]{64}$/,'snapshot_trusted_collector_pins_required');
  const c=JSON.parse(captureBytes),scope=trusted.scope??MAPPING_OPERATOR_SCOPE_V1;
  assert.equal(c.version,MAPPING_OPERATOR_CAPTURE_VERSION_V2,'snapshot_unsupported_capture_version');
  assert.equal(c.accepted,true);assert.equal(c.status,'accepted');assert.equal(c.projectRef,PROJECT);
  for(const key of ['collectorSha256','sqlSha256','caSha256'])assert.equal(c[key],trusted[key],'snapshot_collector_pin_mismatch');
  assert.deepEqual(c.scope,scope,'snapshot_scope_changed');
  assert.equal(c.sourceRunId,trusted.runId);assert.equal(c.publicationSetId,trusted.publicationSetId);assert.equal(c.sourceSyncRunId,trusted.sourceSyncRunId);
  assert.equal(c.readOnly,true);assert.equal(c.verifiedTls,true);assert.equal(c.rollbackAcknowledged,true);
  assert.equal(c.databaseWrites,0);assert.equal(c.executorInvoked,false);assert.equal(c.dryRunPassed,null);
  const captured=age(c.capturedAt,now);
  assert.deepEqual(c.records.map(r=>r.kind),['environment','current_publication_before','source_run','schema_columns','live_input_context','current_publication_after','transaction_end']);
  const r=Object.fromEntries(c.records.map(row=>[row.kind,row])),env=r.environment;
  assert.equal(env.read_only,'on');assert.equal(env.isolation,'repeatable read');assert.equal(env.database,'postgres');assert.equal(env.timezone,'UTC');
  assert.ok(age(env.captured_at,now)<=captured);
  for(const [key,min] of [['cards',40000],['sets',150],['traits',5000],['migrations',444]])assert.ok(Number.isSafeInteger(env[key])&&env[key]>=min,'snapshot_maturity_failed');
  assert.equal(r.current_publication_before.rows.length,1);
  assert.deepEqual(r.current_publication_before.rows,r.current_publication_after.rows,'snapshot_pointer_changed');
  pointer(r.current_publication_before.rows[0],trusted,now);
  assert.equal(r.source_run.rows.length,1);const source=r.source_run.rows[0];
  assert.equal(source.id,trusted.sourceSyncRunId);assert.equal(source.status,'completed');assert.equal(source.sync_mode,'current_full_sync');assert.equal(source.failed_count,0);
  assert.equal(source.finished_at,r.current_publication_before.rows[0].source_finished_at);
  assert.ok(age(source.finished_at,now)<=time(env.captured_at));
  assert.equal(r.transaction_end.status,'ROLLBACK');assert.equal(r.transaction_end.read_only_after,'on');assert.equal(r.transaction_end.isolation_after,'read committed');
  const ctx=r.live_input_context.data,population=rows(populationBytes),selected=rows(selectedBytes);
  assert.ok(selected.length>0&&selected.length<=25,'snapshot_batch_bound');
  const all=unique(population,'source_product_id');unique(population.map(x=>({id:x.target.card_print_id})),'id');unique(population,'candidate_fingerprint');
  assert.equal(population.length,scope.expectedProducts);assert.equal(scope.productIdMax-scope.productIdMin+1,scope.expectedProducts);
  exactSet(all.keys(),Array.from({length:scope.expectedProducts},(_,i)=>scope.productIdMin+i),'snapshot_population_incomplete');
  for(const item of selected)assert.deepEqual(item,all.get(item.source_product_id),'snapshot_selected_not_reviewed_population');
  const caps={products:scope.expectedProducts,targets:scope.expectedProducts,groups:1,identities:1000,mappings:2000,observations:1000,artifacts:100,publication_snapshots:2000,decisions:1000,foreign_embedded_targets:1000};
  for(const [key,cap] of Object.entries(caps)){assert.ok(Array.isArray(ctx[key]),'snapshot_required_census_missing');assert.equal(ctx[key].length,ctx.counts[key],'snapshot_census_count_mismatch');assert.ok(Number.isSafeInteger(ctx.counts[key])&&ctx.counts[key]<=cap);}
  assert.equal(ctx.foreign_embedded_targets.length,0,'snapshot_foreign_embedded_collision');assert.equal(ctx.publication_snapshots.length,0,'snapshot_publication_overlap');
  assert.equal(ctx.set_rows.length,1);assert.equal(ctx.set_rows[0].id,scope.setId);assert.equal(ctx.set_rows[0].code,scope.setCode);assert.equal(ctx.set_rows[0].game,scope.game);
  assert.equal(ctx.groups.length,1);assert.equal(ctx.groups[0].group_id,scope.sourceGroupId);assert.equal(ctx.groups[0].category_id,scope.sourceCategoryId);
  const products=unique(ctx.products,'product_id'),targets=unique(ctx.targets,'card_print_id');
  exactSet(products.keys(),all.keys(),'snapshot_product_census_mismatch');exactSet(targets.keys(),population.map(x=>x.target.card_print_id),'snapshot_target_census_mismatch');
  unique(ctx.identities,'id');unique(ctx.mappings,'id');const artifacts=unique(ctx.artifacts,'id');
  for(const m of ctx.mappings){assert.equal(typeof m.active,'boolean');assert.ok(all.has(Number(m.external_id))||targets.has(m.card_print_id),'snapshot_mapping_outside_scope');assert.ok(!(m.source==='tcgplayer'&&(all.has(Number(m.external_id))||m.active&&targets.has(m.card_print_id))),'snapshot_existing_mapping');}
  for(const i of ctx.identities)assert.ok(targets.has(i.card_print_id),'snapshot_identity_outside_scope');
  for(const candidate of population){
    assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted,true,'snapshot_invalid_candidate');
    assert.equal(candidate.mapping_method,'exact_embedded_tcgcsv_identity_v1','snapshot_unsupported_identity_proof');
    const p=products.get(candidate.source_product_id),t=targets.get(candidate.target.card_print_id),raw=p.product_snapshot,parent=t.parent_snapshot;
    assert.equal(p.source_product_name,candidate.source_product_name);assert.equal(p.source_group_name,candidate.source_group_name);assert.equal(p.source_group_name,ctx.groups[0].name);
    assert.equal(p.source_group_id,scope.sourceGroupId);assert.equal(candidate.source_group_id,scope.sourceGroupId);
    assert.equal(p.source_active,true);assert.equal(p.catalog_metadata_status,'current');assert.equal(p.active_source_mapping_count,0);
    for(const [k,v] of Object.entries({product_id:p.product_id,group_id:scope.sourceGroupId,category_id:scope.sourceCategoryId,name:p.source_product_name,source_active:true,catalog_metadata_status:'current',last_seen_run_id:source.id}))assert.equal(raw[k],v,'snapshot_product_projection_changed');
    assert.deepEqual(raw.extended_data,p.extended_data);
    assert.ok(raw.raw_payload&&payloadHash(raw.raw_payload)===raw.payload_hash,'snapshot_product_payload_hash');
    for(const [key,value] of Object.entries({productId:p.product_id,groupId:scope.sourceGroupId,categoryId:scope.sourceCategoryId,name:p.source_product_name}))assert.equal(raw.raw_payload[key],value);
    assert.deepEqual(raw.raw_payload.extendedData,p.extended_data);
    const numbers=p.extended_data.filter(x=>String(x.name).toLowerCase()==='number');assert.equal(numbers.length,1);assert.equal(numbers[0].value,candidate.printed_number);
    assert.deepEqual(validateTcgplayerExactMappingLiveTargetV1(candidate,t),[],'snapshot_target_changed');
    assert.equal(t.game_code,scope.game);assert.equal(t.set_id,scope.setId);assert.equal(t.set_code,scope.setCode);
    for(const key of ['gv_id','set_id','set_code','name','number','variant_key'])assert.equal(parent[key],t[key],'snapshot_parent_projection_changed');
    assert.equal(parent.id,t.card_print_id);assert.equal(parent.number,candidate.target.canonical_number);
    assert.equal(parent.external_ids?.new_set_release_ingestion_v1?.source,'tcgcsv');
    assert.equal(parent.external_ids.new_set_release_ingestion_v1.external_id,`tcgcsv:${scope.sourceGroupId}:${p.product_id}`);
    const identities=ctx.identities.filter(i=>i.card_print_id===t.card_print_id&&i.is_active===true&&i.identity_domain==='pokemon_eng_standard');
    assert.equal(identities.length,1);assert.equal(t.active_standard_identity_count,identities.length);assert.equal(t.active_tcgplayer_mapping_count,0);
  }
  validateSiblings(ctx.observations,ctx.decisions,population,source,trusted.runId,scope);
  for(const o of ctx.observations){const artifact=artifacts.get(o.source_artifact_id);assert.ok(artifact,'snapshot_observation_artifact_missing');assert.equal(artifact.sync_run_id,source.id);assert.match(artifact.sha256??'',/^[a-f0-9]{64}$/);assert.equal(ctx.decisions.find(d=>d.source_observation_id===o.id).source_artifact_hash,artifact.sha256);}
  const selectedTargetIds=new Set(selected.map(row=>row.target.card_print_id));
  const authority=JSON.parse(authorityBytes);
  assertMasterMappingBatchAuthority(selected,authority,{liveTargets:ctx.targets.filter(row=>selectedTargetIds.has(row.card_print_id))});
  for(const candidate of selected){
    const scopes=authority.scopes.filter(s=>s.manifest.external_mapping_assertions.some(a=>a.candidate_fingerprint===candidate.candidate_fingerprint));
    assert.equal(scopes.length,1,'snapshot_reviewed_source_scope_required');
    const assertion=scopes[0].manifest.external_mapping_assertions.find(a=>a.candidate_fingerprint===candidate.candidate_fingerprint);
    const artifact=scopes[0].artifacts.find(a=>a.ref===assertion.source_ref);
    const reviewedRaw=JSON.parse(Buffer.from(artifact.base64,'base64').toString('utf8'));
    assert.equal(payloadHash(reviewedRaw),products.get(candidate.source_product_id).product_snapshot.payload_hash,'snapshot_reviewed_product_payload_changed');
  }
  return {selected,population,context:ctx,source,pointer:r.current_publication_before.rows[0],capturedAt:c.capturedAt,scope,trusted:structuredClone(trusted),executionAuthorized:false};
}

export function buildMappingOperatorSnapshotPlanV1(input){
  const proof=assertMappingOperatorSnapshotV1(input),producer=input.producer;
  assert.match(producer?.commitSha??'',/^[a-f0-9]{40}$/,'snapshot_clean_producer_required');assert.equal(producer.trackedWorktreeClean,true,'snapshot_clean_producer_required');
  assert.ok(typeof producer.branch==='string'&&producer.branch.trim()===producer.branch&&producer.branch.length>0);assert.ok(age(producer.observedAt,input.now??Date.now())>=time(proof.capturedAt));
  const runPlan={version:'MAPPING_OPERATOR_SNAPSHOT_PLAN_V1',mode:MAPPING_OPERATOR_SNAPSHOT_MODE_V1,
    commit_sha:producer.commitSha,branch:producer.branch,tracked_worktree_clean:true,producer_observed_at:producer.observedAt,
    commit_semantics:'Actual clean committed offline snapshot-validation producer; not the historical offline planner or a live executor.',
    database_target:{kind:'trusted_production_snapshot',project_ref:PROJECT},source_run_id:input.trusted.runId,source_sync_run_id:input.trusted.sourceSyncRunId,
    publication_set_id:input.trusted.publicationSetId,capture_sha256:input.trusted.captureSha256,population_sha256:input.trusted.populationSha256,
    candidate_artifact_sha256:input.trusted.selectedSha256,master_authority_sha256:input.trusted.authoritySha256,
    collector_sha256:input.trusted.collectorSha256,sql_sha256:input.trusted.sqlSha256,ca_sha256:input.trusted.caSha256,
    captured_at:proof.capturedAt,execution_authorized:false,live_preflight_completed:false,database_writes:0};
  const summary={version:'MAPPING_OPERATOR_SNAPSHOT_SUMMARY_V1',status:'passed',validation_scope:'trusted_snapshot_admission_only',counts:{candidates:proof.selected.length,population:proof.population.length},execution_authorized:false,live_preflight_completed:false};
  return {runPlan,summary,proof,files:{'candidates.jsonl':Buffer.from(input.selectedBytes),'master_authority.json':Buffer.from(input.authorityBytes),
    'operator_capture.json':Buffer.from(input.captureBytes),'reviewed_population.jsonl':Buffer.from(input.populationBytes),
    'run_plan.json':Buffer.from(json(runPlan)),'summary.json':Buffer.from(json(summary))}};
}

// Called inside the executor transaction, again just before COMMIT. Rows use the
// same immutable SQL projection as capture V2. No caller-provided SQL is accepted.
export function assertMappingOperatorLiveStateV1(proof,{pointerRows,observations,decisions,foreignTargets,products},now=Date.now()){
  age(proof.capturedAt,now);assert.equal(pointerRows.length,1);pointer(pointerRows[0],proof.trusted,now);
  assert.deepEqual(pointerRows[0].pointer_snapshot,proof.pointer.pointer_snapshot,'snapshot_live_pointer_changed');
  assert.equal(foreignTargets.length,0,'snapshot_live_foreign_collision');
  const liveProducts=unique(products,'product_id');exactSet(liveProducts.keys(),proof.selected.map(c=>c.source_product_id),'snapshot_live_product_census');
  for(const product of products)assert.deepEqual(product,proof.context.products.find(p=>p.product_id===product.product_id).product_snapshot,'snapshot_live_product_changed');
  validateSiblings(observations,decisions,proof.selected,proof.source,proof.trusted.runId,proof.scope);
  const frozen=new Map(proof.context.observations.map(o=>[o.id,o]));
  for(const o of observations)assert.deepEqual(o,frozen.get(o.id),'snapshot_live_observation_changed');
  const frozenDecisions=new Map(proof.context.decisions.map(d=>[d.decision_id,d]));
  for(const d of decisions)assert.deepEqual(d,frozenDecisions.get(d.decision_id),'snapshot_live_decision_changed');
  return true;
}

export async function readMappingOperatorLiveStateV1(client,proof,{lockPointer=false}={}){
  assert.equal(typeof lockPointer,'boolean');
  const ids=proof.selected.map(c=>c.source_product_id),targetIds=proof.selected.map(c=>c.target.card_print_id);
  const pointerRows=(await client.query(`select c.run_id,c.publication_set_id,p.publication_state,r.state,r.reconciliation_state,r.run_mode,
    r.source_sync_run_id,r.completed_at,source.finished_at as source_finished_at,source.status as source_status,
    source.sync_mode,source.failed_count as source_failed_count,to_jsonb(c) as pointer_snapshot
    from public.market_price_current_publication c
    join public.market_price_publication_sets p on p.id=c.publication_set_id and p.run_id=c.run_id
    join public.market_price_pipeline_runs r on r.id=c.run_id
    join public.tcgcsv_source_sync_runs source on source.id=r.source_sync_run_id
    where c.singleton${lockPointer?' for share of c':''}`)).rows.map(row=>({...row,completed_at:row.completed_at instanceof Date?row.completed_at.toISOString():row.completed_at,
      source_finished_at:row.source_finished_at instanceof Date?row.source_finished_at.toISOString():row.source_finished_at}));
  const observations=(await client.query(`select to_jsonb(o) as row from public.tcgcsv_source_price_daily_observations o
    where o.product_id=any($1::integer[]) and o.observed_on=$2::date order by o.id`,[ids,proof.source.observed_on])).rows.map(x=>x.row);
  const decisions=(await client.query(`select d.id::text as decision_id,d.run_id::text,d.source_product_id,d.source_observation_id::text,
    d.source_subtype_name,d.decision,d.reason_codes[1] as primary_reason,d.evidence->>'product_scope_result' as product_scope_result,
    d.source_sync_run_id::text,d.source_price_row_identity,d.currency,d.source_row_hash,d.source_artifact_hash
    from public.market_price_qualification_decisions d where d.run_id=$1::uuid and d.source_product_id=any($2::integer[])
    order by d.id`,[proof.trusted.runId,ids])).rows;
  const foreignTargets=(await client.query(`select c.id::text as card_print_id from public.card_prints c
    where c.external_ids #>> '{new_set_release_ingestion_v1,external_id}'=any($1::text[])
    and not(c.id=any($2::uuid[])) order by c.id`,[ids.map(id=>`tcgcsv:${proof.scope.sourceGroupId}:${id}`),targetIds])).rows;
  const products=(await client.query('select to_jsonb(p) as row from public.tcgcsv_source_products p where p.product_id=any($1::integer[]) order by p.product_id',[ids])).rows.map(x=>x.row);
  return {pointerRows,observations,decisions,foreignTargets,products};
}
