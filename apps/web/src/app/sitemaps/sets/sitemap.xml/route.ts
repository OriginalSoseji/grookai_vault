import {
  getSetSitemapEntries,
  urlSetResponse,
  SITEMAP_REVALIDATE_SECONDS,
} from "@/lib/seo/sitemaps";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export async function GET() {
  return urlSetResponse(await getSetSitemapEntries());
}
