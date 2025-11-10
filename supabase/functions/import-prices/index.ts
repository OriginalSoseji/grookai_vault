import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


/** GV_BRIDGE_TOKEN_GATE: accept token via multiple header names; compare to env; log hash8s only */
function hash8(s: string | null | undefined): string {
  if (!s) return "<missing>";
  const enc = new TextEncoder().encode(s);
  // simple hash8 without external deps:
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (let i = 0; i < enc.length; i++) { h ^= enc[i]; h = Math.imul(h, 16777619) >>> 0; }
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
    return new Response(JSON.stringify({ ok: false, code: 401, reason: "env-missing" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  if (!headerToken) {
    return new Response(JSON.stringify({ ok: false, code: 401, reason: "header-missing" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  if (headerToken !== secret) {
    return new Response(JSON.stringify({ ok: false, code: 401, reason: "token-mismatch", header8: h8, env8: s8 }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  return null; // pass
}
const url = Deno.env.get("SUPABASE_URL")!;
const pub = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const token = Deno.env.get("BRIDGE_IMPORT_TOKEN")!;

export default async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await req.json().catch(() => ({}));
    // Always perform and log bridge-token gate (prints header8/env8)
    const gate = await requireBridgeToken(req);
    if (gate) return gate;
    // Lightweight health path: accept ping without touching DB
    if ((body && (body.ping || body.source === "bridge_health"))) {
      return new Response(JSON.stringify({ ok: true, health: true }), { status: 200, headers: { "content-type": "application/json" } });
    }

    const supabase = createClient(url, pub);

    // Optionally set a local GUC so the RPC can read it via current_setting('app.bridge_token', true)
    try {
      await supabase.rpc('set_config', { parameter: 'app.bridge_token', value: token, is_local: true });
    } catch (_) { /* best-effort; continue regardless */ }

    const { data, error } = await supabase.rpc('admin.import_prices_do', {
      _payload: body,
      _bridge_token: token
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
