import '../../utils/display_image_contract.dart';

class CatalogArtworkResolution {
  const CatalogArtworkResolution({
    required this.primaryImageUrl,
    required this.fallbackImageUrl,
  });

  final String? primaryImageUrl;
  final String? fallbackImageUrl;
}

bool isCollectorUploadedCardImage(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  if (normalized.isEmpty) {
    return false;
  }

  final uri = Uri.tryParse(normalized);
  final isHttp = uri != null && (uri.scheme == 'http' || uri.scheme == 'https');
  var path = isHttp ? uri.path : normalized;
  if (isHttp) {
    try {
      path = Uri.decodeComponent(path);
    } catch (_) {
      // Keep the parsed path for malformed legacy URLs; detection fails closed.
    }
  }
  if (isHttp &&
      uri.host.toLowerCase().endsWith('.supabase.co') &&
      RegExp(
        r'^/storage/v1/object/(?:sign|public)/user-card-images/',
        caseSensitive: false,
      ).hasMatch(path)) {
    return true;
  }

  return RegExp(
    r'(^|/)vault-instances/[^/]+/(front|back)/current$',
    caseSensitive: false,
  ).hasMatch(path);
}

CatalogArtworkResolution resolveCatalogArtwork({
  required dynamic gvId,
  required dynamic providerImageUrl,
}) {
  final hostedImageUrl = buildCanonicalCardImageUrl(gvId);
  final normalizedProviderImageUrl = normalizeDisplayImageUrl(providerImageUrl);

  if (hostedImageUrl == null) {
    return CatalogArtworkResolution(
      primaryImageUrl: normalizedProviderImageUrl,
      fallbackImageUrl: null,
    );
  }

  return CatalogArtworkResolution(
    primaryImageUrl: hostedImageUrl,
    fallbackImageUrl:
        normalizedProviderImageUrl == null ||
            normalizedProviderImageUrl == hostedImageUrl
        ? null
        : normalizedProviderImageUrl,
  );
}
