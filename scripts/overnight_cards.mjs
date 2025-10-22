// Grookai Vault — Overnight Cards Backfill Driver
// - Verifies schedules (check-sets, import-cards)
// - Imports all Pokémon sets/prints in batches, then hydrates images
// - Respects rate limits with backoff; compact operational logs
// - Appends a morning summary to REPORT.md

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ---- Project config ----
const PROJECT_REF = 'ycdxbpibncqcchqiihfz'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
const FUNCTIONS_URL = `https://${PROJECT_REF}.functions.supabase.co`

// Resolve anon key from repo (no printing)
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
if (!SUPABASE_ANON_KEY) {
  console.error('[CARDS] Missing SUPABASE_ANON_KEY. Aborting.')
  process.exit(1)
}

// Paths
const LOG_DIR = path.join(process.cwd(), 'build', 'diagnostics')
const LOG_FILE = path.join(LOG_DIR, 'overnight_cards.log')
const REPORT_FILE = path.join(process.cwd(), 'REPORT.md')
fs.mkdirSync(LOG_DIR, { recursive: true })

// ---- Utils ----
const tzFormat = (d, tz) => new Intl.DateTimeFormat('en-US', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(d)

const fmtIso = (d) => new Date(d).toISOString()
const nowUtc = () => new Date()

function logLine(s) { fs.appendFileSync(LOG_FILE, s + os.EOL) }
function readText(p) { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }

// Minimal next-run calculator for cron like: "0 5 * * *"
function nextRunFrom(cronExpr, from = new Date()) {
  const parts = (cronExpr || '').trim().split(/\s+/)
  if (parts.length < 5) return null
  const [mExp, hExp] = parts
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours(), from.getUTCMinutes(), 0, 0))
  const matchMin = (m) => String(m) === mExp
  const matchHr = (h) => {
    if (hExp.startsWith('*/')) { const step = parseInt(hExp.slice(2), 10); return Number.isFinite(step) && (h % step === 0) }
    const hh = parseInt(hExp, 10); return Number.isFinite(hh) && h === hh
  }
  const cur = new Date(start)
  if (!matchMin(cur.getUTCMinutes()) || !matchHr(cur.getUTCHours())) cur.setUTCMinutes(cur.getUTCMinutes() + 1)
  for (let i = 0; i < 7 * 24 * 60; i++) { if (matchMin(cur.getUTCMinutes()) && matchHr(cur.getUTCHours())) return new Date(cur); cur.setUTCMinutes(cur.getUTCMinutes() + 1) }
  return null
}

async function fetchJson(url, opts = {}, baseBackoff = 500) {
  let attempt = 0
  const max = 5
  let lastErr = null
  while (attempt < max) {
    try {
      const r = await fetch(url, opts)
      if (r.status === 429 || r.status >= 500) {
        const delay = Math.round(baseBackoff * Math.pow(3, attempt))
        await new Promise(res => setTimeout(res, delay))
        attempt++
        continue
      }
      const data = await r.json().catch(() => ({}))
      return { status: r.status, ok: r.ok, data, headers: r.headers }
    } catch (e) {
      lastErr = e
      const delay = Math.round(baseBackoff * Math.pow(3, attempt))
      await new Promise(res => setTimeout(res, delay))
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

// Pick first available cards view/table
async function resolveCardsViewName() {
  const candidates = ['card_prints_v', 'card_prints_view', 'card_prints']
  for (const name of candidates) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${name}?select=id&limit=1`
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json', 'Prefer': 'count=exact', 'Range': '0-0' } })
      if (r.ok) return name
    } catch {}
  }
  return 'card_prints'
}

async function countCards(viewName) {
  const url = `${SUPABASE_URL}/rest/v1/${viewName}?select=id&limit=1`
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json', 'Prefer': 'count=exact', 'Range': '0-0' } })
  return parseContentRangeTotal(r.headers) ?? null
}

async function countCardsWithImages(viewName) {
  const url = `${SUPABASE_URL}/rest/v1/${viewName}?select=id&image_url=not.is.null&limit=1`
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json', 'Prefer': 'count=exact', 'Range': '0-0' } })
  return parseContentRangeTotal(r.headers) ?? null
}

async function sampleThree(viewName) {
  const fields = 'set_code,number,name,rarity,lang as language,image_url,created_at as first_seen_at,updated_at'
  const url = `${SUPABASE_URL}/rest/v1/${viewName}?select=${encodeURIComponent(fields)}&order=updated_at.desc&limit=3`
  const { status, ok, data } = await fetchJson(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json' } })
  const rows = Array.isArray(data) ? data : []
  return { status, ok, rows }
}

async function distinctSetCodesFromDb() {
  const url = `${SUPABASE_URL}/rest/v1/card_prints?select=set_code&order=set_code&limit=1`
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json', 'Prefer': 'count=exact', 'Range': '0-0' } })
  const total = parseContentRangeTotal(r.headers) || 0
  const pageSize = 1000
  const out = new Set()
  for (let offset = 0; offset < Math.max(total, 1); offset += pageSize) {
    const pageUrl = `${SUPABASE_URL}/rest/v1/card_prints?select=set_code&order=set_code&limit=${pageSize}&offset=${offset}`
    const { ok, data } = await fetchJson(pageUrl, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json' } })
    if (!ok || !Array.isArray(data) || data.length === 0) break
    for (const row of data) if (row?.set_code) out.add(String(row.set_code))
    if (data.length < pageSize) break
  }
  return Array.from(out)
}

async function checkSetsMissing() {
  // Returns arrays of set codes (no disclosure of external sources)
  try {
    const url = `${FUNCTIONS_URL}/check-sets`
    const { ok, data } = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ fix: false }) })
    if (ok && data && Array.isArray(data.missing)) return { missing: data.missing, extra: data.extra || [] }
  } catch {}
  return { missing: [], extra: [] }
}

async function importCardsForSet(setCode, pageSize = 200) {
  // Client-driven paging using server hint
  let page = 1
  let imported = 0
  for (let attempt = 0; attempt < 1000; attempt++) {
    const url = `${FUNCTIONS_URL}/import-cards`
    const { ok, status, data } = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ setCode, page, pageSize }) })
    if (!ok) return { ok: false, status, imported }
    imported += Number(data?.imported || 0)
    const next = data?.nextPageHint
    if (!next || next === page) break
    page = next
    await new Promise(r => setTimeout(r, 350)) // ~3 req/sec max across loops
  }
  return { ok: true, status: 200, imported }
}

async function probeSetTotal(setCode) {
  // import-cards probe gives totalCount
  try {
    const url = `${FUNCTIONS_URL}/import-cards?op=probe`
    const { ok, data } = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ setCode, page: 1, pageSize: 1 }) })
    if (ok && typeof data?.totalCount === 'number') return data.totalCount
  } catch {}
  return null
}

async function countPrintsInSet(setCode) {
  const url = `${SUPABASE_URL}/rest/v1/card_prints?select=id&set_code=eq.${encodeURIComponent(setCode)}&limit=1`
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json', 'Prefer': 'count=exact', 'Range': '0-0' } })
  return parseContentRangeTotal(r.headers) ?? 0
}

async function hydrateMissingImages(setCode, max = 50) {
  // Find prints without images in this set and hydrate a limited batch
  const url = `${SUPABASE_URL}/rest/v1/card_prints?select=set_code,number,lang&set_code=eq.${encodeURIComponent(setCode)}&or=(image_url.is.null,image_url.eq.)&order=updated_at.asc&limit=${max}`
  const { ok, data } = await fetchJson(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Accept': 'application/json' } })
  if (!ok || !Array.isArray(data)) return { tried: 0, hydrated: 0 }
  let tried = 0, hydrated = 0
  for (const row of data) {
    tried++
    const lang = (row?.lang || 'en').toString().toLowerCase()
    const body = { set_code: row.set_code, number: row.number, lang }
    try {
      const resp = await fetchJson(`${FUNCTIONS_URL}/hydrate_card`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify(body) }, 500)
      if (resp.ok) hydrated++
    } catch {}
    await new Promise(r => setTimeout(r, 350))
  }
  return { tried, hydrated }
}

// ---- Main ----
(async () => {
  const start = nowUtc()
  const startUtcFmt = tzFormat(start, 'UTC')
  const startMtnFmt = tzFormat(start, 'America/Denver')

  // 1) Verify / note schedules
  const checkSetsToml = readText(path.join(process.cwd(), 'supabase', 'functions', 'check-sets', 'config.toml'))
  const mSched = checkSetsToml.match(/schedule\s*=\s*"([^"]+)"/)
  const checkSetsCron = mSched ? mSched[1] : '0 5 * * *'
  const nextCheckSets = nextRunFrom(checkSetsCron, start)
  // import-cards has no schedule by default (note as none)
  const importCardsToml = readText(path.join(process.cwd(), 'supabase', 'functions', 'import-cards', 'config.toml'))
  const mSchedImport = importCardsToml.match(/schedule\s*=\s*"([^"]+)"/)
  const importCardsCron = mSchedImport ? mSchedImport[1] : null
  const nextImportCards = importCardsCron ? nextRunFrom(importCardsCron, start) : null

  logLine(`[START] UTC=${startUtcFmt} MT=${startMtnFmt} check-sets="${checkSetsCron}" next=${nextCheckSets ? fmtIso(nextCheckSets) : 'n/a'} import-cards="${importCardsCron ?? 'none'}" next=${nextImportCards ? fmtIso(nextImportCards) : 'n/a'}`)

  // 2) Discover scope
  let dbSets = await distinctSetCodesFromDb()
  let { missing } = await checkSetsMissing()
  let allSets = Array.from(new Set([ ...dbSets, ...missing ])).sort()

  // If discovery empty, trigger a proactive check-sets fix for cards only
  if (allSets.length === 0) {
    try {
      const url = `${FUNCTIONS_URL}/check-sets`
      await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ fix: true, fixMode: 'cards', throttleMs: 200 }) })
      // allow a short settle, then re-discover
      await new Promise(r => setTimeout(r, 1500))
      dbSets = await distinctSetCodesFromDb()
      ;({ missing } = await checkSetsMissing())
      allSets = Array.from(new Set([ ...dbSets, ...missing ])).sort()
    } catch {}
  }

  // estimate expected counts per set (via probe) and current counts
  const setMeta = []
  let expectedTotal = 0
  for (const sc of allSets) {
    const expected = await probeSetTotal(sc)
    const existing = await countPrintsInSet(sc)
    if (typeof expected === 'number') expectedTotal += expected
    setMeta.push({ set_code: sc, expected, existing, remaining: expected != null ? Math.max(0, expected - existing) : null })
    await new Promise(r => setTimeout(r, 200))
  }

  // 2) Backfill loop
  let loop = 0
  let consecutiveZero = 0
  let totalProcessed = 0
  let totalInserted = 0
  let totalHydrated = 0
  let totalFailed = 0
  let consecutiveFailures = 0
  const HARD_FAIL_CAP = 25
  const startedAt = Date.now()

  while (true) {
    loop++
    let loopProcessed = 0
    let loopInserted = 0
    let loopHydrated = 0
    const t0 = Date.now()

    for (const sm of setMeta) {
      const sc = sm.set_code
      // Skip sets that appear complete (if expected known)
      if (sm.expected != null && sm.existing >= sm.expected) continue
      const { ok, imported } = await importCardsForSet(sc, 200)
      if (!ok) { totalFailed++; consecutiveFailures++; if (consecutiveFailures >= HARD_FAIL_CAP) { logLine(`[STOP] hard_cap_failures cap=${HARD_FAIL_CAP}`); break } }
      else { consecutiveFailures = 0 }
      if (imported > 0) {
        loopProcessed += imported
        loopInserted += imported
        sm.existing += imported
        if (sm.expected != null) sm.remaining = Math.max(0, sm.expected - sm.existing)
      }
      // Light image hydration pass per set
      const { tried, hydrated } = await hydrateMissingImages(sc, 30)
      loopProcessed += hydrated
      loopHydrated += hydrated
      await new Promise(r => setTimeout(r, 300))
    }

    totalProcessed += loopProcessed
    totalInserted += loopInserted
    totalHydrated += loopHydrated

    const elapsedMs = Date.now() - t0
    const avgPerUnit = totalProcessed > 0 ? (Date.now() - startedAt) / Math.max(1, totalProcessed) : 0
    const remaining = setMeta.reduce((acc, s) => acc + (s.remaining ?? 0), 0)
    const etaMs = (remaining && avgPerUnit) ? Math.round(remaining * avgPerUnit) : null

    logLine(`[LOOP ${loop}] sets=${setMeta.length} batch=~200 processed=${loopProcessed} inserted=${loopInserted} hydrated=${loopHydrated} failed=${totalFailed} elapsed_ms=${elapsedMs}` + (etaMs ? ` eta_ms~=${etaMs}` : ''))

    if (loop % 5 === 0) {
      const setsDone = setMeta.filter(s => s.expected != null && s.existing >= s.expected).length
      const printsExpected = setMeta.reduce((a, s) => a + (s.expected ?? 0), 0)
      const printsDone = setMeta.reduce((a, s) => a + Math.min(s.existing, (s.expected ?? s.existing)), 0)
      logLine(`[SCOPE] sets_done=${setsDone}/${setMeta.length} prints_done=${printsDone}/${printsExpected || 'unknown'}`)
    }

    // Stop conditions
    if (loopProcessed === 0) consecutiveZero++; else consecutiveZero = 0
    const reachedByZero = consecutiveZero >= 2
    const printsExpected = setMeta.reduce((a, s) => a + (s.expected ?? 0), 0)
    const reachedByCount = printsExpected ? (totalProcessed >= 0.98 * printsExpected && setMeta.every(s => (s.remaining ?? 0) <= 0)) : false
    if (reachedByZero || reachedByCount) { logLine(`[STOP] reason=${reachedByZero ? 'two_consecutive_zero' : 'expected_count_reached'}`); break }

    await new Promise(r => setTimeout(r, 400)) // keep ~2–3 req/sec across loop
  }

  // 3) Validation snapshot
  const viewName = await resolveCardsViewName()
  let viewStatus = 'unknown'
  let totalCards = null, withImages = null
  try {
    totalCards = await countCards(viewName)
    withImages = await countCardsWithImages(viewName)
    viewStatus = '200'
  } catch { viewStatus = 'view_unavailable' }

  const sample = await sampleThree(viewName).catch(() => ({ status: 0, ok: false, rows: [] }))
  const fieldsOk = (sample.rows && sample.rows[0]) ? ['set_code','number','name','language','image_url','updated_at'].every(k => k in sample.rows[0]) : false

  // 5) Morning summary
  const end = nowUtc()
  const today = new Date().toISOString().slice(0, 10)
  const summary = []
  summary.push(`## Overnight Cards Backfill — Results (${today})`)
  summary.push('')
  summary.push('Run window:')
  summary.push(`- UTC: ${tzFormat(start, 'UTC')} → ${tzFormat(end, 'UTC')}`)
  summary.push(`- America/Denver: ${tzFormat(start, 'America/Denver')} → ${tzFormat(end, 'America/Denver')}`)
  summary.push('')
  const setsCompleted = setMeta.filter(s => s.expected != null && s.existing >= s.expected).length
  const residual = setMeta.filter(s => (s.remaining ?? 0) > 0).map(s => s.set_code)
  summary.push('Sets:')
  summary.push(`- Discovered: ${setMeta.length}`)
  summary.push(`- Completed: ${setsCompleted}`)
  summary.push(`- Residual gaps: ${residual.length ? residual.join(', ') : 'none'}`)
  summary.push('')
  const printsExpected = setMeta.reduce((a, s) => a + (s.expected ?? 0), 0)
  const failureRate = totalProcessed > 0 ? ((totalFailed / totalProcessed) * 100).toFixed(2) : '0.00'
  summary.push('Prints:')
  summary.push(`- Expected: ${printsExpected || 'unknown'}`)
  summary.push(`- Processed: ${totalProcessed}`)
  summary.push(`- Inserted: ${totalInserted}`)
  summary.push(`- Failed: ${totalFailed} (${failureRate}%)`)
  summary.push('')
  const imagesPct = (totalCards && withImages != null) ? `${Math.round((withImages / totalCards) * 100)}%` : 'unknown'
  summary.push('Images:')
  summary.push(`- With image_url: ${withImages ?? 'unknown'} (${imagesPct} of total prints)`) 
  summary.push('')
  summary.push('View check:')
  summary.push(`- View: public.${viewName}`)
  summary.push(`- Status: ${viewStatus}`)
  if (totalCards != null) summary.push(`- COUNT(*): ${totalCards}`)
  if (withImages != null) summary.push(`- COUNT(image_url IS NOT NULL): ${withImages}`)
  summary.push('')
  const coverageCore = totalCards != null ? `${Math.round((totalCards / Math.max(printsExpected || totalCards, 1)) * 100)}%` : 'unknown'
  summary.push('Coverage:')
  summary.push(`- Core fields present: ${coverageCore}`)
  summary.push(`- With images: ${imagesPct}`)
  summary.push('')
  summary.push('Notes:')
  summary.push(`- Throttling: ~2–3 req/sec aggregate; backoff 0.5s→1.5s→4s on 429/5xx`)
  if (!sample.ok || !fieldsOk) summary.push(`- View sample fields missing or view unavailable — schema reload may be needed`)
  summary.push('')
  const nextCheck = nextRunFrom(checkSetsCron, end)
  summary.push('Next run:')
  summary.push(`- check-sets cron (${checkSetsCron}) next UTC: ${nextCheck ? fmtIso(nextCheck) : 'n/a'}`)
  summary.push('')

  fs.appendFileSync(REPORT_FILE, summary.join('\n') + '\n')
})().catch((e) => { logLine(`[FATAL] ${String(e && e.stack || e)}`); process.exit(1) })
