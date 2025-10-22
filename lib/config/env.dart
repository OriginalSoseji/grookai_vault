import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../secrets.dart' as secrets;

class Env {
  static String get supabaseUrl {
    final v = (dotenv.env['SUPABASE_URL'] ?? '').trim();
    return v.isNotEmpty ? v : secrets.supabaseUrl;
  }

  static String get supabaseAnonKey {
    final v = (dotenv.env['SUPABASE_ANON_KEY'] ?? '').trim();
    return v.isNotEmpty ? v : secrets.supabaseAnonKey;
  }

  /// Optional OAuth redirect URL used for mobile/desktop OAuth flows.
  /// Defaults to the common Supabase Flutter scheme if not provided.
  static String get oauthRedirectUrl {
    final v = (dotenv.env['OAUTH_REDIRECT_URL'] ?? '').trim();
    return v.isNotEmpty ? v : 'io.supabase.flutter://login-callback/';
  }
}
