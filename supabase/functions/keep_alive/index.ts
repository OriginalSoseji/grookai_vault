import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } })

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SB_SERVICE_ROLE_KEY')

Deno.serve(async () => {
  try {
    const key = SERVICE_ROLE ?? Deno.env.get('SUPABASE_ANON_KEY')!
    const sb = createClient(SUPABASE_URL, key, { global: { headers: {} } })
    // Ping search and hydrate endpoints to keep warm
    await Promise.allSettled([
      sb.functions.invoke('search_cards', { body: { query: 'warm', limit: 1 } }),
      sb.functions.invoke('hydrate_card', { body: { ping: true } }),
    ])
    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})
