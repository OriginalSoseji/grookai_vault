// Edge Function: job_worker
// Service-only worker: pulls queued jobs and executes by name with retries/backoff

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' } }
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: CORS.headers })
const err  = (code: number, message: string, details?: unknown) => json({ ok: false, code, message, details }, code)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE_KEY')
const CONCURRENCY = Number(Deno.env.get('JOB_WORKER_CONCURRENCY') || '2')
const BACKOFFS = (Deno.env.get('JOB_BACKOFF_MS') || '400,1200,2500').split(',').map(s => Number(s.trim())).filter(n=>Number.isFinite(n))

type Job = { id: string; name: string; payload: Record<string, unknown>; attempts: number; max_attempts: number }

async function runJob(sb: ReturnType<typeof createClient>, j: Job) {
  const name = j.name
  const p = j.payload || {}
  try {
    if (name === 'import_set_cards') {
      const set_code = String(p['set_code'] || '')
      if (!set_code) throw new Error('missing set_code')
      // call import-cards paging
      let page = 1
      while (true) {
        const r = await sb.functions.invoke('import-cards', { body: { setCode: set_code, page, pageSize: 200 } })
        const d: any = r?.data ?? {}
        const next = d?.nextPageHint as number | null | undefined
        if (!next || next === page) break
        page = next
      }
      return true
    }
    if (name === 'import_set_prices') {
      const set_code = String(p['set_code'] || '')
      if (!set_code) throw new Error('missing set_code')
      const r = await sb.functions.invoke('import-prices', { body: { set_code, debug: false } })
      if (r.error) throw new Error(String(r.error.message || 'import_prices_failed'))
      return true
    }
    if (name === 'hydrate_card') {
      const set_code = String(p['set_code'] || '')
      const number = String(p['number'] || '')
      const lang = String(p['lang'] || 'en')
      if (!set_code || !number) throw new Error('missing set_code/number')
      const r = await sb.functions.invoke('hydrate_card', { body: { set_code, number, lang } })
      if (r.error) throw new Error(String(r.error.message || 'hydrate_failed'))
      return true
    }
    // Unknown job -> no-op success
    return true
  } catch (e) {
    await sb.from('job_logs').insert({ job_id: j.id, level: 'error', message: 'job_failed', meta: { err: String(e) } })
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS.headers })
  if (req.method !== 'POST') return err(405, 'method_not_allowed')

  const { limit = 10 } = (await req.json().catch(()=> ({}))) as { limit?: number }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE!)

  // Fetch queued or retryable errors
  const { data: jobs, error } = await sb
    .from('jobs')
    .select('id,name,payload,attempts,max_attempts')
    .or('status.eq.queued,and(status.eq.error,attempts.lt.max_attempts)')
    .order('scheduled_at', { ascending: true })
    .limit(Math.max(1, Math.min(50, limit)))
  if (error) return err(500, 'query_failed', error.message)

  const picked: Job[] = (jobs || []).slice(0, CONCURRENCY)
  const results: { id: string; ok: boolean }[] = []
  for (const j of picked) {
    await sb.from('jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', j.id)
    let ok = await runJob(sb, j)
    if (!ok && j.attempts < j.max_attempts) {
      const nextAttempts = (j.attempts ?? 0) + 1
      const backoffMs = BACKOFFS[Math.min(BACKOFFS.length - 1, nextAttempts - 1)] || 2500
      const nextTime = new Date(Date.now() + backoffMs).toISOString()
      await sb.from('jobs').update({ status: 'error', attempts: nextAttempts, last_error: 'failed', scheduled_at: nextTime }).eq('id', j.id)
    } else {
      await sb.from('jobs').update({ status: ok ? 'done' : 'error', finished_at: new Date().toISOString() }).eq('id', j.id)
    }
    results.push({ id: j.id, ok })
  }
  return json({ ok: true, processed: results.length, results })
})

