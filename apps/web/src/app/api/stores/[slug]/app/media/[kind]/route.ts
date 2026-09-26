import { storeMediaResponse } from "@/lib/stores/storeMediaServer";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; kind: string }> },
) {
  const { slug, kind } = await context.params;
  return storeMediaResponse(slug, kind, "app");
}
