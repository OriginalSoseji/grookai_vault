import {NextRequest,after} from 'next/server';
import {recordSquareWebhookSignal,processSquareWebhookSignal} from '../../../../../../../backend/square/webhook_backend_v2.mjs';
import {squareWebhookHint} from '../../../../../../../backend/square/webhook_v2.mjs';
import {squareReply} from '@/lib/square/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY||!process.env.SQUARE_WEBHOOK_URL)return squareReply({received:false},503);
 try{
  if(!request.body)return squareReply({received:false},400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>1048576){await reader.cancel();return squareReply({received:false},413);}chunks.push(value);}
  const hint=squareWebhookHint({body:Buffer.concat(chunks),signature:request.headers.get('x-square-hmacsha256-signature'),
   key:process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,notificationUrl:process.env.SQUARE_WEBHOOK_URL,environment:process.env.SQUARE_ENVIRONMENT});
  if(!hint)return squareReply({received:true},202);
  if(!await recordSquareWebhookSignal(hint))return squareReply({received:false},503);
  after(async()=>{try{await processSquareWebhookSignal(hint);}catch{/* The durable hint/run remains pending for periodic reconciliation. */}});
  return squareReply({received:true});
 }catch{return squareReply({received:false},403);}
}
