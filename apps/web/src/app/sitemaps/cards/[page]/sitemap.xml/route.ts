import { NextResponse } from "next/server";
import {
  getCardSitemapEntries,
  getPublicCardSitemapPageCount,
  urlSetResponse,
  SITEMAP_REVALIDATE_SECONDS,
} from "@/lib/seo/sitemaps";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export async function GET(
  _request: Request,
  { params }: { params: { page: string } },
) {
  const pageIndex = Number(params.page);
  const pageCount = await getPublicCardSitemapPageCount();

  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
    return new NextResponse("Not found", { status: 404 });
  }

  return urlSetResponse(await getCardSitemapEntries(pageIndex));
}
