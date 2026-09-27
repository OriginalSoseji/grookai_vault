import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { createServerAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try { const client = await teamClient(request); const store = teamUuid((await context.params).storeId);
    const { data: path, error } = await client.rpc("vendor_store_team_media_path_v1", { p_store: store, p_kind: request.nextUrl.searchParams.get("kind") });
    if (error || !path) throw error ?? new Error("Unavailable");
    const image = await client.storage.from("vendor-store-media").download(path);
    if (image.error || !image.data) throw image.error;
    return new NextResponse(await image.data.arrayBuffer(), { headers: { ...STORE_NO_STORE, "content-type": image.data.type, "content-security-policy": "default-src 'none'" } });
  } catch { return teamJson({ error: "Image unavailable" }, 404); }
}
export async function POST(request: NextRequest, context: Context) {
  try { const client = await teamClient(request, true); const store = teamUuid((await context.params).storeId);
    const { error: accessError } = await client.rpc("vendor_store_team_media_path_v1", { p_store: store, p_kind: "logo" });
    if (accessError) throw accessError;
    if (!request.body) throw new Error("Missing image");
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length;
      if (size > 6 * 1024 * 1024) { await reader.cancel(); throw new Error("Image too large"); } chunks.push(value); }
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
    const file = form.get("file"), kind = form.get("kind");
    if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024 || !["logo", "banner"].includes(String(kind))) throw new Error("Invalid image");
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const extension = png ? "png" : jpg ? "jpg" : webp ? "webp" : null;
    if (!extension) throw new Error("Unsupported image");
    const { error: budgetError } = await client.rpc("vendor_store_team_upload_budget_v1", { p_store: store });
    if (budgetError) throw budgetError;
    const path = `${store}/${kind}/${randomUUID()}.${extension}`;
    // Only this validated, authorized server path can upload manager media.
    const storage = createServerAdminClient().storage.from("vendor-store-media");
    const upload = await storage.upload(path, bytes, { contentType: png ? "image/png" : jpg ? "image/jpeg" : "image/webp", upsert: false });
    if (upload.error) throw upload.error;
    const attach = await client.rpc("vendor_store_team_media_v1", { p_store: store, p_kind: kind, p_path: path });
    if (attach.error) { await storage.remove([path]); throw attach.error; }
    return teamJson({ ok: true });
  } catch (error) { return teamFailure(error); }
}
