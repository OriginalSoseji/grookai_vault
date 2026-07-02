import {
  getPublicCardSitemapPageCount,
  getSitemapOrigin,
  sitemapIndexResponse,
  SITEMAP_REVALIDATE_SECONDS,
} from "@/lib/seo/sitemaps";

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export async function GET() {
  const origin = getSitemapOrigin();
  const cardPageCount = await getPublicCardSitemapPageCount();
  const now = new Date().toISOString();

  return sitemapIndexResponse([
    { loc: `${origin}/sitemaps/static/sitemap.xml`, lastmod: now },
    { loc: `${origin}/sitemaps/sets/sitemap.xml`, lastmod: now },
    { loc: `${origin}/sitemaps/profiles/sitemap.xml`, lastmod: now },
    ...Array.from({ length: cardPageCount }, (_, index) => ({
      loc: `${origin}/sitemaps/cards/${index}/sitemap.xml`,
      lastmod: now,
    })),
  ]);
}
