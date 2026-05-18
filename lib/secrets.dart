// lib/secrets.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

String _pickConfig(String dartDefineValue, String envValue) {
  final normalizedDefine = dartDefineValue.trim();
  if (normalizedDefine.isNotEmpty) {
    return normalizedDefine;
  }

  return envValue.trim();
}

String get supabaseUrl => _pickConfig(
  const String.fromEnvironment('SUPABASE_URL'),
  dotenv.env['SUPABASE_URL'] ?? '',
);
String get supabasePublishableKey => _pickConfig(
  const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  dotenv.env['SUPABASE_PUBLISHABLE_KEY'] ?? '',
);
String get grookaiWebBaseUrl {
  final configured = _pickConfig(
    const String.fromEnvironment('GROOKAI_WEB_BASE_URL'),
    dotenv.env['GROOKAI_WEB_BASE_URL'] ??
        dotenv.env['NEXT_PUBLIC_SITE_URL'] ??
        dotenv.env['SITE_URL'] ??
        '',
  );
  return configured.isNotEmpty ? configured : 'https://grookaivault.com';
}

// Use 10.0.2.2 so the Android emulator can reach your PC's FastAPI on localhost:8000
const String conditionApiBaseUrl = "http://10.0.2.2:8000";
