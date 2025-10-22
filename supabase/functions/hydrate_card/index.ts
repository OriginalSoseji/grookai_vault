// Deno Edge Function: hydrate_card
// - Given set_code/number (and lang), fetch details from TCGdex
// - Upsert into public.card_prints (merge, do not clobber curated values)
// - Returns the row after upsert

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

type Body = {
  print_id?: string
  set_code?: string
  number?: string
  name?: string
  query?: string
  ping?: boolean
  lang?: string
}

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SB_SERVICE_ROLE_KEY')

async function fetchTcgdex(setCode: string, number: string, lang: string) {
  // Try detail by set/number; fallback to a search and pick first match
  const bySetNum = `https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(setCode)}/${encodeURIComponent(number)}`
  try {
    const r = await fetch(bySetNum, { headers: { 'Accept': 'application/json' } })
    if (r.ok) return await r.json()
  } catch {}
  // Fallback: name/number search
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

function normalizeSetCode(sc: string, num: string): string {
  const s = (sc || '').toLowerCase().trim()
  const n = (num || '').toLowerCase().trim()
  // Map odd aliases used by tcgdex to canonical where possible
  if ((s === 'me' || s === 'me01' || s === 'me1') && n.startsWith('rc')) return 'g1'
  return sc
}

async function searchFirstByName(name: string, lang: string) {
  try {
    const url = `https://api.tcgdex.net/v2/${lang}/cards?name=${encodeURIComponent(name)}`
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return null
    const arr = (await r.json()) as any[]
    if (!Array.isArray(arr) || arr.length === 0) return null
    let best: { set_code: string; number: string; image?: string } | null = null
    let bestScore = -1e9
    for (const c of arr) {
      const setId: string = (c?.set?.id || c?.setId || '').toString().toLowerCase()
      const localId: string = (c?.localId || c?.number || '').toString()
      const nm: string = (c?.name || '').toString().toLowerCase()
      if (!setId || !localId) continue
      let score = 0
      if (/^me(01|1)?$/.test(setId)) score -= 100 // avoid alias
      if (/^rc/i.test(localId)) score += 10
      if (setId === 'g1') score += 8
      if (setId === 'sts' || setId === 'prc') score += 6
      if (/gardevoir/.test(nm) && setId === 'sts') score += 2
      if (score > bestScore) {
        bestScore = score
        best = { set_code: setId, number: localId, image: c?.image as string | undefined }
      }
    }
    return best
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { print_id, set_code, number, name, query, ping, lang = 'en' } = (await req.json()) as Body

  // Warmup: allow a cheap health check that doesn't hit external APIs or DB writes
  if (ping) return json({ ok: true, warm: true })

  // If print_id missing and no set/number, try to find by name/query
  let sc = set_code
  let num = number
  if (!print_id && (!sc || !num)) {
    const q = (name || query || '').toString().trim()
    if (q.length < 2) return err(400, 'missing_params', 'Provide print_id or set_code+number or name')
    const found = await searchFirstByName(q, lang)
    if (!found) return err(404, 'not_found', 'Card not found by name')
    sc = found.set_code
    num = found.number
  }

  // Use a privileged client for DB writes. If a service key is available,
  // do NOT forward the user's Authorization header (it would downgrade
  // privileges and re-enable RLS constraints). If no service key is present,
  // fall back to anon and forward Authorization so reads still respect the user.
  const hasService = Boolean(SERVICE_ROLE)
  const key = (hasService ? SERVICE_ROLE : Deno.env.get('SUPABASE_ANON_KEY'))!
  const sb = hasService
    ? createClient(SUPABASE_URL, key)
    : createClient(SUPABASE_URL, key, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })

  try {
    console.log('[HYDRATE] start', {
      hasService,
      set_code: sc ?? null,
      number: num ?? null,
      print_id: print_id ?? null,
      name: name ?? query ?? null,
      lang,
    })
  } catch {}

  let row: any = null

  if (print_id) {
    // Already in DB: return it
    const { data } = await sb.from('card_prints').select('*').eq('id', print_id).limit(1)
    row = (data ?? [])[0] ?? null
    if (row) return json({ ok: true, ...row })
    return err(404, 'not_found', 'print_id not found')
  }

  // Fetch external details
  sc = normalizeSetCode(sc!, num!)
  const card = await fetchTcgdex(sc, num!, lang)
  if (!card) return err(404, 'not_found', 'External card not found')

  const name: string = card?.name ?? 'Card'
  const image_url: string | undefined = card?.image

  // Prefer a SECURITY DEFINER RPC that safely upserts without requiring a unique constraint.
  try {
    console.log('[HYDRATE] rpc.upsert_card_print', { set_code: sc, number: num })
    const rpc = await sb.rpc('upsert_card_print', {
      p_set_code: sc,
      p_number  : num,
      p_name    : name,
      p_image_url: image_url ?? null,
    })
    const out = (rpc as any) as Record<string, any> | null
    if (!out) return err(500, 'upsert_empty', 'No row returned after upsert')
    try { console.log('[HYDRATE] rpc.success', { id: out?.id, set_code: out?.set_code, number: out?.number }) } catch {}
    return json({ ok: true, ...out })
  } catch (e) {
    try { console.error('[HYDRATE] rpc.error', String(e)) } catch {}
    // Fallback to direct upsert for environments without the RPC
    const payload: Record<string, any> = { set_code: sc, number: num, name }
    if (image_url) payload.image_url = image_url
    console.log('[HYDRATE] direct.upsert', payload)
    const { data: upserted, error } = await sb.from('card_prints').upsert(payload, {
      onConflict: 'set_code,number_norm,lang_norm',
      ignoreDuplicates: false,
    }).select().limit(1)
    if (error) {
      try { console.error('[HYDRATE] direct.error', error.message) } catch {}
      return err(500, 'upsert_failed', error.message)
    }
    const out = (upserted ?? [])[0] ?? null
    if (!out) return err(500, 'upsert_empty', 'No row returned after upsert')
    try { console.log('[HYDRATE] direct.success', { id: out?.id, set_code: out?.set_code, number: out?.number }) } catch {}
    return json({ ok: true, ...out })
  }
})
