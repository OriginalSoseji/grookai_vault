import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketIntelligenceEvidenceStrengthV1 =
  | "limited"
  | "moderate"
  | "strong";

type MarketIntelligenceReadRowV1 = {
  market_intelligence_version: string | null;
  card_print_id: string | null;
  card_printing_id: string | null;
  printing_gv_id: string | null;
  finish_key: string | null;
  status: string | null;
  unavailable_reason: string | null;
  currency: string | null;
  lowest_active_ask: number | null;
  median_active_ask: number | null;
  listing_count: number | null;
  seller_count: number | null;
  ask_spread: number | null;
  ask_spread_pct: number | null;
  observed_at: string | null;
  freshness: string | null;
  evidence_strength: string | null;
  source_name: string | null;
  source_label: string | null;
  evidence_kind: string | null;
  is_market_value: boolean | null;
  is_completed_sale: boolean | null;
};

export type MarketIntelligenceRecordV1 = {
  market_intelligence_version: "MARKET_INTELLIGENCE_READ_MODEL_V1";
  card_print_id: string;
  card_printing_id: string;
  printing_gv_id: string;
  finish_key: string;
  status: "available";
  currency: "USD";
  lowest_active_ask: number;
  median_active_ask: number;
  listing_count: number;
  seller_count: number;
  ask_spread: number;
  ask_spread_pct: number;
  observed_at: string;
  freshness: "fresh";
  evidence_strength: MarketIntelligenceEvidenceStrengthV1;
  source_name: "ebay_active";
  source_label: "eBay active asks";
  evidence_kind: "active_listing_ask";
  is_market_value: false;
  is_completed_sale: false;
};

type MarketIntelligenceClient = Pick<SupabaseClient, "rpc">;

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function validTimestamp(value: string | null | undefined) {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? value : undefined;
}

function mapRow(
  row: MarketIntelligenceReadRowV1,
): MarketIntelligenceRecordV1 | null {
  const cardPrintId = row.card_print_id?.trim() ?? "";
  const cardPrintingId = row.card_printing_id?.trim() ?? "";
  const printingGvId = row.printing_gv_id?.trim() ?? "";
  const finishKey = row.finish_key?.trim() ?? "";
  const lowestActiveAsk = finite(row.lowest_active_ask);
  const medianActiveAsk = finite(row.median_active_ask);
  const listingCount = finite(row.listing_count);
  const sellerCount = finite(row.seller_count);
  const askSpread = finite(row.ask_spread);
  const askSpreadPct = finite(row.ask_spread_pct);
  const observedAt = validTimestamp(row.observed_at);
  const evidenceStrength =
    row.evidence_strength === "limited" ||
    row.evidence_strength === "moderate" ||
    row.evidence_strength === "strong"
      ? row.evidence_strength
      : null;

  if (
    row.market_intelligence_version !== "MARKET_INTELLIGENCE_READ_MODEL_V1" ||
    row.status !== "available" ||
    row.unavailable_reason !== null ||
    row.currency !== "USD" ||
    row.freshness !== "fresh" ||
    row.source_name !== "ebay_active" ||
    row.source_label !== "eBay active asks" ||
    row.evidence_kind !== "active_listing_ask" ||
    row.is_market_value !== false ||
    row.is_completed_sale !== false ||
    !cardPrintId ||
    !cardPrintingId ||
    !printingGvId ||
    !finishKey ||
    lowestActiveAsk === undefined ||
    lowestActiveAsk < 0 ||
    medianActiveAsk === undefined ||
    medianActiveAsk < lowestActiveAsk ||
    listingCount === undefined ||
    !Number.isInteger(listingCount) ||
    listingCount < 1 ||
    sellerCount === undefined ||
    !Number.isInteger(sellerCount) ||
    sellerCount < 0 ||
    askSpread === undefined ||
    askSpread < 0 ||
    askSpreadPct === undefined ||
    askSpreadPct < 0 ||
    !observedAt ||
    !evidenceStrength
  ) {
    return null;
  }

  return {
    market_intelligence_version: "MARKET_INTELLIGENCE_READ_MODEL_V1",
    card_print_id: cardPrintId,
    card_printing_id: cardPrintingId,
    printing_gv_id: printingGvId,
    finish_key: finishKey,
    status: "available",
    currency: "USD",
    lowest_active_ask: lowestActiveAsk,
    median_active_ask: medianActiveAsk,
    listing_count: listingCount,
    seller_count: sellerCount,
    ask_spread: askSpread,
    ask_spread_pct: askSpreadPct,
    observed_at: observedAt,
    freshness: "fresh",
    evidence_strength: evidenceStrength,
    source_name: "ebay_active",
    source_label: "eBay active asks",
    evidence_kind: "active_listing_ask",
    is_market_value: false,
    is_completed_sale: false,
  };
}

export async function getMarketIntelligenceReadModelV1(
  client: MarketIntelligenceClient,
  {
    cardPrintIds = [],
    cardPrintingIds = [],
    throwOnError = false,
  }: {
    cardPrintIds?: string[];
    cardPrintingIds?: string[];
    throwOnError?: boolean;
  },
): Promise<MarketIntelligenceRecordV1[]> {
  const parentIds = Array.from(
    new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean)),
  );
  const printingIds = Array.from(
    new Set(cardPrintingIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (!parentIds.length && !printingIds.length) return [];

  const { data, error } = await client.rpc(
    "get_market_intelligence_read_model_v1",
    {
      p_card_print_ids: parentIds.length ? parentIds : null,
      p_card_printing_ids: printingIds.length ? printingIds : null,
    },
  );
  if (error) {
    if (throwOnError) throw error;
    console.error("[market-intelligence:v1] shared read model failed", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketIntelligenceReadRowV1[])
    .map(mapRow)
    .filter((row): row is MarketIntelligenceRecordV1 => row !== null);
}
