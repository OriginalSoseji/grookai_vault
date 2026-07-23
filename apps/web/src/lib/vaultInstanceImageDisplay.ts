import { orderCatalogImageSourcesV1 } from "@/lib/canon/catalogImageSourceOrderV1";

export type VaultInstanceImageDisplayMode = "canonical" | "uploaded";

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeVaultInstanceImageDisplayMode(
  value: string | null | undefined,
): VaultInstanceImageDisplayMode | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase();

  if (normalized === "canonical" || normalized === "uploaded") {
    return normalized;
  }

  return null;
}

export function prefersUploadedVaultInstanceImage(
  value: string | null | undefined,
) {
  return normalizeVaultInstanceImageDisplayMode(value) === "uploaded";
}

export function getVaultInstancePresentationImageSources({
  imageDisplayMode,
  uploadedImageUrl,
  canonicalImageUrl,
  providerImageUrl,
}: {
  imageDisplayMode: string | null | undefined;
  uploadedImageUrl: string | null | undefined;
  canonicalImageUrl: string | null | undefined;
  providerImageUrl?: string | null;
}) {
  const mode = normalizeVaultInstanceImageDisplayMode(imageDisplayMode) ?? "canonical";
  const imageSources = orderCatalogImageSourcesV1({
    imageDisplayMode: mode,
    uploadedImageUrl,
    hostedImageUrl: canonicalImageUrl,
    providerImageUrl,
  });
  const [primaryImageUrl = null, ...fallbackImageUrls] = imageSources;

  return {
    primaryImageUrl,
    fallbackImageUrl: fallbackImageUrls[0] ?? null,
    fallbackImageUrls,
  };
}
