import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketPricingScopeV1 = "parent" | "card_printing";

type MarketPricingReadRowV1 = {
  pricing_scope: string | null;
  card_print_id: string | null;
  card_printing_id: string | null;
  gv_id: string | null;
  printing_gv_id: string | null;
  finish_key: string | null;
  status: string | null;
  unavailable_reason: string | null;
  currency: string | null;
  market_close: number | null;
  source_name: string | null;
  source_label: string | null;
  observed_at: string | null;
  published_at: string | null;
  freshness: string | null;
  low_price: number | null;
  mid_price: number | null;
  high_price: number | null;
  direct_low_price: number | null;
  is_from_price: boolean | null;
  eligible_printing_count: number | null;
  lowest_active_ask: number | null;
  active_ask_listing_count: number | null;
  active_ask_observed_at: string | null;
  provenance_id: string | null;
};

export type MarketPricingRecordV1 = {
  pricing_scope: MarketPricingScopeV1;
  card_print_id: string;
  card_printing_id?: string;
  gv_id?: string;
  printing_gv_id?: string;
  finish_key?: string;
  status: "available";
  unavailable_reason?: string;
  currency: "USD";
  market_close: number;
  source_name: "tcgplayer";
  source_label: string;
  observed_at: string;
  published_at: string;
  freshness: "fresh";
  low_price?: number;
  mid_price?: number;
  high_price?: number;
  direct_low_price?: number;
  is_from_price: boolean;
  eligible_printing_count: number;
  lowest_active_ask?: number;
  active_ask_listing_count?: number;
  active_ask_observed_at?: string;
  provenance_id?: string;
};

type PricingClient = Pick<SupabaseClient, "rpc">;

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function mapRow(row: MarketPricingReadRowV1): MarketPricingRecordV1 | null {
  const marketClose = finite(row.market_close);
  if (
    !row.card_print_id ||
    marketClose === undefined ||
    row.status !== "available" ||
    row.currency !== "USD" ||
    row.source_name !== "tcgplayer" ||
    row.freshness !== "fresh" ||
    !row.observed_at ||
    !row.published_at
  ) {
    return null;
  }

  return {
    pricing_scope:
      row.pricing_scope === "card_printing" ? "card_printing" : "parent",
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id ?? undefined,
    gv_id: row.gv_id ?? undefined,
    printing_gv_id: row.printing_gv_id ?? undefined,
    finish_key: row.finish_key ?? undefined,
    status: "available",
    unavailable_reason: row.unavailable_reason ?? undefined,
    currency: "USD",
    market_close: marketClose,
    source_name: "tcgplayer",
    source_label: row.source_label?.trim() || "TCGPlayer Market",
    observed_at: row.observed_at,
    published_at: row.published_at,
    freshness: "fresh",
    low_price: finite(row.low_price),
    mid_price: finite(row.mid_price),
    high_price: finite(row.high_price),
    direct_low_price: finite(row.direct_low_price),
    is_from_price: row.is_from_price === true,
    eligible_printing_count:
      finite(row.eligible_printing_count) ?? 1,
    lowest_active_ask: finite(row.lowest_active_ask),
    active_ask_listing_count: finite(row.active_ask_listing_count),
    active_ask_observed_at: row.active_ask_observed_at ?? undefined,
    provenance_id: row.provenance_id ?? undefined,
  };
}

export async function getMarketPricingReadModelV1(
  client: PricingClient,
  {
    cardPrintIds = [],
    cardPrintingIds = [],
  }: {
    cardPrintIds?: string[];
    cardPrintingIds?: string[];
  },
): Promise<MarketPricingRecordV1[]> {
  const parentIds = Array.from(
    new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean)),
  );
  const printingIds = Array.from(
    new Set(cardPrintingIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (!parentIds.length && !printingIds.length) {
    return [];
  }

  const { data, error } = await client.rpc(
    "get_market_pricing_read_model_v1",
    {
      p_card_print_ids: parentIds.length ? parentIds : null,
      p_card_printing_ids: printingIds.length ? printingIds : null,
    },
  );
  if (error) {
    console.error("[pricing:v1] shared read model failed", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketPricingReadRowV1[])
    .map(mapRow)
    .filter((row): row is MarketPricingRecordV1 => row !== null);
}
