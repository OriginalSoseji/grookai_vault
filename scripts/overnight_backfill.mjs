// Grookai Vault — Overnight Pricing Backfill Driver
// - Verifies schedules
// - Loops update_prices batches with throttling and backoff
// - Fallback to price_aggregate for a small random sample if needed
// - Writes progress to build/diagnostics/overnight_backfill.log
// - Appends summary to REPORT.md on completion
//
// Notes:
// - Uses public anon key only to invoke Edge Functions and REST
// - Does NOT print secrets; reads anon key from lib/secrets.dart or .env if present
// - Timezone handling: UTC and America/Denver

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ---- Config ----
const PROJECT_REF = 'ycdxbpibncqcchqiihfz'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
const FUNCTIONS_URL = `https://${PROJECT_REF}.functions.supabase.co`

// Attempt to resolve anon key from lib/secrets.dart or .env
let SUPABASE_ANON_KEY = ''
try {
  const secrets = fs.readFileSync(path.join(process.cwd(), 'lib', 'secrets.dart'), 'utf8')
  const m = secrets.match(/const\s+String\s+supabaseAnonKey\s*=\s*'([^']+)'/)
  if (m) SUPABASE_ANON_KEY = m[1]
} catch {}
if (!SUPABASE_ANON_KEY) {
  try {
    const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
    const m = env.match(/SUPABASE_ANON_KEY=([^\r\n]+)/)
    if (m) SUPABASE_ANON_KEY = m[1].trim()
  } catch {}
}
// Hard fail if no anon key — cannot invoke functions or REST
if (!SUPABASE_ANON_KEY) {
  console.error('[BACKFILL] Missing SUPABASE_ANON_KEY. Aborting.')
  process.exit(1)
}

// Paths
const LOG_DIR = path.join(process.cwd(), 'build', 'diagnostics')
const LOG_FILE = path.join(LOG_DIR, 'overnight_backfill.log')
const REPORT_FILE = path.join(process.cwd(), 'REPORT.md')

// Ensure directories
fs.mkdirSync(LOG_DIR, { recursive: true })

// ---- Helpers ----
const tzFormat = (d, tz) => new Intl.DateTimeFormat('en-US', {
  timeZone: tz,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(d)

const fmtIso = (d) => new Date(d).toISOString()

function logLine(line) {
  fs.appendFileSync(LOG_FILE, line + os.EOL)
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

// Minimal cron matcher for the two used patterns: "0 */12 * * *" and "0 3 * * *"
function nextRunFrom(cronExpr, fromDateUtc = new Date()) {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null
  const [minExpr, hourExpr /* dom */, /* dom */, /* mon */, /* dow */] = parts
  const from = new Date(Date.UTC(fromDateUtc.getUTCFullYear(), fromDateUtc.getUTCMonth(), fromDateUtc.getUTCDate(), fromDateUtc.getUTCHours(), fromDateUtc.getUTCMinutes(), 0, 0))
  function matchMinute(m) { return String(m) === minExpr }
  function matchHour(h) {
    if (hourExpr.startsWith('*/')) {
      const step = parseInt(hourExpr.slice(2), 10)
      if (!Number.isFinite(step) || step <= 0) return false
      return (h % step) === 0
    }
    const hh = parseInt(hourExpr, 10)
    return Number.isFinite(hh) ? (h === hh) : false
  }
  const cur = new Date(from)
  // If current minute isn't exact, advance to next minute boundary
  if (!matchMinute(cur.getUTCMinutes()) || !matchHour(cur.getUTCHours())) {
    cur.setUTCMinutes(cur.getUTCMinutes() + 1)
  }
  // Brute-force minute-wise up to 7 days (safe for simple patterns)
  for (let i = 0; i < 7 * 24 * 60; i++) {
    if (matchMinute(cur.getUTCMinutes()) && matchHour(cur.getUTCHours())) return new Date(cur)
    cur.setUTCMinutes(cur.getUTCMinutes() + 1)
  }
  return null
}

async function fetchJson(url, opts = {}, backoffBaseMs = 500) {
  let attempt = 0
  const maxAttempts = 5
  let lastErr = null
  while (attempt < maxAttempts) {
    try {
      const r = await fetch(url, opts)
      if (r.status === 429 || r.status >= 500) {
        const delay = Math.round(backoffBaseMs * Math.pow(3, attempt))
        await new Promise(r => setTimeout(r, delay))
        attempt++
        continue
      }
      const data = await r.json().catch(() => ({}))
      return { status: r.status, ok: r.ok, data, headers: r.headers }
    } catch (e) {
      lastErr = e
      const delay = Math.round(backoffBaseMs * Math.pow(3, attempt))
      await new Promise(r => setTimeout(r, delay))
      attempt++
    }
  }
  throw lastErr ?? new Error('fetchJson failed')
}

function parseContentRangeTotal(headers) {
  const v = headers.get('content-range') || ''
  const m = v.match(/\/(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

// Sample three rows from public.latest_card_prices_v
async function sampleLatestPrices() {
  const url = `${SUPABASE_URL}/rest/v1/latest_card_prices_v?select=card_id,price_low,price_mid,price_high,grookai_index,confidence,currency,observed_at&limit=3`
  const { status, ok, data } = await fetchJson(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
    },
  })
  return { status, ok, rows: Array.isArray(data) ? data : [] }
}

async function countLatestPricesMaybe() {
  const url = `${SUPABASE_URL}/rest/v1/latest_card_prices_v?select=id&limit=1`
  const { status, ok } = await fetchJson(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  })
  return { status, ok }
}

async function getCardPrintsCount() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/card_prints?select=id&limit=1`
    const r = await fetch(`${url}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Prefer': 'count=exact',
        'Range': '0-0',
      },
    })
    const total = parseContentRangeTotal(r.headers)
    return total || null
  } catch { return null }
}

async function invokeUpdatePrices(limit = 200) {
  try {
    const url = `${FUNCTIONS_URL}/update_prices`
    const { status, ok, data } = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ limit }),
    })
    if (!ok) return { ok: false, status, processed: 0, succeeded: 0, failed: 0, inserted: 0 }
    const counts = data?.counts || {}
    return {
      ok: true,
      status,
      processed: Number(counts.processed || 0),
      succeeded: Number(counts.succeeded || 0),
      failed: Number(counts.failed || 0),
      inserted: Number(counts.succeeded || 0), // approximate
    }
  } catch {
    return { ok: false, status: 0, processed: 0, succeeded: 0, failed: 0, inserted: 0 }
  }
}

async function invokePriceAggregate({ set_code, number, lang = 'en' }) {
  try {
    const url = `${FUNCTIONS_URL}/price_aggregate`
    const { status, ok, data } = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ set_code, number, lang }),
    })
    if (!ok) return { ok: false, status, wrote: false }
    return { ok: true, status, wrote: !!data?.wrote_snapshot }
  } catch {
    return { ok: false, status: 0, wrote: false }
  }
}

// Discover a small random pool of prints as fallback work
async function getRandomPrintPairs(limit = 10) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/card_prints?select=set_code,number&order=updated_at.desc&limit=${limit}`
    const { ok, data } = await fetchJson(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      },
    })
    if (!ok || !Array.isArray(data)) return []
    return data.map(r => ({ set_code: r.set_code, number: r.number }))
  } catch { return [] }
}

// ---- Main driver ----
(async () => {
  const startUtc = new Date()
  const startMtn = tzFormat(startUtc, 'America/Denver')
  const startUtcFmt = tzFormat(startUtc, 'UTC')

  // Verify schedules
  const updSched = readJson(path.join(process.cwd(), 'supabase', 'functions', 'update_prices', 'schedule.json'))
  const retSched = readJson(path.join(process.cwd(), 'supabase', 'functions', 'prices_retention', 'schedule.json'))
  const updCron = updSched?.schedule || '0 */12 * * *'
  const retCron = retSched?.schedule || '0 3 * * *'
  const nextUpd = nextRunFrom(updCron, new Date())
  const nextRet = nextRunFrom(retCron, new Date())

  logLine(`[START] UTC=${startUtcFmt} MT=${startMtn} upd_cron="${updCron}" next_upd=${nextUpd ? fmtIso(nextUpd) : 'n/a'} ret_cron="${retCron}" next_ret=${nextRet ? fmtIso(nextRet) : 'n/a'}`)

  // Discover scope
  const expectedCount = await getCardPrintsCount()
  logLine(`[DISCOVER] expected_card_prints=${expectedCount ?? 'unknown'}`)

  let totalProcessed = 0
  let totalSucceeded = 0
  let totalFailed = 0
  let totalInserted = 0
  let consecutiveZero = 0
  let loop = 0
  const HARD_FAIL_CAP = 25
  let consecutiveFailures = 0
  const startedAt = Date.now()

  while (true) {
    loop++
    const t0 = Date.now()
    // Primary path: batch update via update_prices
    const r = await invokeUpdatePrices(200)
    if (!r.ok) {
      consecutiveFailures++
      logLine(`[LOOP ${loop}] status=${r.status} error_on_update_prices consecutive_failures=${consecutiveFailures}`)
      if (consecutiveFailures >= HARD_FAIL_CAP) {
        logLine(`[STOP] hard_cap_failures_reached cap=${HARD_FAIL_CAP}`)
        break
      }
      await new Promise(res => setTimeout(res, 1500))
      continue
    } else {
      consecutiveFailures = 0
    }

    const { processed, succeeded, failed, inserted } = r
    totalProcessed += processed
    totalSucceeded += succeeded
    totalFailed += failed
    totalInserted += inserted

    const elapsedMs = Date.now() - t0
    const avgPerLoop = totalProcessed > 0 ? (Date.now() - startedAt) / Math.max(1, totalProcessed) : 0
    const remaining = (expectedCount && expectedCount > totalProcessed) ? (expectedCount - totalProcessed) : null
    const etaMs = (remaining && avgPerLoop) ? Math.round(remaining * avgPerLoop) : null

    logLine(`[SUMMARY ${loop}] processed=${processed} ok=${succeeded} fail=${failed} inserted_snapshots~=${inserted} elapsed_ms=${elapsedMs}` + (etaMs ? ` eta_ms~=${etaMs}` : ''))

    // Validation: quick view check every 5 loops
    if (loop % 5 === 0) {
      try {
        const { status, ok } = await countLatestPricesMaybe()
        logLine(`[VIEW] latest_card_prices_v status=${status} ok=${ok}`)
      } catch (e) {
        logLine(`[VIEW] latest_card_prices_v error schema_reload_maybe`)
      }
      try {
        const sample = await sampleLatestPrices()
        const rows = sample.rows || []
        const fieldsOk = rows.length > 0 ? ['price_low','price_mid','price_high','grookai_index','confidence','currency','observed_at'].every(k => k in rows[0]) : false
        logLine(`[SAMPLE] rows=${rows.length} status=${sample.status} fields_ok=${fieldsOk}`)
      } catch {
        logLine(`[SAMPLE] error`)
      }
    }

    // Stop conditions
    if (processed === 0) consecutiveZero++; else consecutiveZero = 0
    const reachedByZero = consecutiveZero >= 2
    const reachedByCount = (expectedCount != null) ? (totalProcessed >= 0.98 * expectedCount) : false
    if (reachedByZero || reachedByCount) {
      logLine(`[STOP] reason=${reachedByZero ? 'two_consecutive_zero' : 'expected_count_reached'} totalProcessed=${totalProcessed} expected=${expectedCount ?? 'unknown'}`)
      break
    }

    // Fallback path (light): if processed was very small, try a few direct aggregates
    if (processed < 10) {
      const pairs = await getRandomPrintPairs(6)
      let wrote = 0, tried = 0
      for (const p of pairs) {
        tried++
        const q = await invokePriceAggregate(p)
        if (q.ok && q.wrote) { wrote++; totalInserted++ }
        await new Promise(res => setTimeout(res, 350)) // throttle ~3/s
      }
      logLine(`[FALLBACK] tried=${tried} wrote=${wrote}`)
    }

    // Throttle between loops to ~2–3 req/sec overall (function-level)
    await new Promise(res => setTimeout(res, 400))
  }

  const endUtc = new Date()
  const endUtcFmt = tzFormat(endUtc, 'UTC')
  const endMtn = tzFormat(endUtc, 'America/Denver')

  // Morning summary appended to REPORT.md
  const today = new Date().toISOString().slice(0, 10)
  const failureRate = totalProcessed > 0 ? ((totalFailed / totalProcessed) * 100).toFixed(2) : '0.00'

  // View status probe
  let viewStatus = 'unknown'
  try {
    const { status, ok } = await countLatestPricesMaybe()
    viewStatus = ok ? '200' : String(status)
  } catch {}

  // Coverage estimate: naive — use processed as proxy when expectedCount known
  const coveragePct = (expectedCount && expectedCount > 0) ? Math.min(100, Math.round((totalProcessed / expectedCount) * 100)) : null

  const nextUpd2 = nextRunFrom(updCron, endUtc)
  const report = [
    `## Overnight Backfill — Results (${today})`,
    '',
    `Run window:`,
    `- UTC: ${startUtcFmt} → ${endUtcFmt}`,
    `- America/Denver: ${startMtn} → ${endMtn}`,
    '',
    `Totals:`,
    `- Prints discovered: ${expectedCount ?? 'unknown'}`,
    `- Processed: ${totalProcessed}`,
    `- Succeeded: ${totalSucceeded}`,
    `- Failed: ${totalFailed} (${failureRate}%)`,
    '',
    `Snapshots:`,
    `- Inserted (approx): ${totalInserted}`,
    `- Last observed_at: ${endUtc.toISOString()}`,
    '',
    `View check:`,
    `- public.latest_card_prices_v status: ${viewStatus} (service/anon)`,
    '',
    `Coverage estimate: ${coveragePct != null ? coveragePct + '%' : 'unknown'} (of Pokémon prints with pricing)`,
    '',
    `Notes:`,
    `- Throttling: ~2–3 function calls/sec; exponential backoff on 429/5xx`,
    `- Fallback: direct price_aggregate invoked for small batches if primary processed < 10`,
    '',
    `Next run:`,
    `- update_prices cron (${updCron}) next UTC: ${nextUpd2 ? fmtIso(nextUpd2) : 'n/a'}`,
    '',
  ].join('\n')

  fs.appendFileSync(REPORT_FILE, report + '\n')

  logLine(`[END] UTC=${endUtcFmt} MT=${endMtn} totals processed=${totalProcessed} ok=${totalSucceeded} fail=${totalFailed}`)
})().catch((e) => {
  logLine(`[FATAL] ${String(e && e.stack || e)}`)
  process.exit(1)
})
