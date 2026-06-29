import "server-only";

import { cache } from "react";
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
  display_label: string | null;
  pricing_basis: string | null;
  confidence_label: string | null;
  freshness_label: string | null;
  signal_at: string | null;
  market_truth: boolean | null;
  sold_comp: boolean | null;
  active_listing_evidence: boolean | null;
};

export type CardPricingUiRecord = {
  card_print_id: string;
  primary_price?: number;
  primary_source?: "ebay";
  grookai_value?: number;
  min_price?: number;
  max_price?: number;
  variant_count?: number;
  ebay_median_price?: number;
  ebay_listing_count?: number;
  display_label?: string;
  pricing_basis?: "active_listing_market_estimate";
  confidence_label?: "high" | "medium" | "low";
  freshness_label?: "fresh" | "aging";
  signal_at?: string;
  market_truth?: false;
  sold_comp?: false;
  active_listing_evidence?: true;
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export const getCardPricingUiByCardPrintId = cache(async function getCardPricingUiByCardPrintId(
  cardPrintId: string,
): Promise<CardPricingUiRecord | null> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("v_card_pricing_ui_v1")
    .select(
      "card_print_id,primary_price,primary_source,grookai_value,min_price,max_price,variant_count,ebay_median_price,ebay_listing_count,display_label,pricing_basis,confidence_label,freshness_label,signal_at,market_truth,sold_comp,active_listing_evidence",
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

  const isSafeMarketEstimate =
    row.primary_source === "ebay" &&
    row.pricing_basis === "active_listing_market_estimate" &&
    row.active_listing_evidence === true &&
    row.market_truth === false &&
    row.sold_comp === false;
  const primarySource: "ebay" | undefined = isSafeMarketEstimate ? "ebay" : undefined;
  const primaryPrice = primarySource ? toNumber(row.primary_price) : undefined;

  return {
    card_print_id: row.card_print_id,
    primary_price: primaryPrice,
    primary_source: primarySource,
    grookai_value: primarySource ? toNumber(row.grookai_value) : undefined,
    min_price: primarySource ? toNumber(row.min_price) : undefined,
    max_price: primarySource ? toNumber(row.max_price) : undefined,
    variant_count: primarySource && typeof row.variant_count === "number" && Number.isFinite(row.variant_count) ? row.variant_count : undefined,
    ebay_median_price: toNumber(row.ebay_median_price),
    ebay_listing_count:
      typeof row.ebay_listing_count === "number" && Number.isFinite(row.ebay_listing_count) ? row.ebay_listing_count : undefined,
    display_label: primarySource ? row.display_label ?? "Market estimate from active listing evidence" : undefined,
    pricing_basis: primarySource ? "active_listing_market_estimate" : undefined,
    confidence_label:
      primarySource && (row.confidence_label === "high" || row.confidence_label === "medium" || row.confidence_label === "low")
        ? row.confidence_label
        : undefined,
    freshness_label: primarySource && (row.freshness_label === "fresh" || row.freshness_label === "aging") ? row.freshness_label : undefined,
    signal_at: primarySource ? row.signal_at ?? undefined : undefined,
    market_truth: primarySource ? false : undefined,
    sold_comp: primarySource ? false : undefined,
    active_listing_evidence: primarySource ? true : undefined,
  };
});
