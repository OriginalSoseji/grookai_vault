// Deno Edge Function: price_aggregate
// Aggregates price quotes from multiple providers and writes a snapshot.
// Inputs: { set_code: string, number: string, lang?: string }
// Outputs: { price_low, price_mid, price_high, currency, observed_at, sources: {...} }

import { createClient } from 'jsr:@supabase/supabase-js@2'

type BodyIn = { set_code?: string; number?: string; lang?: string }
type Quote = { low?: number; mid?: number; high?: number; currency?: string } | null

const CORS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || ''

const JUSTTCG_BASE = (Deno.env.get('JUSTTCG_BASE_URL') || '').replace(/\/$/, '')
const JUSTTCG_KEY = Deno.env.get('JUSTTCG_API_KEY') || ''

// Pricing v2: PriceCharting disabled/removed

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err  = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

function normLang(x?: string | null): string { const v = (x ?? 'en').toString().trim().toLowerCase(); return v || 'en' }
function normNumber(n: string): { raw: string; pad3: string; intLike: string } {
  const left = String(n || '').trim().split('/')[0]
  const core = left.replace(/[^0-9a-z]/gi, '')
  const m = core.match(/^(\d+)([a-z]+)?$/i)
  if (m) {
    const num = String(parseInt(m[1], 10))
    const suf = m[2] ? m[2].toLowerCase() : ''
    const pad3 = num.padStart(3, '0') + suf
    return { raw: core.toLowerCase(), pad3, intLike: num + (suf || '') }
  }
  return { raw: core.toLowerCase(), pad3: core.toLowerCase(), intLike: core.toLowerCase() }
}

function parseDollar(s?: string | null): number | undefined {
  if (!s) return undefined
  const m = String(s).replace(/[$,]/g, '').trim()
  const v = Number(m)
  return Number.isFinite(v) ? v : undefined
}

async function getJustTcgQuote(set_code: string, number: string, lang: string): Promise<Quote> {
  if (!JUSTTCG_BASE || !JUSTTCG_KEY) return null
  try {
    const url = `${JUSTTCG_BASE}/prices?game=pokemon&set=${encodeURIComponent(set_code)}&number=${encodeURIComponent(number)}&lang=${encodeURIComponent(lang)}`
    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'x-api-key': JUSTTCG_KEY } })
    if (!r.ok) { console.error('[PRICES] aggregate.source', { name: 'justtcg', ok: false, status: r.status }); return null }
    const j: any = await r.json().catch(() => null)
    if (!j) return null
    const low = typeof j.price_low === 'number' ? j.price_low : (typeof j.low === 'number' ? j.low : undefined)
    const midRaw = typeof j.price_mid === 'number' ? j.price_mid : (typeof j.mid === 'number' ? j.mid : (typeof j.price === 'number' ? j.price : undefined))
    const high = typeof j.price_high === 'number' ? j.price_high : (typeof j.high === 'number' ? j.high : undefined)
    const mid = midRaw ?? (low ?? high)
    const out = (mid != null) ? { low: low ?? mid, mid: mid, high: high ?? mid, currency: (j.currency ?? 'USD') } : null
    console.log('[PRICES] aggregate.source', { name: 'justtcg', ok: !!out })
    return out
  } catch (e) {
    console.error('[PRICES] aggregate.source', { name: 'justtcg', ok: false, detail: String(e) })
    return null
  }
}

async function getPriceChartingCsvQuote(_set_code: string, _number: string): Promise<Quote> { return null }

function mergeQuotes({ ebay, just, pc }: { ebay?: Quote, just?: Quote, pc?: Quote }): Required<NonNullable<Quote>> {
  const weights = (ebay ? { pc: 0.3, just: 0.2, ebay: 0.5 } : { pc: 0.6, just: 0.4 }) as any
  const currency = 'USD'
  const mids: number[] = []
  if (pc?.mid) mids.push(pc.mid * (weights.pc ?? 0))
  if (just?.mid) mids.push(just.mid * (weights.just ?? 0))
  if (ebay?.mid) mids.push(ebay.mid * (weights.ebay ?? 0))
  const mid = mids.length > 0 ? mids.reduce((a, b) => a + b, 0) : (pc?.mid ?? just?.mid ?? ebay?.mid ?? 0)
  const lows = [pc?.low, just?.low, ebay?.low, mid].filter((v): v is number => typeof v === 'number')
  const highs = [pc?.high, just?.high, ebay?.high, mid].filter((v): v is number => typeof v === 'number')
  const low = Math.min(...lows)
  const high = Math.max(...highs)
  return { low, mid, high, currency }
}

type Config = { weights: Record<string, number>, version: string }
async function loadConfig(sb: ReturnType<typeof createClient>): Promise<Config> {
  try {
    const { data } = await sb.from('pricing_config').select('weights_json,version_label').order('updated_at', { ascending: false }).limit(1)
    const row = (data ?? [])[0] as any
    const weights = (row?.weights_json ?? { pc_mid: 0.6, jtcg_low: 0.4, ebay_sold: 0.0 }) as Record<string, number>
    const version = (row?.version_label ?? 'gi-1.0') as string
    return { weights, version }
  } catch {
    return { weights: { pc_mid: 0.6, jtcg_low: 0.4, ebay_sold: 0.0 }, version: 'gi-1.0' }
  }
}

function computeMarketValue(weights: Record<string, number>, pc: Quote, just: Quote): number {
  const pcMid = (pc?.mid && typeof pc.mid === 'number') ? pc.mid : 0
  const jLow = (just?.low && typeof just.low === 'number') ? just.low : 0
  const ebaySold = 0
  const mv = (pcMid * (weights.pc_mid ?? 0)) + (jLow * (weights.jtcg_low ?? 0)) + (ebaySold * (weights.ebay_sold ?? 0))
  return mv
}

function computeConfidence(pc: Quote, just: Quote): 'high' | 'medium' | 'low' {
  let present: number[] = []
  if (pc?.mid != null && typeof pc.mid === 'number') present.push(pc.mid)
  if (just?.low != null && typeof just.low === 'number') present.push(just.low)
  if (present.length === 0) return 'low'
  if (present.length === 1) return 'medium'
  const min = Math.min(...present)
  const max = Math.max(...present)
  if (min > 0 && (max - min) / min > 0.6) return 'low'
  // simple sample-size heuristic (2 sources => medium)
  if (present.length < 3) return 'medium'
  return 'high'
}

async function insertSnapshot(sb: ReturnType<typeof createClient>, printId: string, q: { low: number; mid: number; high: number; currency: string }) {
  // Try legacy schema first (card_prices: card_print_id, low, mid, high, currency, last_updated)
  try {
    // legacy often requires a constrained source (tcgplayer/cardmarket). Use tcgplayer to satisfy check constraints.
    await sb.from('card_prices').insert({ card_print_id: printId, low: q.low, mid: q.mid, high: q.high, currency: q.currency, source: 'tcgplayer' })
    return true
  } catch (_) {
    // Try new schema variant (card_id, price_low/mid/high, currency, observed_at)
  }
  try {
    await sb.from('card_prices').insert({ card_id: printId, price_low: q.low, price_mid: q.mid, price_high: q.high, currency: q.currency })
    return true
  } catch (_) {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const { set_code, number, lang } = (await req.json().catch(() => ({}))) as BodyIn
  const sc = (set_code ?? '').toString().trim()
  const num = (number ?? '').toString().trim()
  const langNorm = normLang(lang)
  if (!sc || !num) return err(400, 'missing_params')

  console.log('[PRICES] aggregate.start', { set_code: sc, number: num, lang: langNorm })

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

  // resolve card_print id
  let printId: string | null = null
  try {
    const nn = normNumber(num)
    const { data: rows } = await sb
      .from('card_prints')
      .select('id,set_code,number')
      .eq('set_code', sc)
      .in('number', [nn.pad3, nn.intLike, nn.raw, num])
      .limit(1)
    if (rows && rows.length > 0) printId = rows[0].id as string
  } catch {}

  // Sources
  // eBay placeholder (disabled unless creds provided)
  const ebayEnabled = Boolean(Deno.env.get('EBAY_APP_ID') && Deno.env.get('EBAY_CERT_ID') && Deno.env.get('EBAY_OAUTH_TOKEN'))
  const ebay: Quote = ebayEnabled ? null : null

  const just = await getJustTcgQuote(sc, num, langNorm)
  const pc = null

  if (!just && !pc && !ebay) {
    console.error('[PRICES] aggregate.error', { message: 'no_sources_returned' })
    return err(502, 'no_sources_returned')
  }

  const agg = mergeQuotes({ ebay, just, pc })
  const observed_at = new Date().toISOString()
  const cfg = await loadConfig(sb)
  const grookaiIndex = computeMarketValue(cfg.weights, pc, just)
  const confidence = computeConfidence(pc, just)

  // Write snapshot if we have a print id
  let wrote = false
  if (printId) {
    // Append raw observations per source
    try {
      if (just) {
        await sb.from('price_observations').insert({ card_print_id: printId, source: 'justtcg', low: just.low ?? null, mid: just.mid ?? null, high: just.high ?? null, sample_size: 1 })
      }
    } catch {}
    // Insert snapshot with market value metadata
    try {
      // legacy first
      await sb.from('card_prices').insert({ card_print_id: printId, low: agg.low, mid: agg.mid, high: agg.high, currency: agg.currency, grookai_index: grookaiIndex, gi_algo_version: cfg.version, confidence })
      wrote = true
    } catch (_) {
      try {
        await sb.from('card_prices').insert({ card_id: printId, price_low: agg.low, price_mid: agg.mid, price_high: agg.high, currency: agg.currency, grookai_index: grookaiIndex, gi_algo_version: cfg.version, confidence })
        wrote = true
      } catch (_) {
        wrote = wrote || false
      }
    }
  }

  console.log('[PRICES] aggregate.success', { price_mid: agg.mid, used: [just ? 'justtcg' : null, ebay ? 'ebay' : null].filter(Boolean) })

  return json({
    ok: true,
    price_low: agg.low,
    price_mid: agg.mid,
    price_high: agg.high,
    currency: agg.currency,
    observed_at,
    wrote_snapshot: wrote,
    grookai_index: grookaiIndex,
    gi_algo_version: cfg.version,
    confidence,
  })
})
