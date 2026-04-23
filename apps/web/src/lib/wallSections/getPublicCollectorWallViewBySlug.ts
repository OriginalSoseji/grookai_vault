import "server-only";

import { cache } from "react";
import { getPublicWallCardsBySlug } from "@/lib/wallSections/getPublicWallCardsBySlug";
import { getPublicWallSectionsBySlug } from "@/lib/wallSections/getPublicWallSectionsBySlug";
import {
  PUBLIC_WALL_SECTION_ID,
  type PublicCollectorSectionView,
} from "@/lib/wallSections/wallSectionTypes";

export const getPublicCollectorWallViewBySlug = cache(async (
  slug: string,
): Promise<PublicCollectorSectionView[]> => {
  const [wallCards, sectionSummaries] = await Promise.all([
    getPublicWallCardsBySlug(slug),
    getPublicWallSectionsBySlug(slug),
  ]);

  // LOCK: Public Wall route loads Wall cards plus section rail summaries only.
  // LOCK: Do not fetch every custom section card grid for the default Wall view.
  return [
    Object.freeze({
      id: PUBLIC_WALL_SECTION_ID,
      kind: "wall" as const,
      name: "Wall",
      position: -1,
      item_count: wallCards.length,
      cards: wallCards,
    }),
    ...sectionSummaries.map((section) =>
      Object.freeze({
        id: section.id,
        kind: "custom" as const,
        name: section.name,
        position: section.position,
        item_count: section.item_count,
        cards: [],
      }),
    ),
  ];
});
