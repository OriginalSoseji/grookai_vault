export function selectCatalogProviderFallbackV1({
  imageStatus,
  externalImageUrl,
  representativeImageUrl,
}: {
  imageStatus?: string | null;
  externalImageUrl?: string | null;
  representativeImageUrl?: string | null;
}) {
  const normalizedStatus = imageStatus?.trim().toLowerCase() ?? "";
  const normalizedExternalImageUrl = externalImageUrl?.trim() || null;
  const normalizedRepresentativeImageUrl =
    representativeImageUrl?.trim() || null;

  // A representative asset belongs in representative_image_url so legacy
  // read models do not mistake base art for an exact stamped/parallel image.
  // When Grookai's hosted copy fails, that representative provider is the
  // honest fallback for rows whose image truth status is representative.
  if (normalizedStatus.startsWith("representative_")) {
    return normalizedRepresentativeImageUrl ?? normalizedExternalImageUrl;
  }

  return normalizedExternalImageUrl;
}
