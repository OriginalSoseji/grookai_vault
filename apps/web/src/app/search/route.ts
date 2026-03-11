import { NextRequest, NextResponse } from "next/server";
import { resolvePublicSearch } from "@/lib/publicSearchResolver";

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

  return nextUrl;
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const result = await resolvePublicSearch(rawQuery);

    if (result.kind === "card") {
      return NextResponse.redirect(new URL(`/card/${encodeURIComponent(result.gv_id)}`, request.url));
    }

    return NextResponse.redirect(buildExploreUrl(request, result.query));
  } catch {
    return NextResponse.redirect(buildExploreUrl(request, rawQuery.trim()));
  }
}
