// Edge Function: import-prices-v2
// Input: { cardId: string, condition: string }
// 1) Read latest floors (retail/market)
// 2) Optionally read eBay sold summary via ebay_sold_engine or observations
// 3) Optionally read GV baseline
// 4) Compose Grookai Index weighted blend
// 5) Compute low/mid/high and insert into card_prices (source='grookai_index')

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { nowIso } from '../_shared/pricing/utils.ts'

type InBody = { cardId?: string; condition?: string }

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || ''

async function latestFloors(sb: ReturnType<typeof createClient>, cardId: string, condition: string) {
  const { data } = await sb
    .from('latest_card_floors_v')
    .select('source, floor_price, currency, observed_at')
    .eq('card_id', cardId)
    .eq('condition', condition)
  let retail: number | null = null
  let market: number | null = null
  for (const r of data || []) {
    const s = String((r as any).source || '')
    if (s === 'retail') retail = Number((r as any).floor_price)
    if (s === 'market') market = Number((r as any).floor_price)
  }
  return { retail, market }
}

async function latestGv(sb: ReturnType<typeof createClient>, cardId: string, condition: string) {
  const { data } = await sb
    .from('latest_card_gv_baselines_v')
    .select('value')
    .eq('card_id', cardId)
    .eq('condition', condition)
    .limit(1)
  return (data && data.length) ? Number((data[0] as any).value) : null
}

async function ebaySoldSummary(sb: ReturnType<typeof createClient>, cardId: string, condition: string) {
  try {
    const r = await sb.functions.invoke('ebay_sold_engine', { body: { cardId, condition } })
    const d: any = r?.data ?? null
    if (d && d.ok) return { avg: d.sold_avg as number | null, p10: d.sold_low_p10 as number | null, p90: d.sold_high_p90 as number | null, count: d.count as number }
  } catch {}
  return { avg: null, p10: null, p90: null, count: 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { cardId, condition } = (await req.json().catch(() => ({}))) as InBody
  if (!cardId || !condition) return err(400, 'missing_params')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
  const compFloors = await latestFloors(sb, cardId, condition)
  const compEbay = await ebaySoldSummary(sb, cardId, condition)
  const compGv = await latestGv(sb, cardId, condition)

  // Weights: JTCG 0.45, eBay sold 0.35, GV 0.20 (renormalize if missing)
  const w = { jtcg: 0.45, ebay: 0.35, gv: 0.20 }
  const present = [
    compFloors.retail != null ? 'jtcg' : null,
    compEbay.avg != null ? 'ebay' : null,
    compGv != null ? 'gv' : null,
  ].filter(Boolean) as string[]
  const sum = present.reduce((a, k) => a + (w as any)[k], 0)
  const scale = sum > 0 ? (1 / sum) : 0
  const jw = present.includes('jtcg') ? w.jtcg * scale : 0
  const ew = present.includes('ebay') ? w.ebay * scale : 0
  const gw = present.includes('gv') ? w.gv * scale : 0

  const mid = (compFloors.retail ?? 0) * jw + (compEbay.avg ?? 0) * ew + (compGv ?? 0) * gw
  const lowCandidates = [ compFloors.retail, compFloors.market, compEbay.p10 ].filter((n): n is number => typeof n === 'number')
  const low = lowCandidates.length ? Math.min(...lowCandidates) : (mid || null)
  const high = (compEbay.p90 != null) ? compEbay.p90 : Math.max((compFloors.retail ?? 0) * 1.2, mid * 1.1)
  const observedAt = nowIso()

  // Insert into card_prices with source='grookai_index'
  try {
    await sb.from('card_prices').insert({
      card_id: cardId,
      condition,
      source: 'grookai_index',
      price_low: low ?? null,
      price_mid: mid || null,
      price_high: high || null,
      currency: 'USD',
      observed_at: observedAt,
    })
  } catch {}

  return json({ ok: true, condition, low, mid, high, components: { floors: compFloors, ebay: compEbay, gv: compGv, weights: { jtcg: jw, ebay: ew, gv: gw } }, observedAt })
})

