import { NextRequest, NextResponse } from "next/server";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";

function parseLimit(value: string | null) {
  if (!value) {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  if (!query) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing q",
      },
      { status: 400 },
    );
  }

  try {
    const resolved = await resolveQueryWithMeta(query, {
      mode: "ranked",
      sortMode: "relevance",
      exactSetCode: "",
    });

    const rows = resolved.rows.slice(0, limit).map((row) => ({
      id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      number_plain: row.number,
      rarity: row.rarity ?? null,
      set_code: row.set_code ?? null,
      image_url: row.image_url ?? null,
      set: {
        name: row.set_name ?? null,
        code: row.set_code ?? null,
      },
    }));

    return NextResponse.json({
      ok: true,
      query,
      rows,
      meta: resolved.meta,
      source: "web_ranked_resolver_v1",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resolver request failed.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
