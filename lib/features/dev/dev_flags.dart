import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

// Dev-only advanced scanner exposure
bool get kShowAdvancedScanner {
  final raw = (dotenv.env['GV_SHOW_ADVANCED_SCANNER'] ?? '').toLowerCase();
  if (raw == 'true') return true;
  if (raw == 'false') return false;
  return kDebugMode || kProfileMode;
}
