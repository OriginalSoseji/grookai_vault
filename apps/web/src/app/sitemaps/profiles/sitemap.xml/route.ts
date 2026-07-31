import {
  getPublicProfileSitemapEntries,
  urlSetResponse,
} from "@/lib/seo/sitemaps";

export const revalidate = 300;

export async function GET() {
  return urlSetResponse(await getPublicProfileSitemapEntries());
}
