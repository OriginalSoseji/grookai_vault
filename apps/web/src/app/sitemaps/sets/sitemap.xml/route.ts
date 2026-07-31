import {
  getSetSitemapEntries,
  urlSetResponse,
} from "@/lib/seo/sitemaps";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  return urlSetResponse(await getSetSitemapEntries());
}
