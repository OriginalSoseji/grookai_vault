import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';

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

  static Uri buildAuthenticatedUri(String path, Session session) {
    final handoffUri = buildUri('/auth/mobile-handoff');
    final refreshToken = session.refreshToken;

    if (refreshToken == null || refreshToken.isEmpty) {
      return buildUri(path);
    }

    final fragment = Uri(
      queryParameters: {
        'access_token': session.accessToken,
        'refresh_token': refreshToken,
        'next': normalizePath(path),
      },
    ).query;

    return handoffUri.replace(fragment: fragment);
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
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      return openPath(path);
    }

    return _launchUri(buildAuthenticatedUri(path, session));
  }
}
