import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../secrets.dart';
import '../../utils/display_image_contract.dart';

class CanonImageUrlService {
  static const String warehouseImagePathPrefix =
      'warehouse-derived/self-hosted-images-v1/';
  static const Duration _requestTimeout = Duration(seconds: 8);
  static const Duration _cacheTtl = Duration(minutes: 50);
  static final Map<String, _SignedCanonImageCacheEntry> _cache =
      <String, _SignedCanonImageCacheEntry>{};

  static Future<List<Map<String, dynamic>>> enrichRows(
    Iterable<Map<String, dynamic>> rows,
  ) async {
    final materialized = rows.map(Map<String, dynamic>.from).toList();
    final signedUrls = await signedUrlsForRows(materialized);

    for (final row in materialized) {
      final path = _warehouseImagePath(row);
      final signedUrl = path == null ? null : signedUrls[path];
      final displayUrl = normalizeDisplayImageUrl(signedUrl);
      if (displayUrl != null) {
        row['display_image_url'] = displayUrl;
      }
    }

    return materialized;
  }

  static Future<Map<String, String>> signedUrlsForRows(
    Iterable<Map<String, dynamic>> rows,
  ) async {
    final paths = rows
        .map(_warehouseImagePath)
        .whereType<String>()
        .toSet()
        .toList(growable: false);
    return signedUrlsForPaths(paths);
  }

  static Future<Map<String, String>> signedUrlsForPaths(
    Iterable<String> rawPaths,
  ) async {
    final now = DateTime.now();
    final resolved = <String, String>{};
    final pending = <String>[];

    for (final rawPath in rawPaths) {
      final path = _normalizeWarehousePath(rawPath);
      if (path == null) {
        continue;
      }

      final cached = _cache[path];
      if (cached != null && cached.expiresAt.isAfter(now)) {
        resolved[path] = cached.url;
        continue;
      }

      pending.add(path);
    }

    if (pending.isEmpty) {
      return resolved;
    }

    try {
      for (final chunk in _chunks(pending.toSet().toList(), 100)) {
        final uri = Uri.parse(grookaiWebBaseUrl).resolve('/api/canon/images');
        final response = await http
            .post(
              uri,
              headers: const {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({'paths': chunk}),
            )
            .timeout(_requestTimeout);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          continue;
        }

        final decoded = jsonDecode(response.body);
        if (decoded is! Map || decoded['urls'] is! Map) {
          continue;
        }

        final urls = Map<String, dynamic>.from(decoded['urls'] as Map);
        for (final entry in urls.entries) {
          final path = _normalizeWarehousePath(entry.key);
          final url = normalizeDisplayImageUrl(entry.value);
          if (path == null || url == null) {
            continue;
          }

          resolved[path] = url;
          _cache[path] = _SignedCanonImageCacheEntry(
            url: url,
            expiresAt: DateTime.now().add(_cacheTtl),
          );
        }
      }
    } catch (_) {
      return resolved;
    }

    return resolved;
  }

  static String? displayImageUrlFromRow(Map<String, dynamic>? row) {
    if (row == null) {
      return null;
    }

    return normalizeDisplayImageUrl(row['display_image_url']) ??
        resolveDisplayImageUrlFromRow(row);
  }

  static String? _warehouseImagePath(Map<String, dynamic> row) {
    return _normalizeWarehousePath(row['image_path']);
  }

  static String? _normalizeWarehousePath(dynamic value) {
    final normalized = (value ?? '').toString().trim().replaceFirst(
      RegExp(r'^/+'),
      '',
    );
    if (normalized.isEmpty ||
        normalized.length > 512 ||
        normalized.contains('..') ||
        !normalized.startsWith(warehouseImagePathPrefix)) {
      return null;
    }
    return normalized;
  }

  static List<List<String>> _chunks(List<String> values, int size) {
    final chunks = <List<String>>[];
    for (var index = 0; index < values.length; index += size) {
      chunks.add(
        values.sublist(
          index,
          index + size > values.length ? values.length : index + size,
        ),
      );
    }
    return chunks;
  }
}

class _SignedCanonImageCacheEntry {
  const _SignedCanonImageCacheEntry({
    required this.url,
    required this.expiresAt,
  });

  final String url;
  final DateTime expiresAt;
}
