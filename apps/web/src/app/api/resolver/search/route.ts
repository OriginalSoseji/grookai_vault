import { NextRequest, NextResponse } from "next/server";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";

function parseSortMode(value: string | null) {
  if (value === "newest" || value === "oldest") {
    return value;
  }

  return "relevance";
}

function normalizeSetCode(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function parseReleaseYear(value: string | null) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeIllustrator(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const exactSetCode = normalizeSetCode(request.nextUrl.searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(request.nextUrl.searchParams.get("year"));
  const exactIllustrator = normalizeIllustrator(request.nextUrl.searchParams.get("illustrator"));
  const sortMode = parseSortMode(request.nextUrl.searchParams.get("sort"));

  if (!query && !exactSetCode && !exactReleaseYear && !exactIllustrator) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing search criteria",
      },
      { status: 400 },
    );
  }

  try {
    const resolved = await resolveQueryWithMeta(rawQuery, {
      mode: "ranked",
      sortMode,
      exactSetCode,
      exactReleaseYear,
      exactIllustrator,
    });

    return NextResponse.json({
      ok: true,
      query,
      rows: resolved.rows,
      meta: resolved.meta,
      source: "web_ranked_resolver_v2",
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
