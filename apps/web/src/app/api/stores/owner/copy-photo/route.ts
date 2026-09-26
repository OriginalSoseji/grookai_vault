import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { inventoryId } from "@/lib/stores/storeInventoryInput";
import type { StoreOwner } from "@/lib/stores/storefrontTypes";
import { buildVaultInstanceMediaStoragePath, isOwnedVaultInstanceMediaPath, VAULT_INSTANCE_MEDIA_BUCKET } from "@/lib/vaultInstanceMedia";
import { saveVaultItemInstanceMediaAction } from "@/lib/vault/saveVaultItemInstanceMediaAction";
import { saveVaultItemInstanceImageDisplayModeAction } from "@/lib/vault/saveVaultItemInstanceImageDisplayModeAction";
import { copyPhotoType, COPY_PHOTO_MAX_BYTES } from "@/lib/stores/storeCopyPhoto";

export const dynamic = "force-dynamic";
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: STORE_NO_STORE });
async function context(id: string, writing: boolean) {
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { response: reply("Sign in required", 401) } as const;
  const { data, error } = await client.rpc("vendor_store_owner_v1");
  const owner = data as StoreOwner | null;
  if (error || !owner?.store || (writing && (!owner.capabilities.store_app || !owner.rollout.app_enabled))) return { response: reply("Store access unavailable", 403) } as const;
  const { data: copy, error: copyError } = await client.from("vault_item_instances")
    .select("id,image_url,image_source,image_display_mode").eq("id", inventoryId(id)).eq("user_id", user.id).is("archived_at", null).maybeSingle();
  if (copyError || !copy) return { response: reply("Copy unavailable", 404) } as const;
  return { client, user, copy } as const;
}
export async function GET(request: NextRequest) {
  try {
    const auth = await context(request.nextUrl.searchParams.get("id") ?? "", false);
    if (auth.response) return auth.response;
    if (auth.copy.image_display_mode !== "uploaded" || auth.copy.image_source !== "user_photo" || !isOwnedVaultInstanceMediaPath(auth.user.id, auth.copy.id, "front", auth.copy.image_url)) return reply("Image unavailable", 404);
    const { data, error } = await auth.client.storage.from(VAULT_INSTANCE_MEDIA_BUCKET).download(auth.copy.image_url!, { cacheNonce: randomUUID() }, { cache: "no-store" });
    if (error || !data) return reply("Image unavailable", 404);
    return new NextResponse(await data.arrayBuffer(), { headers: { ...STORE_NO_STORE, "content-type": data.type, "content-security-policy": "default-src 'none'" } });
  } catch { return reply("Image unavailable", 404); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getSiteOrigin()) return reply("Invalid request origin", 403);
  try {
    const auth = await context(request.nextUrl.searchParams.get("id") ?? "", true);
    if (auth.response) return auth.response;
    if (request.nextUrl.searchParams.get("action") === "catalog") {
      const result = await saveVaultItemInstanceImageDisplayModeAction({ instanceId: auth.copy.id, imageDisplayMode: "canonical" });
      return result.ok ? NextResponse.json({ ok: true }, { headers: STORE_NO_STORE }) : reply(result.message, 400);
    }
    const maxBody = COPY_PHOTO_MAX_BYTES + 64 * 1024;
    if (!request.body || Number(request.headers.get("content-length") ?? 0) > maxBody) return reply("Choose an image up to 4 MB", 413);
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBody) { await reader.cancel(); return reply("Choose an image up to 4 MB", 413); }
      chunks.push(value);
    }
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > COPY_PHOTO_MAX_BYTES) return reply("Choose an image up to 4 MB", 400);
    const bytes = new Uint8Array(await file.arrayBuffer()), contentType = copyPhotoType(bytes);
    if (!contentType) return reply("Choose a JPEG, PNG or WebP image", 400);
    // The object path is derived only from the authenticated active owner and exact copy.
    // Server upload supports replacement without expanding the existing Storage policies.
    const path = buildVaultInstanceMediaStoragePath(auth.user.id, auth.copy.id, "front");
    const { error } = await createServerAdminClient().storage.from(VAULT_INSTANCE_MEDIA_BUCKET).upload(path, bytes, { contentType, upsert: true, cacheControl: "0" });
    if (error) return reply("Photo could not be uploaded. Please try again.", 400);
    const attached = await saveVaultItemInstanceMediaAction({ instanceId: auth.copy.id, side: "front", storagePath: path });
    if (!attached.ok) return reply("Photo uploaded, but attachment could not be confirmed. Refresh this copy before retrying.", 409);
    return NextResponse.json({ ok: true }, { headers: STORE_NO_STORE });
  } catch { return reply("Photo could not be confirmed. Refresh this copy before retrying.", 400); }
}
