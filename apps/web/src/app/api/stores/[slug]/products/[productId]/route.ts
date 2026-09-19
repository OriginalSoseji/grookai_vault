import { customProductResponse } from "@/lib/stores/customProductServer";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; productId: string }> },
) {
  const p = await context.params;
  return customProductResponse(p.slug, p.productId, "web");
}
