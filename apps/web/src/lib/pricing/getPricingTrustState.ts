import type { CardPricingComps } from "@/lib/pricing/getCardPricingComps";

export type PricingTrustMarketState = "active" | "thin" | "none";
export type PricingTrustConfidenceLabel = "high" | "medium" | "low" | "none";
export type PricingTrustFreshnessLabel = "fresh" | "aging" | "stale" | "unknown";

export type PricingTrustState = {
  marketState: PricingTrustMarketState;
  confidenceLabel: PricingTrustConfidenceLabel;
  freshnessLabel: PricingTrustFreshnessLabel;
  acceptedCompCount: number;
  acceptedPriceMin?: number;
  acceptedPriceMax?: number;
  latestObservedAt?: string;
  ageInDays: number | null;
  hasAcceptedComps: boolean;
  hasFilteredRows: boolean;
  trustSummaryText: string;
};

type PricingTrustInput = {
  comps: CardPricingComps;
  now?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getAgeInDays(latestObservedAt?: string, now = new Date()) {
  if (!latestObservedAt) {
    return null;
  }

  const latestMs = Date.parse(latestObservedAt);
  if (!Number.isFinite(latestMs)) {
    return null;
  }

  const diffMs = Math.max(0, now.getTime() - latestMs);
  return Math.floor(diffMs / DAY_MS);
}

function deriveMarketState(acceptedCompCount: number): PricingTrustMarketState {
  if (acceptedCompCount >= 3) {
    return "active";
  }
  if (acceptedCompCount >= 1) {
    return "thin";
  }
  return "none";
}

function deriveFreshnessLabel(acceptedCompCount: number, ageInDays: number | null): PricingTrustFreshnessLabel {
  if (acceptedCompCount === 0 || ageInDays === null) {
    return "unknown";
  }
  if (ageInDays <= 2) {
    return "fresh";
  }
  if (ageInDays <= 7) {
    return "aging";
  }
  return "stale";
}

function deriveConfidenceLabel(
  acceptedCompCount: number,
  ageInDays: number | null,
): PricingTrustConfidenceLabel {
  if (acceptedCompCount === 0) {
    return "none";
  }
  if (ageInDays !== null && acceptedCompCount >= 8 && ageInDays <= 3) {
    return "high";
  }
  if (ageInDays !== null && acceptedCompCount >= 3 && acceptedCompCount <= 7 && ageInDays <= 7) {
    return "medium";
  }
  return "low";
}

function getMarketStateLabel(marketState: PricingTrustMarketState) {
  if (marketState === "active") {
    return "Active market";
  }
  if (marketState === "thin") {
    return "Thin market";
  }
  return "No active market";
}

function getSummaryText({
  marketState,
  confidenceLabel,
  freshnessLabel,
  hasAcceptedComps,
}: {
  marketState: PricingTrustMarketState;
  confidenceLabel: PricingTrustConfidenceLabel;
  freshnessLabel: PricingTrustFreshnessLabel;
  hasAcceptedComps: boolean;
}) {
  if (!hasAcceptedComps) {
    return "No accepted live comps yet";
  }

  const confidenceText =
    confidenceLabel === "none" ? null : `${confidenceLabel.charAt(0).toUpperCase()}${confidenceLabel.slice(1)} confidence`;
  const freshnessText =
    freshnessLabel === "unknown" ? null : `${freshnessLabel.charAt(0).toUpperCase()}${freshnessLabel.slice(1)}`;
  const marketText = getMarketStateLabel(marketState);

  return [confidenceText, freshnessText, marketText].filter((value): value is string => Boolean(value)).join(" · ");
}

export function getPricingTrustState({ comps, now = new Date() }: PricingTrustInput): PricingTrustState {
  const acceptedCompCount = comps.summary.accepted_count;
  const latestObservedAt = acceptedCompCount > 0 ? comps.summary.latest_observed_at : undefined;
  const ageInDays = getAgeInDays(latestObservedAt, now);
  const marketState = deriveMarketState(acceptedCompCount);
  const freshnessLabel = deriveFreshnessLabel(acceptedCompCount, ageInDays);
  const confidenceLabel = deriveConfidenceLabel(acceptedCompCount, ageInDays);
  const hasAcceptedComps = acceptedCompCount > 0;
  const hasFilteredRows = comps.summary.staged_count > 0 || comps.summary.rejected_count > 0;

  return {
    marketState,
    confidenceLabel,
    freshnessLabel,
    acceptedCompCount,
    acceptedPriceMin: comps.summary.accepted_price_min,
    acceptedPriceMax: comps.summary.accepted_price_max,
    latestObservedAt,
    ageInDays,
    hasAcceptedComps,
    hasFilteredRows,
    trustSummaryText: getSummaryText({
      marketState,
      confidenceLabel,
      freshnessLabel,
      hasAcceptedComps,
    }),
  };
}
