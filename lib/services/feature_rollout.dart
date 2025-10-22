import 'package:flutter_dotenv/flutter_dotenv.dart';

bool gvScannerEnabledForUser(String? userId) {
  final rollout = int.tryParse(dotenv.env['GV_SCAN_ROLLOUT_PERCENT'] ?? '100') ?? 100;
  if (rollout >= 100) return true;
  if (userId == null || userId.isEmpty) return false;
  final bucket = userId.hashCode.abs() % 100;
  return bucket < rollout;
}

