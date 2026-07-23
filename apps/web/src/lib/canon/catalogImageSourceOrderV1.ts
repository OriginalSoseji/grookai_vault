export type CatalogImageDisplayModeV1 = "canonical" | "uploaded";

function normalizeImageUrl(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function orderCatalogImageSourcesV1({
  imageDisplayMode,
  uploadedImageUrl,
  hostedImageUrl,
  providerImageUrl,
}: {
  imageDisplayMode?: string | null;
  uploadedImageUrl?: string | null;
  hostedImageUrl?: string | null;
  providerImageUrl?: string | null;
}) {
  const normalizedMode: CatalogImageDisplayModeV1 =
    imageDisplayMode?.trim().toLowerCase() === "uploaded"
      ? "uploaded"
      : "canonical";
  const candidates = normalizedMode === "uploaded"
    ? [uploadedImageUrl, hostedImageUrl, providerImageUrl]
    : [hostedImageUrl, providerImageUrl];
  const ordered: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate);
    if (normalized && !ordered.includes(normalized)) {
      ordered.push(normalized);
    }
  }

  return ordered;
}
