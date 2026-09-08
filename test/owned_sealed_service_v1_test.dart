import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/sealed/owned_sealed_service_v1.dart';

const instance = '11111111-1111-4111-8111-111111111111';
const variant = '22222222-2222-4222-8222-222222222222';
Map<String, dynamic> row() => {'object_kind': 'sealed', 'instance_id': instance,
  'sealed_product_variant_id': variant, 'gv_vi_id': 'GVVI-fixture', 'name': 'Booster box',
  'package_form': 'booster_box', 'language_code': 'ja', 'seal_state': 'unknown', 'package_condition': 'unknown',
  'section_ids': <String>[], 'owned_market_price': null, 'reference_market_price': null};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test('typed sealed identity never substitutes a card ID and keeps unknown price', () {
    final copy = OwnedSealedCopy.fromJson(row());
    expect(copy.id, instance); expect(copy.amount('owned_market_price'), isNull);
    expect(copy.identity, contains('JA')); expect(copy.data.containsKey('card_print_id'), isFalse);
    expect(() => OwnedSealedCopy.fromJson({...row(), 'object_kind': 'card'}), throwsFormatException);
  });
  test('totals preserve separate currencies and reconcile copies', () {
    final totals = OwnedSealedTotals.fromJson({'active_copy_count': 3, 'priced_copy_count': 1,
      'unpriced_copy_count': 2, 'totals_by_currency': {'USD': 12.34}});
    expect(totals.usd, 12.34); expect(totals.unpriced, 2);
    expect(() => OwnedSealedTotals.fromJson({'active_copy_count': 2, 'priced_copy_count': 1,
      'unpriced_copy_count': 2, 'totals_by_currency': {}}), throwsFormatException);
  });
  test('an interrupted mutation retains its request ID across service instances', () async {
    final ids = <String>[];
    final first = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async {
      ids.add(params['p_request_id'] as String); throw Exception('connection interrupted after commit');
    });
    await expectLater(first.mutation('fixture', {'p_instance_id': instance}), throwsException);
    final second = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async {
      ids.add(params['p_request_id'] as String); return {'confirmed': true};
    });
    await second.mutation('fixture', {'p_instance_id': instance});
    expect(ids[0], ids[1]); expect((await SharedPreferences.getInstance()).getKeys(), isEmpty);
    await second.mutation('fixture', {'p_instance_id': instance});
    expect(ids[2], isNot(ids[1]));
  });
  test('parallel duplicate submissions share one provider request', () async {
    var calls = 0;
    final waiting = Completer<void>();
    final service = OwnedSealedService(userId: () => 'owner', rpc: (_, _) async { calls++; await waiting.future; return {'ok': true}; });
    final first = service.mutation('fixture', {}), second = service.mutation('fixture', {});
    await Future<void>.delayed(const Duration(milliseconds: 20)); waiting.complete();
    await Future.wait([first, second]); expect(calls, 1);
  });
  test('add cannot succeed before exact ownership readback', () async {
    var reads = 0;
    final changed = OwnedSealedService.additions.first;
    final service = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async {
      if (name == 'vault_add_sealed_copies_v1') return {'instance_ids': [instance], 'created_count': 1};
      reads++; return [row()];
    });
    await service.add(variantId: variant, quantity: 1, seal: 'unknown', condition: 'unknown');
    expect(reads, 1);
    expect(await changed, 'owner');
  });
  test('missing readback is not success and preserves request for recovery', () async {
    final events = <String>[];
    final subscription = OwnedSealedService.additions.listen(events.add);
    addTearDown(subscription.cancel);
    final service = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async =>
      name == 'vault_add_sealed_copies_v1' ? {'instance_ids': [instance], 'created_count': 1} : []);
    await expectLater(service.add(variantId: variant, quantity: 1, seal: 'unknown', condition: 'unknown'), throwsStateError);
    expect((await SharedPreferences.getInstance()).getKeys().length, 1);
    await Future<void>.delayed(Duration.zero);
    expect(events, isEmpty);
  });
  test('archive readback must withdraw active copy', () async {
    final service = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async =>
      name == 'vault_dispose_sealed_copy_v1' ? {'instance_id': instance, 'operation': 'remove', 'archived': true} : [row()]);
    await expectLater(service.disposeCopy(OwnedSealedCopy.fromJson(row()), 'remove', {}), throwsStateError);
  });
  test('account change cannot report mutation success', () async {
    var user = 'owner';
    final service = OwnedSealedService(userId: () => user, rpc: (_, _) async { user = 'another'; return {'ok': true}; });
    await expectLater(service.mutation('fixture', {}), throwsStateError);
  });
  test('search and Wall filters are applied before server pagination', () async {
    final service = OwnedSealedService(userId: () => 'owner', rpc: (name, params) async {
      expect(name, 'get_owned_sealed_inventory_v1'); expect(params['p_section_id'], instance);
      expect(params['p_wall_only'], isTrue); expect(params['p_query'], 'Japanese'); expect(params['p_offset'], 50); return [];
    });
    await service.page(offset: 50, sectionId: instance, wallOnly: true, query: 'Japanese');
  });
}
