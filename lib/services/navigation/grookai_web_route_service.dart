import 'package:url_launcher/url_launcher.dart';

import '../../secrets.dart';

enum GrookaiCanonicalRouteKind { card, collector, set }

class GrookaiCanonicalRoute {
  const GrookaiCanonicalRoute._({
    required this.kind,
    required this.path,
    required this.value,
  });

  factory GrookaiCanonicalRoute.card(String gvId) {
    final normalized = gvId.trim();
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.card,
      path: '/card/$normalized',
      value: normalized,
    );
  }

  factory GrookaiCanonicalRoute.collector(String slug) {
    final normalized = slug.trim();
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.collector,
      path: '/u/$normalized',
      value: normalized,
    );
  }

  factory GrookaiCanonicalRoute.set(String setCode) {
    final normalized = setCode.trim();
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.set,
      path: '/set/$normalized',
      value: normalized,
    );
  }

  final GrookaiCanonicalRouteKind kind;
  final String path;
  final String value;
}

class GrookaiWebRouteService {
  static String normalizePath(String path) {
    return path.trim().isEmpty
        ? '/'
        : '/${path.trim().replaceFirst(RegExp(r'^/+'), '')}';
  }

  static Uri buildUri(String path) {
    final base = grookaiWebBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    final normalizedPath = normalizePath(path);
    return Uri.parse('$base$normalizedPath');
  }

  static Future<bool> _launchUri(Uri uri) async {
    final openedInApp = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    if (openedInApp) {
      return true;
    }

    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  static Future<bool> openPath(String path) async {
    return _launchUri(buildUri(path));
  }

  static Future<bool> openAuthenticatedPath(String path) async {
    return openPath(path);
  }

  static GrookaiCanonicalRoute? parseCanonicalUri(Uri? uri) {
    if (uri == null || !_isSupportedCanonicalHost(uri)) {
      return null;
    }

    final segments = uri.pathSegments
        .map((segment) => segment.trim())
        .where((segment) => segment.isNotEmpty)
        .toList(growable: false);
    if (segments.length < 2) {
      return null;
    }

    final head = segments.first.toLowerCase();
    final value = segments[1].trim();
    if (value.isEmpty) {
      return null;
    }

    // DEEP_LINKING_UNIVERSAL_LINKS_V1
    // Canonical web URLs are the single source of truth for app deep-link
    // routing.
    switch (head) {
      case 'card':
        return GrookaiCanonicalRoute.card(value);
      case 'u':
        return GrookaiCanonicalRoute.collector(value.toLowerCase());
      case 'set':
      case 'sets':
        return GrookaiCanonicalRoute.set(value);
      default:
        return null;
    }
  }

  static bool _isSupportedCanonicalHost(Uri uri) {
    if (uri.host.trim().isEmpty) {
      return true;
    }

    final canonicalHost = buildUri('/').host.toLowerCase();
    return uri.host.toLowerCase() == canonicalHost;
  }
}
