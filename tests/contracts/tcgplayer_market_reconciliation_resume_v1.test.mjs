import assert from 'node:assert/strict';
import test from 'node:test';
import {runDurable} from '../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs';

// Model a durable run whose staging, qualification and snapshot build already
// succeeded. Execute the real remaining phase and terminal-state transition.
// Four eligible fixture rows represent MTG, English Pokemon, One Piece and
// Japanese Pokemon; a fifth row is excluded. This is a state-machine model,
// not a claim of a real database/full-source qualification.
function stagedRunClient({traced=4,onePiece=1,mtg=1}={}) {
  const run={id:'00000000-0000-4000-8000-000000000001',run_key:'RECONCILIATION-RESUME',state:'failed'};
  const phases=[];
  const client={run,phases,async query(sql,values=[]) {
    if(typeof sql==='object'){values=sql.values;sql=sql.text;}
    if(['begin','commit','rollback'].includes(sql))return {rows:[]};
    if(sql==='show statement_timeout')return {rows:[{statement_timeout:'2min'}]};
    if(sql.includes("current_setting('enable_indexscan')"))return {rows:[{indexscan:'on',bitmapscan:'on'}]};
    if(sql.includes('set_config('))return {rows:[]};
    if(sql.includes('with publication_scopes as materialized'))return {rows:[{mtg_selected:mtg,mtg_eligible:mtg,mtg_baseline_eligible:1,pokemon_eligible:1,pokemon_baseline_eligible:1,fresh_pokemon_eligible:1,one_piece_eligible:onePiece,one_piece_baseline_eligible:1,japanese_eligible:1,japanese_baseline_eligible:1}]};
    if(sql.includes('select run.id,run.worker_version'))return {rows:[{...run,publication_set_id:'00000000-0000-4000-8000-000000000004',observed_at:'2026-11-24T15:00:00Z'}]};
    if(sql.includes('pg_advisory_'))return {rows:[]};
    if(sql.includes('insert into public.market_price_pipeline_runs')) {
      Object.assign(run,{git_commit_sha:values[10],run_mode:values[3],source_sync_run_id:values[5],policy_version:values[2],worker_version:values[11]});
      return {rows:[run]};
    }
    if(sql.includes('select exists')&&sql.includes('market_price_pipeline_phase_attempts'))return {rows:[{completed:values[1]!=='reconcile'}]};
    if(sql.includes('coalesce(max(attempt)'))return {rows:[{attempt:0}]};
    if(sql.includes('insert into public.market_price_pipeline_phase_attempts')) {
      phases.push({phase:values[2],state:values[4],error:values[16]});
      return {rows:[{id:'00000000-0000-4000-8000-000000000002'}]};
    }
    if(sql.includes('with candidate_totals'))return {rows:[{selected_count:5,mapped_count:5,decision_count:5,eligible_count:4,delayed_count:0,suppressed_count:0,quarantined_count:0,excluded_count:1,snapshot_count:4,traced_snapshot_count:traced}]};
    if(sql.includes('as decision_count'))return {rows:[{decision_count:5,eligible_count:4,delayed_count:0,suppressed_count:0,quarantined_count:0,excluded_count:1}]};
    if(sql.includes('insert into public.market_price_publication_sets'))return {rows:[{id:'00000000-0000-4000-8000-000000000004',publication_state:'staging',expected_snapshot_count:4}]};
    if(sql.includes('reconciliation = $12::jsonb')) {
      Object.assign(run,{state:values[1],reconciliation_state:values[2],reconciliation:JSON.parse(values[11])});
      return {rows:[]};
    }
    if(sql.includes("set state = 'shadow_verified'")) {
      assert.equal(run.reconciliation_state,'reconciled');if(run.reconciliation.complete_source_selection){assert.equal(run.reconciliation.activation_coverage_qualification.ready_for_production,true);assert.equal(run.reconciliation.activation_coverage_qualification.cross_tcg_scope_guard.version,'CROSS_TCG_MARKET_ACTIVATION_GUARD_V4');}run.state='shadow_verified';return {rows:[]};
    }
    if(sql.includes("jsonb_build_object('activation_coverage_qualification'")){run.reconciliation.activation_coverage_qualification=JSON.parse(values[1]);return {rows:[],rowCount:1};}
    if(sql.includes("set state='failed',current_phase='shadow_verify'")){run.state='failed';run.error=values[1];return {rows:[],rowCount:1};}
    if(sql.includes('update public.market_price_pipeline_runs'))return {rows:[]};
    if(sql.includes('select *')&&sql.includes('from public.market_price_pipeline_runs'))return {rows:[run]};
    throw new Error('Unexpected database operation: '+sql.trim().slice(0,120));
  }};
  return client;
}

const source={id:'00000000-0000-4000-8000-000000000003'};
const plan={run_key:'RECONCILIATION-RESUME',commit_sha:'a'.repeat(40)};
for(const [name,limit,canaryDefinition,complete]of [
  ['unlimited full source',null,null,true],
  ['limited source',1,null,false],
  ['explicit canary selection',null,{printings:[]},false],
])test('durable shadow reconciliation resumes '+name,async()=>{
  const client=stagedRunClient();
  const result=await runDurable(client,{runMode:'shadow',limit,canaryDefinition},source,plan);
  assert.equal(result.run.state,'shadow_verified');
  assert.equal(result.reconciliation.complete_source_selection,complete);
  assert.equal(result.reconciliation.source_scope_version,'CROSS_TCG_MARKET_SCOPE_V2');
  assert.deepEqual(result.reconciliation.mismatches,[]);
  assert.equal(client.run.worker_version,'TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_31');
  assert.equal(Boolean(result.reconciliation.activation_coverage_qualification),complete);
  if(complete){const qualification=result.reconciliation.activation_coverage_qualification;assert.equal(qualification.guard_stage,'shadow_pre_verification');assert.equal(qualification.evidence_scope,'shadow_publication_snapshots');assert.equal(qualification.status,'shadow_coverage_qualified');assert.equal(qualification.production_execution_authority,false);}
  assert.deepEqual(client.phases.map(row=>[row.phase,row.state]),[['reconcile','started'],['reconcile','succeeded']]);
});

test('full shadow never verifies after cohort coverage fails, even when reconciliation succeeded',async()=>{
 const client=stagedRunClient({onePiece:0});
 await assert.rejects(runDurable(client,{runMode:'shadow',limit:null,canaryDefinition:null},source,plan),/one_piece_missing_qualified_prices/);
 assert.equal(client.run.state,'failed');assert.match(client.run.error,/shadow_activation_coverage_qualification/);
 assert.equal(client.run.reconciliation.activation_coverage_qualification,undefined);
});

test('full shadow retains the MTG loss guard and labels its failure as shadow qualification',async()=>{
 const client=stagedRunClient({mtg:0});
 await assert.rejects(runDurable(client,{runMode:'shadow',limit:null,canaryDefinition:null},source,plan),/shadow coverage qualification guard blocked/);
 assert.equal(client.run.state,'failed');assert.equal(client.run.reconciliation.activation_coverage_qualification,undefined);
});

test('durable reconciliation with a missing snapshot trace never verifies the shadow',async()=>{
  const client=stagedRunClient({traced:0});
  await assert.rejects(runDurable(client,{runMode:'shadow',limit:null,canaryDefinition:null},source,plan),/snapshot_trace_count/);
  assert.notEqual(client.run.state,'shadow_verified');
  assert.equal(client.run.reconciliation_state,'mismatch');
  assert.equal(client.phases.at(-1).state,'failed');
});
