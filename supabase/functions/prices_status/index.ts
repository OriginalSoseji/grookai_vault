// Deno Edge Function: prices_status
// - Pings price API to verify reachability and returns basic info
// - Service role if available (not required for ping)

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  const base = Deno.env.get('PRICE_API_BASE_URL') ?? ''
  const apiKey = Deno.env.get('PRICE_API_KEY') ?? ''
  const info: Record<string, unknown> = { baseConfigured: Boolean(base), keyConfigured: Boolean(apiKey), time: new Date().toISOString() }
  if (!base) return json({ ok: false, reachable: false, ...info })
  try {
    const url = `${base.replace(/\/$/, '')}/health` // convention
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    return json({ ok: true, reachable: r.ok, status: r.status, ...info })
  } catch (e) {
    return json({ ok: false, reachable: false, error: String(e), ...info }, 200)
  }
})

