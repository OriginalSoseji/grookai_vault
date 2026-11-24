import test from 'node:test';
import assert from 'node:assert/strict';
import {runVendorPricingRecovery} from '../recovery_v1.mjs';

const id=n=>`da000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',SQUARE_ENVIRONMENT:'production',GROOKAI_VENDOR_PRICING_RECOVERY_ENABLED:'true',GROOKAI_VENDOR_PRICING_DRAIN_ENABLED:'true'};
function harness({count=123,latency=0,sticky=false,status='ready',rejectAt,claim={status:'running',fence:7},overrideCandidates,legacy=false}={}){
 const ids=Array.from({length:count},(_,i)=>id(i+1)),owners=Array.from({length:100},(_,i)=>id(200000+i));
 const byId=new Map(ids.map((value,index)=>[value,index]));
 const checked=[],finishes=[],calls=[],synced=[];let cursor=0,time=0,runs=0;
 const createClient=()=>({rpc:async(name,args)=>{
  calls.push({name,action:args.p_action,data:args.p_data});
  if(name==='square_commerce_service_v2')return {data:owners.map((ownerId,i)=>({ownerId,connectionId:id(300000+i)}))};
  const action=args.p_action;
  if(action==='run_start')return {data:claim.status==='running'?{...claim,fence:claim.fence+runs-1}:claim};
  assert.equal(args.p_data.runId,id(900000+runs));assert.equal(args.p_data.fence,claim.fence+runs-1);
  if(action==='candidates')return {data:typeof overrideCandidates==='function'?overrideCandidates({cursor}):overrideCandidates??ids.slice(sticky?0:cursor,(sticky?0:cursor)+50)};
  if(action==='reprice'){
   if(checked.length===rejectAt)return {error:{message:'private simulated database failure'}};
   const index=byId.get(args.p_data.instanceId);assert.ok(Number.isInteger(index));checked.push(args.p_data.instanceId);if(!sticky)cursor++;
   time+=latency;
   if(status!=='ready')return {data:{status}};
   return {data:{status:'ready',id:args.p_data.instanceId,ownerId:owners[Math.floor(index/1000)%100],amountMinor:100,changed:true,needsSquareSync:true}};
  }
  assert.equal(action,'run_finish');finishes.push(args.p_data.result);return {data:{recorded:true}};
 }});
 const run=()=>{runs++;return runVendorPricingRecovery({env:{...env,...(legacy?{GROOKAI_VENDOR_PRICING_DRAIN_ENABLED:undefined}:{})},createClient,now:()=>time,nextId:()=>id(900000+runs),createSquare:()=>({commerce:{processConnection:async(...args)=>{synced.push(args);return {focusStatus:'ready'};}}})});};
 return {run,checked,finishes,calls,synced,get cursor(){return cursor;}};
}

test('opt-in drain reads multiple bounded batches under the same fence and leaves provider handoff pending',async()=>{
 const h=harness(),result=await h.run();
 assert.equal(result.checked,123);assert.equal(result.updated,123);assert.equal(result.squareReady,0);assert.equal(result.squarePending,123);
 assert.equal(result.drain.stopReason,'empty');assert.equal(result.drain.deferredHandoffs,123);
 assert.equal(h.finishes.length,1);assert.deepEqual(h.finishes[0],result);
 assert.equal(h.calls.filter(c=>c.action==='run_start').length,1);assert.equal(h.calls.filter(c=>c.name==='square_commerce_service_v2').length,0);assert.equal(h.synced.length,0);
 assert.equal(new Set(h.checked).size,123);
});
test('default-off path retains the existing one-batch inline Square handoff',async()=>{
 const h=harness({legacy:true}),result=await h.run();assert.equal(result.checked,50);assert.equal(result.squareReady,50);assert.equal(h.synced.length,50);assert.equal(result.drain,undefined);
});
test('100 vendors and100000 synthetic automatic copies drain in20 bounded invocations without inline provider work',async()=>{
 const h=harness({count:100000});let ticks=0;
 while(h.cursor<100000){const result=await h.run();assert.ok(result.checked<=5000);assert.equal(result.drain.stopReason,'capacity');assert.equal(result.squareReady,0);ticks++;assert.ok(ticks<=20);}
 assert.equal(ticks,20);assert.equal(h.checked.length,100000);assert.equal(new Set(h.checked).size,100000);assert.equal(h.finishes.length,20);assert.equal(h.synced.length,0);
 assert.equal(new Set(h.calls.filter(c=>c.action==='run_start').map(c=>c.data.runId)).size,20);
 assert.equal(new Set(h.calls.filter(c=>c.action==='run_finish').map(c=>c.data.fence)).size,20);
});
test('time-budget exhaustion persists a truthful partial receipt and resumes unprocessed copies later',async()=>{
 const h=harness({count:80,latency:5000}),first=await h.run();assert.equal(first.checked,44);assert.equal(first.drain.stopReason,'budget');assert.equal(h.cursor,44);
 const second=await h.run();assert.equal(second.checked,36);assert.equal(second.drain.stopReason,'empty');assert.equal(new Set(h.checked).size,80);assert.equal(h.finishes.length,2);
});
test('repeated candidate pages stop rather than re-evaluating a busy or provider-pending cohort forever',async()=>{
 const h=harness({count:50,sticky:true}),result=await h.run();assert.equal(result.checked,50);assert.equal(result.drain.stopReason,'repeated');assert.equal(h.finishes.length,1);assert.equal(h.checked.length,50);
});
test('manual races, holds and unavailable sources retain the existing authority outcomes',async()=>{
 for(const status of ['skipped','held','stale','waiting','paused','busy']){
  const h=harness({count:60,status}),result=await h.run();assert.equal(result.checked,60);assert.equal(result.waiting,60);assert.equal(result.updated,0);assert.equal(result.drain.deferredHandoffs,0);assert.equal(h.synced.length,0);
 }
});
test('failed price authority terminates the fenced run durably without hiding the error or advancing pending work',async()=>{
 const h=harness({rejectAt:17});await assert.rejects(h.run(),{code:'vendor_pricing_state_unavailable'});assert.equal(h.checked.length,17);assert.equal(h.finishes.length,1);assert.equal(h.finishes[0].status,'failed');assert.equal(h.finishes[0].failed,1);assert.equal(h.finishes[0].errorCode,'vendor_pricing_state_unavailable');assert.equal(JSON.stringify(h.finishes).includes('private'),false);
});
test('invalid candidate arrays retain the original fail-closed bound and duplicate checks',async()=>{
 for(const candidates of [[id(1),id(1)],Array.from({length:51},(_,i)=>id(i+1)),['invalid']]){
  const h=harness({overrideCandidates:candidates});await assert.rejects(h.run(),{code:'vendor_pricing_candidates_invalid'});assert.equal(h.checked.length,0);assert.equal(h.finishes[0].status,'failed');
 }
});
test('a busy lease does not fetch candidates, initialize Square or claim completed work',async()=>{
 const h=harness({claim:{status:'busy'}}),result=await h.run();assert.equal(result.status,'busy');assert.equal(result.checked,0);assert.equal(h.calls.length,1);assert.equal(h.finishes.length,0);assert.equal(h.synced.length,0);
});
test('a partially repeated page processes unseen copies exactly once and exposes the blocked queue',async()=>{
 const h=harness({count:60,overrideCandidates:({cursor})=>cursor===0?Array.from({length:50},(_,i)=>id(i+1)):[id(1),...Array.from({length:10},(_,i)=>id(i+51))]});
 const result=await h.run();assert.equal(result.checked,60);assert.equal(new Set(h.checked).size,60);assert.equal(result.drain.stopReason,'repeated');
});
test('invalid later pages retain earlier committed work and a durable failed run',async()=>{
 const h=harness({count:60,overrideCandidates:({cursor})=>cursor===0?Array.from({length:50},(_,i)=>id(i+1)):[id(51),id(51)]});
 await assert.rejects(h.run(),{code:'vendor_pricing_candidates_invalid'});assert.equal(h.checked.length,50);assert.equal(h.finishes[0].checked,50);assert.equal(h.finishes[0].status,'failed');
});
