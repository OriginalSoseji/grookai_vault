// Deno Edge Function: update_prices
// - Periodically refresh prices for existing card_prints
// - Service role only

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
}

type Body = { limit?: number }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')

// Centralized aggregation via price_aggregate function
async function fetchPricesViaAggregate(sb: ReturnType<typeof createClient>, setCode: string, number: string, lang: string) {
  try {
    const r = await sb.functions.invoke('price_aggregate', { body: { set_code: setCode, number, lang } })
    const d: any = r?.data ?? null
    if (d && d.ok) {
      return { low: d.price_low as number | undefined, mid: d.price_mid as number | undefined, high: d.price_high as number | undefined, currency: (d.currency ?? 'USD') as string }
    }
  } catch (e) {
    console.error('[PRICES] fetch.error', String(e))
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { limit = 200 } = (await req.json().catch(() => ({}))) as Body
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!, {})

  // Pull a batch of cards (recently updated first)
  const { data: cards, error } = await sb
    .from('card_prints')
    .select('id,set_code,number')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) return err(500, 'query_failed', error.message)

  let processed = 0, succeeded = 0, failed = 0, priceErrors = 0
  for (const c of cards ?? []) {
    processed++
    const id = c.id as string
    const sc = c.set_code as string
    const num = c.number as string
    const lang = 'en'
    let wrote = false
    for (let attempt = 0; attempt < 3; attempt++) {
      const pq = await fetchPricesViaAggregate(sb, sc, num, lang)
      if (pq) {
        // anomaly detection vs latest
        let okToInsert = true
        try {
          const { data: prev } = await sb
            .from('card_prices')
            .select('mid, last_updated, price_mid, observed_at')
            .or('card_id.eq.' + id + ',card_print_id.eq.' + id)
            .order('last_updated', { ascending: false })
            .limit(1)
          const prevMid = (prev && prev.length > 0) ? ((prev[0] as any).price_mid ?? (prev[0] as any).mid ?? null) as number | null : null
          if (typeof prevMid === 'number' && typeof pq.mid === 'number' && prevMid > 0) {
            const delta = (pq.mid - prevMid) / prevMid
            if (delta > 0.8 || delta < -0.6) {
              okToInsert = false
              priceErrors++
              await sb.from('price_error_log').insert({ set_code: sc, number: num, lang, error_text: `anomaly delta=${delta.toFixed(2)} prev=${prevMid} new=${pq.mid}` })
              console.error('[PRICES] fetch.error', { set_code: sc, number: num, lang, reason: 'anomaly', delta })
            }
          }
        } catch {}
        try {
          if (okToInsert) {
            // legacy schema first
            try {
              await sb.from('card_prices').insert({ card_print_id: id, low: pq.low ?? null, mid: pq.mid ?? null, high: pq.high ?? null, currency: pq.currency ?? 'USD' })
            } catch (_) {
              await sb.from('card_prices').insert({ card_id: id, price_low: pq.low ?? null, price_mid: pq.mid ?? null, price_high: pq.high ?? null, currency: pq.currency ?? 'USD' })
            }
          }
          wrote = true
        } catch (_) { wrote = true }
        break
      }
      const delay = [400,1200,2500][attempt] || 2500
      await new Promise((r) => setTimeout(r, delay))
    }
    if (wrote) succeeded++; else failed++
  }
  console.log('[PRICES] update.summary', { processed, succeeded, failed, price_error_count: priceErrors })
  return json({ ok: true, counts: { processed, succeeded, failed, price_error_count: priceErrors } })
})
