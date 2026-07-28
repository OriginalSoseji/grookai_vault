import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  getMarketPricingReadModelV1,
  type MarketPricingRecordV1,
} from "@/lib/pricing/marketPricingReadModelV1";

export type CardPricingUiRecord = MarketPricingRecordV1 & {
  primary_price: number;
  primary_source: "tcgplayer_market";
  min_price?: number;
  max_price?: number;
  ebay_listing_count?: number;
  display_label: string;
  pricing_basis: "tcgplayer_market_exact" | "tcgplayer_market_from";
};

type PricingClient = Pick<SupabaseClient, "from" | "rpc">;

type CardPrintingIdRow = {
  id: string | null;
};

function toUiRecord(record: MarketPricingRecordV1): CardPricingUiRecord {
  return {
    ...record,
    primary_price: record.market_close,
    primary_source: "tcgplayer_market",
    min_price: record.low_price,
    max_price: record.high_price,
    ebay_listing_count: record.active_ask_listing_count,
    display_label: record.source_label,
    pricing_basis: record.is_from_price
      ? "tcgplayer_market_from"
      : "tcgplayer_market_exact",
  };
}

function sortPricingRecords(records: CardPricingUiRecord[]) {
  return [...records].sort((left, right) => {
    if (left.pricing_scope !== right.pricing_scope) {
      return left.pricing_scope === "parent" ? -1 : 1;
    }
    return String(
      left.finish_key ?? left.printing_gv_id ?? "",
    ).localeCompare(String(right.finish_key ?? right.printing_gv_id ?? ""));
  });
}

export async function getCardPricingUiRowsByCardPrintIdWithClient(
  supabase: PricingClient,
  cardPrintId: string,
): Promise<CardPricingUiRecord[]> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return [];
  }

  const { data: printingRows, error: printingError } = await supabase
    .from("card_printings")
    .select("id")
    .eq("card_print_id", normalizedCardPrintId);
  if (printingError) {
    console.error("[pricing:v1] exact-printing lookup failed", {
      code: printingError.code,
      message: printingError.message,
      cardPrintId: normalizedCardPrintId,
    });
  }
  const cardPrintingIds = ((printingRows ?? []) as CardPrintingIdRow[])
    .map((row) => row.id?.trim() ?? "")
    .filter(Boolean);

  const records = await getMarketPricingReadModelV1(supabase, {
    cardPrintIds: [normalizedCardPrintId],
    cardPrintingIds,
  });
  return sortPricingRecords(records.map(toUiRecord));
}

export async function getCardPricingUiByCardPrintIdWithClient(
  supabase: PricingClient,
  cardPrintId: string,
): Promise<CardPricingUiRecord | null> {
  const records = await getCardPricingUiRowsByCardPrintIdWithClient(
    supabase,
    cardPrintId,
  );
  return (
    records.find((record) => record.pricing_scope === "parent") ??
    records[0] ??
    null
  );
}

export const getCardPricingUiByCardPrintId = cache(
  async function getCardPricingUiByCardPrintId(
    cardPrintId: string,
  ): Promise<CardPricingUiRecord | null> {
    return getCardPricingUiByCardPrintIdWithClient(
      createServerAdminClient(),
      cardPrintId,
    );
  },
);

export const getCardPricingUiRowsByCardPrintId = cache(
  async function getCardPricingUiRowsByCardPrintId(
    cardPrintId: string,
  ): Promise<CardPricingUiRecord[]> {
    return getCardPricingUiRowsByCardPrintIdWithClient(
      createServerAdminClient(),
      cardPrintId,
    );
  },
);
