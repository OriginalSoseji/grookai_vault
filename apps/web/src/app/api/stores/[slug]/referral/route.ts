import { NextRequest, NextResponse } from "next/server";
import { setStoreReferralCookie } from "@/lib/gvvi/vendorReferralAttribution";
import { readStorefront, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  if (request.headers.get("origin") !== getSiteOrigin())
    return new NextResponse("Invalid origin", {
      status: 403,
      headers: STORE_NO_STORE,
    });
  const response = NextResponse.json({ ok: true }, { headers: STORE_NO_STORE });
  try {
    const store = await readStorefront((await context.params).slug, "web");
    if (store) setStoreReferralCookie(response, store.store.id);
  } catch {
    /* Attribution never blocks browsing. */
  }
  return response;
}
