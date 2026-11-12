import 'server-only';
import {after} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {squareBackend} from './http';
export async function notifySquareOfferSaved(actorId:string,instanceId:string,{waitForResult=false}:{waitForResult?:boolean}={}):Promise<'ready'|'pending'|'review'|'not_enabled'>{
 if(process.env.GROOKAI_SQUARE_COMMERCE_ENABLED!=='true')return 'not_enabled';
 try{
  const client=await createServerComponentClient(),{data:{user}}=await client.auth.getUser();
  if(user?.id!==actorId)return 'not_enabled';
  const {data,error}=await client.rpc('square_workspace_v1');if(error)return 'pending';
  const connection=data.connections.find((row:{environment:string;status:string;autoSync:boolean})=>row.environment===process.env.SQUARE_ENVIRONMENT&&row.status==='connected'&&row.autoSync);
  if(!connection)return 'not_enabled';
  if(waitForResult){
    const result=await squareBackend().commerce.processConnection(actorId,connection.id,{manual:false,maxTargets:2,focusInstanceId:instanceId});
    const status=result&&typeof result==='object'&&'focusStatus' in result?result.focusStatus:undefined;
    return status==='ready'||status==='review'||status==='not_enabled'?status:'pending';
  }
  // The source mutation already committed its durable copy-change queue. Finish
  // the page action promptly; the journaled worker continues after the response.
  after(async()=>{try{await squareBackend().commerce.processConnection(actorId,connection.id,{manual:false,maxTargets:2,focusInstanceId:instanceId});}catch{/* Durable run/queue retain recovery. */}});
  return 'pending';
 }catch{return 'pending';} // The successful Vault write and durable queue remain intact.
}
