import test from 'node:test';import assert from 'node:assert/strict';
import {readCrossTcgMarketBootstrapV3,evaluateCrossTcgMarketActivationV2,assertCrossTcgMarketActivationV3,CROSS_TCG_MARKET_SCOPE_V2} from '../../backend/pricing/cross_tcg_market_activation_guard_v3.mjs';
const reconciliation={source_scope_version:CROSS_TCG_MARKET_SCOPE_V2,complete_source_selection:true};
const counts={one_piece_eligible:5000,one_piece_baseline_eligible:0,japanese_eligible:3000,japanese_baseline_eligible:0};
test('first publication rejects an old scope, absent proof and string booleans',async()=>{
 for(const row of [undefined,{current_verified:false,shadow_verified:false},{current_verified:'true',shadow_verified:'true'}])await assert.rejects(readCrossTcgMarketBootstrapV3({query:async()=>({rows:row?[row]:[]})},'worker'),/initial_full_shadow_required/);
});
test('verified full shadow or qualified current runtime permits bootstrap',async()=>{
 for(const proof of [{current_verified:false,shadow_verified:true},{current_verified:true,shadow_verified:false}]){
  const client={query:async(sql,params)=>{assert.deepEqual(params,['TCGPLAYER_MARKET_PUBLICATION_POLICY_V3','worker',CROSS_TCG_MARKET_SCOPE_V2]);assert.match(sql,/run\.worker_version=\$2/);assert.match(sql,/run\.reconciliation->'complete_source_selection'='true'::jsonb/);return{rows:[proof]};}};
  assert.deepEqual(await readCrossTcgMarketBootstrapV3(client,'worker'),proof);
 }
});
test('partial selections and canary scopes are not production qualification',()=>{
 for(const value of [{},{...reconciliation,complete_source_selection:false},{...reconciliation,complete_source_selection:'true'},{...reconciliation,source_scope_version:'legacy'}])assert.equal(evaluateCrossTcgMarketActivationV2({reconciliation:value,counts}).ready_for_production,false);
});
test('initial scope requires eligible prices for both new games',()=>{
 assert.equal(evaluateCrossTcgMarketActivationV2({reconciliation,counts}).ready_for_production,true);
 for(const changed of [{one_piece_eligible:0},{japanese_eligible:0},{japanese_eligible:null},{one_piece_baseline_eligible:-1}])assert.equal(evaluateCrossTcgMarketActivationV2({reconciliation,counts:{...counts,...changed}}).ready_for_production,false);
});
test('refresh cannot materially erase either cross-TCG cohort',()=>{
 assert.equal(evaluateCrossTcgMarketActivationV2({reconciliation,counts:{...counts,one_piece_baseline_eligible:5000,one_piece_eligible:4995,japanese_baseline_eligible:3000,japanese_eligible:2997}}).ready_for_production,true);
 for(const changed of [{one_piece_eligible:4994},{japanese_eligible:2996}])assert.equal(evaluateCrossTcgMarketActivationV2({reconciliation,counts:{...counts,one_piece_baseline_eligible:5000,japanese_baseline_eligible:3000,...changed}}).ready_for_production,false);
});
test('activation rereads persisted selection proof',async()=>{
 let calls=0;const client={query:async(sql,params)=>{calls++;if(calls===1)return{rows:[{current_verified:false,shadow_verified:true}]};assert.equal(sql,'select reconciliation from public.market_price_pipeline_runs where id=$1');assert.deepEqual(params,['run']);return{rows:[{reconciliation}]};}};
 const result=await assertCrossTcgMarketActivationV3(client,{runId:'run',workerVersion:'worker',counts});assert.equal(result.ready_for_production,true);assert.equal(calls,2);
});
