// Edge Function: system_health
// Nightly health report: checks set coverage, price importer reachability,
// row counts, freshness, and posts a webhook summary.

import { createClient } from 'jsr:@supabase/supabase-js@2'

type Report = {
  ok: boolean
  sets: { totalApi?: number; totalDb?: number; missing?: number; extra?: number }
  prices: { reachable: boolean; note?: string }
  counts: { card_prints: number; price_observations: number; card_prices: number }
  freshness: { latest_price_at?: string | null; latest_floor_at?: string | null }
  ranAt: string
}

import { retryFetch } from "../_shared/retryFetch.ts";

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')
const WEBHOOK_URL = Deno.env.get('HEALTH_WEBHOOK_URL') || ''

async function postWebhook(payload: unknown) {
  if (!WEBHOOK_URL) return
  try { await retryFetch(WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }, { attempts: 3, baseDelayMs: 700, timeoutMs: 10000 }) } catch {}
}

function nowIso() { return new Date().toISOString() }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!)
  const rep: Report = { ok: true, sets: {}, prices: { reachable: false }, counts: { card_prints: 0, price_observations: 0, card_prices: 0 }, freshness: {}, ranAt: nowIso() }

  // 1) check-sets dry
  try {
    const r = await fetch(new URL('/functions/v1/check-sets', SUPABASE_URL).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE}`, 'apikey': SERVICE_ROLE as string },
      body: JSON.stringify({ fix: false, throttleMs: 0 })
    })
    if (r.ok) {
      const j: any = await r.json().catch(() => null)
      rep.sets.totalApi = Number(j?.total_api ?? 0)
      rep.sets.totalDb = Number(j?.total_db ?? 0)
      rep.sets.missing = Number(j?.missing_count ?? 0)
      rep.sets.extra = Number(j?.extra_count ?? 0)
    } else { rep.ok = false }
  } catch { rep.ok = false }

  // 2) import-prices dry probe (use small limit or debug)
  try {
    const r = await fetch(new URL('/functions/v1/import-prices', SUPABASE_URL).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE}`, 'apikey': SERVICE_ROLE as string },
      body: JSON.stringify({ set_code: 'sv1', cardLimit: 0, debug: true })
    })
    rep.prices.reachable = r.ok
    if (!r.ok) rep.ok = false
  } catch { rep.ok = false }

  // 3) counts
  try {
    const c1 = await sb.from('card_prints').select('*', { count: 'exact', head: true })
    rep.counts.card_prints = Number(c1.count ?? 0)
  } catch {}
  try {
    const c2 = await sb.from('price_observations').select('*', { count: 'exact', head: true })
    rep.counts.price_observations = Number(c2.count ?? 0)
  } catch {}
  try {
    const c3 = await sb.from('card_prices').select('*', { count: 'exact', head: true })
    rep.counts.card_prices = Number(c3.count ?? 0)
  } catch {}

  // 4) freshness
  try {
    const { data: lp } = await sb.from('latest_card_prices_v').select('observed_at').order('observed_at', { ascending: false }).limit(1)
    rep.freshness.latest_price_at = (lp && lp[0] && (lp[0] as any).observed_at) || null
  } catch {}
  try {
    const { data: lf } = await sb.from('latest_card_floors_v').select('observed_at').order('observed_at', { ascending: false }).limit(1)
    rep.freshness.latest_floor_at = (lf && lf[0] && (lf[0] as any).observed_at) || null
  } catch {}

  // Persist audit (best effort)
  try {
    await fetch(new URL('/rest/v1/system_health_runs', SUPABASE_URL).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE}`, 'apikey': SERVICE_ROLE as string, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify([{ ok: rep.ok, details: rep, ran_at: rep.ranAt }])
    })
  } catch {}

  await postWebhook({ text: `GV Health: ok=${rep.ok} api=${rep.sets.totalApi}/${rep.sets.totalDb} missing=${rep.sets.missing} prices=${rep.prices.reachable} at=${rep.ranAt}` , report: rep })
  return json(rep)
})
