import "server-only";

export type ReferencePricingSource = "none";
export type ReferencePricingConfidence = "none";

export type ReferencePricing = {
  referenceAvailable: boolean;
  referenceSource: ReferencePricingSource;
  psa10Value: number | null;
  rawReferenceValue: number | null;
  referenceUpdatedAt: string | null;
  referenceConfidence: ReferencePricingConfidence;
  referenceNotes: string[];
  unavailableReason: string | null;
};

export async function getReferencePricing(cardPrintId: string): Promise<ReferencePricing> {
  const normalizedCardPrintId = cardPrintId.trim();
  return {
    referenceAvailable: false,
    referenceSource: "none",
    psa10Value: null,
    rawReferenceValue: null,
    referenceUpdatedAt: null,
    referenceConfidence: "none",
    referenceNotes: [],
    unavailableReason: normalizedCardPrintId
      ? "Legacy reference pricing is retired."
      : "No card_print_id was supplied for reference pricing.",
  };
}
