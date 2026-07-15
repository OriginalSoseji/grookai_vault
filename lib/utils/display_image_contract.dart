import 'dart:convert';

import '../secrets.dart';

// LOCK: displayImageUrl is the primary product image contract.
// LOCK: Do not regress to imageUrl-only rendering.
String? normalizeDisplayImageUrl(
  dynamic value, {
  int? width,
  int quality = 85,
}) {
  final normalized = (value ?? '').toString().trim();
  if (normalized.isEmpty) {
    return null;
  }

  final resolved = _resolveGrookaiRelativeUrl(normalized);
  final parsed = Uri.tryParse(resolved);
  if (parsed == null || (parsed.scheme != 'http' && parsed.scheme != 'https')) {
    return null;
  }

  if (_isBrokenPublicUserCardImageUrl(parsed)) {
    return null;
  }

  if (_isExpiredSupabaseSignedStorageUrl(parsed)) {
    return null;
  }

  return _nativeSafeCardImageUrl(
    parsed,
    resolved,
    width: width,
    quality: quality,
  );
}

String? normalizeWarehouseDisplayImagePath(dynamic value) {
  final normalized = _normalizeWarehouseImagePath(value);
  if (normalized == null) {
    return null;
  }

  return Uri.parse(grookaiWebBaseUrl)
      .resolve('/api/canon/image')
      .replace(queryParameters: {'path': normalized})
      .toString();
}

String _resolveGrookaiRelativeUrl(String value) {
  if (!value.startsWith('/')) {
    return value;
  }

  return Uri.parse(grookaiWebBaseUrl).resolve(value).toString();
}

String _nativeSafeCardImageUrl(
  Uri parsed,
  String originalUrl, {
  int? width,
  int quality = 85,
}) {
  if (_isGrookaiOptimizedImage(parsed)) {
    return _grookaiOptimizedImageUrl(
      parsed.queryParameters['url'] ?? originalUrl,
      width: width,
      quality: quality,
    );
  }

  if (!_needsGrookaiImageProxy(parsed)) {
    return originalUrl;
  }

  return _grookaiOptimizedImageUrl(originalUrl, width: width, quality: quality);
}

String _grookaiOptimizedImageUrl(
  String imageUrl, {
  int? width,
  int quality = 85,
}) {
  final optimizedWidth = _nearestGrookaiImageWidth(width ?? 828).toString();
  final optimizedQuality = quality.clamp(40, 95).toString();

  return Uri.https('grookaivault.com', '/_next/image', {
    'url': imageUrl,
    'w': optimizedWidth,
    'q': optimizedQuality,
  }).toString();
}

int _nearestGrookaiImageWidth(int requestedWidth) {
  const allowedWidths = <int>[
    48,
    64,
    74,
    96,
    128,
    160,
    220,
    320,
    640,
    750,
    828,
    1080,
    1200,
  ];
  final normalized = requestedWidth.clamp(48, 1200);
  for (final allowedWidth in allowedWidths) {
    if (normalized <= allowedWidth) {
      return allowedWidth;
    }
  }
  return allowedWidths.last;
}

bool _isGrookaiOptimizedImage(Uri parsed) {
  return parsed.host.toLowerCase() == 'grookaivault.com' &&
      parsed.path == '/_next/image' &&
      (parsed.queryParameters['url'] ?? '').trim().isNotEmpty;
}

bool _needsGrookaiImageProxy(Uri parsed) {
  final host = parsed.host.toLowerCase();
  return host == 'assets.tcgdex.net' ||
      host == 'images.pokemontcg.io' ||
      (host.endsWith('.supabase.co') &&
          parsed.path.startsWith('/storage/v1/object/public/'));
}

bool _isBrokenPublicUserCardImageUrl(Uri parsed) {
  final host = parsed.host.toLowerCase();
  final path = parsed.path.toLowerCase();
  return host.endsWith('.supabase.co') &&
      path.startsWith('/storage/v1/object/public/user-card-images/');
}

bool _isExpiredSupabaseSignedStorageUrl(Uri parsed) {
  final host = parsed.host.toLowerCase();
  final path = parsed.path.toLowerCase();
  if (!host.endsWith('.supabase.co') ||
      !path.startsWith('/storage/v1/object/sign/')) {
    return false;
  }

  final token = (parsed.queryParameters['token'] ?? '').trim();
  final parts = token.split('.');
  if (parts.length < 2) {
    return false;
  }

  try {
    final payload = jsonDecode(
      utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
    );
    if (payload is! Map<String, dynamic>) {
      return false;
    }

    final expiresAt = payload['exp'];
    final expiresAtSeconds = expiresAt is num
        ? expiresAt.toInt()
        : int.tryParse(expiresAt?.toString() ?? '');
    if (expiresAtSeconds == null) {
      return false;
    }

    final nowSeconds = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return expiresAtSeconds <= nowSeconds;
  } catch (_) {
    return false;
  }
}

String? resolveDisplayImageUrl({
  dynamic displayImageUrl,
  dynamic imageUrl,
  dynamic imageAltUrl,
  dynamic representativeImageUrl,
  int? width,
  int quality = 85,
}) {
  return normalizeDisplayImageUrl(
        displayImageUrl,
        width: width,
        quality: quality,
      ) ??
      normalizeDisplayImageUrl(imageUrl, width: width, quality: quality) ??
      normalizeDisplayImageUrl(imageAltUrl, width: width, quality: quality) ??
      normalizeDisplayImageUrl(
        representativeImageUrl,
        width: width,
        quality: quality,
      );
}

String? resolveDisplayImageUrlFromRow(Map<String, dynamic>? row) {
  if (row == null) {
    return null;
  }

  return normalizeDisplayImageUrl(row['display_image_url']) ??
      normalizeWarehouseDisplayImagePath(row['image_path']) ??
      resolveDisplayImageUrl(
        displayImageUrl: row['display_image_url'],
        imageUrl: row['image_url'],
        imageAltUrl: row['image_alt_url'],
        representativeImageUrl: row['representative_image_url'],
      );
}

String? _normalizeWarehouseImagePath(dynamic value) {
  final normalized = (value ?? '').toString().trim().replaceFirst(
    RegExp(r'^/+'),
    '',
  );
  if (normalized.isEmpty ||
      normalized.length > 512 ||
      normalized.contains('..') ||
      !normalized.startsWith('warehouse-derived/self-hosted-images-v1/')) {
    return null;
  }
  return normalized;
}
