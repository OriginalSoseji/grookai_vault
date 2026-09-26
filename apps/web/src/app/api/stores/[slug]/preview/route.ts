import { NextRequest, NextResponse } from "next/server";
import { readStorefront, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { storeFilters } from "@/lib/stores/storefrontTypes";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const store = await readStorefront(
      (await context.params).slug,
      "preview",
      storeFilters(request.nextUrl.searchParams),
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
