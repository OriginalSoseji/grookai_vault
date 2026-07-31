import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

type ReqBody = {
  vault_item_id: string;
  slots: string[];
};

const ALLOWED_SLOTS = new Set([
  "front",
  "back",
  "corner_tl",
  "corner_tr",
  "corner_bl",
  "corner_br",
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extractBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "server_misconfigured" });
    }

    const body = (await req.json()) as Partial<ReqBody>;
    const vaultItemId = (body.vault_item_id ?? "").trim();
    const slots = Array.isArray(body.slots) ? body.slots.map((s) => String(s).trim()) : [];

    const token = extractBearerToken(req);
    if (!token) return json(401, { error: "missing_bearer_token" });

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid_jwt" });
    }
    const userId = userData.user.id;

    if (!vaultItemId) return json(400, { error: "missing_vault_item_id" });
    if (slots.length === 0) return json(400, { error: "missing_slots" });

    // Validate slots and required front/back
    for (const s of slots) {
      if (!ALLOWED_SLOTS.has(s)) return json(400, { error: "invalid_slot", slot: s });
    }
    if (!slots.includes("front") || !slots.includes("back")) {
      return json(400, { error: "front_and_back_required" });
    }

    // Reserve snapshot_id server-side so the path is stable
    const snapshotId = crypto.randomUUID();

    const uploads: Record<string, { path: string; signed_url: string }> = {};

    for (const slot of slots) {
      const objectPath = `${userId}/${vaultItemId}/${snapshotId}/${slot}.jpg`;

      // Signed upload URL is created under the caller's JWT.
      // RLS policy must allow INSERT to bucket_id='condition-scans' and name LIKE '{uid}/%'.
      const { data, error } = await sb.storage
        .from("condition-scans")
        .createSignedUploadUrl(objectPath);

      if (error || !data?.signedUrl) {
        return json(403, {
          error: "signed_upload_denied",
          slot,
        });
      }

      uploads[slot] = { path: objectPath, signed_url: data.signedUrl };
    }

    return json(200, {
      snapshot_id: snapshotId,
      bucket: "condition-scans",
      uploads,
      notes: {
        content_type: "image/jpeg",
        method: "PUT",
      },
    });
  } catch (e) {
    console.error("[scan-upload-plan] request failed", e);
    return json(500, { error: "internal_error" });
  }
});
