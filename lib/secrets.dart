// lib/secrets.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
String get supabasePublishableKey =>
    dotenv.env['SUPABASE_PUBLISHABLE_KEY'] ?? '';

// Use 10.0.2.2 so the Android emulator can reach your PC's FastAPI on localhost:8000
const String conditionApiBaseUrl = "http://10.0.2.2:8000";
