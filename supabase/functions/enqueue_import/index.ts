// Deno Edge Function: enqueue_import
// - Enqueue a catalog import job for set_code/number/lang
// - Idempotent per (set_code, number_norm, lang_norm)

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

type Body = { set_code?: string; number?: string; lang?: string }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')

function normalizeSetCode(sc: string, num: string): string {
  const s = (sc || '').toLowerCase().trim()
  const n = (num || '').toLowerCase().trim()
  if ((s === 'me' || s === 'me01' || s === 'me1') && n.startsWith('rc')) return 'g1'
  return sc
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { set_code, number, lang = 'en' } = (await req.json()) as Body
  const sc = (set_code ?? '').toString().trim()
  const num = (number ?? '').toString().trim()
  const langNorm = (lang ?? 'en').toString().trim() || 'en'
  if (sc.length < 1 || num.length < 1) return err(400, 'missing_params', 'Provide set_code and number')
  const scNorm = normalizeSetCode(sc, num)

  const hasService = Boolean(SERVICE_ROLE)
  const key = (hasService ? SERVICE_ROLE : Deno.env.get('SUPABASE_ANON_KEY'))!
  const sb = hasService ? createClient(SUPABASE_URL, key) : createClient(SUPABASE_URL, key, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })

  try { console.log('[IMPORTQ] enqueue.start', { sc: scNorm, num, lang: langNorm, hasService }) } catch {}

  // Check existing
  const { data: existing } = await sb
    .from('catalog_import_queue')
    .select('id,status,set_code,number,lang')
    .eq('set_code', scNorm)
    .eq('number', num)
    .eq('lang', langNorm)
    .limit(1)

  if (existing && existing.length > 0) {
    const row = existing[0]
    try { console.log('[IMPORTQ] enqueue.exists', row) } catch {}
    // attempt async drain kick for fast path
    if (hasService) {
      try { await sb.functions.invoke('import_drain', { body: { limit: 1 } }); } catch { /* best effort */ }
    }
    return json({ ok: true, id: row.id, status: row.status, set_code: row.set_code, number: row.number, lang: row.lang })
  }

  // Insert queued
  const { data: inserted, error } = await sb
    .from('catalog_import_queue')
    .insert({ set_code: scNorm, number: num, lang: langNorm, status: 'queued' })
    .select()
    .limit(1)
  if (error) {
    try { console.error('[IMPORTQ] enqueue.error', error.message) } catch {}
    return err(500, 'enqueue_failed', error.message)
  }
  const row = (inserted ?? [])[0]
  try { console.log('[IMPORTQ] enqueue.inserted', row) } catch {}
  // attempt async drain kick for fast path
  if (hasService) {
    try { await sb.functions.invoke('import_drain', { body: { limit: 1 } }); } catch { /* best effort */ }
  }
  return json({ ok: true, id: row.id, status: row.status, set_code: row.set_code, number: row.number, lang: row.lang })
})
