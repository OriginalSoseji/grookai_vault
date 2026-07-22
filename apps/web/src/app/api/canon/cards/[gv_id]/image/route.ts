import { NextRequest, NextResponse } from "next/server";
import {
  normalizeCanonImageGvId,
  normalizeWarehouseCanonImagePath,
} from "@/lib/canon/canonImageProxy";
import { isIdentityCardImageSource } from "@/lib/publicCardImage";
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

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: { gv_id: string };
  },
) {
  const gvId = normalizeCanonImageGvId(params.gv_id);
  if (!gvId) {
    return NextResponse.json({ error: "Invalid card id." }, { status: 400 });
  }

  const admin = createServerAdminClient();
  const { data: cardPrint, error: cardPrintError } = await admin
    .from("card_prints")
    .select("gv_id,image_source,image_path")
    .eq("gv_id", gvId)
    .maybeSingle();

  if (cardPrintError) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  let imagePath = normalizeWarehouseCanonImagePath(cardPrint?.image_path);
  if (!cardPrint || !isIdentityCardImageSource(cardPrint.image_source) || !imagePath) {
    const { data: cardPrinting, error: cardPrintingError } = await admin
      .from("card_printings")
      .select("printing_gv_id,image_source,image_path")
      .eq("printing_gv_id", gvId)
      .maybeSingle();

    imagePath = normalizeWarehouseCanonImagePath(cardPrinting?.image_path);
    if (
      cardPrintingError ||
      !cardPrinting ||
      !isIdentityCardImageSource(cardPrinting.image_source) ||
      !imagePath
    ) {
      return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
    }
  }

  const { data, error } = await admin.storage
    .from(VAULT_INSTANCE_MEDIA_BUCKET)
    .download(imagePath);

  if (error || !data) {
    return NextResponse.json({ error: "Image unavailable." }, { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": data.type || getContentTypeForPath(imagePath),
    },
  });
}
