import type { GrookaiAssistantVariantExplanationContextResponse } from "@/lib/ai/grookaiAssistantSchemas";
import type { VariantOriginPublicCopy } from "@/lib/cards/variantOriginPublicCopy";

export type GrookaiVariantExplanationViewModel = {
  status: "ready" | "not_enough_context";
  title: string;
  summary: string;
  why_it_exists: string | null;
  why_collectors_care: string | null;
  how_to_identify: string | null;
  grookai_rule: string | null;
  source_urls: string[];
  limitation_notes: string[];
};

type GrookaiVariantExplanationBuilderContext = Omit<
  GrookaiAssistantVariantExplanationContextResponse,
  "explanation"
>;

type GrookaiVariantExplanationCard = {
  name?: string | null;
  set_name?: string | null;
  printed_number?: string | null;
};

function buildCardLabel(card: GrookaiVariantExplanationCard) {
  return [
    card.name,
    card.set_name,
    card.printed_number ? `#${card.printed_number}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function buildGrookaiVariantExplanationFromPublicCopy({
  card,
  variantOrigin,
  limitations = [],
}: {
  card: GrookaiVariantExplanationCard;
  variantOrigin: VariantOriginPublicCopy | null;
  limitations?: string[];
}): GrookaiVariantExplanationViewModel {
  const cardLabel = buildCardLabel(card);

  if (!variantOrigin) {
    return {
      status: "not_enough_context",
      title: "Variant context not available yet",
      summary: `${cardLabel || "This card"} is in Grookai canon, but Grookai does not yet have public special-variant explanation data for this row.`,
      why_it_exists: null,
      why_collectors_care: null,
      how_to_identify: null,
      grookai_rule: null,
      source_urls: [],
      limitation_notes: limitations,
    };
  }

  return {
    status: "ready",
    title: variantOrigin.family_label,
    summary: `${cardLabel || "This card"} belongs to the ${variantOrigin.family_label} family. Grookai treats this as ${variantOrigin.variant_category.replace(/[_-]+/g, " ")} with ${variantOrigin.confidence} confidence.`,
    why_it_exists: variantOrigin.why_it_exists,
    why_collectors_care: variantOrigin.why_collectors_care,
    how_to_identify: variantOrigin.how_to_identify,
    grookai_rule: variantOrigin.grookai_rule,
    source_urls: variantOrigin.source_urls,
    limitation_notes: limitations,
  };
}

export function buildGrookaiVariantExplanation(
  context: GrookaiVariantExplanationBuilderContext,
): GrookaiVariantExplanationViewModel {
  return buildGrookaiVariantExplanationFromPublicCopy({
    card: context.card,
    variantOrigin: context.variant_origin,
    limitations: context.limitations,
  });
}
