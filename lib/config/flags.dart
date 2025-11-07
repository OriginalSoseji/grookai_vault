// Global feature flags (env-backed where applicable)
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

// LowerCamelCase primary, with deprecated aliases for back-compat
// Alerts: default OFF; enable via env `GV_FEATURE_ALERTS=true`
bool get gvFeatureAlerts =>
    (dotenv.env['GV_FEATURE_ALERTS'] ?? 'false').toLowerCase() == 'true';
@Deprecated('Use gvFeatureAlerts')
// ignore: non_constant_identifier_names
bool get GV_FEATURE_ALERTS => gvFeatureAlerts;

// Scanner: default ON in debug/profile builds unless explicitly disabled by env.
// In release, remains OFF unless explicitly enabled by env.
bool get gvFeatureScanner {
  final raw = (dotenv.env['GV_FEATURE_SCANNER'] ?? '').toLowerCase();
  if (raw == 'true') return true;
  if (raw == 'false') return false;
  // Unset: enable in dev/profile to aid iteration
  return kDebugMode || kProfileMode;
}
@Deprecated('Use gvFeatureScanner')
// ignore: non_constant_identifier_names
bool get GV_FEATURE_SCANNER => gvFeatureScanner;

bool get gvScanTelemetry =>
    (dotenv.env['GV_SCAN_TELEMETRY'] ?? 'false').toLowerCase() == 'true';
@Deprecated('Use gvScanTelemetry')
// ignore: non_constant_identifier_names
final bool GV_SCAN_TELEMETRY = gvScanTelemetry;

bool get gvScanLazyImport =>
    (dotenv.env['GV_SCAN_LAZY_IMPORT'] ?? 'true').toLowerCase() == 'true';
@Deprecated('Use gvScanLazyImport')
// ignore: non_constant_identifier_names
final bool GV_SCAN_LAZY_IMPORT = gvScanLazyImport;

int get gvScanLazyCooldownMs =>
    int.tryParse(dotenv.env['GV_SCAN_LAZY_COOLDOWN_MS'] ?? '4000') ?? 4000;
@Deprecated('Use gvScanLazyCooldownMs')
// ignore: non_constant_identifier_names
final int GV_SCAN_LAZY_COOLDOWN_MS = gvScanLazyCooldownMs;

int get gvScanLazyMaxRetries =>
    int.tryParse(dotenv.env['GV_SCAN_LAZY_MAX_RETRIES'] ?? '1') ?? 1;
@Deprecated('Use gvScanLazyMaxRetries')
// ignore: non_constant_identifier_names
final int GV_SCAN_LAZY_MAX_RETRIES = gvScanLazyMaxRetries;

String get gvEnvStage => (dotenv.env['GV_ENV_STAGE'] ?? 'dev').toLowerCase();
@Deprecated('Use gvEnvStage')
// ignore: non_constant_identifier_names
String get GV_ENV_STAGE => gvEnvStage;

bool get gvEnableWall =>
    (dotenv.env['GV_ENABLE_WALL'] ?? 'false').toLowerCase() == 'true';
@Deprecated('Use gvEnableWall')
// ignore: non_constant_identifier_names
bool get GV_ENABLE_WALL => gvEnableWall;

const bool kUseGlowWidgets = true;

// Thunder UI is now the primary design; no toggle required.
