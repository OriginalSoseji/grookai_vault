// LOCK: displayImageUrl is the primary product image contract.
// LOCK: Do not regress to imageUrl-only rendering.
String? normalizeDisplayImageUrl(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  if (normalized.isEmpty) {
    return null;
  }

  final parsed = Uri.tryParse(normalized);
  if (parsed == null || (parsed.scheme != 'http' && parsed.scheme != 'https')) {
    return null;
  }

  return normalized;
}

String? resolveDisplayImageUrl({
  dynamic displayImageUrl,
  dynamic imageUrl,
  dynamic imageAltUrl,
  dynamic representativeImageUrl,
}) {
  return normalizeDisplayImageUrl(displayImageUrl) ??
      normalizeDisplayImageUrl(imageUrl) ??
      normalizeDisplayImageUrl(imageAltUrl) ??
      normalizeDisplayImageUrl(representativeImageUrl);
}

String? resolveDisplayImageUrlFromRow(Map<String, dynamic>? row) {
  if (row == null) {
    return null;
  }

  return resolveDisplayImageUrl(
    displayImageUrl: row['display_image_url'],
    imageUrl: row['image_url'],
    imageAltUrl: row['image_alt_url'],
    representativeImageUrl: row['representative_image_url'],
  );
}
