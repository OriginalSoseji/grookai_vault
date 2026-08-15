import {
  getPublicCardSitemapPageCount,
  getSitemapOrigin,
  sitemapIndexResponse,
} from "@/lib/seo/sitemaps";

export const revalidate = 300;

export async function GET() {
  const origin = getSitemapOrigin();
  let cardPageCount = 1;
  try {
    cardPageCount = await getPublicCardSitemapPageCount();
  } catch (error) {
    console.error(
      "[sitemap-index] Using the bounded card sitemap fallback after count lookup failure.",
      error instanceof Error ? error.message : "unknown_error",
    );
  }
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
