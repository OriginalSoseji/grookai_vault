import "server-only";

import type { PublicSetCard } from "@/lib/publicSets.shared";
import { getOwnedPrintingCountsByCardPrintIds } from "@/lib/vault/getOwnedPrintingCountsByCardPrintIds";

export async function applyOwnedPrintingCountsToSetCards(
  cards: PublicSetCard[],
  userId: string | null | undefined,
): Promise<PublicSetCard[]> {
  if (!userId || cards.length === 0) {
    return cards;
  }

  const ownedCounts = await getOwnedPrintingCountsByCardPrintIds(
    userId,
    cards.map((card) => card.id).filter((id): id is string => Boolean(id)),
  );

  if (ownedCounts.size === 0) {
    return cards;
  }

  return cards.map((card) => {
    const countsByPrintingId = card.id ? ownedCounts.get(card.id) : null;
    if (!countsByPrintingId || !card.printings?.length) {
      return card;
    }

    return {
      ...card,
      printings: card.printings.map((printing) => ({
        ...printing,
        owned_count: printing.id ? countsByPrintingId.get(printing.id) ?? 0 : 0,
      })),
    };
  });
}
