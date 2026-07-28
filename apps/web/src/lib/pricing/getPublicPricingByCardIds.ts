import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketPricingReadModelV1 } from "./marketPricingReadModelV1";

export type CanonicalRawPricingRecord = {
  card_print_id: string;
  raw_price?: number;
  raw_price_source?: string;
  raw_price_ts?: string;
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
  active_price_updated_at?: string;
  last_snapshot_at?: string;
};

export type PublicPricingRecord = CanonicalRawPricingRecord;

export async function getPublicPricingByCardIds(
  supabase: SupabaseClient,
  cardPrintIds: string[],
): Promise<Map<string, PublicPricingRecord>> {
  const records = await getMarketPricingReadModelV1(supabase, {
    cardPrintIds,
  }).catch((error) => {
    console.error(
      "[pricing:v1] shared market read failed; search will continue without pricing enrichment",
      error,
    );
    return [];
  });
  if (records.length === 0) {
    return new Map();
  }
  const parents = records.filter((record) => record.pricing_scope === "parent");

  return new Map(
    parents.map((record) => [
      record.card_print_id,
      {
        card_print_id: record.card_print_id,
        raw_price: record.market_close,
        raw_price_source: "tcgplayer_market",
        raw_price_ts: record.observed_at,
        latest_price: record.market_close,
        confidence: 1,
        listing_count: record.active_ask_listing_count,
        price_source: "tcgplayer_market",
        updated_at: record.published_at,
        active_price_updated_at: record.active_ask_observed_at,
        last_snapshot_at: record.published_at,
      },
    ]),
  );
}
