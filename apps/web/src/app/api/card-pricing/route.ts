import { NextRequest, NextResponse } from "next/server";
import { getCardPricingUiByCardPrintId } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const cookieSink = new NextResponse(null);
  const client = createRouteHandlerClient(request, cookieSink);
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
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

  return NextResponse.json(
    {
      ok: true,
      pricing: await getCardPricingUiByCardPrintId(cardPrintId),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
