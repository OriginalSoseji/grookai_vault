import "server-only";
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createStorePublicClient, STORE_NO_STORE } from "./storefrontServer";
import type { CustomProductDetail } from "./storefrontTypes";
export type ProductSurface = "web" | "app" | "preview";
export async function readCustomProduct(
  slug: string,
  id: string,
  surface: ProductSurface,
): Promise<CustomProductDetail | null> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const client =
    surface === "web"
      ? createStorePublicClient()
      : await createServerComponentClient();
  if (surface !== "web" && !(await client.auth.getUser()).data.user)
    return null;
  const { data, error } = await client.rpc("vendor_store_custom_detail_v1", {
    p_slug: slug,
    p_product_id: id,
    p_surface: surface,
  });
  if (error) throw new Error("Product unavailable");
  return data as CustomProductDetail | null;
}
export async function customProductResponse(
  slug: string,
  id: string,
  surface: ProductSurface,
) {
  try {
    const data = await readCustomProduct(slug, id, surface);
    return data
      ? NextResponse.json(data, { headers: STORE_NO_STORE })
      : new NextResponse("Not found", { status: 404, headers: STORE_NO_STORE });
  } catch {
    return new NextResponse("Product unavailable", {
      status: 503,
      headers: STORE_NO_STORE,
    });
  }
}
export async function customProductMediaResponse(
  slug: string,
  id: string,
  photo: string,
  surface: ProductSurface,
) {
  const hidden = () =>
    new NextResponse("Not found", { status: 404, headers: STORE_NO_STORE });
  try {
    const detail = await readCustomProduct(slug, id, surface);
    if (!detail || !detail.product.photo_ids.includes(photo)) return hidden();
    const admin = createServerAdminClient();
    const { data: row } = await admin
      .from("vendor_store_custom_products")
      .select("photo_paths")
      .eq("id", id)
      .eq("store_id", detail.store.id)
      .single();
    const path = `${detail.store.id}/products/${id}/${photo}`;
    if (!row?.photo_paths?.includes(path)) return hidden();
    const { data, error } = await admin.storage
      .from("vendor-store-media")
      .download(path);
    if (error || !data) return hidden();
    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        ...STORE_NO_STORE,
        "content-type": data.type,
        "content-security-policy": "default-src 'none'",
      },
    });
  } catch {
    return hidden();
  }
}
