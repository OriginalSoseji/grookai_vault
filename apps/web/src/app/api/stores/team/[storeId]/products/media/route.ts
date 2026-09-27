import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { createServerAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request), store = teamUuid((await context.params).storeId), product = teamUuid(request.nextUrl.searchParams.get("product") ?? "");
    const photo = request.nextUrl.searchParams.get("photo");
    if (!photo || !/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(photo)) throw new Error("Image unavailable");
    const path = `${store}/products/${product}/${photo}`;
    const access = await client.rpc("vendor_store_team_product_media_v1", { p_store: store, p_product: product, p_path: path });
    if (access.error) throw access.error;
    const image = await createServerAdminClient().storage.from("vendor-store-media").download(path);
    if (image.error || !image.data) throw image.error;
    return new NextResponse(await image.data.arrayBuffer(), { headers: { ...STORE_NO_STORE, "content-type": image.data.type, "content-security-policy": "default-src 'none'" } });
  } catch { return teamJson({ error: "Image unavailable" }, 404); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request, true), store = teamUuid((await context.params).storeId), product = teamUuid(request.nextUrl.searchParams.get("product") ?? "");
    const expected = Number(request.nextUrl.searchParams.get("version"));
    if (!Number.isSafeInteger(expected) || expected < 1) throw new Error("Invalid product version");
    const access = await client.rpc("vendor_store_team_product_media_v1", { p_store: store, p_product: product });
    if (access.error) throw access.error;
    const state = access.data as { version: number; photo_paths: string[] };
    if (state.version !== expected) throw { code: "PT409", message: "Product changed. Reload before uploading." };
    if (state.photo_paths.length >= 8) throw new Error("Up to eight photos per product");
    if (!request.body) throw new Error("Missing image");
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length;
      if (size > 6 * 1024 * 1024) { await reader.cancel(); throw new Error("Image too large"); } chunks.push(value); }
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose an image up to 5 MB");
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const extension = png ? "png" : jpg ? "jpg" : webp ? "webp" : null;
    if (!extension) throw new Error("Unsupported image");
    const budget = await client.rpc("vendor_store_team_product_media_v1", { p_store: store, p_product: product, p_upload: true });
    if (budget.error) throw budget.error;
    const path = `${store}/products/${product}/${randomUUID()}.${extension}`, storage = createServerAdminClient().storage.from("vendor-store-media");
    const upload = await storage.upload(path, bytes, { contentType: png ? "image/png" : jpg ? "image/jpeg" : "image/webp", upsert: false });
    if (upload.error) throw upload.error;
    const attach = await client.rpc("vendor_store_team_product_v1", { p_store: store, p_request: null, p_product_id: product,
      p_expected_version: expected, p_action: "photos", p_data: { paths: [...state.photo_paths, path] } });
    if (attach.error) { await storage.remove([path]); throw attach.error; }
    return teamJson(attach.data);
  } catch (error) { return teamFailure(error); }
}
