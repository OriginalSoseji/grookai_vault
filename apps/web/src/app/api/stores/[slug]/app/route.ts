import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { readStorefront, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { storeFilters } from "@/lib/stores/storefrontTypes";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const client = await createServerComponentClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return new NextResponse("Sign in required", {
        status: 401,
        headers: STORE_NO_STORE,
      });
    const store = await readStorefront(
      (await context.params).slug,
      "app",
      storeFilters(request.nextUrl.searchParams),
      client,
    );
    return store
      ? NextResponse.json(store, { headers: STORE_NO_STORE })
      : new NextResponse("Not found", { status: 404, headers: STORE_NO_STORE });
  } catch {
    return new NextResponse("Store unavailable", {
      status: 503,
      headers: STORE_NO_STORE,
    });
  }
}
