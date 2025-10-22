import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(url, key)

function parseCsv(p: string) {
  const rows = fs.readFileSync(p, 'utf-8').trim().split(/\r?\n/)
  const [header, ...rest] = rows
  const cols = header.split(',')
  return rest.map((line) => {
    const vals = line.split(',')
    const o: any = {}
    cols.forEach((c, i) => (o[c.trim()] = (vals[i] ?? '').trim()))
    return o
  })
}

async function main() {
  const file = path.join('tools', 'qa', 'scanner_matrix.csv')
  const rows = parseCsv(file)
  const results: any[] = []
  for (const r of rows) {
    try {
      const body: any = {
        name_hint: '',
        number_hint: r.number,
        lang_hint: r.lang,
      }
      const res = await supabase.functions.invoke('scan_resolve', { body })
      const best = res.data?.best
      const confidence = best?.confidence ?? 0
      results.push({ ...r, confidence, path: res.data?.used_embedding ? 'server' : 'unknown' })
      console.log(`${r.set_code}#${r.number} ${r.lang} -> ${confidence.toFixed(3)} (${best?.card_print_id ?? 'none'})`)
    } catch (e) {
      results.push({ ...r, error: String(e) })
      console.warn('row error', r, e)
    }
  }
  const outDir = path.join('tools', 'qa', 'reports')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'last_run.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })

