import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/price_service.dart';

class CardDetailVM extends ChangeNotifier {
  final SupabaseClient supabase;
  late final PriceService _prices;

  final String cardId;

  CardDetailVM({ required this.supabase, required this.cardId }) {
    _prices = PriceService(supabase);
  }

  String _condition = 'NM';
  String get condition => _condition;
  set condition(String v) { if (_condition != v) { _condition = v; load(); notifyListeners(); } }

  num? retailFloor;
  num? marketFloor;
  num? gvBaseline;
  num? giLow;
  num? giMid;
  num? giHigh;
  DateTime? observedAt;
  bool loading = false;

  Future<void> load() async {
    loading = true; notifyListeners();
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
    } finally {
      loading = false; notifyListeners();
    }
  }
}

