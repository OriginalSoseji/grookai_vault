import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const pub =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY")!;
const token = Deno.env.get("BRIDGE_IMPORT_TOKEN")!;

export default async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await req.json().catch(() => ({}));
    // Lightweight health path: accept ping without touching DB
    if ((body && (body.ping || body.source === "bridge_health"))) {
      return new Response(JSON.stringify({ ok: true, health: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (req.headers.get("x-bridge-token") !== token) return new Response("Unauthorized", { status: 401 });

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
