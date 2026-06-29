/**
 * STABILIZATION RULE:
 *
 * Current active pricing authority:
 * - Engine: Market Evidence Engine approved internal price signals
 * - App-facing read surface: v_market_evidence_public_price_bridge_v1
 *
 * All product-facing reads must continue through v_market_evidence_public_price_bridge_v1.
 *
 * Do not bypass this surface to read lower-level pricing tables directly.
 * Do not treat reference APIs, active listing warehouse rows, or review events
 * as public pricing unless the bridge exposes them.
 *
 * See: MEE_PUBLIC_PRICE_BRIDGE_V1.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type PublicBridgePriceRow = {
  card_print_id: string | null;
  primary_price: number | null;
  primary_source: string | null;
  signal_at: string | null;
  confidence_label: string | null;
  active_listing_count: number | null;
  pricing_basis: string | null;
  market_truth: boolean | null;
  sold_comp: boolean | null;
  active_listing_evidence: boolean | null;
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

function isAllowedPublicPricingSource(source: string | null | undefined) {
  const normalized = source?.trim().toLowerCase();
  return normalized === "ebay";
}

export async function getPublicPricingByCardIds(
  supabase: PricingClient,
  cardPrintIds: string[],
): Promise<Map<string, PublicPricingRecord>> {
  const uniqueIds = Array.from(new Set(cardPrintIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("v_market_evidence_public_price_bridge_v1")
    .select(
      "card_print_id,primary_price,primary_source,signal_at,confidence_label,active_listing_count,pricing_basis,market_truth,sold_comp,active_listing_evidence",
    )
    .in("card_print_id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as PublicBridgePriceRow[])
      .filter((row): row is PublicBridgePriceRow & { card_print_id: string } => Boolean(row.card_print_id))
      .filter((row) => isAllowedPublicPricingSource(row.primary_source))
      .filter(
        (row) =>
          row.pricing_basis === "active_listing_market_estimate" &&
          row.active_listing_evidence === true &&
          row.market_truth === false &&
          row.sold_comp === false,
      )
      .map((row) => {
        const rawPrice = typeof row.primary_price === "number" ? row.primary_price : undefined;
        const rawPriceSource = rawPrice !== undefined ? row.primary_source ?? undefined : undefined;
        const rawPriceTs = rawPrice !== undefined ? row.signal_at ?? undefined : undefined;
        const confidence =
          row.confidence_label === "high" ? 0.9 : row.confidence_label === "medium" ? 0.75 : row.confidence_label === "low" ? 0.5 : undefined;

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
              typeof row.active_listing_count === "number" && Number.isFinite(row.active_listing_count)
                ? row.active_listing_count
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
