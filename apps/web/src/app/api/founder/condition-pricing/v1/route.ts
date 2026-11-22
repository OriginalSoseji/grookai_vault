import {NextRequest,NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@/lib/supabase/server';
import {createServerAdminClient} from '@/lib/supabase/admin';
import {resolveServerUserEntitlement} from '@/lib/entitlements/resolveServerUserEntitlement';
import {createConditionCanaryHandlerV1,getConditionCanaryPriceV1} from '@/lib/pricing/conditionCanaryServer';

export const dynamic='force-dynamic';
export const revalidate=0;
export async function GET(request:NextRequest){
  const cookieSink=new NextResponse(null);
  const handler=createConditionCanaryHandlerV1({
    authorize:async()=>{
      const client=createRouteHandlerClient(request,cookieSink);
      const authorization=request.headers.get('authorization');
      const token=authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if(authorization&&!token)return{authenticated:false,founder:false};
      const {data:{user},error}=token?await client.auth.getUser(token):await client.auth.getUser();
      if(error||!user)return{authenticated:false,founder:false};
      const entitlement=await resolveServerUserEntitlement(user);
      return{authenticated:true,founder:entitlement.capabilities.canUseFounderTools};
    },
    read:selection=>getConditionCanaryPriceV1(createServerAdminClient(),selection),
  });
  const result=await handler(request);
  const response=new NextResponse(result.body,{status:result.status,headers:result.headers});
  for(const cookie of cookieSink.cookies.getAll())response.cookies.set(cookie);
  return response;
}
