import 'package:supabase_flutter/supabase_flutter.dart';

String _normSet(String s) => s.trim().toLowerCase();

String _normNum(String n) {
  final left = (n.trim().split('/').first);
  final core = left.replaceAll(RegExp(r'[^0-9a-zA-Z]'), '');
  final m = RegExp(r'^(\d+)([a-zA-Z]+)$').firstMatch(core);
  if (m != null) {
    final parsed = int.tryParse(m.group(1) ?? '') ?? 0;
    final suf = (m.group(2) ?? '').toLowerCase();
    return parsed.toString().padLeft(3, '0') + suf; // 1a -> 001a
  }
  if (RegExp(r'^\d+$').hasMatch(core)) {
    final v = int.tryParse(core) ?? 0;
    return v.toString().padLeft(3, '0'); // 1 -> 001
  }
  return core.toLowerCase();
}

/// Join-aware pricing service using v_latest_print_prices
/// View columns: set_code, number, print_id, condition, grade_agency, grade_value, source, price_usd, observed_at
class PriceService {
  final SupabaseClient _supa;
  final bool debug;
  PriceService(this._supa, {this.debug = false});

  void _log(String m) { if (debug) print('[PriceService] ' + m); }

  /// Newest price row for a set/number (optionally filter by condition/grade).
  Future<Map<String, dynamic>?> latestPrice({
    required String setCode,
    required String number,
    String? condition,
    String? gradeAgency,
    String? gradeValue,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    dynamic q = _supa
        .from('v_latest_print_prices')
        .select()
        .eq('set_code', set)
        .eq('number', num)
        .order('observed_at', ascending: false)
        .limit(1);

    if (condition != null && condition.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('condition', condition);
    }
    if (gradeAgency != null && gradeAgency.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('grade_agency', gradeAgency);
    }
    if (gradeValue != null && gradeValue.isNotEmpty) {
      // ignore: cascade_invocations
      q.eq('grade_value', gradeValue);
    }

    final rows = await q as List;
    return rows.isNotEmpty ? rows.first as Map<String, dynamic> : null;
  }

  /// Distinct sources available for a print, newest first.
  Future<List<String>> availableVariants({
    required String setCode,
    required String number,
  }) async {
    final set = _normSet(setCode);
    final num = _normNum(number);

    final rows =
        await _supa
                .from('v_latest_print_prices')
                .select('source,observed_at')
                .eq('set_code', set)
                .eq('number', num)
                .order('observed_at', ascending: false)
                .limit(20)
            as List;

    final out = <String>[];
    for (final r in rows) {
      final s = (r['source'] ?? '').toString();
      if (s.isNotEmpty && !out.contains(s)) out.add(s);
    }
    return out;
  }

  /// Latest Grookai Index for a given print and condition.
  Future<Map<String, dynamic>> latestIndex({
    required String cardId,
    required String condition,
  }) async {
    final rows = await _supa
        .from('latest_card_prices_v')
        .select('price_low,price_mid,price_high,observed_at')
        .eq('card_id', cardId)
        .eq('condition', condition)
        .eq('source', 'grookai_index')
        .limit(1) as List;
    if (rows.isEmpty) {
      _log('latestIndex: no rows for ' + cardId + '/' + condition);
      return {
        'price_low': null,
        'price_mid': null,
        'price_high': null,
        'observed_at': null,
      };
    }
    final r = rows.first as Map<String, dynamic>;
    return {
      'price_low': r['price_low'],
      'price_mid': r['price_mid'],
      'price_high': r['price_high'],
      'observed_at': r['observed_at'],
    };
  }

  /// Latest floors for a given print and condition.
  Future<Map<String, dynamic>> latestFloors({
    required String cardId,
    required String condition,
  }) async {
    final rows = await _supa
        .from('latest_card_floors_v')
        .select('source,floor_price')
        .eq('card_id', cardId)
        .eq('condition', condition) as List;
    num? retail;
    num? market;
    for (final r in rows) {
      final s = (r['source'] ?? '').toString();
      final fp = r['floor_price'];
      final val = fp is num ? fp : num.tryParse('$fp');
      if (s == 'retail') retail = val;
      if (s == 'market') market = val;
    }
    _log('latestFloors: retail=' + (retail?.toString() ?? 'null') + ' market=' + (market?.toString() ?? 'null') + ' for ' + cardId + '/' + condition);
    return { 'retail': retail, 'market': market };
  }

  /// Optional GV baseline for a given print and condition.
  Future<Map<String, dynamic>?> latestGvBaseline({
    required String cardId,
    required String condition,
  }) async {
    try {
      final rows = await _supa
          .from('latest_card_gv_baselines_v')
          .select('value')
          .eq('card_id', cardId)
          .eq('condition', condition)
          .limit(1) as List;
      if (rows.isEmpty) return null;
      final v = rows.first['value'];
      final n = v is num ? v : num.tryParse('$v');
      return n == null ? null : { 'value': n };
    } catch (_) {
      return null;
    }
  }

  /// Historical Grookai Index points for sparkline (newest -> oldest)
  Future<List<Map<String, dynamic>>> indexHistory(String cardId, String condition, {int limit = 14}) async {
    final rows = await _supa
        .from('card_prices')
        .select('price_mid,observed_at')
        .eq('card_id', cardId)
        .eq('condition', condition)
        .eq('source', 'grookai_index')
        .order('observed_at', ascending: false)
        .limit(limit) as List;
    return rows.cast<Map<String, dynamic>>();
  }

  /// Last 5 sold comps from eBay via edge function
  Future<List<Map<String, dynamic>>> latestSold5(String cardId, String condition, {String? query, bool debug = false}) async {
    try {
      final resp = await _supa.functions.invoke('ebay_sold_engine', body: {
        'cardId': cardId,
        'condition': condition,
        if (query != null) 'query': query,
        'limit': 5,
        if (debug) 'debug': true,
      });
      final data = (resp.data is Map) ? resp.data as Map : const {};
      final raw = (data['sales'] is List) ? data['sales'] as List : const [];
      return raw
          .map((e) => e is Map ? e as Map<String, dynamic> : <String, dynamic>{})
          .map((e) => {
                'price': e['price'],
                'currency': e['currency'] ?? 'USD',
                'date': e['date'],
                'title': (e['title'] ?? '').toString(),
                'url': (e['url'] ?? '').toString(),
                'condition': e['condition'] ?? condition,
                'shipping': e['shipping'],
              })
          .toList();
    } catch (_) {
      // TODO: If function doesn't return 'sales', adapt when available.
      return const [];
    }
  }
}
