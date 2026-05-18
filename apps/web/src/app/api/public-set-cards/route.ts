import { NextResponse } from "next/server";
import { getPublicSetCards } from "@/lib/publicSets";
import { applyOwnedPrintingCountsToSetCards } from "@/lib/publicSetsOwnership";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setCode = searchParams.get("set_code");

  if (!setCode) {
    return NextResponse.json({ items: [], error: "Missing set_code." }, { status: 400 });
  }

  const offsetInput = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limitInput = Number.parseInt(searchParams.get("limit") ?? "36", 10);

  const offset = Number.isFinite(offsetInput) && offsetInput > 0 ? offsetInput : 0;
  const limit = Number.isFinite(limitInput) && limitInput > 0 ? Math.min(limitInput, 48) : 36;

  try {
    const supabase = createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const items = await applyOwnedPrintingCountsToSetCards(
      await getPublicSetCards(setCode, offset, limit),
      user?.id ?? null,
    );
    const json = NextResponse.json({ items });
    json.headers.set("Cache-Control", user ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=600");
    return json;
  } catch {
    return NextResponse.json({ items: [], error: "Failed to load more cards." }, { status: 500 });
  }
}
