import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {runSquareDurableRecovery} from '../durable_recovery_v1.mjs';
import {runSquareCloudRecovery} from '../cloud_recovery_v3.mjs';

const env={NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',SQUARE_ENVIRONMENT:'production',
 GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED:'true',GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:'true',GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED:'true'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({total=100,process,start,failAction,clock=()=>0}={}){
 const calls=[],processed=[],finished=[],queue=Array.from({length:total},()=>({ownerId:randomUUID(),connectionId:randomUUID(),claimToken:randomUUID(),fence:1}));
 let inFlight=0,peak=0,factories=0,admitted=0;const runId=randomUUID(),runToken=randomUUID();let id=0;
 const client={rpc:async(name,args)=>{
  assert.equal(name,'square_durable_recovery_v1');const {p_action:action,p_data:data}=args;
  calls.push({action,data});if(action===failAction)return{error:{message:'private SQL credential detail'}};
  if(action==='run_start')return{data:start??{started:true}};
  if(action==='claim')return{data:admitted++<100&&queue.length?queue.shift():{empty:true}};
  if(action==='finish'){finished.push(data);return{data:{recorded:true}};}
  if(action==='run_finish'){
   assert.equal(inFlight,0,'Invocation finished while admitted work was outstanding');
   const failed=finished.filter(x=>x.outcome==='failed').length;
   return{data:{runId,status:failed||data.errorCode?'failed':'succeeded',succeeded:finished.filter(x=>x.outcome==='succeeded').length,
    failed,skipped:finished.filter(x=>['busy','review'].includes(x.outcome)).length,
    targetsChecked:finished.reduce((sum,x)=>sum+x.targetsChecked,0),errorCode:data.errorCode||finished.find(x=>x.errorCode)?.errorCode||'',
    admitted:finished.length,pending:0,review:finished.filter(x=>x.outcome==='review').length,reason:data.reason}};
  }
  assert.fail(action);
 }};
 const options={env,now:clock,nextId:()=>id++===0?runId:runToken,createClient:()=>client,createBackend:({config})=>{
  factories++;assert.equal(config.recoveryWindowEnabled,true);
  return{commerce:{processConnection:async(owner,connection,settings)=>{
   assert.deepEqual(settings,{maxTargets:5,manual:false});assert.ok(!processed.includes(connection),'Duplicate seller');processed.push(connection);
   inFlight++;peak=Math.max(peak,inFlight);
   try{return await (process?process({owner,connection,index:processed.length}):tick().then(()=>({runId:randomUUID(),succeeded:5,failed:0,skipped:0})));}
   finally{inFlight--;}
  }}};
 }};
 return{options,calls,processed,finished,queue,runId,runToken,peak:()=>peak,factories:()=>factories};
}

test('durable recovery is off by default and unsafe combinations fail before SDK initialization',async()=>{
 const createClient=()=>assert.fail('Client initialized');
 assert.equal((await runSquareDurableRecovery({env:{},createClient})).status,'paused');
 for(const patch of [{GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED:'TRUE'},{GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:'false'},
  {NODE_ENV:'development'},{SUPABASE_URL:'http://127.0.0.1:61841'},{SQUARE_ENVIRONMENT:'sandbox'},
  {GV_USER_ACCESS_TOKEN:'fixture'},{NEXT_PUBLIC_COLLECTOR_STAGING:'true'},{NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'true'}]){
  await assert.rejects(runSquareDurableRecovery({env:{...env,...patch},createClient}),{code:'square_scheduler_configuration_unavailable'});
 }
});

test('100 sellers are admitted once each with four independent workers and bounded five-target batches',async()=>{
 const h=harness(),result=await runSquareDurableRecovery(h.options);
 assert.equal(result.succeeded,100);assert.equal(result.targetsChecked,500);assert.equal(h.processed.length,100);
 assert.equal(new Set(h.processed).size,100);assert.equal(h.peak(),4);assert.equal(h.factories(),1);
 assert.equal(h.calls.at(-1).action,'run_finish');assert.equal(result.reason,'limit');
 assert.equal(JSON.stringify(result).includes(h.runToken),false);assert.equal(JSON.stringify(result).includes('claimToken'),false);
});

test('the per-invocation ceiling leaves excess sellers in the durable queue for later admission',async()=>{
 const h=harness({total:137}),result=await runSquareDurableRecovery(h.options);
 assert.equal(result.succeeded,100);assert.equal(h.queue.length,37);assert.equal(h.processed.length,100);
});

test('a provider failure is sanitized and does not stop other sellers',async()=>{
 const h=harness({total:12,process:async({index})=>{
  await tick();if(index===1)throw new Error('private provider detail');
  return{runId:randomUUID(),succeeded:4,failed:0,skipped:0};
 }}),result=await runSquareDurableRecovery(h.options);
 assert.equal(result.status,'failed');assert.equal(result.failed,1);assert.equal(result.succeeded,11);assert.equal(h.processed.length,12);
 assert.equal(h.finished.find(x=>x.outcome==='failed').targetsChecked,0);assert.equal(result.errorCode,'square_worker_failed');
 assert.equal(JSON.stringify(h.finished).includes('private provider'),false);
});

test('busy, review and artwork failures retain distinct outcomes without success credit',async()=>{
 const responses=[{busy:true},{reviews:1},{succeeded:3,artworkFailures:1,errorCode:'square_artwork_unconfirmed'}];
 const h=harness({total:3,process:async({index})=>({runId:randomUUID(),succeeded:0,failed:0,skipped:0,...responses[index-1]})});
 const result=await runSquareDurableRecovery(h.options);
 assert.deepEqual(h.finished.map(x=>x.outcome),['busy','review','failed']);
 assert.equal(result.succeeded,0);assert.equal(result.skipped,2);assert.equal(result.review,1);assert.equal(result.failed,1);
});

test('a deadline stops new admissions and awaits every already admitted seller',async()=>{
 let time=0;const releases=[];const h=harness({total:20,clock:()=>time,process:()=>new Promise(resolve=>releases.push(resolve))});
 let done=false;const pending=runSquareDurableRecovery(h.options).then(r=>{done=true;return r;});await tick();
 assert.equal(releases.length,4);time=180000;
 releases[0]({runId:randomUUID(),succeeded:5});await tick();assert.equal(done,false);assert.equal(h.processed.length,4);
 for(const release of releases.slice(1))release({runId:randomUUID(),succeeded:5});
 const result=await pending;assert.equal(result.succeeded,4);assert.equal(result.reason,'deadline');assert.equal(h.queue.length,16);
});

test('a lost database receipt stops admission, awaits other work and finishes with infrastructure failure',async()=>{
 const h=harness({total:20,failAction:'finish'}),result=await runSquareDurableRecovery(h.options);
 assert.equal(result.status,'failed');assert.equal(result.errorCode,'square_recovery_state_unconfirmed');
 assert.equal(h.processed.length,4);assert.equal(h.finished.length,0);assert.equal(result.succeeded,0);
});

test('malformed business receipts remain unresolved rather than inventing checked targets',async()=>{
 for(const response of [{succeeded:6},{succeeded:-1},{succeeded:1.5},{succeeded:1,runId:'invalid'}]){
  const h=harness({total:1,process:async()=>({runId:randomUUID(),...response})}),result=await runSquareDurableRecovery(h.options);
  assert.equal(result.status,'failed');assert.equal(result.errorCode,'square_recovery_state_unconfirmed');assert.equal(h.finished.length,0);
 }
});

test('duplicate or malformed claims stop before processing an unconfirmed seller',async()=>{
 const h=harness({total:2});h.queue[1]=h.queue[0];const result=await runSquareDurableRecovery(h.options);
 assert.equal(h.processed.length,1);assert.equal(result.status,'failed');assert.equal(result.errorCode,'square_recovery_state_unconfirmed');
});

test('terminal and active-run replays never construct a commerce backend or claim sellers',async()=>{
 for(const start of [{busy:true},{terminal:true,result:{status:'failed',succeeded:2,failed:1,skipped:0,targetsChecked:10,errorCode:'square_worker_failed'}}]){
  const h=harness({start}),result=await runSquareDurableRecovery(h.options);
  assert.equal(h.calls.length,1);assert.equal(h.factories(),0);assert.equal(h.processed.length,0);
  assert.equal(start.busy?result.status:result.resumedTerminalRun,start.busy?'paused':true);
 }
});

test('a failed terminal write never returns a successful result',async()=>{
 const h=harness({total:1,failAction:'run_finish'});
 await assert.rejects(runSquareDurableRecovery(h.options),{code:'square_recovery_state_unconfirmed',runId:h.runId});
 assert.equal(h.finished.length,1);assert.equal(h.calls.at(-1).action,'run_finish');
});

test('the enabled cloud clock uses the same durable scheduler instead of the legacy time selector',async()=>{
 const h=harness({total:7}),result=await runSquareCloudRecovery(h.options);
 assert.equal(result.succeeded,7);assert.equal(h.processed.length,7);assert.equal(h.calls[0].action,'run_start');
});
