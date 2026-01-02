import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ code: 500, message: "Server misconfigured: missing Supabase env vars" }),
        { status: 500 },
      );
    }

    const body = (await req.json()) as Partial<ReqBody>;
    const vaultItemId = (body.vault_item_id ?? "").trim();
    const slots = Array.isArray(body.slots) ? body.slots.map((s) => String(s).trim()) : [];
    const debug = body.debug === true;

    if (debug) {
      const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
      const apikey = req.headers.get("apikey") ?? req.headers.get("x-apikey") ?? "";
      const token = extractBearerToken(req);
      const hasAuth = authHeader.length > 0;
      const bearerExtracted = !!token;
      const keys: string[] = [];
      for (const [k] of req.headers.entries()) {
        if (["authorization", "apikey", "x-apikey"].includes(k.toLowerCase())) {
          keys.push(k);
        }
      }
      return json(200, {
        debug: true,
        has_authorization_header: hasAuth,
        authorization_header_prefix: authHeader.slice(0, 20),
        bearer_extracted: bearerExtracted,
        token_len: token?.length ?? 0,
        token_prefix: token ? token.slice(0, 12) : null,
        token_suffix: token ? token.slice(-6) : null,
        token_has_whitespace: token ? /\s/.test(token) : false,
        has_apikey: apikey.length > 0,
        apikey_prefix: apikey.slice(0, 8),
        auth_header_keys: keys,
        env_has_supabase_url: !!supabaseUrl,
        env_has_service_role_key: !!serviceRoleKey,
        supabase_url_prefix: supabaseUrl ? supabaseUrl.slice(0, 24) : null,
      });
    }

    const token = extractBearerToken(req);
    if (!token) return json(401, { error: "missing_bearer_token" });

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({
          code: 401,
          message: "Invalid JWT",
          detail: userErr?.message ?? null,
          token_prefix: token.slice(0, 12),
          token_len: token.length,
        }),
        { status: 401 },
      );
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
          details: error?.message ?? "unknown",
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
    return json(500, { error: "internal_error", details: String((e as Error)?.message ?? e) });
  }
});
