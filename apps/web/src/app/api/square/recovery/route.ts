import {timingSafeEqual} from 'node:crypto';
import {runSquareCloudRecovery} from '@/lib/square/cloudRecovery';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;

const headers={'Cache-Control':'private, no-store','Vary':'Authorization','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
function authorized(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||!/^[A-Za-z0-9_-]{32,256}$/.test(secret))return false;
 const actual=request.headers.get('authorization')??'',expected='Bearer '+secret;
 if(actual.length!==expected.length)return false;
 const left=Buffer.from(actual),right=Buffer.from(expected);
 return left.length===right.length&&timingSafeEqual(left,right);
}
export async function HEAD(){return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});}
export async function GET(request:Request){
 if(request.method!=='GET')return reply({error:'Method not allowed.'},405);
 if(!authorized(request))return reply({error:'Unauthorized.'},401);
 if(process.env.VERCEL_ENV!=='production')return reply({error:'square_scheduler_configuration_unavailable'},503);
 if(process.env.GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED!=='true')return reply({status:'paused'});
 const trigger=request.headers.get('x-vercel-cron-schedule')==='2-57/5 * * * *'?'scheduled':'operator';
 try{
  const result=await runSquareCloudRecovery();
  console.info('[square-cloud-recovery]',JSON.stringify({trigger,...result}));
  return reply(result,result.status==='failed'?503:200);
 }catch(error){
  const value=error as {code?:unknown;runId?:unknown};
  const code=typeof value?.code==='string'&&/^square_[a-z_]{1,80}$/.test(value.code)?value.code:'square_worker_failed';
  const runId=typeof value?.runId==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value.runId)?value.runId:undefined;
  console.error('[square-cloud-recovery]',JSON.stringify({trigger,runId,errorCode:code}));
  return reply({error:code,runId},503);
 }
}
