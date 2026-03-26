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
}: {
  imageDisplayMode: string | null | undefined;
  uploadedImageUrl: string | null | undefined;
  canonicalImageUrl: string | null | undefined;
}) {
  const mode = normalizeVaultInstanceImageDisplayMode(imageDisplayMode) ?? "canonical";
  const normalizedUploadedImageUrl = normalizeOptionalText(uploadedImageUrl);
  const normalizedCanonicalImageUrl = normalizeOptionalText(canonicalImageUrl);

  if (mode === "uploaded") {
    return {
      primaryImageUrl: normalizedUploadedImageUrl ?? normalizedCanonicalImageUrl,
      fallbackImageUrl:
        normalizedUploadedImageUrl && normalizedCanonicalImageUrl && normalizedUploadedImageUrl !== normalizedCanonicalImageUrl
          ? normalizedCanonicalImageUrl
          : null,
    };
  }

  return {
    primaryImageUrl: normalizedCanonicalImageUrl,
    fallbackImageUrl: null,
  };
}
