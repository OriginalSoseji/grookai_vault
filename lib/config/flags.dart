// Global feature flags (env-backed where applicable)
import 'package:flutter_dotenv/flutter_dotenv.dart';

// LowerCamelCase primary, with deprecated aliases for back-compat
const bool gvFeatureAlerts = true; // TODO: env-gate later if needed
@Deprecated('Use gvFeatureAlerts')
// ignore: constant_identifier_names
const bool GV_FEATURE_ALERTS = gvFeatureAlerts;

final bool gvFeatureScanner =
    (dotenv.env['GV_FEATURE_SCANNER'] ?? 'true').toLowerCase() == 'true';
@Deprecated('Use gvFeatureScanner')
// ignore: non_constant_identifier_names
final bool GV_FEATURE_SCANNER = gvFeatureScanner;

final bool gvScanTelemetry =
    (dotenv.env['GV_SCAN_TELEMETRY'] ?? 'false').toLowerCase() == 'true';
@Deprecated('Use gvScanTelemetry')
// ignore: non_constant_identifier_names
final bool GV_SCAN_TELEMETRY = gvScanTelemetry;

final bool gvScanLazyImport =
    (dotenv.env['GV_SCAN_LAZY_IMPORT'] ?? 'true').toLowerCase() == 'true';
@Deprecated('Use gvScanLazyImport')
// ignore: non_constant_identifier_names
final bool GV_SCAN_LAZY_IMPORT = gvScanLazyImport;

final int gvScanLazyCooldownMs =
    int.tryParse(dotenv.env['GV_SCAN_LAZY_COOLDOWN_MS'] ?? '4000') ?? 4000;
@Deprecated('Use gvScanLazyCooldownMs')
// ignore: non_constant_identifier_names
final int GV_SCAN_LAZY_COOLDOWN_MS = gvScanLazyCooldownMs;

final int gvScanLazyMaxRetries =
    int.tryParse(dotenv.env['GV_SCAN_LAZY_MAX_RETRIES'] ?? '1') ?? 1;
@Deprecated('Use gvScanLazyMaxRetries')
// ignore: non_constant_identifier_names
final int GV_SCAN_LAZY_MAX_RETRIES = gvScanLazyMaxRetries;

final String gvEnvStage = (dotenv.env['GV_ENV_STAGE'] ?? 'dev').toLowerCase();
@Deprecated('Use gvEnvStage')
// ignore: non_constant_identifier_names
final String GV_ENV_STAGE = gvEnvStage;

final bool gvEnableWall =
    (dotenv.env['GV_ENABLE_WALL'] ?? 'true').toLowerCase() == 'true';
@Deprecated('Use gvEnableWall')
// ignore: non_constant_identifier_names
final bool GV_ENABLE_WALL = gvEnableWall;
