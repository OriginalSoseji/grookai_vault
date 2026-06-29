/**
 * STABILIZATION RULE:
 *
 * Current active pricing authority:
 * - Engine: Market Evidence Engine evidence-anchored public bridge
 * - App-facing read surface: v_market_evidence_public_pricing_bridge_reference_anchored_v1
 *
 * Product-facing reads must continue through the bridge. Do not bypass this
 * surface to read lower-level pricing tables directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type PublicBridgePriceRow = {
  card_print_id: string | null;
  grookai_value_mid: number | null;
  active_ask_signal_at: string | null;
  confidence_label: string | null;
  active_ask_listing_count: number | null;
  grookai_value_block_reason: string | null;
  market_truth: boolean | null;
  sold_comp: boolean | null;
  publishable: boolean | null;
  app_visible: boolean | null;
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

  const { data, error } = await supabase
    .from("v_market_evidence_public_pricing_bridge_reference_anchored_v1")
    .select(
      "card_print_id,grookai_value_mid,active_ask_signal_at,confidence_label,active_ask_listing_count,grookai_value_block_reason,market_truth,sold_comp,publishable,app_visible",
    )
    .in("card_print_id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as PublicBridgePriceRow[])
      .filter((row): row is PublicBridgePriceRow & { card_print_id: string } => Boolean(row.card_print_id))
      .filter(
        (row) =>
          row.grookai_value_block_reason === null &&
          row.market_truth === false &&
          row.sold_comp === false &&
          row.publishable === false &&
          row.app_visible === false,
      )
      .map((row) => {
        const rawPrice = typeof row.grookai_value_mid === "number" ? row.grookai_value_mid : undefined;
        const rawPriceSource = rawPrice !== undefined ? "grookai_value" : undefined;
        const rawPriceTs = rawPrice !== undefined ? row.active_ask_signal_at ?? undefined : undefined;
        const confidence =
          row.confidence_label === "high" ? 0.9 : row.confidence_label === "medium" ? 0.75 : row.confidence_label === "limited" ? 0.5 : undefined;

        return [
          row.card_print_id,
          {
            card_print_id: row.card_print_id,
            raw_price: rawPrice,
            raw_price_source: rawPriceSource,
            raw_price_ts: rawPriceTs,
            latest_price: rawPrice,
            confidence,
            listing_count:
              typeof row.active_ask_listing_count === "number" && Number.isFinite(row.active_ask_listing_count)
                ? row.active_ask_listing_count
                : undefined,
            price_source: rawPriceSource,
            updated_at: rawPriceTs,
            active_price_updated_at: rawPriceTs,
            last_snapshot_at: rawPriceTs,
          } satisfies PublicPricingRecord,
        ];
      }),
  );
}
