// Independent cloud clock; all business effects remain in the existing fenced
// commerce service. Never create payments, refunds, or a parallel stock balance.
import {randomUUID} from 'node:crypto';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareCommerceBackend} from './commerce_backend_v2.mjs';
import {squareEnvironmentConfig} from './service_v1.mjs';
import {squareScheduledConnections} from './scheduler_batch_v2.mjs';
import {SquareApiError} from './client_v1.mjs';

const safeCode=error=>/^square_[a-z_]{1,80}$/.test(error?.code??'')?error.code:'square_worker_failed';
const paused=()=>({runId:null,status:'paused',succeeded:0,failed:0,skipped:0,targetsChecked:0,errorCode:''});

export async function runSquareCloudRecovery({env=process.env,createClient=createBackendClient,
 createBackend=createSquareCommerceBackend,now=Date.now,nextId=randomUUID}={}){
 if(env.GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED!=='true')return paused();
 if(env.NODE_ENV!=='production'||env.SUPABASE_URL!=='https://ycdxbpibncqcchqiihfz.supabase.co'||
    env.SQUARE_ENVIRONMENT!=='production'||env.GV_USER_ACCESS_TOKEN||
    env.NEXT_PUBLIC_COLLECTOR_STAGING==='true'||env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY==='true'){
  throw new SquareApiError('square_scheduler_configuration_unavailable');
 }
 const runId=nextId(),result={runId,status:'succeeded',succeeded:0,failed:0,skipped:0,targetsChecked:0,errorCode:''};
 let client,started=false;
 const call=async(name,args)=>{const reply=await client.rpc(name,args);if(reply.error)throw new SquareApiError('square_state_unavailable');return reply.data;};
 const finish=value=>call('square_worker_run_v1',{p_id:runId,p_action:'finish',p_result:value});
 try{
  client=createClient();
  const start=await call('square_worker_run_v1',{p_id:runId,p_action:'start',p_result:{environment:'production'}});started=true;
  if(start?.status!=='running'){
   if(!['succeeded','failed','paused','abandoned'].includes(start?.status))throw new SquareApiError('square_state_unavailable');
   return {...result,status:start.status==='abandoned'?'failed':start.status,succeeded:start.succeeded,failed:start.failed,
    skipped:start.skipped,errorCode:start.error_code??'',resumedTerminalRun:true};
  }
  const connections=await call('square_commerce_service_v2',{p_action:'commerce_connections',p_data:{environment:'production'}});
  const selected=squareScheduledConnections(connections,{now:now(),limit:1});
  if(selected.length){
   const backend=createBackend({client,config:squareEnvironmentConfig(env)});
   for(const connection of selected){
    await call('square_worker_run_v1',{p_id:runId,p_action:'heartbeat',p_result:{}});
    try{
     const response=await backend.commerce.processConnection(connection.ownerId,connection.connectionId,{maxTargets:2,manual:false});
     result.targetsChecked+=(response.succeeded??0)+(response.failed??0)+(response.skipped??0);
     if(response.failed||response.artworkFailures){result.failed++;result.errorCode=safeCode({code:response.errorCode});}
     else if(response.busy)result.skipped++;
     else result.succeeded++;
    }catch(error){result.failed++;result.errorCode=safeCode(error);}
   }
  }
  if(result.failed)result.status='failed';
  await finish(result);
  return result;
 }catch(error){
  const errorCode=safeCode(error);
  if(started)await finish({status:'failed',succeeded:0,failed:1,skipped:0,errorCode}).catch(()=>{});
  const failure=new SquareApiError(errorCode);failure.runId=runId;throw failure;
 }
}
