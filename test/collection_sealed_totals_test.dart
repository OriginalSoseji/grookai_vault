import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/sealed/owned_sealed_service_v1.dart';
import 'package:grookai_vault/services/sealed/owned_sealed_totals_controller.dart';

Map<String, dynamic> totals(double? value, {int copies = 1}) => {
  'active_copy_count': copies,
  'priced_copy_count': value == null ? 0 : copies,
  'unpriced_copy_count': value == null ? copies : 0,
  'totals_by_currency': {'USD': ?value},
};
Map<String, dynamic> copy() => {
  'object_kind': 'sealed',
  'instance_id': '11111111-1111-4111-8111-111111111111',
  'sealed_product_variant_id': '22222222-2222-4222-8222-222222222222',
  'gv_vi_id': 'GVVI-test',
  'name': 'Blooming Waters',
  'seal_state': 'unknown',
  'package_condition': 'unknown',
  'intent': 'hold',
  'owned_market_price': null,
  'reference_market_price': 326.70,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('cards plus all priced sealed copies reconcile in USD cents', () {
    expect(
      combineCollectionUsd(2038.80, OwnedSealedTotals.fromJson(totals(326.70))),
      2365.50,
    );
    expect(
      combineCollectionUsd(
        2038.80,
        OwnedSealedTotals.fromJson(totals(653.40, copies: 2)),
      ),
      2692.20,
    );
    expect(
      combineCollectionUsd(.1, OwnedSealedTotals.fromJson(totals(.2))),
      .3,
    );
    expect(
      combineCollectionUsd(null, OwnedSealedTotals.fromJson(totals(326.70))),
      326.70,
    );
    expect(combineCollectionUsd(null, null), isNull);
    expect(
      combineCollectionUsd(2038.80, OwnedSealedTotals.fromJson(totals(null))),
      2038.80,
    );
    expect(
      combineCollectionUsd(
        null,
        OwnedSealedTotals.fromJson({
          ...totals(12),
          'totals_by_currency': {'EUR': 12},
        }),
      ),
      isNull,
    );
  });

  test('reference and asking prices never replace unconfirmed owned value', () {
    final unknown = OwnedSealedCopy.fromJson({
      ...copy(),
      'asking_price_amount': 400,
    });
    expect(unknown.amount('owned_market_price'), isNull);
    expect(unknown.valuationExclusion, contains('unconfirmed'));
    expect(
      OwnedSealedCopy.fromJson({
        ...copy(),
        'seal_state': 'opened',
      }).valuationExclusion,
      contains('opened or damaged'),
    );
    expect(
      OwnedSealedCopy.fromJson({
        ...copy(),
        'reference_market_price': null,
      }).valuationExclusion,
      contains('unavailable'),
    );
    expect(
      OwnedSealedCopy.fromJson({
        ...copy(),
        'owned_market_price': 326.70,
      }).valuationExclusion,
      isNull,
    );
  });

  test('header loads totals without loading any inventory page', () async {
    final controller = OwnedSealedTotalsController(
      OwnedSealedService(
        userId: () => 'owner',
        rpc: (name, params) async {
          expect(name, 'get_owned_sealed_totals_v1');
          expect(params, isEmpty);
          return totals(326.70);
        },
      ),
    );
    addTearDown(controller.dispose);
    await controller.refresh();
    expect(controller.totals?.usd, 326.70);
    expect(controller.loading, isFalse);
  });

  test('latest refresh wins; failure removes stale subtotal', () async {
    final first = Completer<dynamic>(), second = Completer<dynamic>();
    var count = 0;
    final controller = OwnedSealedTotalsController(
      OwnedSealedService(
        userId: () => 'owner',
        rpc: (_, _) {
          count++;
          if (count == 1) return first.future;
          if (count == 2) return second.future;
          throw StateError('offline');
        },
      ),
    );
    addTearDown(controller.dispose);
    final a = controller.refresh(), b = controller.refresh();
    second.complete(totals(653.40, copies: 2));
    await b;
    first.complete(totals(326.70));
    await a;
    expect(controller.totals?.usd, 653.40);
    await controller.refresh();
    expect(controller.totals, isNull);
    expect(controller.failed, isTrue);
  });

  test('account switch and dispose reject delayed totals', () async {
    var user = 'owner';
    final pending = Completer<dynamic>();
    final controller = OwnedSealedTotalsController(
      OwnedSealedService(userId: () => user, rpc: (_, _) => pending.future),
    );
    final request = controller.refresh();
    user = 'other';
    pending.complete(totals(326.70));
    await request;
    expect(controller.totals, isNull);
    controller.dispose();
    await controller.refresh();
  });

  test(
    'signed-out refresh does not query; unrelated owner changes ignored',
    () async {
      String? user;
      final changes = StreamController<String>();
      var reads = 0;
      final controller = OwnedSealedTotalsController(
        OwnedSealedService(
          userId: () => user,
          rpc: (_, _) async {
            reads++;
            return totals(326.70);
          },
        ),
        changes: changes.stream,
      );
      addTearDown(controller.dispose);
      addTearDown(changes.close);
      await controller.refresh();
      expect(reads, 0);
      user = 'owner';
      changes.add('other');
      await Future<void>.delayed(Duration.zero);
      expect(reads, 0);
      changes.add('owner');
      await Future<void>.delayed(Duration.zero);
      expect(reads, 1);
      expect(controller.totals?.usd, 326.70);
    },
  );

  for (final operation in ['remove', 'sale', 'trade']) {
    test('verified edits and $operation refresh collection totals', () async {
      var amount = 326.70;
      final service = OwnedSealedService(
        userId: () => 'owner',
        rpc: (name, params) async {
          switch (name) {
            case 'get_owned_sealed_totals_v1':
              return totals(amount, copies: amount == 0 ? 0 : 1);
            case 'vault_update_sealed_copy_v1':
              return {};
            case 'get_owned_sealed_copies_v1':
              return amount == 0
                  ? []
                  : [
                      {
                        ...copy(),
                        'seal_state': 'factory_sealed',
                        'package_condition': 'undamaged',
                      },
                    ];
            case 'vault_dispose_sealed_copy_v1':
              amount = 0;
              return {
                'instance_id': copy()['instance_id'],
                'operation': params['p_operation'],
                'archived': true,
              };
            default:
              throw StateError(name);
          }
        },
      );
      final controller = OwnedSealedTotalsController(service);
      addTearDown(controller.dispose);
      await service.save(
        OwnedSealedCopy.fromJson(copy()),
        seal: 'factory_sealed',
        condition: 'undamaged',
        intent: 'hold',
      );
      await Future<void>.delayed(Duration.zero);
      expect(controller.totals?.usd, 326.70);
      await service.disposeCopy(
        OwnedSealedCopy.fromJson(copy()),
        operation,
        {},
      );
      await Future<void>.delayed(Duration.zero);
      expect(controller.totals?.copies, 0);
    });
  }

  test(
    'verified additions refresh totals without a mounted inventory panel',
    () async {
      final service = OwnedSealedService(
        userId: () => 'owner',
        rpc: (name, _) async {
          if (name == 'get_owned_sealed_totals_v1') return totals(326.70);
          if (name == 'get_owned_sealed_copies_v1') return [copy()];
          if (name == 'vault_add_sealed_copies_v1') {
            return {
              'instance_ids': [copy()['instance_id']],
              'created_count': 1,
            };
          }
          throw StateError(name);
        },
      );
      final controller = OwnedSealedTotalsController(service);
      addTearDown(controller.dispose);
      await service.add(
        variantId: copy()['sealed_product_variant_id'] as String,
        quantity: 1,
        seal: 'factory_sealed',
        condition: 'undamaged',
      );
      await Future<void>.delayed(Duration.zero);
      expect(controller.totals?.usd, 326.70);
    },
  );

  test('failed readback never emits a completed value change', () async {
    final events = <String>[];
    final subscription = OwnedSealedService.changes.listen(events.add);
    addTearDown(subscription.cancel);
    final service = OwnedSealedService(
      userId: () => 'owner',
      rpc: (name, _) async => name == 'get_owned_sealed_copies_v1' ? [] : {},
    );
    await expectLater(
      service.save(
        OwnedSealedCopy.fromJson(copy()),
        seal: 'factory_sealed',
        condition: 'undamaged',
        intent: 'hold',
      ),
      throwsStateError,
    );
    await Future<void>.delayed(Duration.zero);
    expect(events, isEmpty);
  });
}
