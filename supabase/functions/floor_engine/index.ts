// Edge Function: floor_engine
// Input: { cardId: string, condition: string }
// Output: { retailFloor, marketFloor, samples: { justtcg, ebay }, observedAt }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { p10, toUSD, effectivePrice, mapEbayConditionToBucket, nowIso } from '../_shared/pricing/utils.ts'

type InBody = { cardId?: string; condition?: string }

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || ''

const JUSTTCG_BASE = (Deno.env.get('JUSTTCG_BASE_URL') || 'https://api.justtcg.com/v1').replace(/\/$/, '')
const JUSTTCG_KEY  = Deno.env.get('JUSTTCG_API_KEY') || ''

// eBay Browse API expects OAuth bearer token
const EBAY_BROWSE = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const EBAY_TOKEN  = Deno.env.get('EBAY_OAUTH_TOKEN') || ''

async function fetchPrint(sb: ReturnType<typeof createClient>, cardId: string) {
  const { data } = await sb.from('card_prints').select('id,set_code,number,name').eq('id', cardId).limit(1)
  return (data && data[0]) || null
}

async function fetchJustTcgListings(card: any, condition: string): Promise<number[]> {
  if (!JUSTTCG_KEY) return []
  try {
    // API shape varies; try a generic cards search by tcgplayer id proxy via set/number
    const url = new URL(JUSTTCG_BASE + '/cards')
    url.searchParams.set('game', 'pokemon')
    if (card?.set_code) url.searchParams.set('set', String(card.set_code))
    if (card?.number) url.searchParams.set('number', String(card.number))
    const r = await fetch(url.toString(), { headers: { 'Accept': 'application/json', 'x-api-key': JUSTTCG_KEY } })
    if (!r.ok) return []
    const j: any = await r.json().catch(() => null)
    const prices: number[] = []
    const rows: any[] = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : [])
    for (const it of rows) {
      const p = toUSD(it?.price ?? it?.market ?? it?.mid ?? it?.low, (it?.currency || 'USD'))
      if (p != null) prices.push(p)
    }
    return prices
  } catch { return [] }
}

async function fetchEbayBin(card: any): Promise<{ price: number|null, ship: number|null, cond: string|null }[]> {
  if (!EBAY_TOKEN) return []
  const q = [ 'pokemon', card?.name, card?.set_code, card?.number ].filter(Boolean).join(' ')
  const u = new URL(EBAY_BROWSE)
  u.searchParams.set('q', q)
  u.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}')
  u.searchParams.set('limit', '50')
  try {
    const r = await fetch(u.toString(), { headers: { 'Authorization': `Bearer ${EBAY_TOKEN}`, 'Accept': 'application/json' } })
    if (!r.ok) return []
    const j: any = await r.json().catch(() => null)
    const items: any[] = Array.isArray(j?.itemSummaries) ? j.itemSummaries : []
    return items.map((x) => ({
      price: Number(x?.price?.value ?? x?.priceValue ?? NaN),
      ship: Number(x?.shippingOptions?.[0]?.shippingCost?.value ?? 0),
      cond: String(x?.condition || ''),
    }))
  } catch { return [] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { cardId, condition } = (await req.json().catch(() => ({}))) as InBody
  if (!cardId || !condition) return err(400, 'missing_params')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
  const card = await fetchPrint(sb, cardId)
  if (!card) return err(404, 'card_not_found')

  const jtSamples = await fetchJustTcgListings(card, condition)
  const retailFloor = p10(jtSamples) || null

  const ebayRaw = await fetchEbayBin(card)
  const ebayFiltered = ebayRaw.filter((x) => mapEbayConditionToBucket(x.cond) === (condition as any))
  const ebayEff = ebayFiltered.map((x) => effectivePrice(x.price, x.ship)).filter((n): n is number => typeof n === 'number')
  const marketFloor = p10(ebayEff) || null

  const observedAt = nowIso()

  try {
    if (retailFloor != null) {
      await sb.from('card_floors').insert({ card_id: cardId, condition, source: 'retail', floor_price: retailFloor, currency: 'USD', observed_at: observedAt })
    }
  } catch {}
  try {
    if (marketFloor != null) {
      await sb.from('card_floors').insert({ card_id: cardId, condition, source: 'market', floor_price: marketFloor, currency: 'USD', observed_at: observedAt })
    }
  } catch {}

  return json({ ok: true, retailFloor, marketFloor, samples: { justtcg: jtSamples.length, ebay: ebayEff.length }, observedAt })
})

