// Edge Function: job_enqueue
// Auth: service or authenticated (optionally); enqueues a job for worker

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err  = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')

type In = { name?: string; payload?: Record<string, unknown>; scheduled_at?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')
  const { name, payload = {}, scheduled_at } = (await req.json().catch(()=> ({}))) as In
  if (!name) return err(400, 'missing_name')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!)
  const body: Record<string, unknown> = { name, payload }
  if (scheduled_at) body['scheduled_at'] = scheduled_at
  const { data, error } = await sb.from('jobs').insert(body).select('id').limit(1)
  if (error) return err(500, 'enqueue_failed', error.message)
  return json({ ok: true, id: data?.[0]?.id })
})

