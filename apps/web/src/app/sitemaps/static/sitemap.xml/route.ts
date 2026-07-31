import {
  getStaticSitemapEntries,
  urlSetResponse,
} from "@/lib/seo/sitemaps";

export const revalidate = 300;

export async function GET() {
  return urlSetResponse(getStaticSitemapEntries());
}
