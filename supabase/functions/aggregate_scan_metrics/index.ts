// Edge Function: aggregate_scan_metrics
// Rolls up v_scan_daily into scan_daily_metrics table
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, supabaseKey)
  try {
    const { data, error } = await client.from('v_scan_daily').select('*')
    if (error) throw error
    for (const r of (data as any[] ?? [])) {
      const payload = {
        day: r.day,
        scans: r.scans ?? 0,
        used_server_pct: r.used_server_ratio ?? 0,
        used_lazy_pct: r.used_lazy_ratio ?? 0,
        mean_conf: r.mean_conf ?? 0,
        p95_ms: r.p95_ms ?? 0,
        updated_at: new Date().toISOString(),
      }
      await client.from('scan_daily_metrics').upsert(payload, { onConflict: 'day' })
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

