import type { SupabaseClient } from "@supabase/supabase-js";

type CompatibilityPriceRow = {
  card_id: string | null;
  base_market: number | null;
  base_source: string | null;
  base_ts: string | null;
};

type ActivePriceMetadataRow = {
  card_print_id: string | null;
  confidence: number | null;
  listing_count: number | null;
};

export type PublicPricingRecord = {
  card_print_id: string;
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
};

type PricingClient = SupabaseClient;

export async function getPublicPricingByCardIds(
  supabase: PricingClient,
  cardPrintIds: string[],
): Promise<Map<string, PublicPricingRecord>> {
  const uniqueIds = Array.from(new Set(cardPrintIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const [{ data: compatibilityData, error: compatibilityError }, { data: activePriceData, error: activePriceError }] =
    await Promise.all([
      supabase
        .from("v_best_prices_all_gv_v1")
        .select("card_id,base_market,base_source,base_ts")
        .in("card_id", uniqueIds),
      // Keep these metadata fields in one helper so public callers stay aligned to the compatibility lane.
      supabase
        .from("card_print_active_prices")
        .select("card_print_id,confidence,listing_count")
        .in("card_print_id", uniqueIds),
    ]);

  if (compatibilityError) {
    throw compatibilityError;
  }

  if (activePriceError) {
    throw activePriceError;
  }

  const activePriceByCardId = new Map(
    ((activePriceData ?? []) as ActivePriceMetadataRow[])
      .filter((row): row is ActivePriceMetadataRow & { card_print_id: string } => Boolean(row.card_print_id))
      .map((row) => [row.card_print_id, row]),
  );

  return new Map(
    ((compatibilityData ?? []) as CompatibilityPriceRow[])
      .filter((row): row is CompatibilityPriceRow & { card_id: string } => Boolean(row.card_id))
      .map((row) => {
        const metadata = activePriceByCardId.get(row.card_id);
        const latestPrice = typeof row.base_market === "number" ? row.base_market : undefined;

        return [
          row.card_id,
          {
            card_print_id: row.card_id,
            latest_price: latestPrice,
            confidence: typeof metadata?.confidence === "number" ? metadata.confidence : undefined,
            listing_count: typeof metadata?.listing_count === "number" ? metadata.listing_count : undefined,
            price_source: latestPrice !== undefined ? row.base_source ?? undefined : undefined,
            updated_at: latestPrice !== undefined ? row.base_ts ?? undefined : undefined,
          } satisfies PublicPricingRecord,
        ];
      }),
  );
}
