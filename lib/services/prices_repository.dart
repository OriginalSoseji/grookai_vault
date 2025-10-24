import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/data/prices/price_attach_worker.dart';
import 'package:grookai_vault/core/result.dart';

class PricesRepository {
  final SupabaseClient client;
  PricesRepository(this.client);

  /// Attaches prices to result rows (maps) using the async worker.
  /// Returns a new list with price_* fields merged when available.
  Future<List<Map<String, dynamic>>> attachPricesToRows(
    List<Map<String, dynamic>> rows,
  ) async {
    // ignore: avoid_print
    print('[PRICES] attach.start ids=${rows.length}');
    final ids = rows
        .map((r) => (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString())
        .where((s) => s.isNotEmpty)
        .toList();
    if (ids.isEmpty) {
      // ignore: avoid_print
      print('[PRICES] attach.skip (no ids)');
      return rows;
    }

    final worker = PriceAttachWorker(client, chunkSize: 20, maxConcurrent: 6);
    final map = await worker.attachByIds(ids);
    int updated = 0;
    final merged = rows.map((r) {
      final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
      final p = map[id];
      if (p == null) return r;
      updated++;
      return {
        ...r,
        'price_low': p.low,
        'price_mid': p.mid,
        'price_high': p.high,
        'currency': r['currency'] ?? 'USD',
      };
    }).toList();
    // ignore: avoid_print
    print('[PRICES] attach.done updated=$updated of ${rows.length}');
    // ignore: avoid_print
    print('[PRICES] sentinel=attach_done');
    return merged;
  }

  Future<Result<List<Map<String, dynamic>>>> attachPricesToRowsResult(
    List<Map<String, dynamic>> rows,
  ) async {
    try {
      final r = await attachPricesToRows(rows);
      return Ok(r);
    } catch (e) {
      return Err('prices_attach_failed');
    }
  }
}
