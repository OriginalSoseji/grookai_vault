import { NextRequest, NextResponse } from "next/server";
import { normalizePublicGvviId } from "@/lib/gvvi/vendorQrCore";
import { renderVendorQrSvg } from "@/lib/gvvi/vendorQr";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

function hiddenResponse(cookieSink: NextResponse) {
  return copyResponseCookies(
    cookieSink,
    new NextResponse("Not found", {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    }),
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gvvi_id: string }> },
) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  const entitlement = await resolveServerUserEntitlement(user);
  const { gvvi_id: rawGvviId } = await context.params;
  const gvviId = normalizePublicGvviId(rawGvviId);

  if (authError || !user || !entitlement.capabilities.canUseVendorTools || !gvviId) {
    return hiddenResponse(cookieSink);
  }

  const detail = await getPublicVaultInstanceByGvvi(gvviId);
  if (!detail?.isVendorOffer || detail.ownerUserId !== user.id) {
    return hiddenResponse(cookieSink);
  }

  const svg = await renderVendorQrSvg(detail.gvviId);
  const download = request.nextUrl.searchParams.get("download") === "1";
  const response = new NextResponse(svg, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "image/svg+xml; charset=utf-8",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
      ...(download
        ? { "content-disposition": `attachment; filename="${detail.gvviId}-qr.svg"` }
        : {}),
    },
  });
  return copyResponseCookies(cookieSink, response);
}
