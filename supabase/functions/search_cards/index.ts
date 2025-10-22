// Deno Edge Function: search_cards
// - Searches local DB first (v_card_search -> card_prints)
// - If empty, queries TCGdex and returns slim results
// - Output shape: { results: [{ set_code, number, name, image_url?, source }] }

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

type ResultRow = {
  id?: string
  set_code?: string
  number?: string
  name?: string
  image_best?: string
  image_url?: string
  image_alt_url?: string
}

type SearchBody = {
  query?: string
  limit?: number
  lang?: string
}

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SB_SERVICE_ROLE_KEY')

// Helper: best image
const bestImage = (r: ResultRow): string | undefined =>
  (r.image_best || r.image_url || r.image_alt_url) as string | undefined

// Build a tcgdex assets url defensively if we have set_code and number
function tcgdexImgFromSetNum(lang: string, setCode: string, number: string): string | null {
  // Derive series heuristic similar to app code
  const sc = setCode.toLowerCase()
  const num = number
  // Generations (g1, g2, ...) live under xy
  if (/^g\d+$/.test(sc)) return `https://assets.tcgdex.net/${lang}/xy/${sc}/${num}/high.png`
  if (sc === 'ex5.5' || sc === 'ex5pt5' || sc === 'tk2') return `https://assets.tcgdex.net/${lang}/ex/tk2/${num}/high.png`
  if (sc.startsWith('me')) return null // avoid invalid family
  let series = 'base'
  if (sc.startsWith('sv')) series = 'sv'
  else if (sc.startsWith('sm')) series = 'sm'
  else if (sc.startsWith('bw')) series = 'bw'
  else if (sc.startsWith('xy')) series = 'xy'
  else if (sc.startsWith('base')) series = 'base'
  else series = sc.replace(/[^a-z]/g, '')
  return `https://assets.tcgdex.net/${lang}/${series}/${sc}/${num}/high.png`
}

async function searchLocal(sb: ReturnType<typeof createClient>, q: string, limit: number) {
  // Try view first
  try {
    const { data, error } = await sb
      .from('v_card_search')
      .select('id, set_code, number, name, image_best')
      .or(`name.ilike.%${q}%,set_code.ilike.%${q}%`)
      .limit(limit)

    if (error) throw error
    return (data ?? []) as ResultRow[]
  } catch {
    // Fallback to table
    const { data } = await sb
      .from('card_prints')
      .select('id, set_code, number, name, image_url, image_alt_url')
      .or(`name.ilike.%${q}%,set_code.ilike.%${q}%`)
      .limit(limit)
    return (data ?? []) as ResultRow[]
  }
}

async function searchTcgdex(q: string, limit: number, lang: string) {
  try {
    // Best-effort: TCGdex public API search by name
    const url = `https://api.tcgdex.net/v2/${lang}/cards?name=${encodeURIComponent(q)}`
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return []
    const arr = (await r.json()) as any[]
    return arr.slice(0, limit).map((c) => {
      let setCode = c?.set?.id ?? c?.setId ?? ''
      let number = c?.localId ?? c?.number ?? ''
      const name = c?.name ?? 'Card'
      let image_url: string | null = c?.image ?? null
      if (!image_url && setCode && number) image_url = tcgdexImgFromSetNum(lang, setCode, number)
      // Fallback: try to parse set/num from image URL if missing
      if ((!setCode || !number) && image_url) {
        const m = image_url.match(/assets\.tcgdex\.net\/[a-z]+\/([a-z0-9]+)\/([a-z0-9\.]+)\/([^\/]+)\//i)
        if (m) {
          setCode = setCode || m[2]
          number = number || m[3]
        }
      }
      // Alias normalization for known odd codes
      if ((/^me(01|1)?$/i.test(setCode)) && /^rc/i.test(number)) {
        setCode = 'g1'
      }
      return { set_code: setCode, number, name, image_url: image_url ?? undefined, source: 'tcgdex' }
    })
  } catch {
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { query, limit = 20, lang = 'en' } = (await req.json()) as SearchBody
  const q = (query ?? '').toString().trim()
  if (q.length < 2) return json({ results: [] })

  const key = SERVICE_ROLE ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const sb = createClient(SUPABASE_URL, key, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })

  // 1) Local DB
  let local: ResultRow[] = []
  try {
    local = await searchLocal(sb, q, limit)
  } catch (e) {
    // fallthrough to external
  }
  if (local.length > 0) {
    const results = local.map((r) => ({
      id: r.id,
      set_code: r.set_code,
      number: r.number,
      name: r.name,
      image_url: bestImage(r),
      source: 'db',
    }))
    return json({ results })
  }

  // 2) External (TCGdex)
  try {
    const external = await searchTcgdex(q, limit, lang)
    return json({ results: external })
  } catch (e) {
    return err(500, 'search_failed', String(e))
  }
})
