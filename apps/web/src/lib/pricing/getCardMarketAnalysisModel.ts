import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketInsights } from "@/lib/pricing/getMarketInsights";
import {
  getCardPricingUiRowsByCardPrintIdWithClient,
  type CardPricingUiRecord,
} from "@/lib/pricing/getCardPricingUiByCardPrintId";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const CARD_MARKET_ANALYSIS_DURATIONS = ["7d", "30d", "90d", "180d"] as const;

type MarketAnalysisDuration = (typeof CARD_MARKET_ANALYSIS_DURATIONS)[number];

type MarketAnalysisSelectedSlice = {
  variantId: string;
  condition: string;
  printing: string;
  language: string | null;
  currentPrice: number | null;
  updatedAt: string | null;
};

export type MarketAnalysisAvailableSlice = {
  cardPrintingId: string;
  printingGvId: string | null;
  finishKey: string | null;
  label: string;
  currentPrice: number;
};

type MarketHistoryPoint = {
  date: string;
  price: number;
};

type PriceHistoryDiagnostics = {
  identifierPathUsed: "variant" | "card" | null;
  variantAttemptRawCount: number;
  variantAttemptNormalizedCount: number;
  cardAttemptRawCount: number;
  cardAttemptNormalizedCount: number;
  usedCardFallback: boolean;
  noHistoryReason: string | null;
};

type PriceHistoryResult = {
  points: MarketHistoryPoint[];
  currentPrice: number | null;
  updatedAt: string | null;
  diagnostics: PriceHistoryDiagnostics;
};

type CardMarketAnalysisUiFlags = {
  showChart: boolean;
  showEmptyHistory: boolean;
  showInsights: boolean;
  showDisclosure: boolean;
  showEmptyState: boolean;
};

type CardMarketAnalysisDiagnostics = {
  selectedSlice: {
    variantId: string;
    condition: string;
    printing: string;
    language: string | null;
  } | null;
  identifierPathUsed: "variant" | "card" | null;
  rawPointCount: number;
  normalizedPointCount: number;
  historyPointCount: number;
  usedCardFallback: boolean;
  noHistoryReason: string | null;
  pageMode: "chart" | "empty-history" | "empty-state" | "insights-only";
};

export type CardMarketAnalysisModel = {
  duration: MarketAnalysisDuration;
  selectedSlice: MarketAnalysisSelectedSlice | null;
  availableSlices: MarketAnalysisAvailableSlice[];
  history: PriceHistoryResult | null;
  insights: MarketInsights | null;
  heroPrice: number | null;
  heroUpdatedAt: string | null;
  uiFlags: CardMarketAnalysisUiFlags;
  diagnostics: CardMarketAnalysisDiagnostics;
};

type MarketHistoryReadRow = {
  card_printing_id: string | null;
  printing_gv_id: string | null;
  observed_on: string | null;
  currency: string | null;
  market_price: number | null;
  source_label: string | null;
  provenance_id: string | null;
};

type MarketAnalysisClient = Pick<SupabaseClient, "from" | "rpc">;

const DURATION_DAYS: Record<MarketAnalysisDuration, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

function normalizeDuration(duration: string | null | undefined): MarketAnalysisDuration {
  return CARD_MARKET_ANALYSIS_DURATIONS.includes(duration as MarketAnalysisDuration)
    ? (duration as MarketAnalysisDuration)
    : "30d";
}

function exactPricingRows(records: CardPricingUiRecord[]) {
  return records.filter(
    (record) =>
      record.pricing_scope === "card_printing" &&
      typeof record.card_printing_id === "string" &&
      record.card_printing_id.length > 0,
  );
}

function sliceLabel(record: CardPricingUiRecord) {
  return record.finish_key?.trim() || record.printing_gv_id?.trim() || "Exact printing";
}

function selectPricingSlice(
  records: CardPricingUiRecord[],
  requestedPrinting: string | null | undefined,
) {
  const exactRows = exactPricingRows(records);
  const normalizedRequest = requestedPrinting?.trim().toLowerCase() ?? "";
  if (normalizedRequest) {
    return (
      exactRows.find(
        (record) =>
          record.card_printing_id?.toLowerCase() === normalizedRequest ||
          record.printing_gv_id?.toLowerCase() === normalizedRequest,
      ) ?? null
    );
  }

  return (
    exactRows.find((record) => record.finish_key?.toLowerCase() === "normal") ??
    exactRows[0] ??
    null
  );
}

function normalizeHistoryRows(rows: MarketHistoryReadRow[]) {
  return rows
    .map((row) => ({
      date: row.observed_on?.trim() ?? "",
      price:
        typeof row.market_price === "number" && Number.isFinite(row.market_price)
          ? row.market_price
          : null,
    }))
    .filter(
      (row): row is MarketHistoryPoint =>
        row.date.length > 0 && row.price !== null,
    );
}

function emptyModel(
  duration: MarketAnalysisDuration,
  noHistoryReason: string,
  availableSlices: MarketAnalysisAvailableSlice[] = [],
): CardMarketAnalysisModel {
  return {
    duration,
    selectedSlice: null,
    availableSlices,
    history: null,
    insights: null,
    heroPrice: null,
    heroUpdatedAt: null,
    uiFlags: {
      showChart: false,
      showEmptyHistory: false,
      showInsights: false,
      showDisclosure: true,
      showEmptyState: true,
    },
    diagnostics: {
      selectedSlice: null,
      identifierPathUsed: null,
      rawPointCount: 0,
      normalizedPointCount: 0,
      historyPointCount: 0,
      usedCardFallback: false,
      noHistoryReason,
      pageMode: "empty-state",
    },
  };
}

export async function getCardMarketAnalysisModelWithClient(
  client: MarketAnalysisClient,
  cardPrintId: string,
  duration: string | null | undefined,
  requestedPrinting?: string | null,
): Promise<CardMarketAnalysisModel> {
  const normalizedCardPrintId = cardPrintId.trim();
  const normalizedDuration = normalizeDuration(duration);
  if (!normalizedCardPrintId) {
    return emptyModel(
      normalizedDuration,
      "No card_print_id was supplied for market analysis.",
    );
  }

  const pricingRecords = await getCardPricingUiRowsByCardPrintIdWithClient(
    client,
    normalizedCardPrintId,
  );
  const exactRows = exactPricingRows(pricingRecords);
  const availableSlices = exactRows.map((record) => ({
    cardPrintingId: record.card_printing_id!,
    printingGvId: record.printing_gv_id ?? null,
    finishKey: record.finish_key ?? null,
    label: sliceLabel(record),
    currentPrice: record.market_close,
  }));
  const selectedPricing = selectPricingSlice(pricingRecords, requestedPrinting);
  if (!selectedPricing?.card_printing_id) {
    const reason = requestedPrinting?.trim()
      ? "The requested exact printing has no qualified TCGPlayer Market price."
      : "No exact printing has a qualified TCGPlayer Market price.";
    return emptyModel(normalizedDuration, reason, availableSlices);
  }

  const { data, error } = await client.rpc("get_market_price_history_v1", {
    p_card_printing_id: selectedPricing.card_printing_id,
    p_days: DURATION_DAYS[normalizedDuration],
  });
  if (error) {
    console.error("[pricing:v1] exact-printing history lookup failed", {
      code: error.code,
      message: error.message,
      cardPrintingId: selectedPricing.card_printing_id,
    });
  }

  const rawRows = error ? [] : ((data ?? []) as MarketHistoryReadRow[]);
  const points = normalizeHistoryRows(rawRows);
  const noHistoryReason = points.length
    ? null
    : error
      ? "The governed market history read failed."
      : "No qualified TCGPlayer Market history exists for this exact printing.";
  const printingLabel = sliceLabel(selectedPricing);
  const selectedSlice: MarketAnalysisSelectedSlice = {
    variantId: selectedPricing.card_printing_id,
    condition: "Market price",
    printing: printingLabel,
    language: null,
    currentPrice: selectedPricing.market_close,
    updatedAt: selectedPricing.observed_at,
  };
  const pageMode = points.length ? "chart" : "empty-history";

  return {
    duration: normalizedDuration,
    selectedSlice,
    availableSlices,
    history: {
      points,
      currentPrice: selectedPricing.market_close,
      updatedAt: selectedPricing.observed_at,
      diagnostics: {
        identifierPathUsed: "variant",
        variantAttemptRawCount: rawRows.length,
        variantAttemptNormalizedCount: points.length,
        cardAttemptRawCount: 0,
        cardAttemptNormalizedCount: 0,
        usedCardFallback: false,
        noHistoryReason,
      },
    },
    insights: null,
    heroPrice: selectedPricing.market_close,
    heroUpdatedAt: selectedPricing.observed_at,
    uiFlags: {
      showChart: points.length > 0,
      showEmptyHistory: points.length === 0,
      showInsights: false,
      showDisclosure: true,
      showEmptyState: false,
    },
    diagnostics: {
      selectedSlice: {
        variantId: selectedPricing.card_printing_id,
        condition: "Market price",
        printing: printingLabel,
        language: null,
      },
      identifierPathUsed: "variant",
      rawPointCount: rawRows.length,
      normalizedPointCount: points.length,
      historyPointCount: points.length,
      usedCardFallback: false,
      noHistoryReason,
      pageMode,
    },
  };
}

export async function getCardMarketAnalysisModel(
  cardPrintId: string,
  duration: string | null | undefined,
  requestedPrinting?: string | null,
): Promise<CardMarketAnalysisModel> {
  return getCardMarketAnalysisModelWithClient(
    createServerAdminClient(),
    cardPrintId,
    duration,
    requestedPrinting,
  );
}
