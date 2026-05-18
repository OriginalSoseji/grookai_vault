// lib/secrets.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

String _dotenvValue(String key) {
  if (!dotenv.isInitialized) {
    return '';
  }

  return dotenv.env[key] ?? '';
}

String _pickConfig(String dartDefineValue, String dotenvValue) {
  final normalizedDefine = dartDefineValue.trim();
  if (normalizedDefine.isNotEmpty) {
    return normalizedDefine;
  }

  return dotenvValue.trim();
}

String get supabaseUrl => _pickConfig(
  const String.fromEnvironment('SUPABASE_URL'),
  _dotenvValue('SUPABASE_URL'),
);
String get supabasePublishableKey => _pickConfig(
  const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  _dotenvValue('SUPABASE_PUBLISHABLE_KEY'),
);
String get grookaiWebBaseUrl {
  final configured = _pickConfig(
    const String.fromEnvironment('GROOKAI_WEB_BASE_URL'),
    _dotenvValue('GROOKAI_WEB_BASE_URL').isNotEmpty
        ? _dotenvValue('GROOKAI_WEB_BASE_URL')
        : _dotenvValue('NEXT_PUBLIC_SITE_URL').isNotEmpty
        ? _dotenvValue('NEXT_PUBLIC_SITE_URL')
        : _dotenvValue('SITE_URL'),
  );
  return configured.isNotEmpty ? configured : 'https://grookaivault.com';
}

// Use 10.0.2.2 so the Android emulator can reach your PC's FastAPI on localhost:8000
const String conditionApiBaseUrl = "http://10.0.2.2:8000";
