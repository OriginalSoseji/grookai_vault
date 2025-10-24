import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/price_service.dart';

class CardDetailVM extends ChangeNotifier {
  final String cardId;
  final SupabaseClient? supabase;
  late final PriceService _prices;

  CardDetailVM({
    required this.cardId,
    SupabaseClient? supabase,
    PriceService? priceService,
    String initialCondition = 'NM',
  }) : supabase = supabase {
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
  }) : supabase = null {
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

  Future<void> load() async {
    _isLoading = true; error = null; notifyListeners();
    try {
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
}
