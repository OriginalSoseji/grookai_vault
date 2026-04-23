import { NextResponse } from "next/server";
import { getPublicSetCards } from "@/lib/publicSets";

export const revalidate = 300;

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
    const items = await getPublicSetCards(setCode, offset, limit);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ items: [], error: "Failed to load more cards." }, { status: 500 });
  }
}
