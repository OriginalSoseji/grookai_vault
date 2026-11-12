import test from 'node:test';import assert from 'node:assert/strict';
import {runSquareCloudRecovery} from '../cloud_recovery_v3.mjs';
const env={NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',SQUARE_ENVIRONMENT:'production',GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED:'true',GROOKAI_SQUARE_ARTWORK_ENABLED:'true'};
const runId='10000000-0000-4000-8000-000000000001';
function harness({connections=[{ownerId:'owner-1',connectionId:'connection-1'}],response={succeeded:2,failed:0,skipped:0},rejectAction,throws,start={status:'running'}}={}){
 const calls=[],processed=[];let factories=0;
 const client={rpc:async(name,args)=>{calls.push({name,args});if(args.p_action===rejectAction)return{error:{message:'sensitive provider detail'}};return{data:name==='square_commerce_service_v2'?connections:args.p_action==='start'?start:{recorded:true}};}};
 const options={env,now:()=>0,nextId:()=>runId,createClient:()=>client,createBackend:({config})=>{factories++;assert.equal(config.artworkEnabled,true);return{commerce:{processConnection:async(...args)=>{processed.push(args);if(throws)throw throws;return response;}}};}};
 return {options,calls,processed,factories:()=>factories};
}
test('disabled cloud clock performs no database or provider work',async()=>{
 const result=await runSquareCloudRecovery({env:{},createClient:()=>assert.fail('Database initialized')});assert.equal(result.status,'paused');
});
test('cloud clock rejects staging, another project, owner tokens and non-production runtime before initializing the client',async()=>{
 for(const patch of [{NODE_ENV:'development'},{SUPABASE_URL:'http://127.0.0.1:61841'},{SQUARE_ENVIRONMENT:'sandbox'},{GV_USER_ACCESS_TOKEN:'fixture-only'},{NEXT_PUBLIC_COLLECTOR_STAGING:'true'},{NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'true'}]){
  await assert.rejects(runSquareCloudRecovery({env:{...env,...patch},createClient:()=>assert.fail('Database initialized')}),{code:'square_scheduler_configuration_unavailable'});
 }
});
test('one bounded seller is selected by the existing rotating scheduler; the ordinary automatic service receives at most two targets',async()=>{
 const connections=Array.from({length:12},(_,i)=>({ownerId:'owner-'+i,connectionId:'connection-'+String(i).padStart(2,'0')})),h=harness({connections});
 const result=await runSquareCloudRecovery(h.options);assert.equal(result.succeeded,1);assert.equal(result.targetsChecked,2);assert.equal(result.failed,0);
 assert.deepEqual(h.processed,[['owner-0','connection-00',{maxTargets:2,manual:false}]]);assert.deepEqual(h.calls.map(call=>call.args.p_action),['start','commerce_connections','heartbeat','finish']);
 assert.equal(h.calls.at(-1).args.p_result.status,'succeeded');
 const second=harness({connections});await runSquareCloudRecovery({...second.options,now:()=>300000});assert.equal(second.processed[0][1],'connection-01');
});
test('a busy fenced connection is recorded as skipped and never advertised as completed work',async()=>{
 const h=harness({response:{busy:true,succeeded:0,failed:0}}),result=await runSquareCloudRecovery(h.options);assert.equal(result.succeeded,0);assert.equal(result.skipped,1);assert.equal(h.calls.at(-1).args.p_result.skipped,1);
});
test('artwork failure is retained in a failed terminal result even if catalog and stock succeeded',async()=>{
 const h=harness({response:{succeeded:2,failed:0,skipped:0,artworkFailures:1,errorCode:'square_artwork_unconfirmed'}}),result=await runSquareCloudRecovery(h.options);
 assert.equal(result.status,'failed');assert.equal(result.failed,1);assert.equal(result.succeeded,0);assert.equal(h.calls.at(-1).args.p_result.errorCode,'square_artwork_unconfirmed');
});
test('provider exceptions persist sanitized failures without carrying messages into results',async()=>{
 const h=harness({throws:new Error('private credential fixture must not escape')}),result=await runSquareCloudRecovery(h.options);assert.equal(result.status,'failed');assert.equal(result.errorCode,'square_worker_failed');assert.equal(JSON.stringify(result).includes('credential fixture'),false);assert.equal(h.calls.at(-1).args.p_result.failed,1);
});
test('an invalid connection read persists a failed result and never constructs a provider backend',async()=>{
 const h=harness({connections:{partial:true}});await assert.rejects(runSquareCloudRecovery(h.options),{code:'square_worker_failed',runId});assert.equal(h.factories(),0);assert.equal(h.calls.at(-1).args.p_result.status,'failed');
});
test('database read failures persist failure with the same run identifier',async()=>{
 const h=harness({rejectAction:'commerce_connections'});await assert.rejects(runSquareCloudRecovery(h.options),{code:'square_state_unavailable',runId});assert.equal(h.calls.at(-1).args.p_id,runId);assert.equal(h.calls.at(-1).args.p_result.status,'failed');assert.equal(h.processed.length,0);
});
test('a terminal invocation is replayed without polling connections or repeating business work',async()=>{
 const h=harness({start:{status:'succeeded',succeeded:1,failed:0,skipped:0,error_code:null}}),result=await runSquareCloudRecovery(h.options);assert.equal(result.resumedTerminalRun,true);assert.equal(result.succeeded,1);assert.equal(h.calls.length,1);assert.equal(h.processed.length,0);
});
test('no connected sellers still produces a durable successful empty check',async()=>{
 const h=harness({connections:[]}),result=await runSquareCloudRecovery(h.options);assert.equal(result.succeeded,0);assert.equal(result.failed,0);assert.equal(h.factories(),0);assert.equal(h.calls.at(-1).args.p_action,'finish');
});
test('the invocation cannot finish before its admitted commerce work resolves',async()=>{
 const h=harness();let release,settled=false;const work=new Promise(resolve=>{release=resolve;});h.options.createBackend=()=>({commerce:{processConnection:()=>work}});
 const pending=runSquareCloudRecovery(h.options).then(result=>{settled=true;return result;});await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(h.calls.at(-1).args.p_action,'heartbeat');
 release({succeeded:2,failed:0,skipped:0});assert.equal((await pending).succeeded,1);assert.equal(h.calls.at(-1).args.p_action,'finish');
});
