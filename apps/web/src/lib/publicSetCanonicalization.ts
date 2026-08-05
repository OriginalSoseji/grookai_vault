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

type PublicSetMetadataCandidate = {
  code?: string | null;
  name?: string | null;
  hero_image_url?: string | null;
  printed_set_abbrev?: string | null;
  printed_total?: number | null;
  release_date?: string | null;
};

function normalizeComparableValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isGeneratedJapaneseSetName(candidate: PublicSetMetadataCandidate) {
  const code = normalizeComparableValue(candidate.code).replace(/^jpn-/, "");
  const name = normalizeComparableValue(candidate.name);
  if (!code || !name) {
    return false;
  }

  return new Set([
    `japanese ${code}`,
    `japanese ${code} set`,
    `japanese ${code} pokemon set`,
    `japanese ${code} pokemon card set`,
  ]).has(name);
}

function getMetadataSpecificityScore(candidate: PublicSetMetadataCandidate) {
  let score = 0;
  if (normalizeComparableValue(candidate.name)) score += 1;
  if (!isGeneratedJapaneseSetName(candidate)) score += 32;
  if (normalizeComparableValue(candidate.hero_image_url)) score += 8;
  if (normalizeComparableValue(candidate.printed_set_abbrev)) score += 4;
  if (typeof candidate.printed_total === "number") score += 2;
  if (normalizeComparableValue(candidate.release_date)) score += 1;
  return score;
}

function getMetadataTieBreakKey(candidate: PublicSetMetadataCandidate) {
  return [
    normalizeComparableValue(candidate.name),
    normalizeComparableValue(candidate.code),
    normalizeComparableValue(candidate.printed_set_abbrev),
    normalizeComparableValue(candidate.release_date),
  ].join("|");
}

export function choosePreferredEquivalentSetRow<
  T extends PublicSetMetadataCandidate,
>(existing: T, candidate: T) {
  const existingScore = getMetadataSpecificityScore(existing);
  const candidateScore = getMetadataSpecificityScore(candidate);
  if (candidateScore !== existingScore) {
    return candidateScore > existingScore ? candidate : existing;
  }

  return getMetadataTieBreakKey(candidate).localeCompare(
    getMetadataTieBreakKey(existing),
  ) < 0
    ? candidate
    : existing;
}

export function escapePostgrestLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

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
