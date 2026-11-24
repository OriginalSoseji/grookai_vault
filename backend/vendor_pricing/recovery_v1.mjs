import {randomUUID} from 'node:crypto';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareCommerceBackend} from '../square/commerce_backend_v2.mjs';
import {squareEnvironmentConfig} from '../square/service_v1.mjs';

const safeCode=e=>/^vendor_pricing_[a-z_]{1,80}$/.test(e?.code??'')?e.code:'vendor_pricing_worker_failed';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v);
const failure=code=>Object.assign(new Error(code),{code});

/** Bounded production clock. All monetary writes and leases stay in the DB RPC.
 * Square handoff reuses the ordinary settlement-first fenced commerce worker.
 */
export async function runVendorPricingRecovery({env=process.env,createClient=createBackendClient,
 createSquare=({client})=>createSquareCommerceBackend({client,config:squareEnvironmentConfig(env)}),
 now=Date.now,nextId=randomUUID}={}){
 if(env.GROOKAI_VENDOR_PRICING_RECOVERY_ENABLED!=='true')return{status:'paused',checked:0,updated:0};
 if(env.NODE_ENV!=='production'||env.SUPABASE_URL!=='https://ycdxbpibncqcchqiihfz.supabase.co'||env.SQUARE_ENVIRONMENT!=='production'||env.GV_USER_ACCESS_TOKEN||env.NEXT_PUBLIC_COLLECTOR_STAGING==='true'||env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY==='true')throw failure('vendor_pricing_configuration_unavailable');
 const runId=nextId(),startTime=now(),result={runId,status:'succeeded',checked:0,updated:0,waiting:0,squareReady:0,squarePending:0,failed:0,errorCode:''};
 const draining=env.GROOKAI_VENDOR_PRICING_DRAIN_ENABLED==='true',seen=new Set();
 if(draining)result.drain={candidateBatches:0,deferredHandoffs:0,stopReason:'capacity'};
 let client,context,started=false,square,connections;
 const call=async(action,data={})=>{const response=await client.rpc('vendor_pricing_service_v1',{p_action:action,p_data:{...context,...data}});if(response.error)throw failure('vendor_pricing_state_unavailable');return response.data;};
 try{
  client=createClient();
  const claim=await call('run_start',{runId});
  if(['paused','busy','succeeded','failed','abandoned'].includes(claim?.status))return{...result,status:claim.status==='abandoned'?'failed':claim.status};
  if(claim?.status!=='running'||!Number.isSafeInteger(claim.fence)||claim.fence<1)throw failure('vendor_pricing_state_unavailable');
  context={runId,fence:claim.fence};started=true;
  // Each page and price still uses the existing global run fence. The optional
  // drain has independent work/time bounds, never concurrent monetary writers.
  work: while(result.checked<(draining?5000:50)){
   if(draining&&now()-startTime>=220000){result.drain.stopReason='budget';break;}
   const ids=await call('candidates');
   if(!Array.isArray(ids)||ids.length>50||new Set(ids).size!==ids.length||!ids.every(uuid))throw failure('vendor_pricing_candidates_invalid');
   if(draining)result.drain.candidateBatches++;
   const page=draining?ids.filter(id=>!seen.has(id)):ids;
   if(draining&&!page.length){result.drain.stopReason=ids.length?'repeated':'empty';break;}
   for(const instanceId of page){
   // Leave enough time for the existing bounded Square call and durable finish.
   if(now()-startTime>=220000){if(draining)result.drain.stopReason='budget';break work;}
   if(draining){if(result.checked>=5000)break work;seen.add(instanceId);}
   const price=await call('reprice',{instanceId});result.checked++;
   if(price?.status==='ready'){
    if(price.id!==instanceId||!uuid(price.ownerId)||!Number.isSafeInteger(price.amountMinor)||price.amountMinor<=0)throw failure('vendor_pricing_result_invalid');
    if(price.changed)result.updated++;
    if(price.changed||price.needsSquareSync){
     if(draining){
      // apply_quote commits the existing copy-change queue with changed asks;
      // unchanged pending prices remain discoverable by square_pending. Do not
      // wait for external IO here or report an unacknowledged price as POS-ready.
      result.drain.deferredHandoffs++;if(price.needsSquareSync)result.squarePending++;
     }else try{
      if(!connections){const reply=await client.rpc('square_commerce_service_v2',{p_action:'commerce_connections',p_data:{environment:'production'}});if(reply.error||!Array.isArray(reply.data))throw failure('vendor_pricing_square_unavailable');connections=reply.data;}
      const connection=connections.find(c=>c.ownerId===price.ownerId);
      if(connection){
       square??=createSquare({client});
       const synced=await square.commerce.processConnection(price.ownerId,connection.connectionId,{maxTargets:2,manual:false,focusInstanceId:instanceId});
       if(synced?.focusStatus==='ready')result.squareReady++;else result.squarePending++;
      }
     }catch{result.squarePending++;}
    }
   }else if(['waiting','stale','held','paused','busy','skipped'].includes(price?.status))result.waiting++;
   else if(price?.status==='failed'){result.failed++;result.errorCode=safeCode(price?.error?{code:price.error}:null);}
   else throw failure('vendor_pricing_result_invalid');
   }
   if(!draining)break;
  }
  if(result.failed)result.status='failed';
  await call('run_finish',{result});return result;
 }catch(error){
  result.status='failed';result.errorCode=safeCode(error);result.failed++;
  if(started)await call('run_finish',{result}).catch(()=>{});
  throw Object.assign(failure(result.errorCode),{runId});
 }
}
