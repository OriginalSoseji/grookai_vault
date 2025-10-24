// Edge Function: ebay_sold_engine
// Input: { cardId: string, query: string, condition: string, lookbackDays?: number }
// Output: { sold_avg, sold_low_p10, sold_high_p90, count }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { p10, toUSD, effectivePrice, mapEbayConditionToBucket, nowIso } from '../_shared/pricing/utils.ts'

type InBody = { cardId?: string; query?: string; condition?: string; lookbackDays?: number; limit?: number; debug?: boolean }

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || ''
const EBAY_TOKEN  = Deno.env.get('EBAY_OAUTH_TOKEN') || ''
const DEBUG_DEFAULT = (Deno.env.get('EBAY_SOLD_DEBUG') || '').toLowerCase() === 'true'
const EBAY_BROWSE = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

function p90(arr: number[]): number | null {
  const vals = (arr || []).filter((x) => typeof x === 'number' && isFinite(x)).sort((a,b)=>a-b)
  if (!vals.length) return null
  const idx = Math.max(0, Math.min(vals.length - 1, Math.floor(vals.length * 0.90) - 1))
  return vals[idx] ?? vals[vals.length - 1]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { cardId, query, condition, lookbackDays = 30, limit = 5, debug = DEBUG_DEFAULT } = (await req.json().catch(() => ({}))) as InBody
  if (!cardId || !condition) return err(400, 'missing_params')
  if (!EBAY_TOKEN) return err(500, 'ebay_token_missing')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

  const q = query && query.trim().length > 0 ? query : null
  // eBay Browse supports soldItemsOnly via filter=soldItemsOnly:true in some endpoints; in item_summary it's part of fieldsets
  const u = new URL(EBAY_BROWSE)
  u.searchParams.set('q', q ?? cardId)
  u.searchParams.set('limit', String(Math.max(5, Math.min(100, limit * 4))))
  u.searchParams.set('sort', '-endTime')
  u.searchParams.set('fieldgroups', 'EXTENDED')
  u.searchParams.set('filter', 'soldItemsOnly:true')

  let prices: number[] = []
  const sales: { price: number|null, currency: string, date: string|null, title: string, url: string, condition: string, shipping: number|null }[] = []
  try {
    const r = await fetch(u.toString(), { headers: { 'Authorization': `Bearer ${EBAY_TOKEN}`, 'Accept': 'application/json' } })
    if (r.ok) {
      const j: any = await r.json().catch(() => null)
      const items: any[] = Array.isArray(j?.itemSummaries) ? j.itemSummaries : []
      for (const x of items) {
        const bucket = mapEbayConditionToBucket(String(x?.condition || ''))
        if (bucket !== (condition as any)) continue
        const price = Number(x?.price?.value ?? NaN)
        const ship = Number(x?.shippingOptions?.[0]?.shippingCost?.value ?? 0)
        const eff = effectivePrice(price, ship)
        if (typeof eff === 'number') {
          prices.push(eff)
          if (sales.length < limit) {
            const url = (x?.itemWebUrl || x?.itemUrl || '').toString()
            const title = (x?.title || '').toString()
            const currency = (x?.price?.currency || 'USD').toString()
            const date = (x?.itemEndDate || x?.itemCreationDate || x?.seller?.feedbackInfo?.positiveFeedbackPercentDate || null)
            sales.push({ price: Number(price), currency, date, title, url, condition: bucket, shipping: isFinite(ship) ? Number(ship) : null })
          }
        }
      }
    }
  } catch {}

  const avg = prices.length ? (prices.reduce((a,b)=>a+b,0) / prices.length) : null
  const low = p10(prices)
  const high = p90(prices)
  const observedAt = nowIso()

  // Optionally insert observations (aggregated)
  try {
    if (prices.length) {
      const rows = prices.map((p) => ({ card_id: cardId, condition, source: 'ebay_sold', price: p, currency: 'USD', observed_at: observedAt }))
      await sb.from('price_observations').insert(rows)
    }
  } catch {}

  const out: any = { ok: true, sold_avg: avg, sold_low_p10: low, sold_high_p90: high, count: prices.length, observedAt, sales }
  if (debug) out['query'] = q
  return json(out)
})
