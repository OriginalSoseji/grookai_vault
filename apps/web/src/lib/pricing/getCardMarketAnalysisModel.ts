import "server-only";

import {
  JUSTTCG_HISTORY_DURATIONS,
  getJustTcgPriceHistory,
  normalizeJustTcgHistoryDuration,
  type JustTcgPriceHistoryResult,
  type MarketAnalysisSelectedSlice,
} from "@/lib/pricing/getJustTcgPriceHistory";
import {
  deriveMarketInsights,
  type MarketInsights,
  type MarketInsightsRow,
} from "@/lib/pricing/getMarketInsights";
import { createServerComponentClient } from "@/lib/supabase/server";

type ExternalMappingRow = {
  external_id: string | null;
};

type MarketAnalysisLocalRow = MarketInsightsRow & {
  variant_id: string | null;
  language: string | null;
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
  duration: (typeof JUSTTCG_HISTORY_DURATIONS)[number];
  selectedSlice: MarketAnalysisSelectedSlice | null;
  history: JustTcgPriceHistoryResult | null;
  insights: MarketInsights | null;
  heroPrice: number | null;
  heroUpdatedAt: string | null;
  uiFlags: CardMarketAnalysisUiFlags;
  diagnostics: CardMarketAnalysisDiagnostics;
};

export const CARD_MARKET_ANALYSIS_DURATIONS = JUSTTCG_HISTORY_DURATIONS;

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDate(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function conditionRank(value: string) {
  switch (normalizeText(value)) {
    case "near mint":
    case "nm":
      return 5;
    case "lightly played":
    case "lp":
      return 4;
    case "moderately played":
    case "mp":
      return 3;
    case "heavily played":
    case "hp":
      return 2;
    case "damaged":
    case "dmg":
      return 1;
    default:
      return 0;
  }
}

function printingRank(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "normal") {
    return 3;
  }

  if (normalized === "reverse holofoil" || normalized === "reverse-holofoil") {
    return 2;
  }

  return 1;
}

function languageRank(value: string | null) {
  const normalized = normalizeText(value);
  if (normalized === "english") {
    return 2;
  }

  if (!normalized) {
    return 1;
  }

  return 0;
}

function toConditionLabel(value: string) {
  switch (normalizeText(value)) {
    case "near mint":
    case "nm":
      return "Near Mint";
    case "lightly played":
    case "lp":
      return "Lightly Played";
    case "moderately played":
    case "mp":
      return "Moderately Played";
    case "heavily played":
    case "hp":
      return "Heavily Played";
    case "damaged":
    case "dmg":
      return "Damaged";
    default:
      return value.trim();
  }
}

function toPrintingLabel(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "normal") {
    return "Normal";
  }

  if (normalized === "reverse holofoil" || normalized === "reverse-holofoil") {
    return "Reverse Holofoil";
  }

  return value.trim();
}

function isNearMint(value: string) {
  const normalized = normalizeText(value);
  return normalized === "near mint" || normalized === "nm";
}

function isNormalPrinting(value: string) {
  return normalizeText(value) === "normal";
}

function sortSlices(left: MarketAnalysisSelectedSlice, right: MarketAnalysisSelectedSlice) {
  const conditionDelta = conditionRank(right.condition) - conditionRank(left.condition);
  if (conditionDelta !== 0) {
    return conditionDelta;
  }

  const printingDelta = printingRank(right.printing) - printingRank(left.printing);
  if (printingDelta !== 0) {
    return printingDelta;
  }

  const languageDelta = languageRank(right.language) - languageRank(left.language);
  if (languageDelta !== 0) {
    return languageDelta;
  }

  const updatedDelta = new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return (right.currentPrice ?? 0) - (left.currentPrice ?? 0);
}

function resolveSelectedSlice(rows: MarketAnalysisLocalRow[]): MarketAnalysisSelectedSlice | null {
  const candidates = rows
    .map((row) => {
      const variantId = row.variant_id?.trim() ?? "";
      const condition = row.condition?.trim() ?? "";
      const printing = row.printing?.trim() ?? "";

      if (!variantId || !condition || !printing) {
        return null;
      }

      return {
        variantId,
        condition: toConditionLabel(condition),
        printing: toPrintingLabel(printing),
        language: row.language?.trim() || null,
        currentPrice: normalizePrice(row.price),
        updatedAt: normalizeDate(row.updated_at),
      } satisfies MarketAnalysisSelectedSlice;
    })
    .filter((row): row is MarketAnalysisSelectedSlice => Boolean(row));

  if (candidates.length === 0) {
    return null;
  }

  const nearMintNormal = candidates.filter(
    (row) => isNearMint(row.condition) && isNormalPrinting(row.printing),
  );
  if (nearMintNormal.length > 0) {
    return nearMintNormal.sort(sortSlices)[0];
  }

  const nearMintAny = candidates.filter((row) => isNearMint(row.condition));
  if (nearMintAny.length > 0) {
    return nearMintAny.sort(sortSlices)[0];
  }

  return candidates.sort(sortSlices)[0];
}

function buildUiFlags(args: {
  selectedSlice: MarketAnalysisSelectedSlice | null;
  history: JustTcgPriceHistoryResult | null;
  insights: MarketInsights | null;
}): CardMarketAnalysisUiFlags {
  const insights = args.insights;
  const history = args.history;
  const historyPointCount = history?.points.length ?? 0;
  const hasInsights = insights
    ? insights.conditionRows.length > 0 ||
      typeof insights.printingPremium === "number" ||
      Boolean(insights.trend) ||
      Boolean(insights.spread)
    : false;
  const showChart = historyPointCount > 0;
  const showEmptyHistory = Boolean(args.selectedSlice) && Boolean(history) && historyPointCount === 0;
  const showEmptyState = !showChart && !showEmptyHistory && !hasInsights;

  return {
    showChart,
    showEmptyHistory,
    showInsights: hasInsights,
    showDisclosure: true,
    showEmptyState,
  };
}

function buildDiagnostics(args: {
  selectedSlice: MarketAnalysisSelectedSlice | null;
  history: JustTcgPriceHistoryResult | null;
  uiFlags: CardMarketAnalysisUiFlags;
}): CardMarketAnalysisDiagnostics {
  const historyDiagnostics = args.history?.diagnostics;
  const historyPointCount = args.history?.points.length ?? 0;
  const usedCardFallback = historyDiagnostics?.usedCardFallback ?? false;
  const rawPointCount =
    historyDiagnostics?.identifierPathUsed === "card" ||
    (usedCardFallback && (historyDiagnostics?.cardAttemptRawCount ?? 0) > 0)
      ? historyDiagnostics?.cardAttemptRawCount ?? 0
      : historyDiagnostics?.variantAttemptRawCount ?? 0;
  const normalizedPointCount =
    historyDiagnostics?.identifierPathUsed === "card" ||
    (usedCardFallback && (historyDiagnostics?.cardAttemptNormalizedCount ?? 0) > 0)
      ? historyDiagnostics?.cardAttemptNormalizedCount ?? 0
      : historyDiagnostics?.variantAttemptNormalizedCount ?? 0;

  return {
    selectedSlice: args.selectedSlice
      ? {
          variantId: args.selectedSlice.variantId,
          condition: args.selectedSlice.condition,
          printing: args.selectedSlice.printing,
          language: args.selectedSlice.language,
        }
      : null,
    identifierPathUsed: historyDiagnostics?.identifierPathUsed ?? null,
    rawPointCount,
    normalizedPointCount,
    historyPointCount,
    usedCardFallback,
    noHistoryReason: historyDiagnostics?.noHistoryReason ?? null,
    pageMode: args.uiFlags.showChart
      ? "chart"
      : args.uiFlags.showEmptyHistory
        ? "empty-history"
        : args.uiFlags.showEmptyState
          ? "empty-state"
          : "insights-only",
  };
}

export async function getCardMarketAnalysisModel(
  cardPrintId: string,
  duration: string | null | undefined,
): Promise<CardMarketAnalysisModel> {
  const normalizedCardPrintId = cardPrintId.trim();
  const normalizedDuration = normalizeJustTcgHistoryDuration(duration);

  if (!normalizedCardPrintId) {
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
        noHistoryReason: "No card_print_id was supplied for market analysis.",
        pageMode: "empty-state",
      },
    };
  }

  const supabase = createServerComponentClient();
  const [{ data: mappingData, error: mappingError }, { data: localRows, error: localRowsError }] =
    await Promise.all([
      supabase
        .from("external_mappings")
        .select("external_id")
        .eq("card_print_id", normalizedCardPrintId)
        .eq("source", "justtcg")
        .eq("active", true)
        .maybeSingle(),
      supabase
        .from("justtcg_variant_prices_latest")
        .select("variant_id,condition,printing,language,price,avg_price,price_change_7d,updated_at")
        .eq("card_print_id", normalizedCardPrintId),
    ]);

  if (mappingError) {
    console.error("[pricing:market-analysis] JustTCG mapping lookup failed", {
      cardPrintId: normalizedCardPrintId,
      error: mappingError,
    });
  }

  if (localRowsError) {
    console.error("[pricing:market-analysis] local latest-row lookup failed", {
      cardPrintId: normalizedCardPrintId,
      error: localRowsError,
    });
  }

  const typedRows = ((localRows ?? []) as MarketAnalysisLocalRow[]).map((row) => ({
    variant_id: row.variant_id,
    condition: row.condition,
    printing: row.printing,
    language: row.language,
    price: row.price,
    avg_price: row.avg_price,
    price_change_7d: row.price_change_7d,
    updated_at: row.updated_at,
  }));
  const selectedSlice = resolveSelectedSlice(typedRows);
  const insights = deriveMarketInsights(typedRows);
  const justTcgCardId = (mappingData as ExternalMappingRow | null)?.external_id?.trim() ?? null;
  const history =
    selectedSlice !== null
      ? await getJustTcgPriceHistory({
          cardPrintId: normalizedCardPrintId,
          selectedSlice,
          duration: normalizedDuration,
          justTcgCardId,
        })
      : null;
  const uiFlags = buildUiFlags({
    selectedSlice,
    history,
    insights,
  });
  const latestHistoryPoint =
    history && history.points.length > 0 ? history.points[history.points.length - 1] : null;
  const heroPrice =
    typeof history?.currentPrice === "number"
      ? history.currentPrice
      : latestHistoryPoint?.price ?? selectedSlice?.currentPrice ?? null;
  const heroUpdatedAt = history?.updatedAt ?? insights?.updatedAt ?? selectedSlice?.updatedAt ?? null;
  const diagnostics = buildDiagnostics({
    selectedSlice,
    history,
    uiFlags,
  });

  console.info("[pricing:market-analysis] resolved canonical model", {
    cardPrintId: normalizedCardPrintId,
    duration: normalizedDuration,
    selectedSlice: diagnostics.selectedSlice,
    identifierPathUsed: diagnostics.identifierPathUsed,
    rawPointCount: diagnostics.rawPointCount,
    normalizedPointCount: diagnostics.normalizedPointCount,
    historyPointCount: diagnostics.historyPointCount,
    usedCardFallback: diagnostics.usedCardFallback,
    noHistoryReason: diagnostics.noHistoryReason,
    finalPageMode: diagnostics.pageMode,
  });

  return {
    duration: normalizedDuration,
    selectedSlice,
    history,
    insights,
    heroPrice,
    heroUpdatedAt,
    uiFlags,
    diagnostics,
  };
}
