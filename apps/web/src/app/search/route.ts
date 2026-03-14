import { NextRequest, NextResponse } from "next/server";
import { buildCompareCardsParam, normalizeCompareCardsParam } from "@/lib/compareCards";
import { resolvePublicSearch } from "@/lib/publicSearchResolver";

function applyCompareCardsParam(request: NextRequest, nextUrl: URL) {
  const compareCards = normalizeCompareCardsParam(request.nextUrl.searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);

  if (compareCardsParam) {
    nextUrl.searchParams.set("cards", compareCardsParam);
  }
}

function buildExploreUrl(request: NextRequest, query: string) {
  const nextUrl = new URL("/explore", request.url);

  if (query) {
    nextUrl.searchParams.set("q", query);
  }

  const view = request.nextUrl.searchParams.get("view");
  const sort = request.nextUrl.searchParams.get("sort");

  if (view) {
    nextUrl.searchParams.set("view", view);
  }

  if (sort) {
    nextUrl.searchParams.set("sort", sort);
  }

  applyCompareCardsParam(request, nextUrl);
  return nextUrl;
}

function buildSetsUrl(request: NextRequest, query: string) {
  const nextUrl = new URL("/sets", request.url);

  if (query) {
    nextUrl.searchParams.set("q", query);
  }

  applyCompareCardsParam(request, nextUrl);
  return nextUrl;
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const result = await resolvePublicSearch(rawQuery);

    if (result.kind === "card") {
      const nextUrl = new URL(`/card/${encodeURIComponent(result.gv_id)}`, request.url);
      applyCompareCardsParam(request, nextUrl);
      return NextResponse.redirect(nextUrl);
    }

    if (result.kind === "set") {
      const nextUrl = new URL(`/sets/${encodeURIComponent(result.set_code)}`, request.url);
      applyCompareCardsParam(request, nextUrl);
      return NextResponse.redirect(nextUrl);
    }

    if (result.kind === "sets") {
      return NextResponse.redirect(buildSetsUrl(request, result.query));
    }

    return NextResponse.redirect(buildExploreUrl(request, result.query));
  } catch {
    return NextResponse.redirect(buildExploreUrl(request, rawQuery.trim()));
  }
}
