import { customProductMediaResponse } from "@/lib/stores/customProductServer";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: {
    params: Promise<{ slug: string; productId: string; photo: string }>;
  },
) {
  const p = await context.params;
  return customProductMediaResponse(p.slug, p.productId, p.photo, "app");
}
