type CardWithSetCode = {
  set_code?: string | null;
};

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function deriveTopSetCodesFromCards(cards: CardWithSetCode[], limit = 3) {
  const counts = new Map<string, number>();

  for (const card of cards) {
    const setCode = normalizeSetCode(card.set_code);
    if (!setCode) {
      continue;
    }

    counts.set(setCode, (counts.get(setCode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([setCode]) => setCode);
}
