import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getExploreRowsForLanguageScopedTextSearch } from "@/lib/explore/getExploreRows";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";

export async function GET(request: NextRequest) {
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  const reply = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!user) return reply({ error: "Sign in required." }, 401);
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return reply({ items: [] });
  try {
    const rows =
      (await getExploreRowsForLanguageScopedTextSearch(q, "all", "relevance"))
        .slice(0, 12);
    const finishes = await getPublicCardPrintingOptions(
      client,
      rows.map((row) => row.id),
    );
    return reply({
      items: rows.map((row) => ({
        cardPrintId: row.id,
        gvId: row.gv_id,
        name: row.name,
        context: `${row.set_name ?? row.set_code} · ${row.number}`,
        imageUrl: row.display_image_url ?? row.image_url,
        finishes: finishes.filter((finish) => finish.card_print_id === row.id)
          .map((finish) => ({
            id: finish.id,
            label: finish.finish_label ?? finish.finish_key,
          })),
      })),
    });
  } catch {
    return reply({ error: "Card search is temporarily unavailable." }, 503);
  }
}
