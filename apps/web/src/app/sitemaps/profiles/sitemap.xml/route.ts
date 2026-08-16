import {
  getPublicProfileSitemapEntries,
  urlSetResponse,
} from "@/lib/seo/sitemaps";

export const revalidate = 300;

export async function GET() {
  try {
    return urlSetResponse(await getPublicProfileSitemapEntries());
  } catch (error) {
    console.error(
      "[profile-sitemap] Returning an empty sitemap after profile lookup failure.",
      error instanceof Error ? error.message : "unknown_error",
    );
    return urlSetResponse([]);
  }
}
