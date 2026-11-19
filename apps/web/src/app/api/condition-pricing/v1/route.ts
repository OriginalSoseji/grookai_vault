import {NextRequest,NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@/lib/supabase/server';
import {createServerAdminClient} from '@/lib/supabase/admin';
import {createConditionPriceHandlerV1,getConditionPriceV1} from '@/lib/pricing/conditionPriceServer';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const revalidate=0;
export async function GET(request:NextRequest){
  const cookieSink=new NextResponse(null);
  const handler=createConditionPriceHandlerV1({
    authorize:async()=>{
      const client=createRouteHandlerClient(request,cookieSink);
      const header=request.headers.get('authorization'),token=header?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if(header&&!token)return false;
      const {data:{user},error}=token?await client.auth.getUser(token):await client.auth.getUser();
      return !error&&Boolean(user);
    },
    read:selection=>getConditionPriceV1(createServerAdminClient(),selection),
  });
  const result=await handler(request);
  const response=new NextResponse(result.body,{status:result.status,headers:result.headers});
  for(const cookie of cookieSink.cookies.getAll())response.cookies.set(cookie);
  return response;
}
