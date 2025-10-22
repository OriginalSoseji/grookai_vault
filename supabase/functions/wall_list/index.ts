// Supabase Edge Function: wall_list (public)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const size = Math.min(50, Number(url.searchParams.get("size") ?? 20));
    const from = (page - 1) * size;
    const to = from + size - 1;
    let q = supabase.from('v_wall_posts_public').select('*');
    const { data, error } = await q.range(from, to);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, items: data ?? [] }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
});

