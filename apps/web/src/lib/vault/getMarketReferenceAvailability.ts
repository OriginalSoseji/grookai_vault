export type MarketReferenceAvailability = {
  code: "graded" | "missing_printing" | "no_fresh_reference";
  title: string;
  description: string;
  actionLabel: string;
};

export function getMarketReferenceAvailability(input: {
  isGraded: boolean;
  cardPrintingId: string | null;
}): MarketReferenceAvailability | null {
  if (input.isGraded) {
    return {
      code: "graded",
      title: "Slab pricing is not published here",
      description:
        "TCGPlayer Market references in Grookai are qualified for exact raw printings. A slab stays unpriced until you set an asking price or manage its certified value separately.",
      actionLabel: "Set an asking price",
    };
  }

  if (!input.cardPrintingId) {
    return {
      code: "missing_printing",
      title: "This copy is missing an exact printing",
      description:
        "Grookai cannot request an exact market reference until the copy is linked to a printing. Review the card identity before treating it as unpriced.",
      actionLabel: "Review card identity",
    };
  }

  return {
    code: "no_fresh_reference",
    title: "No fresh market reference is available",
    description:
      "No qualified TCGPlayer Market row was returned for this exact raw printing. This is missing evidence, not a zero value. Set an asking price or review the printing if the identity looks wrong.",
    actionLabel: "Set an asking price",
  };
}
