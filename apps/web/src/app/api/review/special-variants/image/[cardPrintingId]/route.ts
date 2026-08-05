import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import specialVariantManifest from "@/data/review/specialVariantPrintingEvidenceV1.json";
import { resolveVisualSearchReviewerAccess } from "@/lib/review/visualSearchReviewerAccess";
import type { SpecialVariantReviewManifest } from "@/lib/review/specialVariantReviewTypes";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const manifest = specialVariantManifest as SpecialVariantReviewManifest;
const allowedPrefix = "warehouse-derived/special-variant-printing-evidence-v1/";

function privateHeaders(contentType?: string) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": contentType ?? "text/plain; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    Vary: "Cookie",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardPrintingId: string }> },
) {
  const cookieSink = new NextResponse(null);
  const supabase = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Sign in required.", { status: 401, headers: privateHeaders() });
  }

  const access = await resolveVisualSearchReviewerAccess(user);
  if (!access.allowed) {
    return new NextResponse("Not found.", { status: 404, headers: privateHeaders() });
  }

  const { cardPrintingId } = await params;
  const row = manifest.rows.find((candidate) => candidate.card_printing_id === cardPrintingId);
  if (
    !row ||
    row.storage_bucket !== "user-card-images" ||
    !row.storage_path.startsWith(`${allowedPrefix}${row.card_printing_id}/`) ||
    !row.storage_path.includes(row.source_image.sha256)
  ) {
    return new NextResponse("Not found.", { status: 404, headers: privateHeaders() });
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin.storage.from(row.storage_bucket).download(row.storage_path);
  if (error || !data) {
    return new NextResponse("Image unavailable.", { status: 503, headers: privateHeaders() });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const imageSha256 = createHash("sha256").update(bytes).digest("hex");
  if (
    bytes.byteLength !== row.source_image.size_bytes ||
    imageSha256 !== row.source_image.sha256
  ) {
    return new NextResponse("Image integrity mismatch.", { status: 503, headers: privateHeaders() });
  }

  const response = new NextResponse(bytes, {
    status: 200,
    headers: {
      ...privateHeaders(row.source_image.content_type),
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${row.card_printing_id}.${row.source_image.format}"`,
      "X-Grookai-Evidence-Id": row.evidence_id,
      "X-Grookai-Image-Sha256": row.source_image.sha256,
    },
  });
  for (const cookie of cookieSink.cookies.getAll()) response.cookies.set(cookie);
  return response;
}
