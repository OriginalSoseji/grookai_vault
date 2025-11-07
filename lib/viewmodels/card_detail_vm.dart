import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/price_service.dart';

class CardDetailVM extends ChangeNotifier {
  final String cardId;
  final SupabaseClient? supabase;
  late final PriceService _prices;

  final bool debugSold;

  CardDetailVM({
    required this.cardId,
    SupabaseClient? supabase,
    PriceService? priceService,
    String initialCondition = 'NM',
    bool debugSold = false,
  }) : supabase = supabase, debugSold = debugSold {
    if (priceService != null) {
      _prices = priceService;
    } else {
      if (supabase == null) {
        throw ArgumentError('Either priceService or supabase must be provided');
      }
      _prices = PriceService(supabase);
    }
    _condition = initialCondition.toUpperCase();
  }

  CardDetailVM.withService({
    required this.cardId,
    required PriceService priceService,
    String initialCondition = 'NM',
    bool debugSold = false,
  }) : supabase = null, debugSold = debugSold {
    _prices = priceService;
    _condition = initialCondition.toUpperCase();
  }

  String _condition = 'NM';
  String get condition => _condition;
  bool get isLoading => _isLoading;

  bool _isLoading = false;
  String? error;

  num? retailFloor;
  num? marketFloor;
  num? gvBaseline;
  num? giLow;
  num? giMid;
  num? giHigh;
  DateTime? observedAt;
  // Polish: trend sparkline, staleness, dynamic sources
  List<num> trend = const [];
  double? pct7d;
  Duration? age;
  List<String> sources = const [];
  List<Map<String, dynamic>> sold5 = const [];
  List<_CondRow> _pricesByCond = const [];

  // Simple in-memory cache per (cardId, condition)
  final Map<String, _CacheEntry> _cache = {};
  Duration cacheTtl = const Duration(minutes: 10);
  final Map<String, _SoldCacheEntry> _soldCache = {};
  Duration soldTtl = const Duration(minutes: 10);

  Future<void> load() async {
    _isLoading = true; error = null; notifyListeners();
    try {
      final key = '$cardId:$_condition';
      final now = DateTime.now();
      final hit = _cache[key];
      if (hit != null && now.difference(hit.at) < cacheTtl) {
        _hydrateFromCache(hit);
        return;
      }

      final idx = await _prices.latestIndex(cardId: cardId, condition: _condition);
      giLow = _num(idx['price_low']);
      giMid = _num(idx['price_mid']);
      giHigh = _num(idx['price_high']);
      observedAt = _ts(idx['observed_at']);

      final floors = await _prices.latestFloors(cardId: cardId, condition: _condition);
      retailFloor = _num(floors['retail']);
      marketFloor = _num(floors['market']);

      final gvMap = await _prices.latestGvBaseline(cardId: cardId, condition: _condition);
      gvBaseline = (gvMap is Map && gvMap != null && gvMap['value'] != null) ? _num(gvMap['value']) : null;

      final hist = await _prices.indexHistory(cardId, _condition, limit: 14);
      final points = hist.reversed.map((r) => _num(r['price_mid'])).whereType<num>().toList();
      trend = points;

      // pct7d: compare last vs first in our window
      if (points.length >= 2) {
        final first = points.first;
        final last = points.last;
        pct7d = (first != 0) ? ((last - first) / first) * 100.0 : null;
      } else {
        pct7d = null;
      }

      // age from observedAt
      if (observedAt != null) { age = DateTime.now().difference(observedAt!); } else { age = null; }

      // dynamic sources
      final s = <String>[];
      if (retailFloor != null) s.add('JTCG');
      if (marketFloor != null) s.add('eBay');
      if (gvBaseline != null) s.add('GV');
      sources = s;

      // Recent sold comps (with cache)
      final soldKey = '$cardId:$_condition';
      final soldHit = _soldCache[soldKey];
      if (soldHit != null && DateTime.now().difference(soldHit.at) < soldTtl) {
        sold5 = soldHit.rows;
      } else {
        final comps = await _prices.latestSold5(cardId, _condition, debug: debugSold);
        sold5 = comps;
        _soldCache[soldKey] = _SoldCacheEntry(DateTime.now(), comps);
      }

      // write to cache (including history and sold5)
      _cache[key] = _CacheEntry(now, idx, floors, (gvMap is Map) ? gvMap : null, hist, sold5);

      // Prices by condition (GV index)
      _pricesByCond = await _loadPricesByCondition();
    } catch (e) {
      error = e.toString();
    } finally {
      _isLoading = false; notifyListeners();
    }
  }

  Future<void> setCondition(String next) async {
    final v = (next).toUpperCase();
    if (v == _condition) return;
    _condition = v;
    notifyListeners();
    await load();
  }

  num? _num(dynamic v) {
    if (v == null) return null;
    if (v is num) return v;
    return num.tryParse(v.toString());
  }

  DateTime? _ts(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  void _hydrateFromCache(_CacheEntry c) {
    giLow = _num(c.index['price_low']);
    giMid = _num(c.index['price_mid']);
    giHigh = _num(c.index['price_high']);
    observedAt = _ts(c.index['observed_at']);
    retailFloor = _num(c.floors['retail']);
    marketFloor = _num(c.floors['market']);
    final gv = c.gv;
    gvBaseline = gv == null ? null : _num(gv['value']);
    final points = c.history.reversed.map((r) => _num(r['price_mid'])).whereType<num>().toList();
    trend = points;
    if (points.length >= 2) {
      final first = points.first; final last = points.last;
      pct7d = (first != 0) ? ((last - first) / first) * 100.0 : null;
    } else {
      pct7d = null;
    }
    if (observedAt != null) { age = DateTime.now().difference(observedAt!); } else { age = null; }
    final s = <String>[];
    if (retailFloor != null) s.add('JTCG');
    if (marketFloor != null) s.add('eBay');
    if (gvBaseline != null) s.add('GV');
    sources = s;
    sold5 = c.sold5;
  }

  Future<List<_CondRow>> _loadPricesByCondition() async {
    try {
      final rows = await _prices.pricesByCondition(cardId);
      rows.sort((a, b) => _orderIndex((a['condition'] ?? '').toString())
          .compareTo(_orderIndex((b['condition'] ?? '').toString())));
      return rows
          .map((r) => _CondRow(
                (r['condition'] ?? '').toString(),
                _fmt(r['price_mid']),
                _ago(r['observed_at']),
              ))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  List<_CondRow> conditionsWithPrices() => _pricesByCond;

  String _fmt(dynamic v) {
    final n = (v is num) ? v : num.tryParse('$v');
    return n == null ? '-' : '\$${n.toStringAsFixed(2)}';
  }
  String _ago(dynamic ts) {
    final d = DateTime.tryParse(ts?.toString() ?? '');
    if (d == null) return '';
    final dd = DateTime.now().difference(d);
    if (dd.inDays >= 1) return '${dd.inDays}d ago';
    if (dd.inHours >= 1) return '${dd.inHours}h ago';
    if (dd.inMinutes >= 1) return '${dd.inMinutes}m ago';
    return 'just now';
  }
  int _orderIndex(String c) {
    const order = ['NM', 'LP', 'MP', 'HP', 'DMG'];
    final u = c.toUpperCase();
    final i = order.indexOf(u);
    return i >= 0 ? i : 999;
  }

}

class _CondRow {
  final String label;
  final String price;
  final String updated;
  _CondRow(this.label, this.price, this.updated);
}

class _CacheEntry {
  final DateTime at;
  final Map<String, dynamic> index;
  final Map<String, dynamic> floors;
  final Map<String, dynamic>? gv;
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> sold5;
  _CacheEntry(this.at, this.index, this.floors, this.gv, this.history, this.sold5);
}

class _SoldCacheEntry {
  final DateTime at;
  final List<Map<String, dynamic>> rows;
  _SoldCacheEntry(this.at, this.rows);
}
