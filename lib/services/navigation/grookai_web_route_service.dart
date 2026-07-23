import 'package:url_launcher/url_launcher.dart';

import '../../secrets.dart';

enum GrookaiCanonicalRouteKind {
  card,
  collector,
  collectorSection,
  set,
  gvvi,
  feed,
}

class GrookaiCanonicalRoute {
  const GrookaiCanonicalRoute._({
    required this.kind,
    required this.path,
    required this.value,
    this.sectionId,
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

  factory GrookaiCanonicalRoute.collectorSection({
    required String slug,
    required String sectionId,
  }) {
    final normalizedSlug = slug.trim().toLowerCase();
    final normalizedSectionId = sectionId.trim();
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.collectorSection,
      path: '/u/$normalizedSlug/section/$normalizedSectionId',
      value: normalizedSlug,
      sectionId: normalizedSectionId,
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

  factory GrookaiCanonicalRoute.gvvi(String gvviId) {
    final normalized = gvviId.trim();
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.gvvi,
      path: '/gvvi/${Uri.encodeComponent(normalized)}',
      value: normalized,
    );
  }

  factory GrookaiCanonicalRoute.feed({String segment = 'pulse'}) {
    final normalized = segment.trim().toLowerCase();
    final resolvedSegment = normalized.isEmpty ? 'pulse' : normalized;
    return GrookaiCanonicalRoute._(
      kind: GrookaiCanonicalRouteKind.feed,
      path: resolvedSegment == 'pulse'
          ? '/network'
          : '/network?segment=${Uri.encodeQueryComponent(resolvedSegment)}',
      value: resolvedSegment,
    );
  }

  final GrookaiCanonicalRouteKind kind;
  final String path;
  final String value;
  final String? sectionId;
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
    if (uri == null) {
      return null;
    }

    if (_isSupportedAppDeepLink(uri)) {
      return _parseAppDeepLinkUri(uri);
    }

    if (!_isSupportedCanonicalHost(uri)) {
      return null;
    }

    final segments = uri.pathSegments
        .map((segment) => segment.trim())
        .where((segment) => segment.isNotEmpty)
        .toList(growable: false);
    if (segments.isEmpty) {
      return null;
    }
    final head = segments.first.toLowerCase();
    if (head == 'feed' || head == 'network') {
      return GrookaiCanonicalRoute.feed(
        segment: uri.queryParameters['segment'] ?? 'pulse',
      );
    }
    if (segments.length < 2) {
      return null;
    }

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
      case 'collector':
        if (segments.length >= 4 && segments[2].toLowerCase() == 'section') {
          final sectionId = segments[3].trim();
          if (sectionId.isEmpty) {
            return null;
          }
          return GrookaiCanonicalRoute.collectorSection(
            slug: value.toLowerCase(),
            sectionId: sectionId,
          );
        }
        return GrookaiCanonicalRoute.collector(value.toLowerCase());
      case 'set':
      case 'sets':
        return GrookaiCanonicalRoute.set(value);
      case 'gvvi':
        return GrookaiCanonicalRoute.gvvi(value);
      default:
        return null;
    }
  }

  static GrookaiCanonicalRoute? _parseAppDeepLinkUri(Uri uri) {
    final host = uri.host.trim().toLowerCase();
    final segments = uri.pathSegments
        .map((segment) => segment.trim())
        .where((segment) => segment.isNotEmpty)
        .toList(growable: false);

    if (host == 'card' && segments.isNotEmpty) {
      return GrookaiCanonicalRoute.card(segments.first);
    }
    if ((host == 'set' || host == 'sets') && segments.isNotEmpty) {
      return GrookaiCanonicalRoute.set(segments.first);
    }
    if (host == 'feed' || host == 'network') {
      return GrookaiCanonicalRoute.feed(
        segment: uri.queryParameters['segment'] ?? 'pulse',
      );
    }
    if ((host == 'u' || host == 'collector') && segments.isNotEmpty) {
      if (segments.length >= 3 && segments[1].toLowerCase() == 'section') {
        return GrookaiCanonicalRoute.collectorSection(
          slug: segments.first.toLowerCase(),
          sectionId: segments[2],
        );
      }
      return GrookaiCanonicalRoute.collector(segments.first.toLowerCase());
    }
    if (host == 'gvvi' && segments.isNotEmpty) {
      return GrookaiCanonicalRoute.gvvi(segments.first);
    }

    // Also accept slash-style app links such as grookai:///card/GV-PK-...
    // to keep routing compatible with test tools and notification providers.
    if (host.isEmpty) {
      return parseCanonicalUri(Uri(pathSegments: segments));
    }

    return null;
  }

  static bool _isSupportedCanonicalHost(Uri uri) {
    if (uri.host.trim().isEmpty) {
      return true;
    }

    final canonicalHost = buildUri('/').host.toLowerCase();
    return uri.host.toLowerCase() == canonicalHost;
  }

  static bool _isSupportedAppDeepLink(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    return scheme == 'grookai' || scheme == 'grookaivault';
  }
}
