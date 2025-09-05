import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

/// PriceImporter Ã¢â‚¬â€œ calls your `import-prices` Edge Function to populate pricing.
class PriceImporter {
  final SupabaseClient _supa;
  PriceImporter(this._supa);

  /// Import prices for a single set (pages until done).
  Future<int> importSet(
    String setCode, {
    String source = 'tcgplayer',
    int pageSize = 250,
    void Function(String message)? log,
  }) async {
    var page = 1;
    var total = 0;

    while (true) {
      final payload = <String, dynamic>{
        'setCode': setCode,
        'page': page,
        'pageSize': pageSize,
        'source': source,
      };

      final res = await _supa.functions.invoke('import-prices', body: payload);
      final data = Map<String, dynamic>.from(res.data ?? {});
      final imported = (data['imported'] ?? 0) as int;
      total += imported;

      log?.call('$setCode page $page -> priced $imported');

      final end = data['end'] == true || data['nextPageHint'] == null;

      if (end) break;

      page = (data['nextPageHint'] as num).toInt();
      await Future<void>.delayed(const Duration(milliseconds: 150));
    }

    return total;
  }

  /// List all set codes present in your catalog.
  /// Tries RPC `list_set_codes`; falls back to REST (v2 style) if needed.
  Future<List<String>> listAllSetCodes() async {
    try {
      final rows = await _supa.rpc('list_set_codes');
      final list = List<Map<String, dynamic>>.from(rows as List);
      return list
          .map((e) => (e['set_code'] as String).trim())
          .where((c) => c.isNotEmpty)
          .toList();
    } catch (_) {
      // v2: await the builder directly; no `.execute()`.
      // Also add NOT IS NULL filter; weÃ¢â‚¬â„¢ll uniq in Dart.
      final resp = await _supa
          .from('card_prints')
          .select('set_code')
          .not('set_code', 'is', null);

      final rows = (resp as List).cast<Map<String, dynamic>>();
      final uniq = <String>{};
      for (final r in rows) {
        final c = (r['set_code'] as String?)?.trim();
        if (c != null && c.isNotEmpty) uniq.add(c);
      }
      final codes = uniq.toList()..sort();
      return codes;
    }
  }

  /// Import prices for all sets in the catalog.
  Future<void> importAllSets({
    String source = 'tcgplayer',
    void Function(String m)? log,
  }) async {
    final codes = await listAllSetCodes();
    for (final code in codes) {
      final total = await importSet(code, source: source, log: log);
      log?.call('-- $code total: $total');
    }
  }

  /// Import prices for just these set codes.
  Future<void> importSets(
    Iterable<String> codes, {
    String source = 'tcgplayer',
    void Function(String m)? log,
  }) async {
    for (final code in codes) {
      final total = await importSet(code, source: source, log: log);
      log?.call('-- $code total: $total');
    }
  }
}
