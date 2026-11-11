import test from 'node:test';
import assert from 'node:assert/strict';
import {runSquareCatalogTick} from '../worker_v1.mjs';
import {SquareApiError} from '../client_v1.mjs';

test('disabled workers persist a paused terminal result and never poll or contact a provider',async()=>{
  const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});return{data:args.p_action==='start'?{status:'running'}:{status:'paused'}};}};
  const result=await runSquareCatalogTick({client,service:{sync:async()=>assert.fail('Provider called')},environment:'sandbox',enabled:false});
  assert.equal(result.status,'paused');assert.deepEqual(calls.map(row=>row.args.p_action),['start','finish']);
  assert.equal(calls[1].args.p_result.status,'paused');
});
test('each candidate is isolated; busy is skipped, provider failure is persisted and later items continue',async()=>{
  const calls=[];let count=0;
  const candidates=[1,2,3].map(n=>({ownerId:'owner-'+n,connectionId:'connection-'+n,targetId:'target-'+n}));
  const client={rpc:async(name,args)=>{calls.push({name,args});return{data:name==='square_poll_v3'?candidates:{status:'running'}};}};
  const service={sync:async()=>{count++;if(count===1)throw new SquareApiError('square_connection_busy');
    if(count===2)throw new SquareApiError('square_provider_unavailable');return{status:'synced'};}};
  const result=await runSquareCatalogTick({client,service,environment:'production',enabled:true});
  assert.equal(result.status,'failed');assert.equal(result.succeeded,1);assert.equal(result.failed,1);assert.equal(result.skipped,1);
  assert.equal(calls.find(row=>row.name==='square_poll_v3').args.p_environment,'production');
  assert.equal(calls.filter(row=>row.args.p_action==='heartbeat').length,3);
  assert.equal(calls.at(-1).args.p_action,'finish');assert.equal(calls.at(-1).args.p_result.errorCode,'square_provider_unavailable');
});
test('rerunning a completed run never repeats work; invalid or partial poll results persist failure',async()=>{
  let providerCalls=0;
  const complete=await runSquareCatalogTick({client:{rpc:async()=>({data:{status:'succeeded'}})},
    service:{sync:async()=>providerCalls++},environment:'sandbox',enabled:true});
  assert.equal(complete.resumedTerminalRun,true);assert.equal(providerCalls,0);
  const calls=[];
  const result=await runSquareCatalogTick({client:{rpc:async(name,args)=>{calls.push({name,args});return{data:name==='square_poll_v3'?{}:{status:'running'}};}},
    service:{},environment:'sandbox',enabled:true});
  assert.equal(result.status,'failed');assert.equal(result.errorCode,'square_worker_candidates_invalid');
  assert.equal(calls.at(-1).args.p_action,'finish');
});
