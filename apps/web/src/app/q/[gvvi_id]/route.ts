import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizePublicGvviId } from "@/lib/gvvi/vendorQrCore";
import { setVendorReferralCookie } from "@/lib/gvvi/vendorReferralAttribution";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";

const ANONYMOUS_ID_COOKIE = "grookai-anonymous-id";

function notFoundResponse() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gvvi_id: string }> },
) {
  const { gvvi_id: rawGvviId } = await context.params;
  const gvviId = normalizePublicGvviId(rawGvviId);
  if (!gvviId) {
    return notFoundResponse();
  }

  const detail = await getPublicVaultInstanceByGvvi(gvviId);
  if (!detail?.isVendorOffer) {
    return notFoundResponse();
  }

  const destination = new URL(
    `/gvvi/${encodeURIComponent(detail.gvviId)}`,
    getSiteOrigin(),
  );
  destination.searchParams.set("entry", "qr");
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("cache-control", "private, no-store");

  const existingAnonymousId = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value?.trim();
  const anonymousId = existingAnonymousId || `anon_${randomUUID()}`;
  if (!existingAnonymousId) {
    response.cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const attributionPersisted = setVendorReferralCookie(response, detail.gvviId);

  await trackServerEvent({
    eventName: "gvvi_qr_scan",
    anonymousId,
    path: request.nextUrl.pathname,
    gvId: detail.gvId,
    metadata: {
      contract_version: "GVVI_VENDOR_QR_V1",
      gvvi_id: detail.gvviId,
      referred_vendor_slug: detail.ownerSlug,
      attribution_persisted: attributionPersisted,
    },
  });

  return response;
}
