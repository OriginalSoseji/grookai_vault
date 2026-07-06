import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerAdminClient } from "@/lib/supabase/admin";

type CardPricingUiRow = {
  pricing_scope: string | null;
  card_print_id: string | null;
  card_printing_id: string | null;
  printing_gv_id: string | null;
  assigned_finish_key: string | null;
  gv_id: string | null;
  currency: string | null;
  reference_anchor_low: number | null;
  reference_anchor_mid: number | null;
  reference_anchor_high: number | null;
  reference_source_count: number | null;
  reference_eligible_evidence_count: number | null;
  reference_review_flags: string[] | null;
  grookai_value_low: number | null;
  grookai_value_mid: number | null;
  grookai_value_high: number | null;
  grookai_value_basis: string | null;
  grookai_value_block_reason: string | null;
  active_ask_low: number | null;
  active_ask_mid: number | null;
  active_ask_high: number | null;
  raw_active_ask_minimum: number | null;
  raw_active_ask_maximum: number | null;
  active_ask_listing_count: number | null;
  active_ask_seller_count: number | null;
  active_ask_signal_at: string | null;
  market_pressure_pct: number | null;
  market_pressure_status: string | null;
  lane_policy: string | null;
  condition_policy: string | null;
  grookai_value_condition_label: string | null;
  active_ask_condition_label: string | null;
  confidence_label: string | null;
  freshness_label: string | null;
  signed_in_only: boolean | null;
  market_truth: boolean | null;
  sold_comp: boolean | null;
  active_listing_evidence: boolean | null;
  publishable: boolean | null;
  app_visible: boolean | null;
};

export type CardPricingUiRecord = {
  pricing_scope?: "parent" | "card_printing";
  card_print_id: string;
  card_printing_id?: string;
  printing_gv_id?: string;
  assigned_finish_key?: string;
  gv_id?: string;
  currency?: string;
  reference_anchor_low?: number;
  reference_anchor_mid?: number;
  reference_anchor_high?: number;
  reference_source_count?: number;
  reference_eligible_evidence_count?: number;
  reference_review_flags?: string[];
  grookai_value_low?: number;
  grookai_value_mid?: number;
  grookai_value_high?: number;
  grookai_value_basis?: string;
  grookai_value_block_reason?: string;
  active_ask_low?: number;
  active_ask_mid?: number;
  active_ask_high?: number;
  active_ask_minimum?: number;
  active_ask_maximum?: number;
  active_ask_listing_count?: number;
  active_ask_seller_count?: number;
  active_ask_signal_at?: string;
  market_pressure_pct?: number;
  market_pressure_status?: string;
  lane_policy?: string;
  condition_policy?: string;
  grookai_value_condition_label?: string;
  active_ask_condition_label?: string;
  confidence_label?: "high" | "medium" | "limited";
  freshness_label?: "fresh" | "aging" | "stale" | "no_active_ask";
  market_truth?: false;
  sold_comp?: false;
  active_listing_evidence?: boolean;
  publishable?: false;
  app_visible?: false;
  // Legacy card/grid compatibility fields. These now map to Grookai Value,
  // never to active ask when Grookai Value is blocked.
  primary_price?: number;
  primary_source?: "grookai_value";
  grookai_value?: number;
  min_price?: number;
  max_price?: number;
  variant_count?: number;
  ebay_median_price?: number;
  ebay_listing_count?: number;
  display_label?: string;
  pricing_basis?: "evidence_anchored_grookai_value" | "active_listing_only_no_grookai_value";
  signal_at?: string;
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type CardPricingUiClient = Pick<SupabaseClient, "from" | "rpc">;

function mapPricingRow(row: CardPricingUiRow | null): CardPricingUiRecord | null {
  if (!row?.card_print_id) {
    return null;
  }

  const hasClosedPublicBoundary =
    row.market_truth === false &&
    row.sold_comp === false &&
    row.publishable === false &&
    row.app_visible === false;
  if (!hasClosedPublicBoundary) {
    return null;
  }

  const grookaiValueMid = toNumber(row.grookai_value_mid);
  const activeAskMid = toNumber(row.active_ask_mid);
  const hasGrookaiValue = typeof grookaiValueMid === "number";

  return {
    pricing_scope: row.pricing_scope === "card_printing" ? "card_printing" : "parent",
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id ?? undefined,
    printing_gv_id: row.printing_gv_id ?? undefined,
    assigned_finish_key: row.assigned_finish_key ?? undefined,
    gv_id: row.gv_id ?? undefined,
    currency: row.currency ?? undefined,
    reference_anchor_low: toNumber(row.reference_anchor_low),
    reference_anchor_mid: toNumber(row.reference_anchor_mid),
    reference_anchor_high: toNumber(row.reference_anchor_high),
    reference_source_count:
      typeof row.reference_source_count === "number" && Number.isFinite(row.reference_source_count)
        ? row.reference_source_count
        : undefined,
    reference_eligible_evidence_count:
      typeof row.reference_eligible_evidence_count === "number" && Number.isFinite(row.reference_eligible_evidence_count)
        ? row.reference_eligible_evidence_count
        : undefined,
    reference_review_flags: Array.isArray(row.reference_review_flags) ? row.reference_review_flags : undefined,
    grookai_value_low: toNumber(row.grookai_value_low),
    grookai_value_mid: grookaiValueMid,
    grookai_value_high: toNumber(row.grookai_value_high),
    grookai_value_basis: row.grookai_value_basis ?? undefined,
    grookai_value_block_reason: row.grookai_value_block_reason ?? undefined,
    active_ask_low: toNumber(row.active_ask_low),
    active_ask_mid: activeAskMid,
    active_ask_high: toNumber(row.active_ask_high),
    active_ask_minimum: toNumber(row.raw_active_ask_minimum),
    active_ask_maximum: toNumber(row.raw_active_ask_maximum),
    active_ask_listing_count:
      typeof row.active_ask_listing_count === "number" && Number.isFinite(row.active_ask_listing_count)
        ? row.active_ask_listing_count
        : undefined,
    active_ask_seller_count:
      typeof row.active_ask_seller_count === "number" && Number.isFinite(row.active_ask_seller_count)
        ? row.active_ask_seller_count
        : undefined,
    active_ask_signal_at: row.active_ask_signal_at ?? undefined,
    market_pressure_pct: toNumber(row.market_pressure_pct),
    market_pressure_status: row.market_pressure_status ?? undefined,
    lane_policy: row.lane_policy ?? undefined,
    condition_policy: row.condition_policy ?? undefined,
    grookai_value_condition_label: row.grookai_value_condition_label ?? undefined,
    active_ask_condition_label: row.active_ask_condition_label ?? undefined,
    confidence_label:
      row.confidence_label === "high" || row.confidence_label === "medium" || row.confidence_label === "limited"
        ? row.confidence_label
        : undefined,
    freshness_label:
      row.freshness_label === "fresh" ||
      row.freshness_label === "aging" ||
      row.freshness_label === "stale" ||
      row.freshness_label === "no_active_ask"
        ? row.freshness_label
        : undefined,
    market_truth: false,
    sold_comp: false,
    active_listing_evidence: row.active_listing_evidence === true,
    publishable: false,
    app_visible: false,
    primary_price: hasGrookaiValue ? grookaiValueMid : undefined,
    primary_source: hasGrookaiValue ? "grookai_value" : undefined,
    grookai_value: hasGrookaiValue ? grookaiValueMid : undefined,
    min_price: hasGrookaiValue ? toNumber(row.grookai_value_low) : undefined,
    max_price: hasGrookaiValue ? toNumber(row.grookai_value_high) : undefined,
    variant_count: hasGrookaiValue ? row.reference_eligible_evidence_count ?? undefined : undefined,
    ebay_median_price: activeAskMid,
    ebay_listing_count:
      typeof row.active_ask_listing_count === "number" && Number.isFinite(row.active_ask_listing_count)
        ? row.active_ask_listing_count
        : undefined,
    display_label: hasGrookaiValue ? "Evidence-anchored Grookai Value" : "Active ask only - no valuation anchor",
    pricing_basis: hasGrookaiValue ? "evidence_anchored_grookai_value" : "active_listing_only_no_grookai_value",
    signal_at: row.active_ask_signal_at ?? undefined,
  };
}

function sortPricingRecords(records: CardPricingUiRecord[]) {
  return [...records].sort((left, right) => {
    if (left.pricing_scope !== right.pricing_scope) {
      return left.pricing_scope === "parent" ? -1 : 1;
    }
    return String(left.assigned_finish_key ?? left.printing_gv_id ?? "").localeCompare(
      String(right.assigned_finish_key ?? right.printing_gv_id ?? ""),
    );
  });
}

export async function getCardPricingUiRowsByCardPrintIdWithClient(
  supabase: CardPricingUiClient,
  cardPrintId: string,
): Promise<CardPricingUiRecord[]> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return [];
  }

  const { data, error } = await supabase
    .rpc("get_market_evidence_public_pricing_bridge_variant_aware_v1", {
      p_card_print_id: normalizedCardPrintId,
    });

  if (error) {
    console.error("[pricing:ui] getCardPricingUiRowsByCardPrintId failed", {
      cardPrintId: normalizedCardPrintId,
      error,
    });
    return [];
  }

  return sortPricingRecords(
    ((data ?? []) as CardPricingUiRow[])
      .map((row) => mapPricingRow(row))
      .filter((row): row is CardPricingUiRecord => row !== null),
  );
}

export async function getCardPricingUiByCardPrintIdWithClient(
  supabase: CardPricingUiClient,
  cardPrintId: string,
): Promise<CardPricingUiRecord | null> {
  const records = await getCardPricingUiRowsByCardPrintIdWithClient(supabase, cardPrintId);
  return records.find((record) => record.pricing_scope === "parent") ?? records[0] ?? null;
}

export const getCardPricingUiByCardPrintId = cache(async function getCardPricingUiByCardPrintId(
  cardPrintId: string,
): Promise<CardPricingUiRecord | null> {
  return getCardPricingUiByCardPrintIdWithClient(createServerAdminClient(), cardPrintId);
});

export const getCardPricingUiRowsByCardPrintId = cache(async function getCardPricingUiRowsByCardPrintId(
  cardPrintId: string,
): Promise<CardPricingUiRecord[]> {
  return getCardPricingUiRowsByCardPrintIdWithClient(createServerAdminClient(), cardPrintId);
});
