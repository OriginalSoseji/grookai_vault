// Global feature flags (env-backed where applicable)
import 'package:flutter_dotenv/flutter_dotenv.dart';

const bool GV_FEATURE_ALERTS = true; // TODO: env-gate later if needed

final bool GV_FEATURE_SCANNER =
    (dotenv.env['GV_FEATURE_SCANNER'] ?? 'true').toLowerCase() == 'true';
