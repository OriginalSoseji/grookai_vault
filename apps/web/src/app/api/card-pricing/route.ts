import { NextRequest, NextResponse } from "next/server";
import {
  getCardPricingUiRowsByCardPrintIdWithClient,
} from "@/lib/pricing/getCardPricingUiByCardPrintId";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractBearerToken(request: NextRequest) {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization") ??
    "";
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export async function GET(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const adminClient = createServerAdminClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const bearerToken = extractBearerToken(request);

  let authenticatedUserId = user?.id ?? null;
  if (!authenticatedUserId && bearerToken) {
    const {
      data: { user: bearerUser },
    } = await adminClient.auth.getUser(bearerToken);
    authenticatedUserId = bearerUser?.id ?? null;
  }

  if (!authenticatedUserId) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const cardPrintId = (request.nextUrl.searchParams.get("card_print_id") ?? "").trim();
  if (!cardPrintId) {
    return NextResponse.json(
      { ok: false, error: "Missing card_print_id." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const pricingRecords = await getCardPricingUiRowsByCardPrintIdWithClient(adminClient, cardPrintId);

  return NextResponse.json(
    {
      ok: true,
      pricing: pricingRecords.find((record) => record.pricing_scope === "parent") ?? pricingRecords[0] ?? null,
      pricingRecords,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
