import "server-only";

import type { MarketInsights } from "@/lib/pricing/getMarketInsights";

export const CARD_MARKET_ANALYSIS_DURATIONS = ["7d", "30d", "90d", "180d"] as const;

type MarketAnalysisSelectedSlice = {
  variantId: string;
  condition: string;
  printing: string;
  language: string | null;
  currentPrice: number | null;
  updatedAt: string | null;
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
  duration: (typeof CARD_MARKET_ANALYSIS_DURATIONS)[number];
  selectedSlice: MarketAnalysisSelectedSlice | null;
  history: PriceHistoryResult | null;
  insights: MarketInsights | null;
  heroPrice: number | null;
  heroUpdatedAt: string | null;
  uiFlags: CardMarketAnalysisUiFlags;
  diagnostics: CardMarketAnalysisDiagnostics;
};

function normalizeDuration(duration: string | null | undefined): (typeof CARD_MARKET_ANALYSIS_DURATIONS)[number] {
  return CARD_MARKET_ANALYSIS_DURATIONS.includes(duration as (typeof CARD_MARKET_ANALYSIS_DURATIONS)[number])
    ? (duration as (typeof CARD_MARKET_ANALYSIS_DURATIONS)[number])
    : "30d";
}

export async function getCardMarketAnalysisModel(
  cardPrintId: string,
  duration: string | null | undefined,
): Promise<CardMarketAnalysisModel> {
  const normalizedCardPrintId = cardPrintId.trim();
  const normalizedDuration = normalizeDuration(duration);
  const noHistoryReason = normalizedCardPrintId
    ? "Market analysis is unavailable while legacy reference pricing is retired."
    : "No card_print_id was supplied for market analysis.";

  return {
    duration: normalizedDuration,
    selectedSlice: null,
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
