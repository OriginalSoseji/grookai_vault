// lib/main.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';
import 'services/edge_warmup.dart';
import 'services/app_lifecycle.dart';

import 'config/env.dart';

export 'ui/app/app.dart';

// UI foundation
import 'ui/app/app.dart';

/// --- Supabase config (dotenv fallback to secrets.dart) ---
final kSupabaseUrl = Env.supabaseUrl;
final kSupabaseAnonKey = Env.supabaseAnonKey;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load .env so GV_USE_LAZY_SEARCH is available app-wide
  await dotenv.load(fileName: ".env");
  // Log the lazy-search feature flag early for verification
  // Example: [LAZY] GV_USE_LAZY_SEARCH=true
  final lazyFlag = (dotenv.env['GV_USE_LAZY_SEARCH'] ?? '').toString();
  debugPrint('[LAZY] GV_USE_LAZY_SEARCH=$lazyFlag');
  _logStartupFlags();

  await Supabase.initialize(url: kSupabaseUrl, anonKey: kSupabaseAnonKey);
  // Pre-warm Edge Functions to avoid first-call cold starts
  EdgeWarmup.warm();
  // Start lifecycle observer for offline queue auto-sync
  AppLifecycle.instance.start();
  runApp(const MyApp());
}

bool get gvPricesAsyncFlag {
  final v = dotenv.env['GV_PRICES_ASYNC'] ?? '1'; // default ON
  return v == '1' || v.toLowerCase() == 'true';
}

void _logStartupFlags() {
  // existing [LAZY] flag logging is kept
  // Add this:
  // ignore: avoid_print
  print('[PRICES] GV_PRICES_ASYNC=${gvPricesAsyncFlag ? "1" : "0"}');
}

/// Fixes mojibake like "ÃƒÂ¢" if a string was saved/viewed in a wrong encoding.
String fixMojibake(String s) {
  try {
    return utf8.decode(latin1.encode(s));
  } catch (_) {
    return s;
  }
}

/// ================= App =================

/// Root app with an auth gate: session -> AppShell, else -> LoginPage.
// MyApp moved to ui/app/app.dart

// App shell and LoginPage are defined in feature files.
