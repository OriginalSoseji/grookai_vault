import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { createServerComponentClient } from "@/lib/supabase/server";
import { suggestionRequestIsPrivate, suggestionResponseHeaders } from "@/lib/search/suggestionAccess.mjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const safeQuery = query.replace(/[%_]/g, "").trim();
  const requestedGame = request.nextUrl.searchParams.get("game")?.trim().toLowerCase() || "all";
  const supportedGames = ["pokemon", "mtg", "one_piece"];
  if (requestedGame !== "all" && !supportedGames.includes(requestedGame)) {
    return NextResponse.json({ ok: false, rows: [], error: "Unsupported game." }, { status: 400 });
  }
  if (safeQuery.length < 2) {
    return NextResponse.json({ ok: true, rows: [], source: "catalog_search_suggestions_v1" });
  }

  try {
    const privateRequest = suggestionRequestIsPrivate(request.headers, request.cookies.getAll());
    // Signed-in catalogs must keep their viewer context. Shared caching is only
    // allowed when the request contains neither an auth cookie nor a bearer.
    const supabase = privateRequest ? await createServerComponentClient() : createPublicServerClient(60);
    const games = requestedGame === "all" ? supportedGames : [requestedGame];
    const pages = await Promise.all(games.map(async (game) => {
      const { data, error } = await supabase.rpc("search_game_card_prints_v4", {
        game_code_in: game, q: safeQuery.slice(0, 160), set_code_in: null,
        number_in: number?.replace(/^#/, "").split("/", 1)[0] || null,
        illustrator_in: null, language_scope_in: "all", limit_in: limit, offset_in: 0,
      }).abortSignal(AbortSignal.timeout(3500));
      if (error) throw new Error(error.message);
      return (data ?? []) as CardPrintSuggestionRow[];
    }));
    const cardRows = Array.from(new Map(pages.flat().map(row => [row.id, row])).values())
      .sort((a, b) => {
        const exact = (row: CardPrintSuggestionRow) => row.name.toLowerCase() === safeQuery.toLowerCase() ? 0 : 1;
        return exact(a) - exact(b) || a.name.localeCompare(b.name) || a.gv_id.localeCompare(b.gv_id);
      }).slice(0, limit);
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
        headers: suggestionResponseHeaders(privateRequest),
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
