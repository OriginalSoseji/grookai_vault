/** GV_MIN_GATE: temporary hard gate wrapper for import-prices */
function hash8(s: string | null | undefined): string {
  if (!s) return "<missing>";
  const enc = new TextEncoder().encode(s);
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < enc.length; i++) { h ^= enc[i]; h = Math.imul(h, 16777619) >>> 0; }
  return ("00000000" + h.toString(16)).slice(-8);
}
function readBridgeHeader(req: Request): string {
  const h = req.headers;
  return h.get("x-bridge-token") ?? h.get("X-Bridge-Token") ?? h.get("bridge-token") ?? "";
}
async function handler(req: Request): Promise<Response> {
  const headerToken = readBridgeHeader(req);
  const secret = Deno.env.get("BRIDGE_IMPORT_TOKEN") ?? "";
  const h8 = hash8(headerToken);
  const s8 = hash8(secret);
  console.log(`[IMPORT-PRICES] token.check header8=${h8} env8=${s8}`);
  if (!secret) {
    return new Response(JSON.stringify({ ok:false, code:401, reason:"env-missing", env8:s8 }), { status:401, headers:{ "Content-Type":"application/json" }});
  }
  if (!headerToken) {
    return new Response(JSON.stringify({ ok:false, code:401, reason:"header-missing", env8:s8 }), { status:401, headers:{ "Content-Type":"application/json" }});
  }
  if (headerToken !== secret) {
    return new Response(JSON.stringify({ ok:false, code:401, reason:"token-mismatch", header8:h8, env8:s8 }), { status:401, headers:{ "Content-Type":"application/json" }});
  }
  // PASS: prove green with a simple OK
  return new Response(JSON.stringify({ ok:true, route:"import-prices", gate:"pass", env8:s8 }), { status:200, headers:{ "Content-Type":"application/json" }});
}
Deno.serve(handler);