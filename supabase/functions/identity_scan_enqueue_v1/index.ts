// Pattern copied from: supabase/functions/scan-upload-plan/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type EnqueueBody = {
  snapshot_id?: string;
};

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
  let raw = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!raw) return null;
  raw = String(raw).trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
  return null;
}

function isUuid(v: string | undefined | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200 });
    }
    if (req.method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "server_misconfigured" });
    }

    const token = extractBearerToken(req);
    if (!token) return json(401, { error: "missing_bearer_token" });

    const body = (await req.json()) as EnqueueBody;
    const snapshotId = (body.snapshot_id ?? "").trim();
    if (!isUuid(snapshotId)) return json(400, { error: "invalid_snapshot_id" });

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid_jwt" });
    }
    const userId = userData.user.id;

    // Verify snapshot ownership + front image presence
    const { data: snap, error: snapErr } = await sb
      .from("condition_snapshots")
      .select("id, user_id, images")
      .eq("id", snapshotId)
      .eq("user_id", userId)
      .maybeSingle();

    if (snapErr) return json(500, { error: "snapshot_lookup_failed", detail: snapErr.message });
    if (!snap) return json(404, { error: "snapshot_not_found" });

    const images = snap.images ?? {};
    const hasFront =
      (images?.paths && typeof images.paths.front === "string" && images.paths.front.length > 0) ||
      (images?.front && typeof images.front === "string" && images.front.length > 0) ||
      (images?.front && typeof images.front.path === "string" && images.front.path.length > 0);
    if (!hasFront) {
      return json(400, { error: "missing_front_image" });
    }

    const insertPayload = {
      snapshot_id: snapshotId,
      signals: {},
      candidates: [],
      status: "pending",
      analysis_version: "v1",
    };

    const { data: inserted, error: insErr } = await sb
      .from("identity_scan_events")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      return json(500, { error: "enqueue_failed", detail: insErr?.message ?? "unknown" });
    }

    return json(200, { identity_scan_event_id: inserted.id, status: "pending" });
  } catch (e) {
    return json(500, { error: "internal_error", detail: String((e as Error)?.message ?? e) });
  }
});
