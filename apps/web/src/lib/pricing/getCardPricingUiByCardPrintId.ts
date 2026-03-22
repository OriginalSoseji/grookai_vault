import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";

type CardPricingUiRow = {
  card_print_id: string | null;
  primary_price: number | null;
  primary_source: string | null;
  grookai_value: number | null;
  min_price: number | null;
  max_price: number | null;
  variant_count: number | null;
  ebay_median_price: number | null;
  ebay_listing_count: number | null;
};

export type CardPricingUiRecord = {
  card_print_id: string;
  primary_price?: number;
  primary_source?: "justtcg" | "ebay";
  grookai_value?: number;
  min_price?: number;
  max_price?: number;
  variant_count?: number;
  ebay_median_price?: number;
  ebay_listing_count?: number;
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function getCardPricingUiByCardPrintId(cardPrintId: string): Promise<CardPricingUiRecord | null> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("v_card_pricing_ui_v1")
    .select(
      "card_print_id,primary_price,primary_source,grookai_value,min_price,max_price,variant_count,ebay_median_price,ebay_listing_count",
    )
    .eq("card_print_id", normalizedCardPrintId)
    .maybeSingle();

  if (error) {
    console.error("[pricing:ui] getCardPricingUiByCardPrintId failed", {
      cardPrintId: normalizedCardPrintId,
      error,
    });
    return null;
  }

  const row = (data ?? null) as CardPricingUiRow | null;
  if (!row?.card_print_id) {
    return null;
  }

  const primarySource = row.primary_source === "justtcg" || row.primary_source === "ebay" ? row.primary_source : undefined;

  return {
    card_print_id: row.card_print_id,
    primary_price: toNumber(row.primary_price),
    primary_source: primarySource,
    grookai_value: toNumber(row.grookai_value),
    min_price: toNumber(row.min_price),
    max_price: toNumber(row.max_price),
    variant_count: typeof row.variant_count === "number" && Number.isFinite(row.variant_count) ? row.variant_count : undefined,
    ebay_median_price: toNumber(row.ebay_median_price),
    ebay_listing_count:
      typeof row.ebay_listing_count === "number" && Number.isFinite(row.ebay_listing_count) ? row.ebay_listing_count : undefined,
  };
}
