// Edge Function: ext_gateway
// Proxies external providers with caching, retry, normalization.
// Input: { provider: 'ptcg'|'tcgdex'|'justtcg'|'ebay', endpoint: string, params?: object, ttlSec?: number }

import { createClient } from 'jsr:@supabase/supabase-js@2'

type In = { provider?: string; endpoint?: string; params?: Record<string, unknown>; ttlSec?: number }

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err  = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY') || ''

const PTCG_KEY = Deno.env.get('POKEMONTCG_API_KEY') || ''
const JUSTTCG_BASE = (Deno.env.get('JUSTTCG_BASE_URL') || 'https://api.justtcg.com/v1').replace(/\/$/, '')
const JUSTTCG_KEY  = Deno.env.get('JUSTTCG_API_KEY') || ''
const EBAY_BROWSE = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const EBAY_TOKEN  = Deno.env.get('EBAY_OAUTH_TOKEN') || ''

const DEFAULT_TTL = Number(Deno.env.get('EXT_GATEWAY_CACHE_TTL_DEFAULT') || '1800')

function hashParams(p: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(Object.keys(p).sort().reduce((o,k)=>{ (o as any)[k]=p[k]; return o }, {} as Record<string,unknown>))
    const data = new TextEncoder().encode(s)
    // Simple DJB2 fallback; upstream hash not required to be crypto-strong
    let h = 5381
    for (let i=0;i<data.length;i++){ h=((h<<5)+h) + data[i] }
    return ('djb2_' + (h>>>0).toString(16))
  } catch { return 'noparams' }
}

async function getCache(sb: ReturnType<typeof createClient>, provider: string, endpoint: string, params: Record<string,unknown>) {
  const key = `${provider}:${endpoint}:${hashParams(params)}`
  const { data } = await sb.from('external_cache').select('payload,status,expires_at').eq('cache_key', key).limit(1)
  const row = (data && data[0]) || null
  return { key, row }
}

async function setCache(sb: ReturnType<typeof createClient>, key: string, provider: string, endpoint: string, params: Record<string,unknown>, status: number, payload: unknown, ttlSec: number) {
  const now = Date.now()
  const exp = new Date(now + Math.max(60, ttlSec) * 1000).toISOString()
  const body = { cache_key: key, provider, endpoint, query_hash: hashParams(params), payload, status, expires_at: exp }
  try { await sb.from('external_cache').upsert(body, { onConflict: 'cache_key' }) } catch {}
}

async function fetchPtCG(endpoint: string, params: Record<string, unknown>) {
  // endpoints: 'cards', 'sets'
  const base = 'https://api.pokemontcg.io/v2'
  if (endpoint === 'sets') {
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 250)
    const u = new URL(base + '/sets')
    u.searchParams.set('page', String(page))
    u.searchParams.set('pageSize', String(pageSize))
    const r = await fetch(u.toString(), { headers: { 'Accept': 'application/json', ...(PTCG_KEY ? { 'X-Api-Key': PTCG_KEY } : {}) } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  if (endpoint === 'cards') {
    const q = String(params.q || '')
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 250)
    const u = new URL(base + '/cards')
    if (q) u.searchParams.set('q', q)
    u.searchParams.set('page', String(page))
    u.searchParams.set('pageSize', String(pageSize))
    const r = await fetch(u.toString(), { headers: { 'Accept': 'application/json', ...(PTCG_KEY ? { 'X-Api-Key': PTCG_KEY } : {}) } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  return { status: 400, body: { error: 'unsupported_ptcg_endpoint' } }
}

async function fetchTcgdex(endpoint: string, params: Record<string, unknown>) {
  const lang = String(params.lang || 'en')
  if (endpoint === 'card_by_set_number') {
    const set = String(params.set || '')
    const num = String(params.number || '')
    const u = `https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(set)}/${encodeURIComponent(num)}`
    const r = await fetch(u, { headers: { 'Accept': 'application/json' } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  if (endpoint === 'search_cards') {
    const name = String(params.name || '')
    const u = `https://api.tcgdex.net/v2/${lang}/cards?name=${encodeURIComponent(name)}`
    const r = await fetch(u, { headers: { 'Accept': 'application/json' } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  return { status: 400, body: { error: 'unsupported_tcgdex_endpoint' } }
}

async function fetchJustTcg(endpoint: string, params: Record<string, unknown>) {
  if (!JUSTTCG_BASE || !JUSTTCG_KEY) return { status: 500, body: { error: 'justtcg_not_configured' } }
  if (endpoint === 'cards') {
    const set = String(params.set || '')
    const num = String(params.number || '')
    const url = new URL(JUSTTCG_BASE + '/cards')
    if (set) url.searchParams.set('set', set)
    if (num) url.searchParams.set('number', num)
    url.searchParams.set('game','pokemon')
    const r = await fetch(url.toString(), { headers: { 'Accept':'application/json', 'x-api-key': JUSTTCG_KEY } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  if (endpoint === 'prices') {
    const set = String(params.set || '')
    const num = String(params.number || '')
    const lang = String(params.lang || 'en')
    const url = new URL(JUSTTCG_BASE + '/prices')
    url.searchParams.set('game','pokemon')
    if (set) url.searchParams.set('set', set)
    if (num) url.searchParams.set('number', num)
    if (lang) url.searchParams.set('lang', lang)
    const r = await fetch(url.toString(), { headers: { 'Accept':'application/json', 'x-api-key': JUSTTCG_KEY } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  return { status: 400, body: { error: 'unsupported_justtcg_endpoint' } }
}

async function fetchEbay(endpoint: string, params: Record<string, unknown>) {
  if (!EBAY_TOKEN) return { status: 500, body: { error: 'ebay_not_configured' } }
  if (endpoint === 'bin_search' || endpoint === 'sold_search') {
    const q = String(params.q || '')
    const limit = Number(params.limit || 50)
    const u = new URL(EBAY_BROWSE)
    u.searchParams.set('q', q)
    u.searchParams.set('limit', String(Math.max(5, Math.min(100, limit))))
    if (endpoint === 'bin_search') u.searchParams.set('filter','buyingOptions:{FIXED_PRICE}')
    if (endpoint === 'sold_search') u.searchParams.set('filter','soldItemsOnly:true')
    const r = await fetch(u.toString(), { headers: { 'Authorization': `Bearer ${EBAY_TOKEN}`, 'Accept':'application/json' } })
    return { status: r.status, body: await r.json().catch(()=> ({})) }
  }
  return { status: 400, body: { error: 'unsupported_ebay_endpoint' } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { provider, endpoint, params = {}, ttlSec } = (await req.json().catch(()=> ({}))) as In
  if (!provider || !endpoint) return err(400, 'missing_params')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { key, row } = await getCache(sb, provider, endpoint, params)
  const now = Date.now()
  if (row) {
    try { if (row.expires_at && new Date(row.expires_at as any).getTime() > now) return json({ ok:true, status: row.status, data: row.payload, cached: true }) } catch {}
  }

  let out: { status: number; body: unknown } = { status: 500, body: { error: 'unknown_provider' } }
  if (provider === 'ptcg') out = await fetchPtCG(endpoint, params)
  else if (provider === 'tcgdex') out = await fetchTcgdex(endpoint, params)
  else if (provider === 'justtcg') out = await fetchJustTcg(endpoint, params)
  else if (provider === 'ebay') out = await fetchEbay(endpoint, params)

  const ttl = Number.isFinite(ttlSec as number) ? (ttlSec as number) : DEFAULT_TTL
  try { await setCache(sb, key, provider, endpoint, params, out.status, out.body, ttl) } catch {}

  return json({ ok: (out.status>=200 && out.status<300), status: out.status, data: out.body, cached: false })
})
