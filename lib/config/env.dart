import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';
import '../secrets.dart' as secrets;

class Env {
  static const String envName = String.fromEnvironment('GV_ENV', defaultValue: 'local');
  static String? _loadedFile;

  /// Load environment variables with robust fallbacks:
  /// 1) try .env.{envName}
  /// 2) fallback to .env
  /// 3) ensure initialized via testLoad({}) if both missing
  static Future<void> load() async {
    final primary = switch (envName) {
      'staging' => '.env.staging',
      'prod' => '.env.prod',
      _ => '.env.local',
    };
    bool ok = false;
    try {
      await dotenv.load(fileName: primary);
      _loadedFile = primary;
      ok = true;
    } catch (_) {
      // fall through to try .env
    }
    if (!ok) {
      try {
        await dotenv.load(fileName: '.env');
        _loadedFile = '.env';
        ok = true;
      } catch (_) {}
    }
    if (!ok) {
      try {
        dotenv.testLoad();
        _loadedFile = '(empty)';
      } catch (_) {}
    }
    debugPrint('[ENV] GV_ENV=$envName file=${_loadedFile ?? 'unknown'} initialized=${dotenv.isInitialized}');
  }

  static String? get loadedFile => _loadedFile;

  static String _get(String key) {
    try {
      if (dotenv.isInitialized) {
        return (dotenv.env[key] ?? '').trim();
      }
    } catch (_) {}
    return '';
  }

  static String get supabaseUrl {
    final v = _get('SUPABASE_URL');
    // Ignore obvious placeholders or invalid values to avoid breaking auth
    final looksPlaceholder = v.contains('<') || v.contains('project-ref');
    final looksValidHost = v.startsWith('http');
    return (v.isNotEmpty && !looksPlaceholder && looksValidHost)
        ? v
        : secrets.supabaseUrl;
  }

  static String get supabaseAnonKey {
    // Prefer new name first, then legacy, then secrets fallback
    final primary = _get('SUPABASE_PUBLISHABLE_KEY');
    final legacy = _get('SUPABASE_ANON_KEY');
    final chosen = (primary.isNotEmpty) ? primary : legacy;
    final looksPlaceholder = chosen.contains('<PLACEHOLDER>') || chosen.isEmpty;
    return !looksPlaceholder ? chosen : secrets.supabaseAnonKey;
  }

  /// Optional OAuth redirect URL used for mobile/desktop OAuth flows.
  /// Defaults to the common Supabase Flutter scheme if not provided.
  static String get oauthRedirectUrl {
    final v = _get('OAUTH_REDIRECT_URL');
    return v.isNotEmpty ? v : 'io.supabase.flutter://login-callback/';
  }
}
