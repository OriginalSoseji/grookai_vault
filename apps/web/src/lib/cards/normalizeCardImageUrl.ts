export function normalizeCardImageUrl(imageUrl: string | null | undefined): string | null {
  if (typeof imageUrl !== "string") {
    return null;
  }

  const normalized = imageUrl.trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("https://assets.tcgdex.net/en/") &&
    !normalized.endsWith("/high.webp")
  ) {
    return `${normalized.replace(/\/+$/, "")}/high.webp`;
  }

  return normalized;
}
