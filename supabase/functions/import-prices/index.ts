// LEGACY NOTICE:
// This Edge function is part of the deprecated pricing pipeline
// (admin.import_prices_do) and remains only for historical reference.
// New pricing work must flow through the eBay-based pipelines instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// GV_BRIDGE_TOKEN_GATE: accept token via multiple header names; compare to env; log hash8s only
function hash8(s: string | null | undefined): string {
  if (!s) return "<missing>";
  const enc = new TextEncoder().encode(s);
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (let i = 0; i < enc.length; i++) {
    h ^= enc[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

function readBridgeHeader(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-bridge-token") ??
    h.get("X-Bridge-Token") ??
    h.get("bridge-token") ??
    ""
  );
}

async function requireBridgeToken(req: Request): Promise<Response | null> {
  const headerToken = readBridgeHeader(req);
  const secret = Deno.env.get("BRIDGE_IMPORT_TOKEN") ?? "";
  const h8 = hash8(headerToken);
  const s8 = hash8(secret);

  console.log(`[IMPORT-PRICES] token.check header8=${h8} env8=${s8}`);

  if (!secret) {
    console.warn("[IMPORT-PRICES] BRIDGE_IMPORT_TOKEN env missing");
    return new Response(
      JSON.stringify({ ok: false, code: 401, reason: "env-missing" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!headerToken) {
    return new Response(
      JSON.stringify({ ok: false, code: 401, reason: "header-missing" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (headerToken !== secret) {
    return new Response(
      JSON.stringify({ ok: false, code: 401, reason: "token-mismatch", header8: h8, env8: s8 }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return null; // pass
}

const url = Deno.env.get("SUPABASE_URL")!;
const pub = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const token = Deno.env.get("BRIDGE_IMPORT_TOKEN")!;

export default async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await req.json().catch(() => null as any);

    const supabase = createClient(url, pub);

    // Branch detection
    const isModeHealth = !!body && (body as any)?.mode === "health";
    const isHealth = !!body && (
      isModeHealth ||
      body.health === 1 ||
      body.health === true ||
      body.ping === 1 ||
      body.ping === true ||
      body.source === "bridge_health"
    );
    const isPipelineTest = !!body && (body as any)?.mode === "pipeline_test";

    // Health branch: fast, boring, and gate-free (apikey-only).
    if (isHealth) {
      const mode = (body && (body as any).mode) ? String((body as any).mode) : "health";
      const source = (body && (body as any).source) ? String((body as any).source) : "unknown";
      const payload = {
        ok: true,
        slug: "import-prices",
        mode,
        source,
        ts: new Date().toISOString(),
      } as const;
      console.log("[IMPORT-PRICES] health.min.ok", payload);
      // No DB calls, no external work.
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // For non-health requests, enforce bridge token gate
    const gate = await requireBridgeToken(req);
    if (gate) return gate;

    // Pipeline test branch: log run, wrap heavy RPC
    if (isPipelineTest) {
      console.log("[IMPORT-PRICES] pipeline_test.start");
      let runId: string | null = null;
      try {
        const ins = await supabase
          .from("admin.import_runs")
          .insert([{ kind: "pipeline_test", scope: body, status: "running", started_at: new Date().toISOString() }])
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        runId = (ins.data as any)?.id ?? null;
      } catch (e) {
        console.warn("[IMPORT-PRICES] pipeline_test.insert.error", e);
        return new Response(
          JSON.stringify({ ok: false, kind: "pipeline_test", status: "failed", message: "failed to insert import_runs", error: String(e) }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }

      try {
        try { await supabase.rpc("set_config", { parameter: "app.bridge_token", value: token, is_local: true }); } catch {}
        const { data, error } = await supabase.rpc("admin.import_prices_do", { _payload: body, _bridge_token: token });
        if (error) throw error;
        await supabase.from("admin.import_runs").update({ status: "success", finished_at: new Date().toISOString() }).eq("id", runId as string);
        console.log("[IMPORT-PRICES] pipeline_test.success", runId);
        return new Response(
          JSON.stringify({ ok: true, kind: "pipeline_test", run_id: runId, status: "success", data }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      } catch (e) {
        const msg = String((e as any)?.message ?? e);
        try { await supabase.from("admin.import_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: msg }).eq("id", runId as string); } catch {}
        console.warn("[IMPORT-PRICES] pipeline_test.failed", runId, msg);
        return new Response(
          JSON.stringify({ ok: false, kind: "pipeline_test", run_id: runId, status: "failed", message: msg }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }

    // Default full import branch (legacy behavior)
    console.log("[IMPORT-PRICES] full.start");
    try { await supabase.rpc("set_config", { parameter: "app.bridge_token", value: token, is_local: true }); } catch {}
    const { data, error } = await supabase.rpc("admin.import_prices_do", { _payload: body, _bridge_token: token });
    if (error) {
      console.warn("[IMPORT-PRICES] full.error", error);
      return new Response(
        JSON.stringify({ ok: false, error }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    console.log("[IMPORT-PRICES] full.success");
    return new Response(
      JSON.stringify({ ok: true, data }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    console.warn("[IMPORT-PRICES] full.throw", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
};
