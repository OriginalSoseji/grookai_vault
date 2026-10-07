import {NextRequest,NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie, Authorization'}});
export async function GET(request:NextRequest){
  try {
    const client=await createServerComponentClient(),{data:{user},error}=await client.auth.getUser();
    if(error || !user)return json({error:'Sign in required.'},401);
    if(request.nextUrl.searchParams.get('owner')!==user.id)return json({error:'Account changed. Reopen Reports.'},409);
    if(process.env.GV_VENDOR_PROFIT_V1!=='1')return json({error:'Cost reporting is not available.'},404);
    const ids=request.nextUrl.searchParams.getAll('id');
    if(!ids.length || ids.length>100 || ids.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) || new Set(ids.map(id=>id.toLowerCase())).size!==ids.length)return json({error:'Use 1 to 100 receipt IDs.'},400);
    const {data,error:readError}=await client.rpc('vendor_sale_cost_read_v1',{p_request_ids:ids});
    if(readError || data?.ownerId!==user.id || !Array.isArray(data.snapshots))throw Error('Invalid cost read');
    const allowed=new Set(ids.map(id=>id.toLowerCase()));
    if(data.snapshots.length>ids.length || data.snapshots.some((row:{receiptId?:string})=>!row || typeof row.receiptId!=='string' || !allowed.has(row.receiptId)) || new Set(data.snapshots.map((row:{receiptId:string})=>row.receiptId)).size!==data.snapshots.length)throw Error('Invalid cost scope');
    return json({ownerId:user.id,snapshots:data.snapshots});
  }catch{return json({error:'Private cost history could not load. Profit is unavailable until it can refresh.'},503);}
}
