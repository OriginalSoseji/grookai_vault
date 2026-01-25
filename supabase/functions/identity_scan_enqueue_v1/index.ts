// Pattern copied from: supabase/functions/scan-upload-plan/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { json, requireUser } from "../_shared/auth.ts";

type EnqueueBody = {
  snapshot_id?: string;
};

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

    const body = (await req.json()) as EnqueueBody;
    const snapshotId = (body.snapshot_id ?? "").trim();
    if (!isUuid(snapshotId)) return json(400, { error: "invalid_snapshot_id" });

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
