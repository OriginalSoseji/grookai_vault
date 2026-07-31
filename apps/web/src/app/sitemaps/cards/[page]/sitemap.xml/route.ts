import { NextResponse } from "next/server";
import {
  getCardSitemapEntries,
  getPublicCardSitemapPageCount,
  urlSetResponse,
} from "@/lib/seo/sitemaps";

export const revalidate = 300;

export async function GET(_request: Request, props: { params: Promise<{ page: string }> }) {
  const params = await props.params;
  const pageIndex = Number(params.page);
  const pageCount = await getPublicCardSitemapPageCount();

  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
    return new NextResponse("Not found", { status: 404 });
  }

  return urlSetResponse(await getCardSitemapEntries(pageIndex));
}
