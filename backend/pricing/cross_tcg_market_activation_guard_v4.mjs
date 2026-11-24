import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';
import {CROSS_TCG_MARKET_SCOPE_V2,evaluateCrossTcgMarketActivationV2} from './cross_tcg_market_activation_guard_v3.mjs';
import {readJapaneseSourceGapPreparationV1,previewJapaneseSourceGapExceptionV1} from './japanese_source_gap_exception_preparation_v1.mjs';

export const CROSS_TCG_MARKET_ACTIVATION_GUARD_V4='CROSS_TCG_MARKET_ACTIVATION_GUARD_V4';
export const SOURCE_GAP_WORKER_V1='TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_31';

// Old shadows, partial selections and worker30 cannot bootstrap this authority.
export async function readCrossTcgMarketBootstrapV4(client,workerVersion){
 assert.equal(workerVersion,SOURCE_GAP_WORKER_V1);
 const {rows}=await client.query(`select
  exists(select 1 from public.market_price_current_publication pointer
   join public.market_price_publication_sets publication on publication.id=pointer.publication_set_id and publication.run_id=pointer.run_id
   join public.market_price_pipeline_runs run on run.id=pointer.run_id
   where pointer.singleton and publication.publication_state='published'
    and run.state in('published','verified') and run.reconciliation_state='reconciled'
    and run.policy_version=$1 and run.worker_version=$2
    and run.reconciliation->>'source_scope_version'=$3
    and run.reconciliation->'complete_source_selection'='true'::jsonb
    and run.reconciliation->'activation_coverage_qualification'->'ready_for_production'='true'::jsonb
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'version'=$4
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'worker_version'=$2
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'run_id'=run.id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'publication_set_id'=publication.id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'source_sync_run_id'=run.source_sync_run_id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'run_mode'='production'
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->'ready_for_production'='true'::jsonb) current_verified,
  exists(select 1 from public.market_price_pipeline_runs run
   join public.market_price_publication_sets publication on publication.run_id=run.id and publication.publication_state='staging'
   where run.state='shadow_verified' and run.reconciliation_state='reconciled'
    and run.required_phase_count>0 and run.succeeded_phase_count=run.required_phase_count
    and run.policy_version=$1 and run.worker_version=$2
    and run.reconciliation->>'source_scope_version'=$3
    and run.reconciliation->'complete_source_selection'='true'::jsonb
    and run.reconciliation->'activation_coverage_qualification'->'ready_for_production'='true'::jsonb
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'version'=$4
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'worker_version'=$2
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'run_id'=run.id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'publication_set_id'=publication.id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'source_sync_run_id'=run.source_sync_run_id::text
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->>'run_mode'='shadow'
    and run.reconciliation->'activation_coverage_qualification'->'cross_tcg_scope_guard'->'ready_for_production'='true'::jsonb) shadow_verified`,
 [TCGPLAYER_MARKET_PUBLICATION_POLICY_V3,workerVersion,CROSS_TCG_MARKET_SCOPE_V2,CROSS_TCG_MARKET_ACTIVATION_GUARD_V4]);
 const proof=rows[0];
 if(!proof||(proof.current_verified!==true&&proof.shadow_verified!==true))throw Error('cross_tcg_market_v4_initial_full_shadow_required');
 return proof;
}

// This reader is also usable in a server-enforced read-only qualification.
// No snapshot, decision, quote, mapping, pointer or identity is mutated.
export async function readJapaneseSourceGapInputsV1(client,{runId,publicationSetId}){
 const m=readJapaneseSourceGapPreparationV1();
 const sourceRun=(await client.query(`select id,status,sync_mode,failed_count,finished_at
  from public.tcgcsv_source_sync_runs where sync_mode='current_full_sync'
   and status='completed' and failed_count=0 and finished_at is not null
  order by finished_at desc,created_at desc,id desc limit 1`)).rows[0];
 assert.equal(sourceRun?.id,m.sourceSyncRun,'No exception carry-forward to another source');
 const pointers=(await client.query(`select pointer.publication_set_id,pointer.run_id
  from public.market_price_current_publication pointer
  join public.market_price_publication_sets publication on publication.id=pointer.publication_set_id and publication.run_id=pointer.run_id
  join public.market_price_pipeline_runs run on run.id=pointer.run_id
  where pointer.singleton and publication.publication_state='published'
   and run.state in('published','verified') and run.reconciliation_state='reconciled'`)).rows;
 assert.equal(pointers.length,1,'One accepted baseline publication required');
 assert.equal(pointers[0].publication_set_id,m.baselinePublication,'Frozen baseline publication changed');
 assert.equal(pointers[0].run_id,m.baselineRun,'Frozen baseline run changed');
 const baseline=(await client.query(`select distinct snapshot.card_printing_id
  from public.market_price_publication_snapshots snapshot
  join public.market_price_qualification_decisions decision on decision.id=snapshot.qualification_decision_id and decision.run_id=snapshot.run_id
  where snapshot.publication_set_id=$1 and snapshot.run_id=$2
   and snapshot.publication_state='published' and snapshot.freshness_state='fresh'
   and decision.eligible and decision.decision='publish' and decision.publication_lane='current' and decision.evidence->>'category_id'='85'
   and not exists(select 1 from public.card_printing_truth_reviews review where review.card_printing_id=snapshot.card_printing_id and review.active and review.public_visibility in('hidden_pending_review','hidden_unsupported'))
  order by snapshot.card_printing_id`,[pointers[0].publication_set_id,pointers[0].run_id])).rows;
 const selected=(await client.query(`select distinct snapshot.card_printing_id
  from public.market_price_publication_snapshots snapshot
  join public.market_price_qualification_decisions decision on decision.id=snapshot.qualification_decision_id and decision.run_id=snapshot.run_id
  where snapshot.publication_set_id=$1 and snapshot.run_id=$2
   and decision.eligible and decision.decision='publish' and decision.publication_lane='current' and decision.evidence->>'category_id'='85'
   and not exists(select 1 from public.card_printing_truth_reviews review where review.card_printing_id=snapshot.card_printing_id and review.active and review.public_visibility in('hidden_pending_review','hidden_unsupported'))
  order by snapshot.card_printing_id`,[publicationSetId,runId])).rows;
 const pins=(await client.query(`select id,sync_run_id,artifact_kind,category_id,group_id,sha256,byte_size
  from public.tcgcsv_source_artifacts where id=any($1::uuid[])`,[m.sourceArtifactPins.map(pin=>pin.id)])).rows;
 const artifacts=pins.map(pin=>{const frozen=m.sourceArtifactPins.find(row=>row.id===pin.id);assert.ok(frozen,'Unexpected artifact');for(const key of['artifact_kind','category_id','group_id','sha256'])assert.equal(pin[key],frozen[key],'Source artifact metadata drift');assert.equal(String(pin.byte_size),String(frozen.byte_size));assert.equal(pin.sync_run_id,m.sourceSyncRun);return{...pin,bytes:fs.readFileSync(new URL('../../docs/pricing/japanese_source_gap_seventeen_v1/source/'+frozen.group_id+'-'+frozen.artifact_kind+'.json',import.meta.url))};});
 return {sourceRun,currentPublication:pointers[0],baselineJapaneseIds:baseline.map(row=>row.card_printing_id),selectedJapaneseIds:selected.map(row=>row.card_printing_id),artifacts};
}

export async function assertCrossTcgMarketActivationV4(client,{runId,publicationSetId,workerVersion,counts}){
 assert.equal(workerVersion,SOURCE_GAP_WORKER_V1);
 const facts=(await client.query(`select run.id,run.worker_version,run.policy_version,run.run_mode,
  run.source_sync_run_id,run.reconciliation,publication.id publication_set_id,clock_timestamp() observed_at
  from public.market_price_pipeline_runs run
  join public.market_price_publication_sets publication on publication.run_id=run.id
  where run.id=$1 and publication.id=$2`,[runId,publicationSetId])).rows;
 assert.equal(facts.length,1,'Exact run/publication required');const run=facts[0];
 assert.equal(run.id,runId);assert.equal(run.publication_set_id,publicationSetId);
 assert.equal(run.worker_version,workerVersion);assert.equal(run.policy_version,TCGPLAYER_MARKET_PUBLICATION_POLICY_V3);
 assert.ok(['production','shadow'].includes(run.run_mode),'Only production or full-shadow qualification');
 const bootstrap=run.run_mode==='production'?await readCrossTcgMarketBootstrapV4(client,workerVersion):{required:false,reason:'shadow_only'};
 const original=evaluateCrossTcgMarketActivationV2({reconciliation:run.reconciliation,counts});
 let exception=null;
 if(!original.ready_for_production){
  if(original.findings.some(finding=>finding!=='japanese_pokemon_material_coverage_loss'))throw Error('cross_tcg_market_activation_blocked:'+original.findings.join(','));
  // Any different source/baseline/expiry stays under the original guard. The
  // closed preview rejects changed IDs, selected gap prices and changed bytes.
  const m=readJapaneseSourceGapPreparationV1();assert.equal(run.source_sync_run_id,m.sourceSyncRun,'No exception carry-forward to another source');
  const inputs=await readJapaneseSourceGapInputsV1(client,{runId,publicationSetId});
  exception=previewJapaneseSourceGapExceptionV1({...inputs,counts,reconciliation:run.reconciliation,now:run.observed_at});
  if(!exception.preparation_coverage_passed)throw Error('cross_tcg_market_activation_blocked:'+exception.findings.join(','));
  // The legacy preview deliberately reports no integration receipt. Persist
  // its coverage facts; the enclosing guard binds the actual worker and run.
  delete exception.worker_integrated;
 }
 return {version:CROSS_TCG_MARKET_ACTIVATION_GUARD_V4,source_scope_version:CROSS_TCG_MARKET_SCOPE_V2,worker_version:workerVersion,
  run_id:runId,publication_set_id:publicationSetId,source_sync_run_id:run.source_sync_run_id,run_mode:run.run_mode,
  ready_for_production:true,findings:[],original_guard:original,source_gap_exception:exception,bootstrap,
  production_execution_authority:false};
}
