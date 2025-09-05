import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

/// PriceImporter – calls your `import-prices` Edge Function to populate pricing.
/// Usage:
///   final importer = PriceImporter(Supabase.instance.client);
///   await importer.importSet('sv6', log: print);
///   await importer.importAllSets(log: print);
///   await importer.importSets(['base1','bw1'], log: print);
class PriceImporter {
  final SupabaseClient _supa;
  PriceImporter(this._supa);

  /// Import prices for a single set (pages until done).
  /// Returns total rows imported. Optional [log] streams progress.
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

      final end =
          data['end'] == true ||
          imported < pageSize ||
          data['nextPageHint'] == null;

      if (end) break;

      page = (data['nextPageHint'] as num).toInt();
      await Future<void>.delayed(const Duration(milliseconds: 150));
    }

    return total;
  }

  /// List all set codes present in your catalog.
  /// Tries RPC `list_set_codes`; falls back to REST distinct if needed.
  Future<List<String>> listAllSetCodes() async {
    try {
      final rows = await _supa.rpc('list_set_codes');
      final list = List<Map<String, dynamic>>.from(rows as List);
      return list
          .map((e) => (e['set_code'] as String).trim())
          .where((c) => c.isNotEmpty)
          .toList();
    } catch (_) {
      // REST fallback: /rest/v1/card_prints?select=set_code&distinct&set_code=not.is.null
      final resp = await _supa.from('card_prints').select('set_code').execute();

      final data = (resp.data as List).cast<Map<String, dynamic>>();
      final set = <String>{};
      for (final r in data) {
        final c = (r['set_code'] as String?)?.trim();
        if (c != null && c.isNotEmpty) set.add(c);
      }
      final codes = set.toList()..sort();
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
