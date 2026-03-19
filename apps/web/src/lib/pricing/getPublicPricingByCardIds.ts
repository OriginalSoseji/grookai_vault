/**
 * STABILIZATION RULE:
 *
 * Current active pricing authority:
 * - Engine: v_grookai_value_v1_1
 * - App-facing read surface: v_best_prices_all_gv_v1
 *
 * All product-facing reads must continue through v_best_prices_all_gv_v1.
 *
 * Do not bypass this surface to read lower-level pricing tables directly.
 * Do not treat v_grookai_value_v1 or v_grookai_value_v2 as active pricing
 * authority unless a later explicit cutover contract says so.
 *
 * See: STABILIZATION_CONTRACT_V1.md
 */
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
  updated_at: string | null;
  last_snapshot_at: string | null;
};

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
        .select("card_print_id,confidence,listing_count,updated_at,last_snapshot_at")
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
        const rawPrice = typeof row.base_market === "number" ? row.base_market : undefined;
        const rawPriceSource = rawPrice !== undefined ? row.base_source ?? undefined : undefined;
        const rawPriceTs = rawPrice !== undefined ? row.base_ts ?? undefined : undefined;

        return [
          row.card_id,
          {
            card_print_id: row.card_id,
            // Phase 1 canonical raw-price contract:
            // - raw price value/source/timestamp come from v_best_prices_all_gv_v1
            // - optional freshness metadata comes from card_print_active_prices
            raw_price: rawPrice,
            raw_price_source: rawPriceSource,
            raw_price_ts: rawPriceTs,
            // Compatibility aliases remain until downstream UI/internal callers finish
            // converging on the raw_* contract.
            latest_price: rawPrice,
            confidence: typeof metadata?.confidence === "number" ? metadata.confidence : undefined,
            listing_count: typeof metadata?.listing_count === "number" ? metadata.listing_count : undefined,
            price_source: rawPriceSource,
            updated_at: rawPriceTs,
            active_price_updated_at: metadata?.updated_at ?? undefined,
            last_snapshot_at: metadata?.last_snapshot_at ?? undefined,
          } satisfies PublicPricingRecord,
        ];
      }),
  );
}
