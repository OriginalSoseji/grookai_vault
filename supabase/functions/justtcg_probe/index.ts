// Deno Edge Function: justtcg_probe (dev-only)
// Probes JustTCG reachability from Edge with x-api-key -> Bearer -> apiKey query.

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })

const BASE = (Deno.env.get('JUSTTCG_BASE_URL') || '').replace(/\/$/, '') || 'https://api.justtcg.com/v1'
const KEY  = Deno.env.get('JUSTTCG_API_KEY') || ''

async function tryMode(mode: 'x-api-key' | 'bearer' | 'query') {
  const url = new URL(BASE + '/sets')
  url.searchParams.set('game', 'pokemon')
  if (mode === 'query') url.searchParams.set('apiKey', KEY)
  const headers: Record<string,string> = { 'Accept': 'application/json' }
  if (mode === 'x-api-key') headers['x-api-key'] = KEY
  if (mode === 'bearer') headers['Authorization'] = `Bearer ${KEY}`
  const start = Date.now()
  try {
    const r = await fetch(url.toString(), { headers })
    const ms = Date.now() - start
    let sample: unknown = null
    if (r.ok) {
      try {
        const j = await r.json()
        if (Array.isArray(j)) sample = j.slice(0, 2)
        else if (j && typeof j === 'object') sample = j
      } catch {}
    }
    return { ok: r.ok, status: r.status, ms, sample }
  } catch (e) {
    const ms = Date.now() - start
    return { ok: false, error: String(e), ms }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  const out: Record<string, unknown> = { base: BASE }
  out['x-api-key'] = await tryMode('x-api-key')
  out['bearer'] = await tryMode('bearer')
  out['query'] = await tryMode('query')
  // cards pricing probe (tcgplayerId param example)
  try {
    const cardsUrl = new URL(BASE + '/cards')
    cardsUrl.searchParams.set('game', 'pokemon')
    cardsUrl.searchParams.set('tcgplayerId', '12345')
    const rc = await fetch(cardsUrl.toString(), { headers: { 'Accept': 'application/json', 'x-api-key': KEY } })
    let cardSample: unknown = null
    if (rc.ok) {
      try { const jj = await rc.json(); cardSample = Array.isArray(jj) ? jj.slice(0, 1) : jj } catch {}
    }
    out['cards'] = { ok: rc.ok, status: rc.status, sample: cardSample }
  } catch (e) {
    out['cards'] = { ok: false, error: String(e) }
  }
  return json(out)
})
