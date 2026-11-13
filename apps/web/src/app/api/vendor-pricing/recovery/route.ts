import {timingSafeEqual} from 'node:crypto';
import {runVendorPricingRecovery} from '@/lib/vendorPricing/recovery';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=request.headers.get('authorization')??'';
 if(!secret||!/^[A-Za-z0-9_-]{32,256}$/.test(secret))return reply({error:'Unauthorized.'},401);
 const a=Buffer.from(actual),b=Buffer.from('Bearer '+secret);
 if(a.length!==b.length||!timingSafeEqual(a,b))return reply({error:'Unauthorized.'},401);
 if(process.env.VERCEL_ENV!=='production')return reply({error:'vendor_pricing_configuration_unavailable'},503);
 if(process.env.GROOKAI_VENDOR_PRICING_RECOVERY_ENABLED!=='true')return reply({status:'paused'});
 const runId=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value)?value:undefined;
 try{const result=await runVendorPricingRecovery();console.info('grookai_vendor_pricing_recovery_v1',JSON.stringify({...result,runId:runId(result.runId),trigger:request.headers.has('x-vercel-cron-schedule')?'scheduled':'operator'}));return reply(result,result.status==='failed'?503:200);}
 catch(error){const e=error as {code?:string;runId?:string};return reply({error:/^vendor_pricing_[a-z_]+$/.test(e.code??'')?e.code:'vendor_pricing_worker_failed',runId:runId(e.runId)},503);}
}
export async function HEAD(){return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});}
