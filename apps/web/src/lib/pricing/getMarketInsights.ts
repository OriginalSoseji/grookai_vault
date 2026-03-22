import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";

const CONDITION_ORDER = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export type MarketInsightsRow = {
  condition: string | null;
  printing: string | null;
  price: number | null;
  avg_price: number | null;
  price_change_7d: number | null;
  updated_at: string | null;
};

export type MarketInsightConditionRow = {
  condition: string;
  price: number;
};

export type MarketInsights = {
  conditionCurve: Record<string, number>;
  conditionRows: MarketInsightConditionRow[];
  spread: {
    low: number;
    mid: number;
    high: number;
    width: "tight" | "moderate" | "wide";
  } | null;
  printingPremium: number | null;
  trend: {
    percent: number;
    direction: "up" | "down" | "flat";
  } | null;
  updatedAt: string | null;
};

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumeric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function avg(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function classifySpread(low: number, high: number) {
  if (low <= 0) {
    return "wide" as const;
  }

  const ratio = high / low;
  if (ratio < 1.2) return "tight" as const;
  if (ratio < 1.5) return "moderate" as const;
  return "wide" as const;
}

function isNearMint(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "near mint" || normalized === "nm";
}

function isNormalPrinting(value: string) {
  return value.trim().toLowerCase() === "normal";
}

function isReverseHolofoilPrinting(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "reverse holofoil" || normalized === "reverse-holofoil";
}

function getConditionRank(condition: string) {
  const exactIndex = CONDITION_ORDER.indexOf(condition as (typeof CONDITION_ORDER)[number]);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  return CONDITION_ORDER.length;
}

export function deriveMarketInsights(inputRows: MarketInsightsRow[]): MarketInsights | null {
  const rows = inputRows
    .map((row) => ({
      condition: normalizeText(row.condition),
      printing: normalizeText(row.printing),
      price: normalizeNumeric(row.price),
      avg_price: normalizeNumeric(row.avg_price),
      price_change_7d: normalizeNumeric(row.price_change_7d),
      updated_at: normalizeText(row.updated_at) || null,
    }))
    .filter(
      (
        row,
      ): row is {
        condition: string;
        printing: string;
        price: number;
        avg_price: number | null;
        price_change_7d: number | null;
        updated_at: string | null;
      } => row.condition.length > 0 && row.printing.length > 0 && typeof row.price === "number",
    );

  if (rows.length === 0) {
    return null;
  }

  const byCondition: Record<string, number[]> = {};
  const byPrinting: Record<string, number[]> = {};

  for (const row of rows) {
    if (!byCondition[row.condition]) {
      byCondition[row.condition] = [];
    }
    if (!byPrinting[row.printing]) {
      byPrinting[row.printing] = [];
    }

    byCondition[row.condition].push(row.price);
    byPrinting[row.printing].push(row.price);
  }

  const conditionCurve: Record<string, number> = {};
  for (const [condition, prices] of Object.entries(byCondition)) {
    if (prices.length === 0) {
      continue;
    }

    conditionCurve[condition] = round(avg(prices));
  }

  const conditionRows = Object.entries(conditionCurve)
    .sort(([left], [right]) => {
      const leftRank = getConditionRank(left);
      const rightRank = getConditionRank(right);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.localeCompare(right);
    })
    .map(([condition, price]) => ({
      condition,
      price,
    }));

  const nmNormalRows = rows.filter((row) => isNearMint(row.condition) && isNormalPrinting(row.printing));
  let spread: MarketInsights["spread"] = null;
  if (nmNormalRows.length > 0) {
    const prices = nmNormalRows.map((row) => row.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const mid = avg(prices);

    spread = {
      low: round(low),
      mid: round(mid),
      high: round(high),
      width: classifySpread(low, high),
    };
  }

  let printingPremium: number | null = null;
  const normalPrintingKey = Object.keys(byPrinting).find((key) => isNormalPrinting(key));
  const reversePrintingKey = Object.keys(byPrinting).find((key) => isReverseHolofoilPrinting(key));
  if (normalPrintingKey && reversePrintingKey) {
    const normalAvg = avg(byPrinting[normalPrintingKey]);
    const reverseAvg = avg(byPrinting[reversePrintingKey]);

    if (normalAvg > 0) {
      printingPremium = round(reverseAvg / normalAvg);
    }
  }

  const trendValues = rows
    .map((row) => row.price_change_7d)
    .filter((value): value is number => typeof value === "number");
  let trend: MarketInsights["trend"] = null;
  if (trendValues.length > 0) {
    const avgTrend = avg(trendValues);
    trend = {
      percent: round(avgTrend),
      direction: avgTrend > 0 ? "up" : avgTrend < 0 ? "down" : "flat",
    };
  }

  const updatedAt = rows.reduce<string | null>((latest, row) => {
    if (!row.updated_at) {
      return latest;
    }
    if (!latest) {
      return row.updated_at;
    }

    return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
  }, null);

  return {
    conditionCurve,
    conditionRows,
    spread,
    printingPremium,
    trend,
    updatedAt,
  };
}

export async function getMarketInsights(cardPrintId: string): Promise<MarketInsights | null> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("justtcg_variant_prices_latest")
    .select("condition,printing,price,avg_price,price_change_7d,updated_at")
    .eq("card_print_id", normalizedCardPrintId);

  if (error) {
    console.error("[pricing:market-insights] getMarketInsights failed", {
      cardPrintId: normalizedCardPrintId,
      error,
    });
    return null;
  }

  return deriveMarketInsights((data ?? []) as MarketInsightsRow[]);
}
