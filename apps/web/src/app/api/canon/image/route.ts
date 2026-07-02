import { NextRequest, NextResponse } from "next/server";
import { normalizeWarehouseCanonImagePath } from "@/lib/canon/canonImageProxy";
import { resolveVaultInstanceMediaUrl } from "@/lib/vault/resolveVaultInstanceMediaUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const path = normalizeWarehouseCanonImagePath(request.nextUrl.searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  }

  const signedUrl = await resolveVaultInstanceMediaUrl(path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  const response = NextResponse.redirect(signedUrl, 307);
  response.headers.set("Cache-Control", "public, max-age=300, s-maxage=900, stale-while-revalidate=3600");
  return response;
}
