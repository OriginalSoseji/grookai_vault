// Supabase Edge Function: wall_user_feed (auth required)
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
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id;
    if (!uid) return new Response("Unauthorized", { status: 401 });
    // Personalized feed: own posts + followees first (simplified)
    const { data: follows } = await supabase
      .from('wall_follows')
      .select('followee_id')
      .eq('follower_id', uid);
    const ids = [uid, ...(follows?.map((x:any)=>x.followee_id) ?? [])];
    const { data, error } = await supabase
      .from('v_wall_posts_public')
      .select('*')
      .in('user_id', ids)
      .limit(50);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, items: data ?? [] }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
});

