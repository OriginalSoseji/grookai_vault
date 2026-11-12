// Explicit private oneshot; installation/scheduling is a separate release step.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {randomUUID} from 'node:crypto';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareCommerceBackend} from './commerce_backend_v2.mjs';
import {squareEnvironmentConfig} from './service_v1.mjs';
import {squareScheduledConnections} from './scheduler_batch_v2.mjs';
const args=process.argv.slice(2),mode=args.shift();
let client,runId;
const safe=error=>/^square_[a-z_]{1,80}$/.test(error?.code||'')?error.code:'square_worker_failed';
try{
 if(!['--once','--health'].includes(mode)||args.length!==1||!args[0].startsWith('--env-file='))throw Error();
 const cfg=dotenv.parse(fs.readFileSync(path.resolve(args[0].slice(11))));
 for(const key of Object.keys(process.env))if(/SUPABASE|SQUARE|^GV_USER_ACCESS_TOKEN$|^NODE_ENV$/.test(key))delete process.env[key];
 Object.assign(process.env,cfg);
 const local=cfg.SUPABASE_URL==='http://127.0.0.1:61841';
 if(!local&&!(cfg.SUPABASE_URL==='https://ycdxbpibncqcchqiihfz.supabase.co'&&cfg.NODE_ENV==='production'))throw Error();
 if(!['sandbox','production'].includes(cfg.SQUARE_ENVIRONMENT)||(!local&&cfg.SQUARE_ENVIRONMENT!=='production'))throw Error();
 console.log((local?'LOCAL':'REMOTE')+' Square commerce '+mode+': '+cfg.SUPABASE_URL);
 client=createBackendClient();
 if(mode==='--health'){
  const value=await client.rpc('square_commerce_health_v2',{p_environment:cfg.SQUARE_ENVIRONMENT});if(value.error)throw Error();
  console.log(JSON.stringify(value.data));
  const diagnostics=await client.rpc('square_commerce_run_health_v3',{p_environment:cfg.SQUARE_ENVIRONMENT});if(diagnostics.error)throw Error();
  console.log(JSON.stringify(diagnostics.data));
 }else{
  runId=randomUUID();
  const started=await client.rpc('square_worker_run_v1',{p_id:runId,p_action:'start',p_result:{environment:cfg.SQUARE_ENVIRONMENT}});if(started.error)throw Error();
  const value=await client.rpc('square_commerce_service_v2',{p_action:'commerce_connections',p_data:{environment:cfg.SQUARE_ENVIRONMENT}});
  if(value.error||!Array.isArray(value.data))throw Error();
  const backend=createSquareCommerceBackend({client,config:squareEnvironmentConfig(cfg)}),result={status:'succeeded',succeeded:0,failed:0,skipped:0,errorCode:''};
  for(const connection of squareScheduledConnections(value.data)){
   await client.rpc('square_worker_run_v1',{p_id:runId,p_action:'heartbeat',p_result:{}});
   try{const response=await backend.commerce.processConnection(connection.ownerId,connection.connectionId,{maxTargets:5});
    if(response.failed||response.artworkFailures){result.failed++;result.errorCode=response.errorCode??'square_commerce_unconfirmed';}else if(response.busy)result.skipped++;else result.succeeded++;
   }catch(error){result.failed++;result.errorCode=safe(error);}
  }
  if(result.failed)result.status='failed';
  const finished=await client.rpc('square_worker_run_v1',{p_id:runId,p_action:'finish',p_result:result});if(finished.error)throw Error();
  console.log(JSON.stringify({runId,...result}));if(result.failed)process.exitCode=1;
 }
}catch(error){
 if(client&&runId)await client.rpc('square_worker_run_v1',{p_id:runId,p_action:'finish',p_result:{status:'failed',succeeded:0,failed:1,skipped:0,errorCode:safe(error)}}).catch(()=>{});
 console.error(safe(error));process.exitCode=1;
}
