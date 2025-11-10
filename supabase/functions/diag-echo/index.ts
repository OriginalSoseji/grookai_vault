// supabase/functions/diag-echo/index.ts (Deno)
Deno.serve(async (req) => {
  const hdrs: Record<string,string> = {}
  for (const [k,v] of req.headers) hdrs[k.toLowerCase()] = v
  const out = {
    ok: true,
    saw_apikey: !!hdrs["apikey"],
    saw_authz: !!hdrs["authorization"],
    saw_bridge: !!hdrs["x-bridge-token"],
    method: req.method,
    path: new URL(req.url).pathname,
    ua: hdrs["user-agent"] ?? null,
  }
  return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" }})
})
