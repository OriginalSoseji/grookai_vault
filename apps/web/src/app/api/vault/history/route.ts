import {NextRequest,NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
import {portfolioId,portfolioFields,portfolioSequence,validatePortfolioCapabilities,validatePortfolioRequest,
  confirmedPortfolioOutcome,validatePortfolioPage,validatePortfolioComparison,validatePortfolioSummary} from '@/lib/vault/portfolioHistory.mjs';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie, Authorization'}});
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==getSiteOrigin())return json({error:'Open collection history from your Vault.'},403);
  const client=await createServerComponentClient(),{data:{user},error}=await client.auth.getUser();
  if(error||!user)return json({error:'Sign in required.'},401);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>4096)return json({error:'History request is too large.'},400);
  let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{return json({error:'Invalid history request.'},400);}
  if(body===null||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid history request.'},400);
  if(body.ownerId!==user.id)return json({error:'Your account changed. Reopen Vault.'},409);
  const mode=body.mode;
  if(mode==='capabilities'){
   if(!portfolioFields(body,['ownerId','mode']))return json({error:'Invalid history request.'},400);
   const result=await client.rpc('portfolio_history_capabilities_v1');if(result.error)throw Error('Unavailable');
   const capabilities=validatePortfolioCapabilities(result.data);capabilities.enabled&&=process.env.GV_PORTFOLIO_HISTORY_V1==='1';
   return json({ownerId:user.id,capabilities});
  }
  if(mode==='list'){
   if(!portfolioFields(body,['ownerId','mode','before','watermark','limit'])||!(body.before===null||portfolioSequence(body.before))
     ||!(body.watermark===null||portfolioSequence(body.watermark,true))||typeof body.limit!=='number'||!Number.isInteger(body.limit)||body.limit<1||body.limit>100)return json({error:'Invalid history page.'},400);
   const result=await client.rpc('portfolio_history_list_v1',{p_before:body.before,p_watermark:body.watermark,p_limit:body.limit});if(result.error)throw Error('Unavailable');
   return json({ownerId:user.id,page:validatePortfolioPage(result.data,user.id,{before:body.before,watermark:body.watermark,limit:body.limit})});
  }
  if(mode==='compare'){
   if(!portfolioFields(body,['ownerId','mode','beforeId','afterId'])||!portfolioId(body.beforeId)||!portfolioId(body.afterId)||body.beforeId===body.afterId)return json({error:'Choose two different observations.'},400);
   const result=await client.rpc('portfolio_history_compare_v1',{p_before_id:body.beforeId,p_after_id:body.afterId});if(result.error)throw Error('Unavailable');
   return json({ownerId:user.id,comparison:validatePortfolioComparison(result.data,body.beforeId,body.afterId)});
  }
  if(mode==='export'){
   if(!portfolioFields(body,['ownerId','mode','pointId','afterCopy'])||!portfolioId(body.pointId)||!(body.afterCopy===null||portfolioId(body.afterCopy)))return json({error:'Invalid history export.'},400);
   const result=await client.rpc('portfolio_history_export_v1',{p_point_id:body.pointId,p_after_copy:body.afterCopy,p_limit:100});if(result.error)throw Error('Unavailable');
   const v=result.data;if(!portfolioFields(v,['version','ownerId','point','rows','nextAfterCopy'])||v.version!==1||v.ownerId!==user.id||v.point?.snapshotId!==body.pointId||!Array.isArray(v.rows)||v.rows.length>100||!(v.nextAfterCopy===null||portfolioId(v.nextAfterCopy)))throw Error('Invalid export');
   validatePortfolioSummary(v.point);
   let previous=body.afterCopy as string|null;
   for(const row of v.rows){if(!portfolioId(row?.copy?.copyId)||row.evidence?.copyId!==row.copy.copyId||(previous!==null&&row.copy.copyId<=previous))throw Error('Invalid export ordering');previous=row.copy.copyId;}
   if(v.nextAfterCopy!==null&&(v.rows.length!==100||v.nextAfterCopy!==previous))throw Error('Invalid export cursor');
   return json({ownerId:user.id,export:v});
  }
  if(!['capture','recover','cancel'].includes(String(mode))||!portfolioFields(body,['ownerId','mode','request']))return json({error:'Invalid history operation.'},400);
  let pending;try{pending=validatePortfolioRequest(body.request);}catch{return json({error:'Recording request needs review.'},400);}
  if(mode==='capture'&&process.env.GV_PORTFOLIO_HISTORY_V1!=='1')return json({error:'New recordings are unavailable. Recover or cancel the retained request.'},404);
  const result=await client.rpc(`portfolio_history_${mode}_v1`,{p_request:pending});
  if(result.error)return json({error:'The recording outcome is not confirmed. Your request is retained.',code:['22023','55000','42501'].includes(result.error.code)?result.error.code:null},503);
  if(mode==='recover'&&result.data===null)return json({ownerId:user.id,outcome:null});
  return json({ownerId:user.id,outcome:confirmedPortfolioOutcome(pending,result.data,user.id)});
 }catch{return json({error:'Collection history is unavailable. Keep any pending recording request.'},503);}
}
