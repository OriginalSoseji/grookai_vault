// Supabase Edge Function: wall_publish (auth required)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("Unauthorized", { status: 401 });
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: auth } },
    });
    const body = await req.json().catch(() => ({}));
    const { id, is_active, post } = body;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return new Response("Unauthorized", { status: 401 });

    if (id) {
      const { error } = await supabase
        .from("wall_posts")
        .update({ ...(post ?? {}), is_active })
        .eq("id", id)
        .eq("user_id", uid);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, id }), { status: 200 });
    } else {
      const { data, error } = await supabase
        .from("wall_posts")
        .insert([{ ...(post ?? {}), user_id: uid }])
        .select("id").single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
});

