// Supabase Edge Function: wall_feed (public read-only)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  } as Record<string, string>;
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing env" }), { status: 500, headers });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const url = new URL(req.url);
    const sp = url.searchParams;

    // Pagination
    const limitRaw = Number(sp.get("limit") ?? 50);
    const limit = Math.min(100, Math.max(0, isFinite(limitRaw) ? limitRaw : 50));
    const offsetRaw = Number(sp.get("offset") ?? 0);
    const offset = Math.max(0, isFinite(offsetRaw) ? offsetRaw : 0);
    const rangeEnd = offset + (limit > 0 ? limit - 1 : 0);

    // Filters
    const q = sp.get("q")?.trim();
    const condParams = sp.getAll("condition");
    const condFromCsv = (sp.get("conditions") ?? "").split(",").map((s) => s.trim()).filter(Boolean); // optional alias
    const conditions = [...new Set([...
      condParams.flatMap((c) => c.split(",").map((s) => s.trim()).filter(Boolean)),
      ...condFromCsv,
    ])];
    const minPrice = sp.get("min_price_cents");
    const maxPrice = sp.get("max_price_cents");

    // Build query
    let query = supabase
      .from("wall_feed_view")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (q && q.length > 0) {
      const term = `%${q}%`;
      // PostgREST or filter across three cols
      query = query.or(
        `card_name.ilike.${term},set_code.ilike.${term},card_number.ilike.${term}`
      );
    }

    if (conditions.length > 0) {
      query = query.in("condition", conditions);
    }

    if (minPrice && /^\d+$/.test(minPrice)) {
      query = query.gte("price_cents", Number(minPrice));
    }
    if (maxPrice && /^\d+$/.test(maxPrice)) {
      query = query.lte("price_cents", Number(maxPrice));
    }

    // Range pagination
    if (limit > 0) {
      query = query.range(offset, rangeEnd);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const logFilters = {
      q: q ?? null,
      conditions: conditions.length > 0 ? conditions : undefined,
      min_price_cents: minPrice ?? undefined,
      max_price_cents: maxPrice ?? undefined,
      limit,
      offset,
    };
    const line = `wall_feed: ${JSON.stringify(logFilters)}`;
    console.log(line.length > 200 ? line.slice(0, 200) + "…" : line);

    return new Response(
      JSON.stringify({ items: data ?? [], count: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json", ...headers } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(req) } },
    );
  }
});
