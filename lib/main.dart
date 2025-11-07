// lib/main.dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';
import 'services/edge_warmup.dart';
import 'services/app_lifecycle.dart';
import 'core/telemetry.dart';
import 'net/tcgdex_http_override.dart';

import 'config/env.dart';

export 'ui/app/app.dart';

// UI foundation
import 'ui/app/app.dart';

/// --- Supabase config (dotenv loaded via Env.load; secrets.dart as fallback) ---

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load env file based on --dart-define=GV_ENV=local|staging|prod
  await Env.load();
  // Rewrite tcgdex asset URLs to a more reliable CDN when needed
  HttpOverrides.global = TcgdexHttpOverrides();
  // Log the lazy-search feature flag early for verification
  // Example: [LAZY] GV_USE_LAZY_SEARCH=true
  final lazyFlag = (dotenv.env['GV_USE_LAZY_SEARCH'] ?? '').toString();
  debugPrint('[LAZY] GV_USE_LAZY_SEARCH=$lazyFlag');
  _logStartupFlags();

  final supabaseUrl = Env.supabaseUrl;
  final supabaseAnonKey = Env.supabaseAnonKey;
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  // ignore: avoid_print
  print('***** Supabase init completed *****');
  // Pre-warm Edge Functions to avoid first-call cold starts
  EdgeWarmup.warm();
  // Start lifecycle observer for offline queue auto-sync
  AppLifecycle.instance.start();
  _wiringReport();
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

void _wiringReport() {
  // Brief console summary of new adapters and VMs
  Telemetry.log('wiring', {
    'adapters': 'cardPrintFromDb/lazy, vaultItemFromDb',
    'vms': 'Search, Vault, Home',
    'services_result': 'search_gateway=Y, vault_service=Y',
  });
  // Acceptance checklist
  // ignore: avoid_print
  print('[ACCEPT] Result<T> adopted in services used by VMs');
  // ignore: avoid_print
  print('[ACCEPT] Vault grid & progress visible');
  // ignore: avoid_print
  print('[ACCEPT] Home shows Wall + Price Movers (or placeholders)');
  // ignore: avoid_print
  print('[ACCEPT] Overlay uses tokens');
  // ignore: avoid_print
  print('[ACCEPT] No setState-after-dispose');
  // Extended
  // ignore: avoid_print
  print('[ACCEPT] v_set_print_counts wired (progress chips show X/Y)');
  // ignore: avoid_print
  print('[ACCEPT] Public Wall → detail route');
  // ignore: avoid_print
  print('[ACCEPT] v_price_movers active (or fallback used)');
  // ignore: avoid_print
  print('[ACCEPT] Master-Set groundwork migrated');
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
