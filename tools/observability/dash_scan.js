// Minimal Node dashboard for scan metrics (staging)
// Env: SUPABASE_URL, SUPABASE_ANON_KEY
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

function color(x, ok, warn) {
  if (x >= ok) return '\x1b[32m' // green
  if (x >= warn) return '\x1b[33m' // yellow
  return '\x1b[31m' // red
}

async function run() {
  console.log('Scan dashboard (v_scan_daily / v_scan_failures)')
  try {
    const daily = await supabase.from('v_scan_daily').select('*').order('day', { ascending: false }).limit(7)
    if (daily.error) throw daily.error
    for (const r of daily.data ?? []) {
      const usedServer = Number(r.used_server_ratio ?? 0)
      const usedLazy = Number(r.used_lazy_ratio ?? 0)
      const conf = Number(r.mean_conf ?? 0)
      const p95 = Number(r.p95_ms ?? 0)
      const c1 = color(conf, 0.9, 0.85)
      const c2 = color(1 - usedLazy, 0.95, 0.90)
      const c3 = color(1 - p95 / 3000, 0.9, 0.8) // simplistic
      console.log(`${r.day}: scans=${r.scans} conf=${c1}${conf.toFixed(3)}\x1b[0m used_server=${(usedServer*100).toFixed(1)}% used_lazy=${c2}${(usedLazy*100).toFixed(1)}%\x1b[0m p95=${c3}${p95.toFixed(0)}ms\x1b[0m`)
    }
  } catch (e) {
    console.warn('v_scan_daily unavailable; ensure table/view exists.', e.message || e)
  }

  try {
    const fails = await supabase.from('v_scan_failures').select('*').limit(10)
    if (fails.error) throw fails.error
    console.log('Recent failures:', (fails.data ?? []).length)
  } catch (e) {
    console.warn('v_scan_failures unavailable; ensure table/view exists.')
  }
}

run()

