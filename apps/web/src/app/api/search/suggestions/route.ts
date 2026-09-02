import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";

export const revalidate = 60;

const MAX_SUGGESTIONS = 12;

type CardPrintSuggestionRow = {
  id: string;
  gv_id: string;
  name: string;
  number: string;
  rarity?: string | null;
  image_url?: string | null;
  representative_image_url?: string | null;
  image_status?: string | null;
  image_source?: string | null;
  set_code?: string | null;
  printed_set_abbrev?: string | null;
};

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), MAX_SUGGESTIONS)
    : 6;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const number = request.nextUrl.searchParams.get("number")?.trim() || null;
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  if (query.length < 2) {
    return NextResponse.json({ ok: true, rows: [], source: "catalog_search_suggestions_v1" });
  }

  try {
    const supabase = await createServerComponentClient();
    const safeQuery = query.replace(/[%_]/g, "").trim();
    let cardQuery = supabase
      .from("card_prints")
      .select(
        "id,gv_id,name,number,rarity,image_url,representative_image_url,image_status,image_source,set_code,printed_set_abbrev",
      )
      .ilike("name", `%${safeQuery}%`)
      .limit(Math.min(limit * 3, 30));
    if (number) {
      const normalizedNumber = number.trim().replace(/^#/, "").split("/", 1)[0];
      const digits = normalizedNumber.replace(/\D/g, "");
      const numericDigits = digits
        ? String(Number.parseInt(digits, 10))
        : null;
      const numberCandidates = Array.from(
        new Set(
          [
            normalizedNumber,
            digits,
            numericDigits,
            digits ? digits.padStart(3, "0") : null,
          ].filter((value): value is string => Boolean(value)),
        ),
      );
      cardQuery = cardQuery.in("number", numberCandidates);
    }

    const { data: cardRows, error: cardError } = await cardQuery;
    if (cardError) throw new Error(cardError.message);
    const setCodes = Array.from(
      new Set(
        ((cardRows ?? []) as CardPrintSuggestionRow[])
          .map((row) => row.set_code?.trim())
          .filter((code): code is string => Boolean(code)),
      ),
    );
    const setNameByCode = new Map<string, string>();
    if (setCodes.length > 0) {
      const { data: setRows, error: setError } = await supabase
        .from("sets")
        .select("code,name")
        .in("code", setCodes);
      if (setError) throw new Error(setError.message);
      for (const row of setRows ?? []) {
        if (row.code && row.name) setNameByCode.set(row.code, row.name);
      }
    }

    const rows = ((cardRows ?? []) as CardPrintSuggestionRow[])
      .slice(0, limit)
      .map((row) => ({
        ...row,
        set_name: row.set_code ? setNameByCode.get(row.set_code) : undefined,
        display_image_url: `/api/canon/cards/${encodeURIComponent(row.gv_id)}/image`,
      }));

    return NextResponse.json(
      { ok: true, rows, source: "catalog_search_suggestions_v1" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.warn("[search-suggestions] canonical lookup unavailable", error);
    return NextResponse.json(
      { ok: false, rows: [], error: "Search suggestions are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
