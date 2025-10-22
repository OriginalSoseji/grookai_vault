// Deno Edge Function: import_drain
// - Drain queued imports and upsert into public.card_prints
// - Service role only; do not forward Authorization

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

if (!SERVICE_ROLE) {
  // Service role is required for this function
}

function normalizeSetCode(sc: string, num: string): string {
  const s = (sc || '').toLowerCase().trim()
  const n = (num || '').toLowerCase().trim()
  if ((s === 'me' || s === 'me01' || s === 'me1') && n.startsWith('rc')) return 'g1'
  return sc
}

async function fetchTcgdex(setCode: string, number: string, lang: string) {
  const bySetNum = `https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(setCode)}/${encodeURIComponent(number)}`
  try {
    const r = await fetch(bySetNum, { headers: { 'Accept': 'application/json' } })
    if (r.ok) return await r.json()
  } catch {}
  try {
    const listUrl = `https://api.tcgdex.net/v2/${lang}/cards?set=${encodeURIComponent(setCode)}&localId=${encodeURIComponent(number)}`
    const r = await fetch(listUrl, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return null
    const arr = (await r.json()) as any[]
    return arr?.[0] ?? null
  } catch {
    return null
  }
}

type PriceQuote = { low?: number; mid?: number; high?: number; currency?: string } | null
async function fetchPrices(setCode: string, number: string, lang: string): Promise<PriceQuote> {
  const base = Deno.env.get('PRICE_API_BASE_URL') ?? ''
  const apiKey = Deno.env.get('PRICE_API_KEY') ?? ''
  if (!base) return null
  const url = `${base.replace(/\/$/, '')}/prices?set=${encodeURIComponent(setCode)}&number=${encodeURIComponent(number)}&lang=${encodeURIComponent(lang)}`
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  try {
    console.log('[PRICES] fetch.start', { set_code: setCode, number, lang })
    const r = await fetch(url, { headers })
    if (!r.ok) { console.error('[PRICES] fetch.error', r.status); return null }
    const j = await r.json() as any
    const out: PriceQuote = {
      low: typeof j?.price_low === 'number' ? j.price_low : undefined,
      mid: typeof j?.price_mid === 'number' ? j.price_mid : undefined,
      high: typeof j?.price_high === 'number' ? j.price_high : undefined,
      currency: (j?.currency ?? 'USD') as string,
    }
    console.log('[PRICES] fetch.success', { price_mid: out.mid, currency: out.currency })
    return out
  } catch (e) {
    console.error('[PRICES] fetch.error', String(e))
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { limit = 50 } = (await req.json().catch(() => ({}))) as Body

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!, {})

  try { console.log('[IMPORTQ] drain.start', { limit }) } catch {}

  // Fetch jobs: queued or error with retries < 3
  const { data: jobs, error: qerr } = await sb
    .from('catalog_import_queue')
    .select('id,set_code,number,lang,status,retries')
    .or('status.eq.queued,and(status.eq.error,retries.lt.3)')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (qerr) {
    try { console.error('[IMPORTQ] drain.query.error', qerr.message) } catch {}
    return err(500, 'query_failed', qerr.message)
  }

  let processed = 0, succeeded = 0, failed = 0
  let priceErrors = 0
  for (const j of jobs ?? []) {
    processed++
    const id = j.id as string
    let sc = j.set_code as string
    const num = j.number as string
    const lang = (j.lang as string) || 'en'
    sc = normalizeSetCode(sc, num)
    try { console.log('[IMPORTQ] drain.processing', { id, sc, num, lang }) } catch {}

    // mark processing
    await sb.from('catalog_import_queue').update({ status: 'processing' }).eq('id', id)

    // fetch external
    const card = await fetchTcgdex(sc, num, lang)
    if (!card) {
      failed++
      await sb.from('catalog_import_queue').update({ status: 'error', retries: (j.retries ?? 0) + 1, last_error: 'not_found' }).eq('id', id)
      try { console.error('[IMPORTQ] drain.fail', { id, set_code: sc, number: num, lang, reason: 'not_found' }) } catch {}
      try { await sb.from('price_error_log').insert({ set_code: sc, number: num, lang, error_text: 'not_found' }) } catch {}
      continue
    }
    const name: string = card?.name ?? 'Card'
    const image_url: string | undefined = card?.image

    // upsert into card_prints using normalized unique index columns
    const payload: Record<string, any> = { set_code: sc, number: num, name, lang }
    if (image_url) payload.image_url = image_url
    const { data: upserted, error: uerr } = await sb
      .from('card_prints')
      .upsert(payload, { onConflict: 'set_code,number_norm,lang_norm', ignoreDuplicates: false })
      .select('id,set_code,number,lang')
      .limit(1)
    if (uerr) {
      failed++
      await sb.from('catalog_import_queue').update({ status: 'error', retries: (j.retries ?? 0) + 1, last_error: uerr.message }).eq('id', id)
      try { console.error('[IMPORTQ] drain.fail', { id, set_code: sc, number: num, lang, reason: uerr.message }) } catch {}
      try { await sb.from('price_error_log').insert({ set_code: sc, number: num, lang, error_text: uerr.message }) } catch {}
      continue
    }
    const print = (upserted ?? [])[0] as any
    // Aggregate prices via centralized engine
    let priceMid: number | undefined
    let currency: string | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const agg = await sb.functions.invoke('price_aggregate', { body: { set_code: sc, number: num, lang } })
        const data: any = (agg?.data ?? null)
        if (data && data.ok) {
          priceMid = data.price_mid
          currency = data.currency ?? 'USD'
          break
        }
      } catch (_) {}
      const delay = [400,1200,2500][attempt] || 2500
      await new Promise((r) => setTimeout(r, delay))
    }
    succeeded++
    await sb.from('catalog_import_queue').update({ status: 'done' }).eq('id', id)
    try { console.log('[IMPORTQ] drain.success', { id, set_code: sc, number: num, price_mid: priceMid, currency }) } catch {}
  }

  try { console.log('[IMPORTQ] drain.summary', { processed, succeeded, failed, price_error_count: priceErrors }) } catch {}
  return json({ ok: true, counts: { processed, succeeded, failed, price_error_count: priceErrors } })
})
