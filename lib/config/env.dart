import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../secrets.dart' as secrets;

class Env {
  static String get supabaseUrl {
    final v = (dotenv.env['SUPABASE_URL'] ?? '').trim();
    // Ignore obvious placeholders or invalid values to avoid breaking auth
    final looksPlaceholder = v.contains('<') || v.contains('project-ref');
    final looksValidHost = v.startsWith('http') && v.contains('.supabase.co');
    return (v.isNotEmpty && !looksPlaceholder && looksValidHost)
        ? v
        : secrets.supabaseUrl;
  }

  static String get supabaseAnonKey {
    final v = (dotenv.env['SUPABASE_ANON_KEY'] ?? '').trim();
    final looksPlaceholder = v.contains('<your_anon_key_here>') || v.isEmpty;
    return !looksPlaceholder ? v : secrets.supabaseAnonKey;
  }

  /// Optional OAuth redirect URL used for mobile/desktop OAuth flows.
  /// Defaults to the common Supabase Flutter scheme if not provided.
  static String get oauthRedirectUrl {
    final v = (dotenv.env['OAUTH_REDIRECT_URL'] ?? '').trim();
    return v.isNotEmpty ? v : 'io.supabase.flutter://login-callback/';
  }
}
