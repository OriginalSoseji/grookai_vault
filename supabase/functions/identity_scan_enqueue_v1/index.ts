// Pattern copied from: supabase/functions/scan-upload-plan/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { json, requireUser } from "../_shared/auth.ts";

type EnqueueBody = {
  snapshot_id?: string;
  identity_snapshot_id?: string;
  snapshotId?: string;
};

function isUuid(v: string | undefined | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const xbear = req.headers.get("x-gv-bearer") ?? "";
    console.log(
      JSON.stringify(
        {
          stage: "auth_probe",
          has_auth: !!authHeader,
          auth_len: authHeader.length,
          auth_prefix: authHeader.slice(0, 20),
          has_xbear: !!xbear,
          xbear_len: xbear.length,
          xbear_prefix: xbear.slice(0, 20),
        },
        null,
        0,
      ),
    );
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200 });
    }
    if (req.method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }

    let userId;
    try {
      const auth = await requireUser(req);
      userId = auth.userId;
    } catch (err) {
      if (err?.code === "missing_bearer_token") return json(401, { error: "missing_bearer_token" });
      if (err?.code === "invalid_jwt") return json(401, { error: "invalid_jwt" });
      if (err?.code === "server_misconfigured") return json(500, { error: "server_misconfigured" });
      throw err;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "server_misconfigured" });
    }
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as EnqueueBody;
    const candidateId = (body.identity_snapshot_id ?? body.snapshot_id ?? body.snapshotId ?? "").trim();
    if (!candidateId) {
      return json(400, { error: "invalid_request" });
    }
    if (!isUuid(candidateId)) {
      return json(400, { error: "invalid_snapshot_id" });
    }

    let resolvedSnapshotId: string | null = null;
    let snapshotUserId: string | null = null;
    let images: any = null;
    let lookupTable = "condition_snapshots";

    const { data: identitySnap, error: identityErr } = await sb
      .from("identity_snapshots")
      .select("id, user_id, images")
      .eq("id", candidateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (identityErr) return json(500, { error: "snapshot_lookup_failed", detail: identityErr.message });
    if (identitySnap) {
      resolvedSnapshotId = identitySnap.id;
      snapshotUserId = identitySnap.user_id ?? null;
      images = identitySnap.images ?? {};
      lookupTable = "identity_snapshots";
    } else {
      const { data: snap, error: snapErr } = await sb
        .from("condition_snapshots")
        .select("id, user_id, images")
        .eq("id", candidateId)
        .eq("user_id", userId)
        .maybeSingle();
      if (snapErr) return json(500, { error: "snapshot_lookup_failed", detail: snapErr.message });
      if (!snap) return json(404, { error: "snapshot_not_found" });
      resolvedSnapshotId = snap.id;
      snapshotUserId = snap.user_id ?? null;
      images = snap.images ?? {};
      lookupTable = "condition_snapshots";
    }

    const hasFront =
      (images?.paths && typeof images.paths.front === "string" && images.paths.front.length > 0) ||
      (images?.front && typeof images.front === "string" && images.front.length > 0) ||
      (images?.front && typeof images.front.path === "string" && images.front.path.length > 0);
    if (!hasFront) {
      return json(400, { error: "missing_front_image" });
    }

    const insertPayload =
      lookupTable === "identity_snapshots"
        ? {
            user_id: snapshotUserId,
            identity_snapshot_id: resolvedSnapshotId,
            snapshot_id: null,
            signals: {},
            candidates: [],
            status: "pending",
            analysis_version: "v1",
            source_table: "identity_snapshots",
          }
        : {
            user_id: snapshotUserId,
            snapshot_id: resolvedSnapshotId,
            identity_snapshot_id: null,
            signals: {},
            candidates: [],
            status: "pending",
            analysis_version: "v1",
            source_table: "condition_snapshots",
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
