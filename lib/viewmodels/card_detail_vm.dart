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
  Duration? age;
  List<String> sources = const [];
  List<Map<String, dynamic>> sold5 = const [];

  // Simple in-memory cache per (cardId, condition)
  final Map<String, _CacheEntry> _cache = {};
  Duration cacheTtl = const Duration(minutes: 10);
  final Map<String, _SoldCacheEntry> _soldCache = {};
  Duration soldTtl = const Duration(minutes: 10);

  Future<void> load() async {
    _isLoading = true; error = null; notifyListeners();
    try {
      final key = cardId + ':' + _condition;
      final now = DateTime.now();
      final hit = _cache[key];
      if (hit != null && now.difference(hit.at) < cacheTtl) {
        _hydrateFromCache(hit);
        return;
      }

      final idx = await _prices.latestIndex(cardId: cardId, condition: _condition);
      giLow = _num(idx?['price_low']);
      giMid = _num(idx?['price_mid']);
      giHigh = _num(idx?['price_high']);
      observedAt = _ts(idx?['observed_at']);

      final floors = await _prices.latestFloors(cardId: cardId, condition: _condition);
      retailFloor = _num(floors['retail']);
      marketFloor = _num(floors['market']);

      final gv = await _prices.latestGvBaseline(cardId: cardId, condition: _condition);
      if (gv == null) {
        gvBaseline = null;
      } else if (gv is num) {
        gvBaseline = gv;
      } else if (gv is Map) {
        gvBaseline = _num(gv['value']);
      }

      final hist = await _prices.indexHistory(cardId, _condition, limit: 14);
      final points = hist.reversed.map((r) => _num(r['price_mid'])).whereType<num>().toList();
      trend = points;

      if (observedAt != null) { age = DateTime.now().difference(observedAt!); } else { age = null; }

      final s = <String>[];
      if (retailFloor != null) s.add('JTCG');
      if (marketFloor != null) s.add('eBay');
      if (gvBaseline != null) s.add('GV');
      sources = s;

      _cache[key] = _CacheEntry(now, idx ?? {}, floors, (gv is Map) ? gv as Map<String, dynamic>? : (gv == null ? null : {'value': gv}), hist);

      // Recent sold comps (with cache)
      final soldKey = cardId + ':' + _condition;
      final soldHit = _soldCache[soldKey];
      if (soldHit != null && DateTime.now().difference(soldHit.at) < soldTtl) {
        sold5 = soldHit.rows;
      } else {
        final comps = await _prices.latestSold5(cardId, _condition, debug: debugSold);
        sold5 = comps;
        _soldCache[soldKey] = _SoldCacheEntry(DateTime.now(), comps);
      }
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
    if (observedAt != null) { age = DateTime.now().difference(observedAt!); } else { age = null; }
    final s = <String>[];
    if (retailFloor != null) s.add('JTCG');
    if (marketFloor != null) s.add('eBay');
    if (gvBaseline != null) s.add('GV');
    sources = s;
  }
}

class _CacheEntry {
  final DateTime at;
  final Map<String, dynamic> index;
  final Map<String, dynamic> floors;
  final Map<String, dynamic>? gv;
  final List<Map<String, dynamic>> history;
  _CacheEntry(this.at, this.index, this.floors, this.gv, this.history);
}

class _SoldCacheEntry {
  final DateTime at;
  final List<Map<String, dynamic>> rows;
  _SoldCacheEntry(this.at, this.rows);
}
