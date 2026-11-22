import assert from 'node:assert/strict';
import test from 'node:test';
import {runDurable} from '../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs';

// Model a durable run whose staging, qualification and snapshot build already
// succeeded. Execute the real remaining phase and terminal-state transition.
function stagedRunClient({traced=1}={}) {
  const run={id:'00000000-0000-4000-8000-000000000001',run_key:'RECONCILIATION-RESUME',state:'failed'};
  const phases=[];
  const client={run,phases,async query(sql,values=[]) {
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
    if(sql.includes('with candidate_totals'))return {rows:[{selected_count:2,mapped_count:2,decision_count:2,eligible_count:1,delayed_count:0,suppressed_count:0,quarantined_count:0,excluded_count:1,snapshot_count:1,traced_snapshot_count:traced}]};
    if(sql.includes('as decision_count'))return {rows:[{decision_count:2,eligible_count:1,delayed_count:0,suppressed_count:0,quarantined_count:0,excluded_count:1}]};
    if(sql.includes('insert into public.market_price_publication_sets'))return {rows:[{id:'00000000-0000-4000-8000-000000000004',publication_state:'staging',expected_snapshot_count:1}]};
    if(sql.includes('reconciliation = $12::jsonb')) {
      Object.assign(run,{state:values[1],reconciliation_state:values[2],reconciliation:JSON.parse(values[11])});
      return {rows:[]};
    }
    if(sql.includes("set state = 'shadow_verified'")) {
      assert.equal(run.reconciliation_state,'reconciled');run.state='shadow_verified';return {rows:[]};
    }
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
  assert.equal(client.run.worker_version,'TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_25');
  assert.deepEqual(client.phases.map(row=>[row.phase,row.state]),[['reconcile','started'],['reconcile','succeeded']]);
});

test('durable reconciliation with a missing snapshot trace never verifies the shadow',async()=>{
  const client=stagedRunClient({traced:0});
  await assert.rejects(runDurable(client,{runMode:'shadow',limit:null,canaryDefinition:null},source,plan),/snapshot_trace_count/);
  assert.notEqual(client.run.state,'shadow_verified');
  assert.equal(client.run.reconciliation_state,'mismatch');
  assert.equal(client.phases.at(-1).state,'failed');
});
