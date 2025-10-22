// Edge Function: scan_resolve
// Inputs: { image_base64?: string, embedding?: number[], name_hint?: string, number_hint?: string, lang_hint?: string }
// Behavior: If embedding provided, query pgvector RPC; fuse with hints; return best + alternatives

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { embedImage } from './model.ts'
import { MODEL, TIMEOUT_MS, WEIGHTS, CONF_ACCEPT, CONF_STRONG, MAX_CONCURRENT, FUNC_TIMEOUT_MS } from './config.ts'

type Req = {
  image_base64?: string
  embedding?: number[]
  name_hint?: string
  number_hint?: string
  lang_hint?: string
}

// naive per-invocation semaphore (doesn't span instances; placeholder)
let inFlight = 0

serve(async (req: Request) => {
  try {
    const start = Date.now()
    if (inFlight >= MAX_CONCURRENT) {
      return new Response(JSON.stringify({ error: 'busy' }), { status: 429, headers: { 'Content-Type': 'application/json' } })
    }
    inFlight++
    const { image_base64, embedding, name_hint, number_hint, lang_hint }: Req = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const client = createClient(supabaseUrl, supabaseAnonKey)

    const logs: string[] = []
    let usedEmbedding = false
    let vector: number[] | null = null
    if (Array.isArray(embedding) && embedding.length > 0) {
      vector = embedding
      usedEmbedding = true
    } else if (image_base64) {
      try {
        const bytes = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0))
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
        // We don't actually pass signal to embedImage since it's a local call;
        // timeout is best-effort (in case of remote provider implementation)
        const v = await embedImage(bytes)
        clearTimeout(t)
        vector = v
        usedEmbedding = true
        logs.push(`embed.ok model=${MODEL}`)
      } catch (e) {
        logs.push('embed.error:' + String(e))
      }
    }

    // Query by embedding if available
    let candidates: any[] = []
    if (vector) {
      const { data, error } = await client.rpc('cardprints_search_by_embedding', { query: vector, top_k: 10 })
      if (error) logs.push('rpc.error:' + error.message)
      if (data) candidates = data
    }

    // Fuse with hints: boost number+lang, then name+lang
    const num = (number_hint ?? '').toUpperCase().trim()
    const lang = (lang_hint ?? '').toLowerCase().trim()
    const name = (name_hint ?? '').toLowerCase().trim()

    const fused = candidates.map((c) => {
      const e = Number(c.score ?? 0) // embedding similarity in [0,1]
      const isNumLang = num && (c.number ?? '').toUpperCase() === num && lang && (c.lang ?? '').toLowerCase() === lang
      const isNameLang = name && (c.name ?? '').toLowerCase().includes(name) && lang && (c.lang ?? '').toLowerCase() === lang
      const numBoost = isNumLang ? 1 : 0
      const txtBoost = isNameLang ? 1 : 0
      let score = WEIGHTS.wE * e + WEIGHTS.wN * numBoost + WEIGHTS.wT * txtBoost
      if (isNumLang) score += 0.08 // promote exact number+lang
      const confidence = Math.max(0, Math.min(score, 1))
      return { ...c, confidence }
    })

    fused.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    const best = fused[0] || null
    const alternatives = fused.slice(1, 4)

    const body = { best, alternatives, logs, used_embedding: usedEmbedding, model: MODEL, thresholds: { CONF_ACCEPT, CONF_STRONG }, ms: Date.now() - start }
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  finally { inFlight = Math.max(0, inFlight - 1) }
})
