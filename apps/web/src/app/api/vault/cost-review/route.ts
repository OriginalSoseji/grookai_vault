import {NextRequest,NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {costReviewIds,costReviewRows} from '@/lib/vault/copyCostReview.mjs';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie, Authorization'};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
export async function GET(request:NextRequest) {
  try {
    const client=await createServerComponentClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError || !user)return json({error:'Sign in required.'},401);
    if(request.nextUrl.searchParams.get('owner')!==user.id)return json({error:'Account changed. Reopen inventory.'},409);
    if(process.env.GV_COPY_COST_V1!=='1')return json({error:'Cost review is unavailable.'},404);
    const text=request.nextUrl.searchParams.get('ids')??'';
    let ids:string[];
    try {
      if(text.length>3700)throw Error('Too many copies');
      ids=costReviewIds(text.split(','));
      if(!ids.length || ids.length>100)throw Error('Invalid batch');
    }catch{return json({error:'Choose between 1 and 100 copies per read.'},400);}
    const {data,error}=await client.rpc('vault_copy_cost_read_v1',{p_instance_ids:ids});
    if(error)throw error;
    costReviewRows(user.id,ids,data);
    return json(data);
  }catch{return json({error:'Costs could not load. Try again.'},503);}
}
