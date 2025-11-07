import 'package:supabase_flutter/supabase_flutter.dart';

class PricePoint {
  final DateTime t;
  final double v;
  const PricePoint(this.t, this.v);
}

class PriceService {
  final SupabaseClient _client;
  PriceService(this._client);

  bool get debug => false;

  Future<List<String>> availableVariants({required String setCode, required String number}) async {
    // TODO: return available variants for a print
    return const <String>[];
  }

  // ---- Methods used across existing screens (stubs) ----
  Future<Map<String, dynamic>> latestIndex({required String cardId, required String condition}) async {
    // TODO: query latest GV index row for cardId+condition
    return <String, dynamic>{
      'price_low': null,
      'price_mid': null,
      'price_high': null,
      'observed_at': DateTime.now().toIso8601String(),
    };
  }

  Future<Map<String, dynamic>> latestFloors({required String cardId, required String condition}) async {
    // TODO: fetch retail/market floors
    return <String, dynamic>{'retail': null, 'market': null};
  }

  Future<Map<String, dynamic>?> latestGvBaseline({required String cardId, required String condition}) async {
    // TODO: fetch GV baseline value
    return null;
  }

  Future<List<Map<String, dynamic>>> indexHistory(String cardId, String condition, {int limit = 14}) async {
    // TODO: fetch recent index history
    return const <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> latestSold5(String cardId, String condition, {bool debug = false}) async {
    // TODO: fetch 5 most recent sold comps
    return const <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> pricesByCondition(String cardId) async {
    // TODO: fetch latest mid price per condition
    return const <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>?> latestPrice({required String setCode, required String number, String? condition, String? gradeAgency, String? gradeValue}) async {
    // TODO: real query from pricing view/table
    return null;
  }

  Future<List<Map<String, dynamic>>> soldCompsFromView(String cardId, {int limit = 50}) async {
    // TODO: query recent sales materialized view
    return const [];
  }
}

enum PriceRange { d7, m1, m3, y1, all }
