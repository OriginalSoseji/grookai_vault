import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'cards_service.dart'; // lazy (Edge Functions)
import 'legacy_search_service.dart'; // DB (Supabase SQL/view)
import 'package:supabase_flutter/supabase_flutter.dart';

/// Tries lazy-import search first; if it returns nothing or errors,
/// silently falls back to the legacy search.
class SearchGateway {
  final _lazy = CardsService();
  final _legacy = LegacySearchService();

  bool get _useLazy =>
      (dotenv.env['GV_USE_LAZY_SEARCH'] ?? 'true').toLowerCase() == 'true';
  String get _searchSource =>
      (dotenv.env['GV_SEARCH_SOURCE'] ?? 'db').toLowerCase();
  bool get _lazyOverlay =>
      (dotenv.env['GV_LAZY_OVERLAY'] ?? 'true').toLowerCase() == 'true';
  bool get _pricesAsync =>
      ((dotenv.env['GV_PRICES_ASYNC'] ?? '1')).toLowerCase() == '1' ||
      ((dotenv.env['GV_PRICES_ASYNC'] ?? '1')).toLowerCase() == 'true';

  Future<List<Map<String, dynamic>>> search(String query) async {
    // DB-first mode (default): always fetch DB results; optionally overlay lazy
    if (_searchSource == 'db') {
      if (kDebugMode)
        debugPrint(
          '[LAZY] gateway source=db q="$query" overlay=${_lazyOverlay}',
        );
      final dbRows = await _legacy.search(query);
      var normDb = _normalize(dbRows, defaultSource: 'db');
      if (!_pricesAsync) {
        normDb = await _attachPrices(normDb);
      }
      if (!_lazyOverlay || !_useLazy) {
        return normDb;
      }
      // Overlay lazy: fetch external and append those not present in DB
      List<Map<String, dynamic>> lazy = <Map<String, dynamic>>[];
      try {
        lazy = await _lazy
            .search(query)
            .timeout(
              const Duration(seconds: 4),
              onTimeout: () => <Map<String, dynamic>>[],
            );
        if (kDebugMode)
          debugPrint('[LAZY] overlay lazy-result count=${lazy.length}');
      } catch (e) {
        if (kDebugMode) debugPrint('[LAZY] overlay lazy-error: $e');
      }
      if (lazy.isEmpty) return normDb;
      final set = {
        for (final d in normDb)
          '${(d['set_code'] ?? '').toString().toLowerCase()}|${(d['number'] ?? '').toString().toLowerCase()}':
              true,
      };
      final extra = lazy.where((r) {
        final k =
            '${(r['set_code'] ?? '').toString().toLowerCase()}|${(r['number'] ?? '').toString().toLowerCase()}';
        return !set.containsKey(k);
      }).toList();
      var normExtra = _normalize(extra, defaultSource: 'tcgdex');
      if (!_pricesAsync) {
        normExtra = await _attachPrices(normExtra);
      }
      return [...normDb, ...normExtra];
    }

    // Lazy-first (legacy behavior) for compatibility
    if (kDebugMode) debugPrint('[LAZY] gateway source=lazy q="$query"');
    try {
      final r = await _lazy
          .search(query)
          .timeout(
            const Duration(seconds: 4),
            onTimeout: () => <Map<String, dynamic>>[],
          );
      if (kDebugMode) debugPrint('[LAZY] lazy-result count=${r.length}');
      if (r.isNotEmpty) {
        _telemetry(hit: true);
        final blended = await _overlayWithDb(r);
        return _normalize(blended);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[LAZY] lazy-error: $e');
    }
    _telemetry(hit: false);
    if (kDebugMode) debugPrint('[LAZY] legacy-fallback q="$query"');
    final f = await _legacy.search(query);
    if (kDebugMode) debugPrint('[LAZY] legacy-result count=${f.length}');
    return _normalize(f, defaultSource: 'db');
  }

  /// If DB has the same print (by set_code+number), prefer DB row and mark source=db.
  Future<List<Map<String, dynamic>>> _overlayWithDb(
    List<Map<String, dynamic>> lazyRows,
  ) async {
    final client = Supabase.instance.client;
    // Collect pairs
    final pairs = <Map<String, String>>[];
    for (final r in lazyRows) {
      final sc = (r['set_code'] ?? '').toString();
      final num = (r['number'] ?? '').toString();
      if (sc.isEmpty || num.isEmpty) continue;
      // Attempt overlay even for alias-like set codes; DB match will simply return none.
      pairs.add({'set': sc, 'num': num});
    }
    if (pairs.isEmpty) return lazyRows;

    // Try batch RPC first; fallback to OR chain if unavailable
    try {
      final data = await client.rpc(
        'get_prints_by_pairs',
        params: {'pairs': pairs},
      );
      final dbRows = List<Map<String, dynamic>>.from(
        (data as List?) ?? const [],
      );
      if (dbRows.isEmpty) {
        // Fallback: OR expression
        final orParts = pairs
            .map((p) => 'and(set_code.eq.${p['set']},number.eq.${p['num']})')
            .join(',');
        final data2 = await client
            .from('card_prints')
            .select(
              'id,set_code,name,number,image_url,image_alt_url,name_local,lang',
            )
            .or(orParts);
        final dbRows2 = List<Map<String, dynamic>>.from(
          (data2 as List?) ?? const [],
        );
        if (dbRows2.isEmpty) return lazyRows;
        return _blendRows(lazyRows, dbRows2);
      }
      return _blendRows(lazyRows, dbRows);
    } catch (_) {
      // Fallback: OR expression
      try {
        final orParts = pairs
            .map((p) => 'and(set_code.eq.${p['set']},number.eq.${p['num']})')
            .join(',');
        final data = await client
            .from('card_prints')
            .select(
              'id,set_code,name,number,image_url,image_alt_url,name_local,lang',
            )
            .or(orParts);
        final dbRows = List<Map<String, dynamic>>.from(
          (data as List?) ?? const [],
        );
        if (dbRows.isEmpty) return lazyRows;
        return _blendRows(lazyRows, dbRows);
      } catch (_) {
        return lazyRows;
      }
    }
  }

  List<Map<String, dynamic>> _blendRows(
    List<Map<String, dynamic>> lazyRows,
    List<Map<String, dynamic>> dbRows,
  ) {
    final map = <String, Map<String, dynamic>>{};
    for (final d in dbRows) {
      final k =
          '${(d['set_code'] ?? '').toString().toLowerCase()}|${(d['number'] ?? '').toString().toLowerCase()}';
      map[k] = d;
    }

    final blended = <Map<String, dynamic>>[];
    for (final r in lazyRows) {
      final sc = (r['set_code'] ?? '').toString().toLowerCase();
      final num = (r['number'] ?? '').toString().toLowerCase();
      final k = '$sc|$num';
      if (map.containsKey(k)) {
        final d = map[k]!;
        blended.add({
          'id': d['id'],
          'set_code': d['set_code'],
          'name': d['name'] ?? r['name'],
          'number': d['number'],
          'image_url': d['image_url'] ?? d['image_alt_url'] ?? r['image_url'],
          'lang': d['lang'] ?? 'en',
          'source': 'db',
        });
      } else {
        blended.add(r);
      }
    }
    return blended;
  }

  /// Ensure a consistent shape for UI:
  /// { id, set_code, name, number, image_url, lang? }
  List<Map<String, dynamic>> _normalize(
    List<Map<String, dynamic>> rows, {
    String? defaultSource,
  }) {
    return rows.map<Map<String, dynamic>>((r) {
      return {
        'id': r['id'] ?? r['card_id'] ?? r['print_id'],
        'set_code': r['set_code'] ?? r['set'] ?? r['set_name'] ?? '',
        'name': r['name_local'] ?? r['name'] ?? 'Card',
        'number': r['number'] ?? '',
        'image_url': r['image_url'] ?? r['photo_url'] ?? '',
        'source': r['source'] ?? defaultSource ?? 'db',
        'lang': r['lang'] ?? 'en',
        // price fields if present
        'price_low': r['price_low'],
        'price_mid': r['price_mid'],
        'price_high': r['price_high'],
        'currency': r['currency'],
        'price_last_updated': r['price_last_updated'] ?? r['observed_at'],
      };
    }).toList();
  }

  void _telemetry({required bool hit}) {
    if (kDebugMode) {
      print(hit ? 'telemetry: lazy_hit' : 'telemetry: lazy_miss');
    }
    // Later: send to Supabase (metrics table) if you want.
  }

  /// Fetch latest prices for the given card ids and merge into rows.
  Future<List<Map<String, dynamic>>> _attachPrices(
    List<Map<String, dynamic>> rows,
  ) async {
    try {
      final ids = rows
          .map((r) => (r['id'] ?? '').toString())
          .where((s) => s.isNotEmpty)
          .toList();
      if (ids.isEmpty) return rows;
      if (kDebugMode) debugPrint('[PRICES] attach.start ids=${ids.length}');
      final client = Supabase.instance.client;
      if (kDebugMode)
        debugPrint('[PRICES] diag.attach.start ids=${ids.length}');
      final data = await client
          .from('latest_card_prices_v')
          // Required fields for mapping; currency is optional but helpful
          .select(
            'card_id, price_low, price_mid, price_high, observed_at, currency',
          )
          .inFilter('card_id', ids);
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (kDebugMode) debugPrint('[PRICES] diag.attach.rows=${list.length}');
      if (list.isEmpty) {
        if (kDebugMode) debugPrint('[PRICES] attach.empty');
        if (kDebugMode) debugPrint('[PRICES] diag.attach.ZERO');
        // When empty, keep rows; priceStatus remains implicit
        return rows;
      }
      if (kDebugMode) debugPrint('[PRICES] attach.done count=${list.length}');
      final latest = <String, Map<String, dynamic>>{};
      for (final r in list) {
        final id = (r['card_id'] ?? '').toString();
        if (id.isEmpty) continue;
        if (!latest.containsKey(id))
          latest[id] = r; // first is latest due to order desc
      }
      return rows.map((r) {
        final id = (r['id'] ?? '').toString();
        final p = latest[id];
        if (p == null) return r;
        return {
          ...r,
          'price_low': p['price_low'],
          'price_mid': p['price_mid'],
          'price_high': p['price_high'],
          'currency': p['currency'] ?? 'USD',
          'price_last_updated': p['observed_at'],
        };
      }).toList();
    } catch (e) {
      if (kDebugMode)
        debugPrint(
          '[VIEW] latest_card_prices_v unavailable ? prices disabled ()',
        );
      return rows.map((r) => {...r, 'priceStatus': 'unavailable'}).toList();
    }
  }
}

