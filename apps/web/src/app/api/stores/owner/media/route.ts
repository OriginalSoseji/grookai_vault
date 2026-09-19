import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import type { StoreOwner } from "@/lib/stores/storefrontTypes";

export const dynamic = "force-dynamic";
const response = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: STORE_NO_STORE });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function owner() {
  const client = await createServerComponentClient();
  if (!(await client.auth.getUser()).data.user) return null;
  const { data, error } = await client.rpc("vendor_store_owner_v1");
  if (error) throw error;
  return { client, owner: data as StoreOwner };
}

// Owner draft media never receives a public URL; authorization and attachment
// are checked on each request, using the owner's RLS client, not a service grant.
export async function GET(request: NextRequest) {
  try {
    const auth = await owner();
    if (!auth) return response("Sign in required", 401);
    const store = auth.owner.store;
    if (!store) return response("Image unavailable", 404);
    const productId = request.nextUrl.searchParams.get("product");
    let path: string | null = null;
    if (productId) {
      if (!uuid.test(productId)) return response("Image unavailable", 404);
      const { data, error } = await auth.client.rpc("vendor_store_custom_owner_v1", { p_product_id: productId });
      const product = data?.products?.[0];
      const photo = request.nextUrl.searchParams.get("photo") ?? "";
      if (error || !product || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(photo)) return response("Image unavailable", 404);
      const candidate = `${store.id}/products/${productId}/${photo}`;
      if (product.photo_paths.includes(candidate)) path = candidate;
    } else {
      const kind = request.nextUrl.searchParams.get("kind");
      path = kind === "logo" ? store.logo_path : kind === "banner" ? store.banner_path : null;
    }
    if (!path) return response("Image unavailable", 404);
    const { data, error } = await auth.client.storage.from("vendor-store-media").download(path);
    if (error || !data) return response("Image unavailable", 404);
    return new NextResponse(await data.arrayBuffer(), { headers: { ...STORE_NO_STORE, "content-type": data.type, "content-security-policy": "default-src 'none'" } });
  } catch { return response("Image unavailable", 404); }
}

export async function POST(request: NextRequest) {
  // This upload route is browser-only. Native uses its existing private Storage path.
  if (request.headers.get("origin") !== getSiteOrigin()) return response("Invalid request origin", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) return response("Choose an image up to 5 MB", 413);
  try {
    const auth = await owner();
    if (!auth) return response("Sign in required", 401);
    const { store, capabilities, rollout } = auth.owner;
    if (!store || !capabilities.store_app || !rollout.app_enabled) return response("Store access unavailable", 403);
    // Bound actual bytes as well as Content-Length, including chunked requests.
    if (!request.body) return response("Choose an image", 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 6 * 1024 * 1024) { await reader.cancel(); return response("Choose an image up to 5 MB", 413); }
      chunks.push(value);
    }
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
    const file = form.get("file"), kind = form.get("kind"), productId = form.get("product");
    if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) return response("Choose an image up to 5 MB", 400);
    let prefix: string;
    if (kind === "product") {
      if (typeof productId !== "string" || !uuid.test(productId) || !rollout.custom_enabled) return response("Product unavailable", 403);
      const { data, error } = await auth.client.rpc("vendor_store_custom_owner_v1", { p_product_id: productId });
      if (error || !data?.products?.[0] || data.products[0].archived_at) return response("Product unavailable", 404);
      prefix = `${store.id}/products/${productId}`;
    } else if (kind === "logo" || kind === "banner") prefix = `${store.id}/${kind}`;
    else return response("Invalid image type", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const extension = png ? "png" : jpg ? "jpg" : webp ? "webp" : null;
    if (!extension) return response("Choose a JPEG, PNG or WebP image", 400);
    const path = `${prefix}/${randomUUID()}.${extension}`;
    const { error } = await auth.client.storage.from("vendor-store-media").upload(path, bytes, { contentType: png ? "image/png" : jpg ? "image/jpeg" : "image/webp", upsert: false });
    if (error) return response("Image could not be uploaded", 400);
    // Attachment remains a separate governed, version-checked mutation.
    return NextResponse.json({ path }, { headers: STORE_NO_STORE });
  } catch { return response("Image could not be uploaded", 400); }
}
