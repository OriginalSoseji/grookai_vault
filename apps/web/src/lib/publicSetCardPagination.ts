type PublicSetCardIdentity = {
  gv_id: string;
};

export function dedupePublicSetCards<T extends PublicSetCardIdentity>(cards: T[]) {
  const seen = new Set<string>();

  return cards.filter((card) => {
    if (seen.has(card.gv_id)) {
      return false;
    }

    seen.add(card.gv_id);
    return true;
  });
}

export function mergePublicSetCardPage<T extends PublicSetCardIdentity>({
  currentCards,
  pageItems,
  rawOffset,
  pageSize,
  totalCount,
}: {
  currentCards: T[];
  pageItems: T[];
  rawOffset: number;
  pageSize: number;
  totalCount: number;
}) {
  const cards = dedupePublicSetCards([...currentCards, ...pageItems]);
  const nextOffset = rawOffset + pageItems.length;

  return {
    cards,
    nextOffset,
    hasReachedEnd:
      pageItems.length < pageSize || nextOffset >= totalCount,
  };
}
