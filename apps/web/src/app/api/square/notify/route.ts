import {NextRequest} from 'next/server';
import {squareBackend,squareBody,squareFailure,squareId,squareOriginAllowed,squareOwner,squareReply} from '@/lib/square/http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(!squareOriginAllowed(request))return squareReply({error:'Invalid request origin.'},403);
 try{
  const owner=await squareOwner();if(!owner)return squareReply({error:'Sign in to grookai.'},401);
  const body=await squareBody(request),instanceId=squareId(body.instanceId);
  if(process.env.GROOKAI_SQUARE_COMMERCE_ENABLED!=='true')return squareReply({status:'not_enabled'});
  const {data,error}=await owner.client.rpc('square_workspace_v1');if(error)throw new Error('square_state_unavailable');
  const connection=data.connections.find((row:{id:string;environment:string;status:string;autoSync:boolean})=>row.environment===process.env.SQUARE_ENVIRONMENT&&row.status==='connected'&&row.autoSync);
  if(!connection)return squareReply({status:'not_enabled'});
  const result=await squareBackend().commerce.processConnection(owner.actorId,connection.id,{maxTargets:2,manual:false,focusInstanceId:instanceId}) as {focusStatus:string};
  return squareReply({status:result.focusStatus});
 }catch(error){return squareFailure(error);}
}
