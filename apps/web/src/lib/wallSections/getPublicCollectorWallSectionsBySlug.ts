import "server-only";

import { cache } from "react";
import { getPublicSectionCardsBySlug } from "@/lib/wallSections/getPublicSectionCardsBySlug";
import { getPublicWallCardsBySlug } from "@/lib/wallSections/getPublicWallCardsBySlug";
import { getPublicWallSectionsBySlug } from "@/lib/wallSections/getPublicWallSectionsBySlug";
import {
  PUBLIC_WALL_SECTION_ID,
  type PublicCollectorSectionView,
} from "@/lib/wallSections/wallSectionTypes";

export const getPublicCollectorWallSectionsBySlug = cache(async (
  slug: string,
): Promise<PublicCollectorSectionView[]> => {
  const [wallCards, sectionSummaries] = await Promise.all([
    getPublicWallCardsBySlug(slug),
    getPublicWallSectionsBySlug(slug),
  ]);

  const sectionCards = await Promise.all(
    sectionSummaries.map(async (section) => ({
      section,
      cards: await getPublicSectionCardsBySlug(slug, section.id),
    })),
  );

  const customSections = sectionCards
    .filter(({ cards }) => cards.length > 0)
    .map(({ section, cards }) =>
      Object.freeze({
        id: section.id,
        kind: "custom" as const,
        name: section.name,
        position: section.position,
        item_count: cards.length,
        cards,
      }),
    );

  // LOCK: Wall is system-derived and always first.
  // LOCK: Custom Sections are durable public presentation layers, not grouped shared_cards categories.
  return [
    Object.freeze({
      id: PUBLIC_WALL_SECTION_ID,
      kind: "wall" as const,
      name: "Wall",
      position: -1,
      item_count: wallCards.length,
      cards: wallCards,
    }),
    ...customSections,
  ];
});
