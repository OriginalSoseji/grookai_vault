import {NextRequest,NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
import {validateSaleCostCorrectionRequest,confirmedSaleCostCorrection,validateSaleCostCorrectionStates,validateSaleCostCorrectionHistory} from '@/lib/sales/saleCostCorrections.mjs';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie, Authorization'}});
const fields=(v:unknown,keys:string[])=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==getSiteOrigin())return json({error:'Use this account’s Reports page.'},403);
  const client=await createServerComponentClient(),{data:{user},error}=await client.auth.getUser();
  if(error||!user)return json({error:'Sign in required.'},401);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>70000)return json({error:'Cost request is too large.'},400);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid cost request.'},400);}
  if(body?.ownerId!==user.id)return json({error:'Account changed. Reopen Reports.'},409);
  const mode=body.mode;
  if(mode==='available'){
   if(!fields(body,['ownerId','mode']))return json({error:'Invalid availability request.'},400);
   if(process.env.GV_VENDOR_COST_CORRECTIONS_V1!=='1')return json({ownerId:user.id,enabled:false});
   const result=await client.rpc('vendor_sale_cost_correction_available_v1');
   if(result.error||typeof result.data!=='boolean')throw Error('Unavailable');
   return json({ownerId:user.id,enabled:result.data});
  }
  if(mode==='read'){
   if(!fields(body,['ownerId','mode','receiptIds'])||!Array.isArray(body.receiptIds)||!body.receiptIds.length||body.receiptIds.length>100||body.receiptIds.some((v:unknown)=>!uuid(v))||new Set(body.receiptIds.map((v:string)=>v.toLowerCase())).size!==body.receiptIds.length)return json({error:'Use 1 to 100 receipt IDs.'},400);
   const result=await client.rpc('vendor_sale_cost_correction_read_v1',{p_receipt_ids:body.receiptIds});if(result.error)throw Error('Unavailable');
   return json({ownerId:user.id,states:validateSaleCostCorrectionStates(result.data,user.id,body.receiptIds)});
  }
  if(mode==='history'){
   if(!fields(body,['ownerId','mode','receiptId','lineIndex','beforeRevision'])||!uuid(body.receiptId)||!Number.isInteger(body.lineIndex)||body.lineIndex<0||body.lineIndex>49||!(body.beforeRevision===null||typeof body.beforeRevision==='string'&&/^[1-9][0-9]{0,18}$/.test(body.beforeRevision)&&BigInt(body.beforeRevision)<=9223372036854775807n))return json({error:'Invalid cost history selection.'},400);
   const result=await client.rpc('vendor_sale_cost_correction_history_v1',{p_receipt_id:body.receiptId,p_line_index:body.lineIndex,p_before_revision:body.beforeRevision});if(result.error)throw Error('Unavailable');
   return json({ownerId:user.id,history:validateSaleCostCorrectionHistory(result.data,user.id,body.receiptId,body.lineIndex,body.beforeRevision)});
  }
  if(!['apply','recover','cancel'].includes(mode)||!fields(body,['ownerId','mode','request']))return json({error:'Invalid cost operation.'},400);
  let pending;try{pending=validateSaleCostCorrectionRequest(body.request);}catch{return json({error:'Cost correction needs review.'},400);}
  if(mode==='apply'&&process.env.GV_VENDOR_COST_CORRECTIONS_V1!=='1')return json({error:'New cost corrections are unavailable. Recover or cancel your retained request.'},404);
  const result=await client.rpc(`vendor_sale_cost_correction_${mode}_v1`,{p_request:pending});
  if(result.error)return json({error:'The correction outcome is not confirmed. Preserve the request.',code:['PT409','22023','55000','42501'].includes(result.error.code)?result.error.code:null},result.error.code==='PT409'?409:503);
  if(result.data===null&&mode==='recover')return json({ownerId:user.id,outcome:null});
  return json({ownerId:user.id,outcome:confirmedSaleCostCorrection(pending,result.data,user.id)});
 }catch{return json({error:'Private cost history could not be verified. Preserve any pending correction.'},503);}
}
