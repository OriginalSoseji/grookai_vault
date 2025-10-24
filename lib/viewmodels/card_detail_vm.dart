import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/price_service.dart';

class CardDetailVM extends ChangeNotifier {
  final SupabaseClient supabase;
  late final PriceService _prices;

  final String cardId;

  CardDetailVM({ required this.supabase, required this.cardId, String? initialCondition }) {
    _prices = PriceService(supabase);
    _condition = (initialCondition ?? 'NM').toUpperCase();
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
      final floors = await _prices.latestFloors(cardId: cardId, condition: _condition);
      retailFloor = floors['retail'];
      marketFloor = floors['market'];
      gvBaseline = await _prices.latestGvBaseline(cardId: cardId, condition: _condition);
      final idx = await _prices.latestIndex(cardId: cardId, condition: _condition);
      giLow = (idx?['price_low'] as num?)?.toDouble();
      giMid = (idx?['price_mid'] as num?)?.toDouble();
      giHigh = (idx?['price_high'] as num?)?.toDouble();
      final ts = (idx?['observed_at'] ?? '') as String;
      observedAt = ts.isNotEmpty ? DateTime.tryParse(ts) : null;
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
}
