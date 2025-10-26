import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/services/price_service.dart';

class MockPriceService extends Mock implements PriceService {}

void main() {
  test('CardDetailVM loads and refreshes by condition', () async {
    final mockService = MockPriceService();

    when(mockService.latestIndex(cardId: 'test-id', condition: 'NM'))
        .thenAnswer((_) async => {
              'price_low': 280.0,
              'price_mid': 300.0,
              'price_high': 340.0,
              'observed_at': DateTime.now().toIso8601String(),
            });
    when(mockService.latestFloors(cardId: 'test-id', condition: 'NM'))
        .thenAnswer((_) async => {'retail': 255.0, 'market': 262.0});
    when(mockService.latestGvBaseline(cardId: 'test-id', condition: 'NM'))
        .thenAnswer((_) async => {'value': 270.0});

    when(mockService.latestIndex(cardId: 'test-id', condition: 'LP'))
        .thenAnswer((_) async => {
              'price_low': 220.0,
              'price_mid': 240.0,
              'price_high': 260.0,
              'observed_at': DateTime.now().toIso8601String(),
            });
    when(mockService.latestFloors(cardId: 'test-id', condition: 'LP'))
        .thenAnswer((_) async => {'retail': 200.0, 'market': 210.0});
    when(mockService.latestGvBaseline(cardId: 'test-id', condition: 'LP'))
        .thenAnswer((_) async => {'value': 215.0});

    final vm = CardDetailVM.withService(
      cardId: 'test-id',
      priceService: mockService,
      initialCondition: 'NM',
    );

    // First load
    await vm.load();
    expect(vm.isLoading, isFalse);
    expect(vm.condition, equals('NM'));
    verify(mockService.latestIndex(cardId: 'test-id', condition: 'NM')).called(1);
    verify(mockService.latestFloors(cardId: 'test-id', condition: 'NM')).called(1);
    verify(mockService.latestGvBaseline(cardId: 'test-id', condition: 'NM')).called(1);

    // Change condition triggers a single re-query
    await vm.setCondition('LP');
    expect(vm.condition, equals('LP'));
    verify(mockService.latestIndex(cardId: 'test-id', condition: 'LP')).called(1);
    verify(mockService.latestFloors(cardId: 'test-id', condition: 'LP')).called(1);
    verify(mockService.latestGvBaseline(cardId: 'test-id', condition: 'LP')).called(1);

    // Same condition does not re-query
    await vm.setCondition('LP');
    verifyNoMoreInteractions(mockService);

    // Ensure conditions not mixed in results
    // (Basic check: values exist and state reflects current condition)
    expect(vm.giMid, isNotNull);
    expect(vm.retailFloor, isNotNull);
    expect(vm.marketFloor, isNotNull);
  });
}
