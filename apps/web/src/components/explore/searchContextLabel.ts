import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";

export function getSearchContextLabel(card: Pick<ExploreResultCard, "search_object_type" | "display_discriminator" | "finish_label">) {
  const displayDiscriminator = card.display_discriminator?.trim();
  const finishLabel = card.finish_label?.trim();
  if (displayDiscriminator?.startsWith("Cameo:") || displayDiscriminator?.startsWith("Cameo trainer:")) {
    return displayDiscriminator;
  }

  if (card.search_object_type === "child_printing") {
    return displayDiscriminator && displayDiscriminator.toLowerCase() !== finishLabel?.toLowerCase()
      ? displayDiscriminator
      : undefined;
  }

  return undefined;
}
