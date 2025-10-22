import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScanMetrics {
  final SupabaseClient client;
  final bool enabled = (dotenv.env['GV_SCAN_TELEMETRY'] ?? 'false').toLowerCase() == 'true';
  ScanMetrics(this.client);

  Future<void> log({
    required String type, // scan_success | scan_ambiguous | scan_none
    required int candidates,
    double? bestConfidence,
    int? elapsedMs,
  }) async {
    final payload = {
      'type': type,
      'candidates': candidates,
      if (bestConfidence != null) 'best_confidence': bestConfidence,
      if (elapsedMs != null) 'elapsed_ms': elapsedMs,
      'ts': DateTime.now().toIso8601String(),
    };
    debugPrint('[SCAN] metrics:${payload.toString()}');
    if (!enabled) return;
    try {
      await client.from('scan_events').insert(payload);
    } catch (_) {
      // ignore telemetry write failures
    }
  }
}

