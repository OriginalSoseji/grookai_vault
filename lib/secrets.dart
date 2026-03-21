// lib/secrets.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
String get supabasePublishableKey =>
    dotenv.env['SUPABASE_PUBLISHABLE_KEY'] ?? '';
String get grookaiWebBaseUrl =>
    dotenv.env['GROOKAI_WEB_BASE_URL'] ??
    dotenv.env['NEXT_PUBLIC_SITE_URL'] ??
    dotenv.env['SITE_URL'] ??
    'https://grookaivault.com';

// Use 10.0.2.2 so the Android emulator can reach your PC's FastAPI on localhost:8000
const String conditionApiBaseUrl = "http://10.0.2.2:8000";
