import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/services/price_service.dart';

class _StubPriceService implements PriceService {
  @override
  bool get debug => false;

  @override
  Future<List<String>> availableVariants({required String setCode, required String number}) async => const [];

  @override
  Future<List<Map<String, dynamic>>> indexHistory(String cardId, String condition, {int limit = 14}) async => [
        // newest -> oldest
        {'price_mid': 110.0, 'observed_at': ''},
        {'price_mid': 100.0, 'observed_at': ''}
      ];

  @override
  Future<Map<String, dynamic>> latestFloors({required String cardId, required String condition}) async => {
        'retail': 0,
        'market': 0,
      };

  @override
  Future<Map<String, dynamic>> latestIndex({required String cardId, required String condition}) async => {
        'price_low': 0,
        'price_mid': 110.0,
        'price_high': 0,
        'observed_at': DateTime.now().toIso8601String(),
      };

  @override
  Future<Map<String, dynamic>?> latestGvBaseline({required String cardId, required String condition}) async => null;

  @override
  Future<Map<String, dynamic>?> latestPrice({required String setCode, required String number, String? condition, String? gradeAgency, String? gradeValue}) async => null;

  @override
  Future<List<Map<String, dynamic>>> latestSold5(String cardId, String condition, {String? query, bool debug = false}) async => const [];

  @override
  Future<List<Map<String, dynamic>>> soldCompsFromView(String cardId, {int limit = 25}) async => const [];

  @override
  Future<List<Map<String, dynamic>>> pricesByCondition(String cardId) async => const [];
}

void main() {
  test('pct7d computed from trend oldest→newest', () async {
    final svc = _StubPriceService();
    final vm = CardDetailVM.withService(cardId: 'x', priceService: svc);
    await vm.load();
    expect(vm.pct7d, closeTo(10.0, 1e-6)); // (110-100)/100 * 100 = 10%
  });
}

