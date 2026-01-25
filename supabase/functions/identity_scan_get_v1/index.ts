// Pattern copied from: supabase/functions/scan-read/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { json, requireUser } from "../_shared/auth.ts";

function isUuid(v: string | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(Math.max(Math.trunc(val), min), max);
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
    if (req.method !== "GET") return json(405, { error: "method_not_allowed" });

    let sb, userId;
    try {
      const auth = await requireUser(req);
      sb = auth.sb;
      userId = auth.userId;
    } catch (err) {
      if (err?.code === "missing_bearer_token") return json(401, { error: "missing_bearer_token" });
      if (err?.code === "invalid_jwt") return json(401, { error: "invalid_jwt" });
      if (err?.code === "server_misconfigured") return json(500, { error: "server_misconfigured" });
      throw err;
    }

    const url = new URL(req.url);
    const eventIdParam = url.searchParams.get("event_id");
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const eventId = isUuid(eventIdParam) ? eventIdParam : null;
    const limit = clampInt(Number(limitParam ?? 50), 1, 200);
    const offset = Math.max(0, Math.trunc(Number(offsetParam ?? 0) || 0));

    if (eventId) {
      const { data, error } = await sb
        .from("identity_scan_events")
        .select("id,snapshot_id,status,error,analysis_version,created_at,signals,candidates")
        .eq("id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return json(500, { error: "fetch_failed", detail: error.message });
      if (!data) return json(404, { error: "not_found" });
      return json(200, { event: data });
    }

    const { data, error } = await sb
      .from("identity_scan_events")
      .select("id,snapshot_id,status,error,analysis_version,created_at,signals,candidates")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return json(500, { error: "fetch_failed", detail: error.message });
    return json(200, { events: data ?? [] });
  } catch (e) {
    return json(500, { error: "internal_error", detail: String((e as Error)?.message ?? e) });
  }
});
