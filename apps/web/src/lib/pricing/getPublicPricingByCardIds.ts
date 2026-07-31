import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  getMarketPricingReadModelV1,
  type MarketPricingRecordV1,
} from "./marketPricingReadModelV1";

export type CanonicalRawPricingRecord = {
  card_print_id: string;
  raw_price?: number;
  raw_price_source?: string;
  raw_price_ts?: string;
  raw_price_published_at?: string;
  pricing_provenance_id?: string;
  pricing_source_label?: string;
  pricing_scope?: "parent" | "card_printing";
  pricing_is_from_price?: boolean;
  eligible_printing_count?: number;
  latest_price?: number;
  confidence?: number;
  listing_count?: number;
  price_source?: string;
  updated_at?: string;
  active_price_updated_at?: string;
  last_snapshot_at?: string;
};

export type PublicPricingRecord = CanonicalRawPricingRecord;

type PublicPricingQueryOptions = {
  requireComplete?: boolean;
};

export type PublicPricingSortDegradedReason =
  | "candidate_limit_exceeded"
  | "pricing_values_unavailable"
  | "pricing_timeout"
  | "pricing_read_incomplete";

export class PublicPricingSortUnavailableError extends Error {
  readonly reason: PublicPricingSortDegradedReason;
  readonly requestedCount: number;
  readonly maximumCount: number;

  constructor(
    reason: PublicPricingSortDegradedReason,
    requestedCount: number,
    maximumCount: number,
  ) {
    super(
      reason === "candidate_limit_exceeded"
        ? `Value sorting supports at most ${maximumCount} candidates; narrow the search and try again.`
        : reason === "pricing_values_unavailable"
          ? "Value sorting could not be applied because these results do not have sortable TCGPlayer Market prices."
          : "Value sorting could not be completed because pricing is temporarily unavailable.",
    );
    this.name = "PublicPricingSortUnavailableError";
    this.reason = reason;
    this.requestedCount = requestedCount;
    this.maximumCount = maximumCount;
  }
}

type PublicPricingQueryResult = {
  pricingByCardId: Map<string, PublicPricingRecord>;
  complete: boolean;
  incompleteReason: Exclude<
    PublicPricingSortDegradedReason,
    "candidate_limit_exceeded" | "pricing_values_unavailable"
  > | null;
};

const PUBLIC_PRICING_QUERY_CHUNK_SIZE = 24;
const PUBLIC_PRICING_MAX_CARD_IDS = 192;
export const PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS = 64;
const PUBLIC_PRICING_QUERY_BUDGET_MS = 1800;

function normalizeCardPrintIds(cardPrintIds: string[]) {
  return Array.from(
    new Set(cardPrintIds.map((cardPrintId) => cardPrintId.trim()).filter(Boolean)),
  ).sort();
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function mapParentMarketRecord(
  record: MarketPricingRecordV1,
): PublicPricingRecord {
  return {
    card_print_id: record.card_print_id,
    raw_price: record.market_close,
    raw_price_source: "tcgplayer_market",
    raw_price_ts: record.observed_at,
    raw_price_published_at: record.published_at,
    pricing_provenance_id: record.provenance_id,
    pricing_source_label: record.source_label,
    pricing_scope: record.pricing_scope,
    pricing_is_from_price: record.is_from_price,
    eligible_printing_count: record.eligible_printing_count,
    latest_price: record.market_close,
    confidence: 1,
    listing_count: record.active_ask_listing_count,
    price_source: "tcgplayer_market",
    updated_at: record.published_at,
    active_price_updated_at: record.active_ask_observed_at,
    last_snapshot_at: record.published_at,
  };
}

function isTimeoutLike(error: unknown) {
  return error instanceof Error &&
    /timeout|timed out|abort|canceling statement/i.test(
      `${error.name} ${error.message}`,
    );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("TCGPlayer market read timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

const getPublicPricingForNormalizedIds = cache(
  async function getPublicPricingForNormalizedIds(
    supabase: SupabaseClient,
    normalizedIdsKey: string,
  ): Promise<PublicPricingQueryResult> {
    const requestedIds = normalizedIdsKey
      ? normalizedIdsKey.split("\n").filter(Boolean)
      : [];
    const boundedIds = requestedIds.slice(0, PUBLIC_PRICING_MAX_CARD_IDS);
    const pricingByCardId = new Map<string, PublicPricingRecord>();
    let complete = requestedIds.length <= boundedIds.length;
    let incompleteReason: PublicPricingQueryResult["incompleteReason"] =
      complete ? null : "pricing_read_incomplete";

    if (!complete) {
      console.warn("[pricing:v1] shared market read was bounded", {
        requested: requestedIds.length,
        maximum: PUBLIC_PRICING_MAX_CARD_IDS,
      });
    }

    const deadline = Date.now() + PUBLIC_PRICING_QUERY_BUDGET_MS;
    for (const idChunk of chunkValues(
      boundedIds,
      PUBLIC_PRICING_QUERY_CHUNK_SIZE,
    )) {
      const remainingBudgetMs = deadline - Date.now();
      if (remainingBudgetMs <= 0) {
        complete = false;
        incompleteReason = "pricing_timeout";
        break;
      }

      try {
        const records = await withTimeout(
          getMarketPricingReadModelV1(supabase, {
            cardPrintIds: idChunk,
            throwOnError: true,
          }),
          remainingBudgetMs,
        );
        for (const record of records) {
          if (record.pricing_scope !== "parent") {
            continue;
          }
          pricingByCardId.set(
            record.card_print_id,
            mapParentMarketRecord(record),
          );
        }
      } catch (error) {
        complete = false;
        incompleteReason = isTimeoutLike(error)
          ? "pricing_timeout"
          : "pricing_read_incomplete";
        console.warn(
          "[pricing:v1] shared market read failed; the page will continue without remaining pricing enrichment",
          {
            message: error instanceof Error ? error.message : String(error),
            requested: boundedIds.length,
            resolved: pricingByCardId.size,
            batchSize: idChunk.length,
          },
        );
        break;
      }
    }

    return { pricingByCardId, complete, incompleteReason };
  },
);

export async function getPublicPricingByCardIds(
  supabase: SupabaseClient,
  cardPrintIds: string[],
  options: PublicPricingQueryOptions = {},
): Promise<Map<string, PublicPricingRecord>> {
  const uniqueIds = normalizeCardPrintIds(cardPrintIds);
  if (uniqueIds.length === 0) {
    return new Map();
  }

  if (
    options.requireComplete &&
    uniqueIds.length > PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS
  ) {
    throw new PublicPricingSortUnavailableError(
      "candidate_limit_exceeded",
      uniqueIds.length,
      PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS,
    );
  }

  const result = await getPublicPricingForNormalizedIds(
    supabase,
    uniqueIds.join("\n"),
  );
  if (options.requireComplete && !result.complete) {
    throw new PublicPricingSortUnavailableError(
      result.incompleteReason ?? "pricing_read_incomplete",
      uniqueIds.length,
      PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS,
    );
  }

  return result.pricingByCardId;
}

export function mergePublicPricingIntoRows<T extends { id: string }>(
  rows: readonly T[],
  pricingByCardId: ReadonlyMap<string, PublicPricingRecord>,
): T[] {
  return rows.map((row) => {
    const pricing = pricingByCardId.get(row.id);
    if (!pricing) {
      return row;
    }

    const { card_print_id: _cardPrintId, ...pricingFields } = pricing;
    return {
      ...row,
      ...pricingFields,
    };
  });
}
