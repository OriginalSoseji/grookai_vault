// Global feature flags (env-backed where applicable)
import 'package:flutter_dotenv/flutter_dotenv.dart';

const bool GV_FEATURE_ALERTS = true; // TODO: env-gate later if needed

final bool GV_FEATURE_SCANNER =
    (dotenv.env['GV_FEATURE_SCANNER'] ?? 'true').toLowerCase() == 'true';

final bool GV_SCAN_TELEMETRY =
    (dotenv.env['GV_SCAN_TELEMETRY'] ?? 'false').toLowerCase() == 'true';

final bool GV_SCAN_LAZY_IMPORT =
    (dotenv.env['GV_SCAN_LAZY_IMPORT'] ?? 'true').toLowerCase() == 'true';

final int GV_SCAN_LAZY_COOLDOWN_MS =
    int.tryParse(dotenv.env['GV_SCAN_LAZY_COOLDOWN_MS'] ?? '4000') ?? 4000;
