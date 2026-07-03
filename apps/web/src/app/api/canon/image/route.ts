import { NextRequest, NextResponse } from "next/server";
import { normalizeWarehouseCanonImagePath } from "@/lib/canon/canonImageProxy";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { VAULT_INSTANCE_MEDIA_BUCKET } from "@/lib/vaultInstanceMedia";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getContentTypeForPath(path: string) {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  if (lowerPath.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

export async function GET(request: NextRequest) {
  const path = normalizeWarehouseCanonImagePath(request.nextUrl.searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin.storage
    .from(VAULT_INSTANCE_MEDIA_BUCKET)
    .download(path);

  if (error || !data) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  const response = new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": data.type || getContentTypeForPath(path),
    },
  });
  return response;
}
