// Edge Function: scan_resolve
// Inputs: { image_base64?: string, embedding?: number[], name_hint?: string, number_hint?: string, lang_hint?: string }
// Behavior: If embedding provided, query pgvector RPC; fuse with hints; return best + alternatives

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Req = {
  image_base64?: string
  embedding?: number[]
  name_hint?: string
  number_hint?: string
  lang_hint?: string
}

serve(async (req: Request) => {
  try {
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
      logs.push('no-embed:TODO-image->embedding')
      // TODO: model hook to produce 768-dim vector from image
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
      let conf = Number(c.score ?? 0)
      if (num && (c.number ?? '').toUpperCase() === num && lang && (c.lang ?? '').toLowerCase() === lang) conf += 0.10
      else if (name && (c.name ?? '').toLowerCase().includes(name) && lang && (c.lang ?? '').toLowerCase() === lang) conf += 0.05
      return { ...c, confidence: Math.min(conf, 0.99) }
    })

    fused.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    const best = fused[0] || null
    const alternatives = fused.slice(1, 4)

    return new Response(
      JSON.stringify({ best, alternatives, logs, used_embedding: usedEmbedding }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})

