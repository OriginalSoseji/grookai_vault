// Dev-only backfill script (no secrets here). Use environment vars at runtime.
// 1) Select card_prints with image_url != null and image_embedding is null
// 2) Download image
// 3) TODO: Generate 768-dim embedding (model hook)
// 4) Update image_embedding

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY! // required for updates
const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase.from('card_prints').select('id,image_url').is('image_embedding', null).not('image_url', 'is', null).limit(1000)
  if (error) throw error
  for (const r of data ?? []) {
    try {
      const res = await fetch(r.image_url)
      const buf = Buffer.from(await res.arrayBuffer())
      // TODO: model hook
      const embedding = new Array(768).fill(0).map(() => Math.random() * 0.001) // placeholder
      await supabase.from('card_prints').update({ image_embedding: embedding as any }).eq('id', r.id)
      console.log('updated', r.id)
    } catch (e) {
      console.warn('skip', r.id, e)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

