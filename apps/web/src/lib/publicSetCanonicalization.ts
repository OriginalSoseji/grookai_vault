export type EmbeddedCardPrintCount =
  | { count: number | null }
  | { count: number | null }[]
  | null
  | undefined;

type PublicSetCandidate = {
  code: string;
  card_count: number;
  release_date?: string;
};

export function getEmbeddedCardPrintCount(
  relation: EmbeddedCardPrintCount,
) {
  const countRow = Array.isArray(relation) ? relation[0] : relation;
  const count = countRow?.count;

  return typeof count === "number" && Number.isFinite(count)
    ? Math.max(0, Math.trunc(count))
    : 0;
}

export function getManifestCardPrintCount(
  counts: Readonly<Record<string, number>>,
  setCode?: string | null,
) {
  const normalizedCode = (setCode ?? "").trim().toLowerCase();
  const count = counts[normalizedCode];

  return typeof count === "number" && Number.isFinite(count)
    ? Math.max(0, Math.trunc(count))
    : 0;
}

export function chooseCanonicalSetRow<T extends PublicSetCandidate>(
  existing: T,
  candidate: T,
) {
  if (candidate.card_count !== existing.card_count) {
    return candidate.card_count > existing.card_count ? candidate : existing;
  }

  if (Boolean(candidate.release_date) !== Boolean(existing.release_date)) {
    return candidate.release_date ? candidate : existing;
  }

  return candidate.code.length < existing.code.length ? candidate : existing;
}
