import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareCommerceBackend} from './commerce_backend_v2.mjs';
export async function recordSquareWebhookSignal(hint){
 const target=process.env.SUPABASE_URL;
 if(target!=='http://127.0.0.1:61841'&&!(target==='https://ycdxbpibncqcchqiihfz.supabase.co'&&process.env.NODE_ENV==='production'))return false;
 try{
  const result=await createBackendClient().rpc('square_signal_record_v2',{p_environment:hint.environment,p_event_id:hint.eventId,
   p_merchant_id:hint.merchantId,p_type:hint.type,p_resource_id:hint.resourceId,p_body_hash:hint.bodyHash});
  return !result.error&&result.data===true;
 }catch{return false;}
}
export async function processSquareWebhookSignal(hint){
 const target=process.env.SUPABASE_URL;
 if(target!=='http://127.0.0.1:61841'&&!(target==='https://ycdxbpibncqcchqiihfz.supabase.co'&&process.env.NODE_ENV==='production'))return;
 const client=createBackendClient(),binding=await client.rpc('square_commerce_service_v2',{p_action:'signal_connection',p_data:{environment:hint.environment,merchantId:hint.merchantId}});
 if(binding.error||!binding.data?.connectionId)return;
 await createSquareCommerceBackend({client}).commerce.processConnection(binding.data.ownerId,binding.data.connectionId,{maxTargets:1});
}
