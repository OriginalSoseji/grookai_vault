import type { PricingTrustConfidenceLabel } from "@/lib/pricing/getPricingTrustState";
import type { ReferencePricing, ReferencePricingSource } from "@/lib/pricing/getReferencePricing";

export type PricingProjectionConfidenceLabel = "high" | "medium" | "low" | "none";

export type PricingProjectionState = {
  projectionAvailable: boolean;
  projectionSource: ReferencePricingSource;
  projectedPsa10Value: number | null;
  projectedUpsideAbsolute: number | null;
  projectedUpsidePercent: number | null;
  projectionSummaryText: string;
  projectionConfidenceLabel: PricingProjectionConfidenceLabel;
  referenceValueUsed: number | null;
  rawMarketValueUsed: number | null;
  projectionMethodLabel: string;
  projectionNotes: string[];
};

type PricingProjectionInput = {
  rawMarketValue?: number;
  rawMarketConfidenceLabel?: PricingTrustConfidenceLabel;
  referencePricing: ReferencePricing;
};

function isFinitePrice(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function deriveProjectionConfidenceLabel({
  hasRawMarketValue,
  hasReferenceValue,
  rawMarketConfidenceLabel,
}: {
  hasRawMarketValue: boolean;
  hasReferenceValue: boolean;
  rawMarketConfidenceLabel?: PricingTrustConfidenceLabel;
}): PricingProjectionConfidenceLabel {
  if (!hasRawMarketValue && !hasReferenceValue) {
    return "none";
  }

  if (hasRawMarketValue && hasReferenceValue) {
    if (rawMarketConfidenceLabel === "high" || rawMarketConfidenceLabel === "medium") {
      return "high";
    }
    return "medium";
  }

  return "low";
}

export function getPricingProjectionState({
  rawMarketValue,
  rawMarketConfidenceLabel,
  referencePricing,
}: PricingProjectionInput): PricingProjectionState {
  // Projection-lane invariant:
  // Reference pricing may inform modeled output here, but it must never mutate or
  // replace Grookai's raw market-truth lane, trust labels, comps, or accepted observations.
  const hasRawMarketValue = isFinitePrice(rawMarketValue);
  const hasReferenceValue = referencePricing.referenceAvailable && isFinitePrice(referencePricing.psa10Value);

  const rawMarketValueUsed = hasRawMarketValue ? rawMarketValue ?? null : null;
  const referenceValueUsed = hasReferenceValue ? referencePricing.psa10Value ?? null : null;
  const projectionAvailable = hasReferenceValue;
  const projectedPsa10Value = hasReferenceValue ? referencePricing.psa10Value ?? null : null;
  const projectedUpsideAbsolute =
    hasRawMarketValue && hasReferenceValue && projectedPsa10Value !== null
      ? projectedPsa10Value - (rawMarketValue ?? 0)
      : null;
  const projectedUpsidePercent =
    projectedUpsideAbsolute !== null && rawMarketValue && rawMarketValue > 0
      ? projectedUpsideAbsolute / rawMarketValue
      : null;

  const projectionConfidenceLabel = deriveProjectionConfidenceLabel({
    hasRawMarketValue,
    hasReferenceValue,
    rawMarketConfidenceLabel,
  });

  const projectionNotes = [...referencePricing.referenceNotes];
  if (!projectionNotes.includes("Projection only. Not current market price.")) {
    projectionNotes.push("Projection only. Not current market price.");
  }

  let projectionSummaryText = "PSA 10 projection unavailable";
  if (hasRawMarketValue && hasReferenceValue) {
    projectionSummaryText = "Reference-backed PSA 10 projection available";
  } else if (!hasRawMarketValue && hasReferenceValue) {
    projectionSummaryText = "Reference-backed PSA 10 value available, but current raw market is unavailable";
  } else if (hasRawMarketValue && !hasReferenceValue) {
    projectionSummaryText = "PSA 10 projection unavailable because no reference PSA 10 value is available";
  } else if (referencePricing.unavailableReason) {
    projectionSummaryText = referencePricing.unavailableReason;
  }

  return {
    projectionAvailable,
    projectionSource: hasReferenceValue ? referencePricing.referenceSource : "none",
    projectedPsa10Value,
    projectedUpsideAbsolute,
    projectedUpsidePercent,
    projectionSummaryText,
    projectionConfidenceLabel,
    referenceValueUsed,
    rawMarketValueUsed,
    projectionMethodLabel:
      hasReferenceValue && hasRawMarketValue
        ? "Reference + Grookai projection"
        : hasReferenceValue
          ? "Reference-backed projection"
          : "Reference lane unavailable",
    projectionNotes,
  };
}
