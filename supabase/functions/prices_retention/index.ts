// Deno Edge Function: prices_retention
// - Deletes card_prices older than 90 days
// - Service role only

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!, {})
  const { error } = await sb.rpc('noop')
  // delete older than 90 days
  try {
    const { count, error: delErr } = await sb.from('card_prices').delete({ count: 'estimated' }).lt('observed_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
    if (delErr) return err(500, 'retention_failed', delErr.message)
    console.log('[PRICES] retention.summary', { deleted: count ?? 0 })
    return json({ ok: true, deleted: count ?? 0 })
  } catch (e) {
    return err(500, 'retention_failed', String(e))
  }
})

