import 'package:grookai_vault/services/scanner/scanner_pipeline.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScanRepository {
  // Require this token to be passed for any save; prevents accidental writes.
  static const String _confirmToken = 'CONFIRMED_OK';

  Future<void> saveScanResult(ScannerOutput out, {String? confirmToken}) async {
    if (confirmToken != _confirmToken) {
      throw StateError('Save blocked: confirmation required.');
    }
    // Persist a scan event for activity feed and debugging.
    // This does not add to vault (cardId required for that); it logs the result.
    final client = Supabase.instance.client;
    await client.from('scan_events').insert({
      'meta': {
        'set_id': out.setId,
        'card_no': out.cardNo,
        'set_size': out.setSize,
        'year': out.year,
        'variant_tag': out.variant.variantTag,
        'has_overlay': out.variant.hasOverlay,
        'stamp_confidence': out.variant.stampConfidence,
      },
    });
  }

  // Helper for callers
  String get confirmationToken => _confirmToken;
}
