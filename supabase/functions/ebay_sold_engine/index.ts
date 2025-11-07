// Stub Edge Function: ebay_sold_engine
// Accepts { cardId: string, condition?: string, limit?: number }
// Returns recent sales from DB cache (when available) or an empty list.
// TODO: Wire actual eBay API ingestion in a separate pipeline.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = (body?.cardId ?? '').toString();
    const limit = Number(body?.limit ?? 5);
    if (!cardId) {
      return new Response(JSON.stringify({ error: 'missing cardId', sales: [] }), { status: 400 });
    }
    // Placeholder: backend view is public.sold_comps_v; client reads via REST directly when needed.
    const sales: Array<Record<string, unknown>> = [];
    console.log(JSON.stringify({ func: 'ebay_sold_engine', ok: true, cardId, limit, count: sales.length }));
    return new Response(JSON.stringify({ sales }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.log(JSON.stringify({ func: 'ebay_sold_engine', ok: false, err: String(err?.message ?? err) }));
    return new Response(JSON.stringify({ error: 'failed', sales: [] }), { status: 500 });
  }
});

