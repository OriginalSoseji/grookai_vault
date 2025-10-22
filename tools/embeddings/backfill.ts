import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BATCH = parseInt(process.env.BATCH ?? '200')
const SLEEP_MS = parseInt(process.env.SLEEP_MS ?? '50')
const STATE_FILE = '.backfill_state.json'
const LOG_DIR = 'tools/embeddings/logs'
const CACHE_DIR = '/tmp/embed_cache'

const supabase = createClient(url, key)

type State = { lastId?: string, processed: number }

function loadState(): State {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) } catch { return { processed: 0 } }
}
function saveState(s: State) { fs.writeFileSync(STATE_FILE, JSON.stringify(s)) }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function ensureDirs() { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }); if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true }) }

async function cachedFetch(url: string): Promise<Buffer> {
  const key = path.join(CACHE_DIR, Buffer.from(url).toString('hex'))
  if (fs.existsSync(key)) return fs.readFileSync(key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(key, buf)
  return buf
}

async function backfill() {
  ensureDirs()
  const st = loadState()
  let processed = st.processed || 0
  let lastId = st.lastId
  while (true) {
    const { data, error } = await supabase
      .from('card_prints')
      .select('id,image_url')
      .is('image_embedding', null)
      .not('image_url', 'is', null)
      .order('id', { ascending: true })
      .gt('id', lastId ?? '00000000-0000-0000-0000-000000000000')
      .limit(BATCH)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      lastId = row.id
      saveState({ lastId, processed })
      try {
        const img = await cachedFetch(row.image_url)
        // TODO: replace with real embedding; for now small deterministic vector
        const emb = new Array(768).fill(0).map((_, i) => (img[i % img.length] % 7) / 1000)
        const { error: uerr } = await supabase.from('card_prints').update({ image_embedding: emb as any }).eq('id', row.id)
        if (uerr) throw uerr
        processed += 1
      } catch (e) {
        const log = path.join(LOG_DIR, `fail_${Date.now()}.log`)
        fs.writeFileSync(log, `${row.id} ${row.image_url} ${String(e)}`)
      }
      await sleep(SLEEP_MS)
    }
  }
  saveState({ lastId, processed })
  console.log('done', { processed })
}

backfill().catch((e) => { console.error(e); process.exit(1) })

