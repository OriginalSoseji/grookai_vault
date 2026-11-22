import test from 'node:test';
import assert from 'node:assert/strict';
import {runVendorPricingRecovery} from '../recovery_v1.mjs';

const env={NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',SQUARE_ENVIRONMENT:'production',GROOKAI_VENDOR_PRICING_RECOVERY_ENABLED:'true'};
const id='ac000000-0000-4000-8000-000000000001',owner='ac000000-0000-4000-8000-000000000002';
function harness({claim={status:'running',fence:3},ids=[id],price={status:'ready',id,ownerId:owner,amountMinor:1234,changed:true,needsSquareSync:true},squareResult={focusStatus:'ready'},squareError=false,clock=()=>0}={}){
 const calls=[],syncs=[];
 const client={rpc:async(name,data)=>{
  calls.push({name,...data});
  if(name==='square_commerce_service_v2')return{data:[{ownerId:owner,connectionId:'connection'}]};
  const a=data.p_action;
  return {data:a==='run_start'?claim:a==='candidates'?ids:a==='reprice'?price:{status:'recorded'}};
 }};
 return {calls,syncs,run:()=>runVendorPricingRecovery({env,createClient:()=>client,nextId:()=>id,now:clock,createSquare:()=>({commerce:{processConnection:async(...args)=>{syncs.push(args);if(squareError)throw Error('provider outage with private contents');return squareResult;}}})})};
}
test('disabled clock performs no client or provider calls',async()=>{
 assert.equal((await runVendorPricingRecovery({env:{},createClient:()=>{throw Error('must not connect');}})).status,'paused');
});
test('production isolation rejects preview, wrong project and owner credentials',async()=>{
 for(const override of [{NODE_ENV:'test'},{SUPABASE_URL:'https://other.supabase.co'},{SQUARE_ENVIRONMENT:'sandbox'},{GV_USER_ACCESS_TOKEN:'do-not-print'},{NEXT_PUBLIC_COLLECTOR_STAGING:'true'}])
 await assert.rejects(runVendorPricingRecovery({env:{...env,...override},createClient:()=>{throw Error('must not connect');}}),{code:'vendor_pricing_configuration_unavailable'});
});
test('busy lease does no candidate or Square work',async()=>{
 const h=harness({claim:{status:'busy'}});assert.equal((await h.run()).status,'busy');assert.equal(h.calls.length,1);assert.equal(h.syncs.length,0);
});
test('price uses existing exact focused commerce worker and fenced durable finish',async()=>{
 const h=harness(),result=await h.run();assert.equal(result.updated,1);assert.equal(result.squareReady,1);
 assert.deepEqual(h.syncs,[[owner,'connection',{maxTargets:2,manual:false,focusInstanceId:id}]]);
 const finish=h.calls.at(-1);assert.equal(finish.p_action,'run_finish');assert.equal(finish.p_data.fence,3);assert.equal(finish.p_data.result.status,'succeeded');
});
test('unchanged canonical price retries outstanding provider handoff',async()=>{
 const h=harness({price:{status:'ready',id,ownerId:owner,amountMinor:1234,changed:false,needsSquareSync:true}});
 const result=await h.run();assert.equal(result.updated,0);assert.equal(h.syncs.length,1);
});
test('provider uncertainty remains pending without failing or repeating price authority',async()=>{
 const h=harness({squareError:true});const r=await h.run();assert.equal(r.squarePending,1);assert.equal(r.status,'succeeded');assert.equal(h.syncs.length,1);assert.equal(h.calls.filter(c=>c.p_action==='reprice').length,1);
});
test('manual race, checkout holds and stale references never reach Square',async()=>{
 for(const status of ['skipped','held','stale','waiting','paused','busy']){
  const h=harness({price:{status}});assert.equal((await h.run()).waiting,1);assert.equal(h.syncs.length,0);
 }
});
test('candidate duplication and malformed result fail closed and finish audit',async()=>{
 for(const options of [{ids:[id,id]},{ids:['invalid']},{price:{status:'ready',id:'wrong',ownerId:owner,amountMinor:2}},{price:{status:'ready',id,ownerId:owner,amountMinor:1.25}}]){
  const h=harness(options);await assert.rejects(h.run(),e=>e.code.startsWith('vendor_pricing_'));assert.equal(h.syncs.length,0);assert.equal(h.calls.at(-1).p_action,'run_finish');assert.equal(h.calls.at(-1).p_data.result.status,'failed');
 }
});
test('time budget leaves provider and finish headroom',async()=>{
 let i=0;const h=harness({clock:()=>i++===0?0:220000});const r=await h.run();assert.equal(r.checked,0);assert.equal(h.calls.at(-1).p_action,'run_finish');assert.equal(h.syncs.length,0);
});
