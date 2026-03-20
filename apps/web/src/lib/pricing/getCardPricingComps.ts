import "server-only";

import { getPricingObservations, type PricingObservation } from "@/lib/pricing/getPricingObservations";

export type CardPricingCompRow = PricingObservation & {
  total_price: number;
};

export type CardPricingCompsSummary = {
  accepted_count: number;
  staged_count: number;
  rejected_count: number;
  latest_observed_at?: string;
  accepted_price_min?: number;
  accepted_price_max?: number;
  accepted_average_match_confidence?: number;
};

export type CardPricingComps = {
  accepted: CardPricingCompRow[];
  staged: CardPricingCompRow[];
  rejected: CardPricingCompRow[];
  summary: CardPricingCompsSummary;
};

function toTotalPrice(row: PricingObservation) {
  return row.price + row.shipping;
}

function sortRows(rows: PricingObservation[]) {
  return [...rows].sort((left, right) => {
    const leftObserved = left.observed_at ? Date.parse(left.observed_at) : 0;
    const rightObserved = right.observed_at ? Date.parse(right.observed_at) : 0;
    if (rightObserved !== leftObserved) {
      return rightObserved - leftObserved;
    }
    return toTotalPrice(right) - toTotalPrice(left);
  });
}

function withTotalPrice(rows: PricingObservation[]): CardPricingCompRow[] {
  return sortRows(rows).map((row) => ({
    ...row,
    total_price: toTotalPrice(row),
  }));
}

function averageConfidence(rows: CardPricingCompRow[]) {
  const confidences = rows
    .map((row) => row.match_confidence)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (confidences.length === 0) {
    return undefined;
  }

  const total = confidences.reduce((sum, value) => sum + value, 0);
  return Number((total / confidences.length).toFixed(3));
}

export async function getCardPricingComps(cardPrintId: string): Promise<CardPricingComps> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return {
      accepted: [],
      staged: [],
      rejected: [],
      summary: {
        accepted_count: 0,
        staged_count: 0,
        rejected_count: 0,
      },
    };
  }

  const rows = await getPricingObservations(normalizedCardPrintId);

  const accepted = withTotalPrice(rows.filter((row) => row.classification === "accepted"));
  const staged = withTotalPrice(rows.filter((row) => row.classification === "staged"));
  const rejected = withTotalPrice(rows.filter((row) => row.classification === "rejected"));

  const observedTimestamps = rows
    .map((row) => row.observed_at)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  const acceptedObservedTimestamps = accepted
    .map((row) => row.observed_at)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((left, right) => Date.parse(right) - Date.parse(left));

  const acceptedTotals = accepted
    .map((row) => row.total_price)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  return {
    accepted,
    staged,
    rejected,
    summary: {
      accepted_count: accepted.length,
      staged_count: staged.length,
      rejected_count: rejected.length,
      latest_observed_at: acceptedObservedTimestamps[0] ?? observedTimestamps[0],
      accepted_price_min: acceptedTotals.length > 0 ? acceptedTotals[0] : undefined,
      accepted_price_max: acceptedTotals.length > 0 ? acceptedTotals[acceptedTotals.length - 1] : undefined,
      accepted_average_match_confidence: averageConfidence(accepted),
    },
  };
}
