import {createBackendClient} from '../supabase_backend_client.mjs';
import {SquareCatalogService,squareEnvironmentConfig} from './service_v1.mjs';
import {SquareCommerceService} from './commerce_service_v2.mjs';
import {SquareApiError} from './client_v1.mjs';
export function createSquareCommerceBackend({client,config=squareEnvironmentConfig()}={}){
 if(process.env.GV_USER_ACCESS_TOKEN)throw new SquareApiError('square_database_target_unqualified');
 if(!client){
  const target=process.env.SUPABASE_URL;
  const onboardingLab=target==='http://127.0.0.1:62941'&&process.env.NEXT_PUBLIC_SQUARE_ONBOARDING_LOCAL_TEST==='true'&&process.env.NEXT_PUBLIC_COLLECTOR_STAGING==='true'&&process.env.GROOKAI_DISABLE_TELEMETRY==='1'&&process.env.NODE_ENV==='development'&&!process.env.VERCEL&&!process.env.VERCEL_ENV;
  if(!onboardingLab&&target!=='http://127.0.0.1:61841'&&!(target==='https://ycdxbpibncqcchqiihfz.supabase.co'&&process.env.NODE_ENV==='production'))throw new SquareApiError('square_database_target_unqualified');
  client=createBackendClient();
 }
 const rpc=async(action,data)=>{
  const result=action==='commerce_run_detail'?await client.rpc('square_commerce_run_detail_v3',{p_run_id:data.runId,p_owner:data.ownerId,p_connection:data.connectionId,
    p_stage:data.stage,p_error_code:data.errorCode??null,p_database_code:data.databaseCode??null,p_target:data.targetId??null})
   :action==='defer'?await client.rpc('square_connection_defer_v1',{p_connection:data.connectionId,p_owner:data.ownerId,p_token:data.leaseToken,p_fence:data.fence,p_seconds:data.seconds})
   :action==='authorization_failed'?await client.rpc('square_connection_authorization_failed_v1',{p_connection:data.connectionId,p_owner:data.ownerId,p_token:data.leaseToken,p_fence:data.fence})
   :await client.rpc('square_commerce_service_v2',{p_action:action,p_data:data});
  if(result.error){
   const error=new SquareApiError(/^square_[a-z_]{1,80}$/.test(result.error.message)?result.error.message:'square_state_unavailable');
   if(/^[0-9A-Z]{5}$/.test(result.error.code??''))error.databaseCode=result.error.code;
   throw error;
  }
  return result.data??{recorded:true};
 };
 const catalog=new SquareCatalogService({rpc,config});
 return Object.assign(catalog,{commerce:new SquareCommerceService({catalog,rpc,config})});
}
