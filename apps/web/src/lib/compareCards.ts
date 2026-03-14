export const MAX_COMPARE_CARDS = 4;
export const MIN_COMPARE_CARDS = 2;

function normalizeCompareCardId(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeCompareCardsParam(raw?: string | string[] | null) {
  const source = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const values = source.split(",");
  const seen = new Set<string>();
  const cards: string[] = [];

  for (const value of values) {
    const normalized = normalizeCompareCardId(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    cards.push(normalized);

    if (cards.length >= MAX_COMPARE_CARDS) {
      break;
    }
  }

  return cards;
}

export function buildCompareCardsParam(cards: string[]) {
  return normalizeCompareCardsParam(cards).join(",");
}

export function buildCompareHref(cards: string[]) {
  const normalized = normalizeCompareCardsParam(cards);
  const params = new URLSearchParams();
  if (normalized.length > 0) {
    params.set("cards", normalized.join(","));
  }
  const query = params.toString();
  return query ? `/compare?${query}` : "/compare";
}

export function buildPathWithCompareCards(pathname: string, existingSearch: string, cards: string[]) {
  const params = new URLSearchParams(existingSearch);
  const normalized = normalizeCompareCardsParam(cards);

  if (normalized.length > 0) {
    params.set("cards", normalized.join(","));
  } else {
    params.delete("cards");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function toggleCompareCard(cards: string[], gvId: string) {
  const normalizedCards = normalizeCompareCardsParam(cards);
  const normalizedGvId = normalizeCompareCardId(gvId);

  if (!normalizedGvId) {
    return normalizedCards;
  }

  if (normalizedCards.includes(normalizedGvId)) {
    return normalizedCards.filter((value) => value !== normalizedGvId);
  }

  if (normalizedCards.length >= MAX_COMPARE_CARDS) {
    return normalizedCards;
  }

  return [...normalizedCards, normalizedGvId];
}
