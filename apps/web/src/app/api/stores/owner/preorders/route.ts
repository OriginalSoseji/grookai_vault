import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { preorderId, preorderTerms } from "@/lib/stores/storePreorderInput";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status=200) => NextResponse.json(data,{status,headers:STORE_NO_STORE});
export async function GET(request: NextRequest) {
  if(process.env.GROOKAI_PREORDER_DRAFTS_ENABLED!=="true") return reply({error:"Preorder setup is not available yet"},503);
  const client=await createServerComponentClient();
  if(!(await client.auth.getUser()).data.user) return reply({error:"Sign in required"},401);
  const offset=Number(request.nextUrl.searchParams.get("offset")??0);
  if(!Number.isInteger(offset)||offset<0||offset>100000) return reply({error:"Invalid page"},400);
  const {data,error}=await client.rpc("vendor_preorders_owner_v1",{p_offset:offset});
  if(error) return reply({error:"Preorders could not be loaded"},503);
  return reply(data);
}
export async function POST(request: NextRequest) {
  if(process.env.GROOKAI_PREORDER_DRAFTS_ENABLED!=="true") return reply({error:"Preorder setup is not available yet"},503);
  const origin=request.headers.get("origin");
  if((origin&&origin!==getSiteOrigin())||(!origin&&!/^Bearer \S+$/i.test(request.headers.get("authorization")??""))) return reply({error:"Invalid request origin"},403);
  const client=await createServerComponentClient();
  if(!(await client.auth.getUser()).data.user) return reply({error:"Sign in required"},401);
  try {
    // Bound even chunked bodies before parsing any supplied text.
    const reader=request.body?.getReader(); if(!reader) return reply({error:"Invalid request"},400);
    let size=0;const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>40000){await reader.cancel();return reply({error:"Preorder is too large"},413);}chunks.push(value);}
    const body=JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string,unknown>;
    const id=preorderId(body.id), terms=preorderTerms(body);
    if(typeof body.version!=="number"||!Number.isInteger(body.version)||body.version<0||body.version>2147483646||!["draft","archived"].includes(String(body.status))) throw new Error("Invalid preorder version or status");
    const {data,error}=await client.rpc("vendor_preorders_save_v1",{p_id:id,p_version:body.version,p_data:{...terms,status:body.status}});
    if(error) return reply({error:(error.code==="PT409"||error.code==="40001")?"This preorder changed. Go back and reload it before editing.":error.code==="42501"?"Store access or preorder unavailable":"Preorder could not be saved. Check its fields and retry."},(error.code==="PT409"||error.code==="40001")?409:error.code==="42501"?403:400);
    return reply(data);
  } catch(error) { return reply({error:error instanceof SyntaxError?"Invalid request":error instanceof Error?error.message:"Invalid preorder"},400); }
}
