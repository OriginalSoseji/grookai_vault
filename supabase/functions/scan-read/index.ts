import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ReqBody = { snapshot_id: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) return json(500, { error: "missing_env", details: "SUPABASE_URL / SUPABASE_ANON_KEY" });

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json(401, { error: "missing_bearer_token" });

    const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
    const userId = userData.user.id;

    const body = (await req.json()) as Partial<ReqBody>;
    const snapshotId = (body.snapshot_id ?? "").trim();
    if (!snapshotId) return json(400, { error: "missing_snapshot_id" });

    // Fetch snapshot row owned by the caller (RLS should enforce, but we add a filter too)
    const { data: snap, error: snapErr } = await sb
      .from("condition_snapshots")
      .select("id, user_id, images")
      .eq("id", snapshotId)
      .eq("user_id", userId)
      .maybeSingle();

    if (snapErr) return json(500, { error: "db_error", details: snapErr.message });
    if (!snap) return json(404, { error: "not_found" });

    const images = snap.images as any;
    const bucket = String(images?.bucket ?? "condition-scans");

    // Paths stored in JSON
    const frontPath = images?.front?.path ?? null;
    const backPath = images?.back?.path ?? null;
    const corners = images?.corners ?? {};

    // Generate signed READ URLs (1 hour default)
    const expiresIn = 3600;

    async function sign(path: string | null) {
      if (!path) return null;
      const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    const signedFront = await sign(frontPath);
    const signedBack = await sign(backPath);

    const cornerKeys = ["corner_tl", "corner_tr", "corner_bl", "corner_br"];
    const signedCorners: Record<string, string | null> = {};
    const cornerPaths: Record<string, string | null> = {};

    for (const k of cornerKeys) {
      const p = corners?.[k]?.path ?? null;
      cornerPaths[k] = p;
      signedCorners[k] = await sign(p);
    }

    return json(200, {
      snapshot_id: snap.id,
      bucket,
      paths: { front: frontPath, back: backPath, corners: cornerPaths },
      signed_urls: { front: signedFront, back: signedBack, corners: signedCorners },
      expires_in: expiresIn,
    });
  } catch (e) {
    return json(500, { error: "internal_error", details: String((e as Error)?.message ?? e) });
  }
});
