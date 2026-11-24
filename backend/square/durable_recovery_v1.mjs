// Admission and receipts only. All provider, stock and sale effects stay in the
// ordinary commerce service and its existing fenced authorities.
import {randomUUID} from 'node:crypto';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareCommerceBackend} from './commerce_backend_v2.mjs';
import {squareEnvironmentConfig} from './service_v1.mjs';
import {SquareApiError} from './client_v1.mjs';

const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const safeCode=error=>/^square_[a-z_]{1,80}$/.test(error?.code??'')?error.code:'square_worker_failed';
const fail=()=>{throw new SquareApiError('square_recovery_state_unconfirmed');};
const count=value=>Number.isSafeInteger(value??0)&&(value??0)>=0?value??0:fail();
const paused=()=>({runId:null,status:'paused',succeeded:0,failed:0,skipped:0,targetsChecked:0,errorCode:''});

export function assertSquareDurableRecoveryConfig(env){
 const priceBatch=env.GROOKAI_SQUARE_PRICE_BATCH_ENABLED??'false';
 if(!['true','false'].includes(priceBatch)||priceBatch==='true'&&env.GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED!=='true'){
  throw new SquareApiError('square_scheduler_configuration_unavailable');
 }
 if(!['true','false'].includes(env.GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED??'false')){
  throw new SquareApiError('square_scheduler_configuration_unavailable');
 }
 if(env.GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED!=='true')return;
 if(env.GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED!=='true'||env.NODE_ENV!=='production'||
    env.SUPABASE_URL!=='https://ycdxbpibncqcchqiihfz.supabase.co'||env.SQUARE_ENVIRONMENT!=='production'||
    env.GV_USER_ACCESS_TOKEN||env.NEXT_PUBLIC_COLLECTOR_STAGING==='true'||
    env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY==='true'){
  throw new SquareApiError('square_scheduler_configuration_unavailable');
 }
}

function receipt(response){
 const succeeded=count(response?.succeeded),failed=count(response?.failed),skipped=count(response?.skipped);
 const targetsChecked=succeeded+failed+skipped;
 if(!response||targetsChecked>5||!uuid.test(response.runId??''))fail();
 const broken=failed+count(response.artworkFailures)+count(response.batchFailures)>0;
 const outcome=broken?'failed':response.busy||(!succeeded&&skipped&&!count(response.reviews)&&!response.batchReview&&!count(response.orderReviews))?'busy':
  count(response.reviews)+count(response.orderReviews)+(response.batchReview?1:0)>0?'review':'succeeded';
 return {outcome,childRunId:response.runId,targetsChecked,
  errorCode:broken?safeCode({code:response.errorCode}):''};
}

export async function runSquareDurableRecovery({env=process.env,createClient=createBackendClient,
 createBackend=createSquareCommerceBackend,now=Date.now,nextId=randomUUID}={}){
 assertSquareDurableRecoveryConfig(env);
 if(env.GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED!=='true')return paused();
 const runId=nextId(),runToken=nextId();
 if(!uuid.test(runId)||!uuid.test(runToken))fail();
 const client=createClient();
 const call=async(action,data={})=>{
  const reply=await client.rpc('square_durable_recovery_v1',{p_action:action,
   p_data:{environment:'production',runId,runToken,...data}});
  if(reply.error)throw new SquareApiError('square_recovery_state_unconfirmed');
  return reply.data;
 };
 let started=false,backend,stop=false,claims=0,infrastructureError='';
 const began=now(),seen=new Set();
 const remember=error=>{stop=true;infrastructureError||=safeCode(error);};
 try{
  const start=await call('run_start');
  if(start?.terminal===true){
   if(!start.result||!['succeeded','failed'].includes(start.result.status))fail();
   return {...start.result,resumedTerminalRun:true};
  }
  if(start?.busy===true)return {...paused(),runId,errorCode:'square_recovery_run_busy'};
  if(start?.started!==true)fail();
  started=true;
  // The database also enforces the admission deadline and 100-claim ceiling.
  // Never race a timeout against admitted work: await every worker before finish.
  const worker=async()=>{
   while(!stop&&now()-began<180000&&claims<100){
    let claim;
    try{claim=await call('claim');}catch(error){remember(error);return;}
    if(claim?.empty===true)return;
    try{
     if(!uuid.test(claim?.connectionId??'')||!uuid.test(claim?.ownerId??'')||
       !uuid.test(claim?.claimToken??'')||!Number.isSafeInteger(claim?.fence)||claim.fence<1||
       seen.has(claim.connectionId)||++claims>100)fail();
     seen.add(claim.connectionId);
     backend??=createBackend({client,config:squareEnvironmentConfig(env)});
     let result;
     try{
      const response=await backend.commerce.processConnection(claim.ownerId,claim.connectionId,{maxTargets:5,manual:false});
      // A malformed business receipt is infrastructure failure. Do not turn it
      // into an invented provider failure or credit targets that weren't checked.
      result=receipt(response);
     }catch(error){
      if(error?.code==='square_recovery_state_unconfirmed')throw error;
      result={outcome:'failed',targetsChecked:0,errorCode:safeCode(error)};
     }
     const finished=await call('finish',{connectionId:claim.connectionId,claimToken:claim.claimToken,fence:claim.fence,...result});
     if(finished?.recorded!==true)fail();
    }catch(error){remember(error);}
   }
  };
  await Promise.all(Array.from({length:8},worker));
  const reason=infrastructureError?'infrastructure':now()-began>=180000?'deadline':claims>=100?'limit':'drained';
  const result=await call('run_finish',{errorCode:infrastructureError,reason});
  if(result?.runId!==runId||!['succeeded','failed'].includes(result?.status))fail();
  return result;
 }catch(error){
  // Preserve already completed children and unresolved attempts in the database.
  // A failed finish is not evidence that the batch or any target succeeded.
  if(started)await call('run_finish',{errorCode:safeCode(error),reason:'infrastructure'}).catch(()=>{});
  const failure=new SquareApiError(safeCode(error));failure.runId=runId;throw failure;
 }
}
