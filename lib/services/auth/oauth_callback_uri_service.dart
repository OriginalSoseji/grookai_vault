class OAuthCallbackUriService {
  static const String scheme = 'grookaivault';
  static const String host = 'login-callback';
  static const String redirectUri = '$scheme://$host/';

  static Uri? extractLoginCallback(Uri uri) {
    return _extractLoginCallback(uri, depth: 0);
  }

  static bool isLoginCallback(Uri uri) {
    if (uri.scheme.toLowerCase() != scheme) {
      return false;
    }

    final normalizedHost = uri.host.toLowerCase();
    if (normalizedHost == host) {
      return true;
    }

    final pathSegments = uri.pathSegments
        .map((segment) => segment.toLowerCase())
        .where((segment) => segment.isNotEmpty)
        .toList(growable: false);
    return pathSegments.isNotEmpty && pathSegments.first == host;
  }

  static bool hasOAuthPayload(Uri uri) {
    if (uri.queryParameters.containsKey('code') ||
        uri.queryParameters.containsKey('error') ||
        uri.queryParameters.containsKey('error_code') ||
        uri.queryParameters.containsKey('error_description')) {
      return true;
    }

    final fragmentParameters = Uri.splitQueryString(uri.fragment);
    return fragmentParameters.containsKey('access_token') ||
        fragmentParameters.containsKey('refresh_token') ||
        fragmentParameters.containsKey('error') ||
        fragmentParameters.containsKey('error_code') ||
        fragmentParameters.containsKey('error_description');
  }

  static String describe(Uri? uri) {
    if (uri == null) {
      return 'null';
    }

    final queryKeys = uri.queryParameters.keys.toList(growable: false);
    final fragmentKeys = Uri.splitQueryString(
      uri.fragment,
    ).keys.toList(growable: false);

    return '${uri.scheme}://${uri.host}${uri.path}'
        ' queryKeys=$queryKeys fragmentKeys=$fragmentKeys';
  }

  static Uri? _extractLoginCallback(Uri uri, {required int depth}) {
    if (depth > 3) {
      return null;
    }

    if (isLoginCallback(uri)) {
      return uri;
    }

    for (final key in const <String>[
      'link',
      'url',
      'redirect_to',
      'redirectTo',
    ]) {
      final nested = uri.queryParameters[key];
      if (nested == null || nested.trim().isEmpty) {
        continue;
      }

      final parsedNested = Uri.tryParse(nested.trim());
      if (parsedNested == null) {
        continue;
      }

      final extracted = _extractLoginCallback(parsedNested, depth: depth + 1);
      if (extracted != null) {
        return extracted;
      }
    }

    return null;
  }
}
