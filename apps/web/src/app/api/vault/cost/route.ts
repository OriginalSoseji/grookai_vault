import {NextRequest, NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
import {isCostId, validateCostRequest} from '@/lib/vault/copyCost.mjs';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store', Vary:'Cookie, Authorization'};
const json = (body:unknown, status=200) => NextResponse.json(body,{status,headers});
const enabled = () => process.env.GV_COPY_COST_V1 === '1';
async function session() {
  const client = await createServerComponentClient();
  const {data:{user},error} = await client.auth.getUser();
  return error || !user ? null : {client,user};
}

export async function GET(req:NextRequest) {
  try {
    const ctx = await session();
    if (!ctx) return json({error:'Sign in required.'},401);
    const ownerId = req.nextUrl.searchParams.get('owner');
    if (ownerId !== ctx.user.id) return json({error:'Account changed. Reopen this copy.'},409);
    const requestId = req.nextUrl.searchParams.get('requestId');
    // Recovery remains available when the web entry is switched off.
    if (requestId !== null) {
      if (!isCostId(requestId)) return json({error:'Invalid request.'},400);
      const {data,error} = await ctx.client.rpc('vault_copy_cost_request_read_v1',{p_request_id:requestId});
      if (error) throw error;
      return json({ownerId:ctx.user.id,result:data});
    }
    if (!enabled()) return json({error:'Cost editing is not available.'},404);
    const instanceId = req.nextUrl.searchParams.get('instanceId');
    if (!isCostId(instanceId)) return json({error:'Invalid copy.'},400);
    const {data,error} = await ctx.client.rpc('vault_copy_cost_read_v1',{p_instance_ids:[instanceId]});
    if (error) throw error;
    if (data?.ownerId !== ctx.user.id || !Array.isArray(data.copies)) throw Error('Invalid owner response');
    const copy = data.copies.find((row:{instanceId:string}) => row.instanceId === instanceId);
    if (!copy) return json({error:'Copy unavailable.'},404);
    return json({ownerId:ctx.user.id,editEnabled:data.editEnabled===true,copy});
  } catch {
    return json({error:'Cost information could not load. Try again.'},503);
  }
}

export async function POST(req:NextRequest) {
  try {
    const ctx = await session();
    if (!ctx) return json({error:'Sign in required.'},401);
    const origin = req.headers.get('origin');
    if (!origin || ![req.nextUrl.origin,getSiteOrigin()].includes(origin)) return json({error:'Invalid request origin.'},403);
    if (!enabled()) return json({error:'Cost editing is not available. Any unconfirmed save remains recoverable.'},404);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return json({error:'Use a cost request.'},415);
    if (Number(req.headers.get('content-length') ?? 0)>10000) return json({error:'Cost request is too large.'},413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength>10000) return json({error:'Cost request is too large.'},413);
    let request;
    try { request = validateCostRequest(JSON.parse(raw)); }
    catch { return json({error:'Review the cost amount and currency.'},400); }
    if (request.ownerId !== ctx.user.id) return json({error:'Account changed. Reopen this copy.'},409);
    const {data,error} = await ctx.client.rpc('vault_copy_cost_save_v1',{
      p_request_id:request.requestId,p_instance_id:request.instanceId,
      p_expected_amount:request.expectedAmount,p_expected_currency:request.expectedCurrency,
      p_amount:request.amount,p_currency:request.currency,
    });
    if (error) {
      // Only a completed RPC business rejection settles this request. HTTP,
      // network and feature-visibility errors cannot prove it never committed.
      if (error.code==='PT409' && ['Copy unavailable','Cost changed; review the current value'].includes(error.message)) return json({error:'This copy or its cost changed. Review the latest value.',definitive:true,conflict:true},409);
      if (error.code==='42501' && error.message==='Cost editing unavailable') return json({error:'Cost editing is temporarily unavailable.',definitive:true},403);
      if (error.code==='22023' && error.message==='Enter a nonnegative cost with at most two decimals and its currency') return json({error:'This cost request needs review.',definitive:true},400);
      throw error;
    }
    return json({ownerId:ctx.user.id,result:data});
  } catch {
    return json({error:'The save result is not confirmed. Check this request before saving again.'},503);
  }
}
