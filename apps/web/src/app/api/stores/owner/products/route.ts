import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const client = await createServerComponentClient();
    if (!(await client.auth.getUser()).data.user)
      return new NextResponse("Sign in required", {
        status: 401,
        headers: STORE_NO_STORE,
      });
    const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
      throw new Error("Invalid page");
    const { data, error } = await client.rpc("vendor_store_custom_owner_v1", {
      p_product_id: request.nextUrl.searchParams.get("id") || null,
      p_offset: offset,
    });
    if (error) throw error;
    return NextResponse.json(data, { headers: STORE_NO_STORE });
  } catch {
    return new NextResponse("Products unavailable", {
      status: 400,
      headers: STORE_NO_STORE,
    });
  }
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== getSiteOrigin()) ||
    (!origin &&
      !/^Bearer \S+$/i.test(request.headers.get("authorization") ?? ""))
  )
    return new NextResponse("Invalid origin", {
      status: 403,
      headers: STORE_NO_STORE,
    });
  try {
    const client = await createServerComponentClient();
    if (!(await client.auth.getUser()).data.user)
      return new NextResponse("Sign in required", {
        status: 401,
        headers: STORE_NO_STORE,
      });
    const body = await request.json();
    if (
      !(body.id === null || typeof body.id === "string") ||
      !(body.version === null || Number.isSafeInteger(body.version)) ||
      typeof body.action !== "string"
    )
      throw Error("Invalid action");
    const { data, error } = await client.rpc("vendor_store_custom_mutate_v1", {
      p_product_id: body.id,
      p_expected_version: body.version,
      p_action: body.action,
      p_data: body.data ?? {},
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "PT409"
              ? "Product changed. Reload before saving."
              : "Change not saved. Check fields, access and eligibility.",
        },
        {
          status:
            error.code === "PT409" ? 409 : error.code === "42501" ? 403 : 400,
          headers: STORE_NO_STORE,
        },
      );
    return NextResponse.json(data, { headers: STORE_NO_STORE });
  } catch {
    return new NextResponse("Invalid product request", {
      status: 400,
      headers: STORE_NO_STORE,
    });
  }
}
