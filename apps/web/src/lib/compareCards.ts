export const MAX_COMPARE_CARDS = 4;
export const MIN_COMPARE_CARDS = 2;

const COMPARE_CARD_ID_PATTERN = /^GV-[A-Z0-9]+(?:-[A-Z0-9.]+)+$/;

function normalizeCompareCardId(value: string) {
  const normalized = value.trim().toUpperCase();
  return COMPARE_CARD_ID_PATTERN.test(normalized) ? normalized : "";
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
  const params = new URLSearchParams();
  const compareCardsParam = buildCompareCardsParam(cards);

  if (compareCardsParam) {
    params.set("cards", compareCardsParam);
  }

  const query = params.toString();
  return query ? `/compare?${query}` : "/compare";
}

export function buildPathWithCompareCards(pathname: string, existingSearch = "", cards: string[] = []) {
  const params = new URLSearchParams(existingSearch);
  const compareCardsParam = buildCompareCardsParam(cards);

  if (compareCardsParam) {
    params.set("cards", compareCardsParam);
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
