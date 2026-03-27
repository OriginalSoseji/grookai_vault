export function buildTcgDexImageUrl(externalId: string | null | undefined): string | null {
  if (!externalId || typeof externalId !== "string") {
    return null;
  }

  const normalized = externalId.trim();
  if (!normalized) {
    return null;
  }

  const separatorIndex = normalized.indexOf("-");
  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null;
  }

  const setCode = normalized.slice(0, separatorIndex).trim();
  const localId = normalized.slice(separatorIndex + 1).trim();
  if (!setCode || !localId) {
    return null;
  }

  return `https://assets.tcgdex.net/en/${setCode}/${setCode}/${localId}/high.webp`;
}
