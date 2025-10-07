// File: supabase/functions/price-cron/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ProviderPrice = { price: number; source: string } | null;

async function fetchFromTCGplayer(_cardId: string): Promise<ProviderPrice> {
  const id = Deno.env.get("TCGPLAYER_CLIENT_ID");
  const secret = Deno.env.get("TCGPLAYER_CLIENT_SECRET");
  if (!id || !secret) return null;
  return null; // TODO
}

async function fetchFromEbay(_cardId: string): Promise<ProviderPrice> {
  const appId = Deno.env.get("EBAY_APP_ID");
  if (!appId) return null;
  return null; // TODO
}

async function fetchFromManualOverride(admin: any, cardId: string): Promise<ProviderPrice> {
  const { data } = await admin.from("manual_price_overrides").select("price").eq("card_id", cardId).maybeSingle();
  if (!data) return null;
  return { price: Number(data.price ?? 0), source: "manual_override" };
}

async function getBestPrice(admin: any, cardId: string): Promise<ProviderPrice> {
  const providers: Array<() => Promise<ProviderPrice>> = [
    () => fetchFromTCGplayer(cardId),
    () => fetchFromEbay(cardId),
    () => fetchFromManualOverride(admin, cardId),
  ];
  for (const p of providers) {
    try {
      const got = await p();
      if (got && got.price >= 0) return got;
    } catch (e) {
      console.error("provider error", e);
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  // 🔒 Shared secret guard
  const key = Deno.env.get("CRON_KEY");
  const got = req.headers.get("x-cron-key");
  if (key && got !== key) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1) distinct card_ids from vault_items
  const { data: rows, error: vErr } = await admin.from("vault_items").select("card_id").not("card_id", "is", null);
  if (vErr) {
    console.error(vErr);
    return new Response(JSON.stringify({ error: "vault query failed" }), { status: 500 });
  }

  const uniqueIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.card_id))));
  const batch = uniqueIds.slice(0, 500);

  let inserted = 0, skipped = 0;
  for (const cardId of batch) {
    const price = await getBestPrice(admin, cardId);
    if (!price) { skipped++; continue; }

    const { error: insErr } = await admin.from("market_prices").insert({
      card_id: cardId,
      price: price.price,
      source: price.source,
    });
    if (insErr) {
      console.error("insert price failed", cardId, insErr);
      continue;
    }
    inserted++;
    await new Promise(r => setTimeout(r, 50));
  }

  return new Response(JSON.stringify({ processed: batch.length, inserted, skipped }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
