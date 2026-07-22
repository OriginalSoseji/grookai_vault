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
import { cache } from "react";

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
          ? "Value sorting could not be applied because these results do not have sortable Grookai Values."
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
const PUBLIC_PRICING_SELECT =
  "card_print_id,grookai_value_mid,active_ask_signal_at,confidence_label,active_ask_listing_count,grookai_value_block_reason,market_truth,sold_comp,publishable,app_visible";

function normalizeCardPrintIds(cardPrintIds: string[]) {
  return Array.from(
    new Set(
      cardPrintIds
        .map((cardPrintId) => cardPrintId.trim())
        .filter(Boolean),
    ),
  ).sort();
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function mapPublicBridgeRow(
  row: PublicBridgePriceRow & { card_print_id: string },
): PublicPricingRecord {
  const rawPrice = typeof row.grookai_value_mid === "number" ? row.grookai_value_mid : undefined;
  const rawPriceSource = rawPrice !== undefined ? "grookai_value" : undefined;
  const rawPriceTs =
    rawPrice !== undefined ? row.active_ask_signal_at ?? undefined : undefined;
  const confidence =
    row.confidence_label === "high"
      ? 0.9
      : row.confidence_label === "medium"
        ? 0.75
        : row.confidence_label === "limited"
          ? 0.5
          : undefined;

  return {
    card_print_id: row.card_print_id,
    raw_price: rawPrice,
    raw_price_source: rawPriceSource,
    raw_price_ts: rawPriceTs,
    latest_price: rawPrice,
    confidence,
    listing_count:
      typeof row.active_ask_listing_count === "number" &&
      Number.isFinite(row.active_ask_listing_count)
        ? row.active_ask_listing_count
        : undefined,
    price_source: rawPriceSource,
    updated_at: rawPriceTs,
    active_price_updated_at: rawPriceTs,
    last_snapshot_at: rawPriceTs,
  };
}

/**
 * React's server cache is request-scoped. The normalized string key makes
 * repeated reads for the same ID set share one bounded bridge read without
 * retaining signed-in pricing across requests.
 */
const getPublicPricingForNormalizedIds = cache(
  async function getPublicPricingForNormalizedIds(
    supabase: PricingClient,
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

    if (requestedIds.length > boundedIds.length) {
      console.warn("[pricing] public bridge read was bounded", {
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
        console.warn("[pricing] public bridge read exceeded its request budget", {
          requested: boundedIds.length,
          resolved: pricingByCardId.size,
          budgetMs: PUBLIC_PRICING_QUERY_BUDGET_MS,
        });
        break;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remainingBudgetMs);

      try {
        const { data, error } = await supabase
          .from("v_market_evidence_public_pricing_bridge_reference_anchored_v1")
          .select(PUBLIC_PRICING_SELECT)
          .in("card_print_id", idChunk)
          .limit(idChunk.length)
          .abortSignal(controller.signal);

        if (error) {
          complete = false;
          incompleteReason =
            error.code === "57014" ||
            /timeout|timed out|aborted|canceling statement/i.test(error.message)
              ? "pricing_timeout"
              : "pricing_read_incomplete";
          console.warn(
            "[pricing] public bridge read failed; the page will continue without remaining pricing enrichment",
            {
              message: error.message,
              code: error.code,
              requested: boundedIds.length,
              resolved: pricingByCardId.size,
              batchSize: idChunk.length,
            },
          );
          break;
        }

        for (const row of (data ?? []) as PublicBridgePriceRow[]) {
          const isSafePublicPrice =
            row.grookai_value_block_reason === null &&
            row.market_truth === false &&
            row.sold_comp === false &&
            row.publishable === false &&
            row.app_visible === false;
          if (!row.card_print_id || !isSafePublicPrice) {
            continue;
          }

          pricingByCardId.set(
            row.card_print_id,
            mapPublicBridgeRow(
              row as PublicBridgePriceRow & { card_print_id: string },
            ),
          );
        }
      } catch (error) {
        complete = false;
        incompleteReason =
          controller.signal.aborted ||
          (error instanceof Error &&
            /timeout|timed out|aborted|aborterror|canceling statement/i.test(
              `${error.name} ${error.message}`,
            ))
            ? "pricing_timeout"
            : "pricing_read_incomplete";
        console.warn(
          "[pricing] public bridge read was interrupted; the page will continue without remaining pricing enrichment",
          {
            message: error instanceof Error ? error.message : String(error),
            requested: boundedIds.length,
            resolved: pricingByCardId.size,
            batchSize: idChunk.length,
          },
        );
        break;
      } finally {
        clearTimeout(timeout);
      }
    }

    return { pricingByCardId, complete, incompleteReason };
  },
);

export async function getPublicPricingByCardIds(
  supabase: PricingClient,
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
    console.warn("[pricing] complete bridge read refused an oversized candidate set", {
      requested: uniqueIds.length,
      maximum: PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS,
    });
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
