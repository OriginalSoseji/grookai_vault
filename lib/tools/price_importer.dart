import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Calls your `import-prices` Edge Function and pages until the server says end=true.
/// Ignores `imported < pageSize` and falls back to (page+1) if `nextPageHint` is missing.
class PriceImporter {
  final SupabaseClient _supa;
  PriceImporter(this._supa);

  Future<int> importSet(
    String setCode, {
    String source = 'tcgdex',
    int pageSize = 250,
    int maxRetries = 3,
    void Function(String m)? log,
  }) async {
    var page = 1;
    var total = 0;

    while (true) {
      final payload = <String, dynamic>{
        // accept both server conventions
        'setCode': setCode,
        'set_code': setCode,
        'page': page,
        'page_size': pageSize,
        'pageSize': pageSize,
        'source': source,
      };

      Map<String, dynamic> data = const {};
      int attempt = 0;

      // Retry current page a few times if the function throws
      while (true) {
        try {
          final res = await _supa.functions.invoke(
            'import-prices',
            body: payload,
          );
          data = Map<String, dynamic>.from(res.data ?? {});
          break;
        } catch (e) {
          attempt++;
          if (attempt >= maxRetries) {
            log?.call('ERROR $setCode page $page: $e (giving up)');
            rethrow;
          }
          final delayMs = 400 * attempt;
          log?.call('WARN  $setCode page $page: $e (retry in ${delayMs}ms)');
          await Future<void>.delayed(Duration(milliseconds: delayMs));
        }
      }

      final imported = (data['imported'] ?? 0) as int;
      final fetched =
          (data['fetched'] ?? data['count'] ?? data['pageCount'])
              as int?; // optional from server
      final end =
          data['end'] == true || (fetched != null && fetched < pageSize);
      final nph = data['nextPageHint'];
      final next = end ? null : (nph is num ? nph.toInt() : page + 1);

      total += imported;
      log?.call(
        '$setCode page $page -> priced $imported (fetched=${fetched ?? "?"}, end=$end, next=$next)',
      );

      if (end || next == null) break;

      page = next;
      await Future<void>.delayed(const Duration(milliseconds: 150));
    }

    return total;
  }

  /// List all set codes. Tries RPC `list_set_codes` first; falls back to REST distinct.
  Future<List<String>> listAllSetCodes() async {
    try {
      final rows = await _supa.rpc('list_set_codes');
      final list = List<Map<String, dynamic>>.from(rows as List);
      return list
          .map((e) => (e['set_code'] as String).trim())
          .where((c) => c.isNotEmpty)
          .toList();
    } catch (_) {
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

  Future<void> importAllSets({
    String source = 'tcgdex',
    void Function(String m)? log,
  }) async {
    final codes = await listAllSetCodes();
    for (final code in codes) {
      final total = await importSet(code, source: source, log: log);
      log?.call('-- $code total: $total');
    }
  }

  Future<void> importSets(
    Iterable<String> codes, {
    String source = 'tcgdex',
    void Function(String m)? log,
  }) async {
    for (final code in codes) {
      final total = await importSet(code, source: source, log: log);
      log?.call('-- $code total: $total');
    }
  }
}


