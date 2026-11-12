import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_rules_service.dart';
import 'package:grookai_vault/widgets/vault/vault_copy_sale_sheet.dart';

void main() {
  final workspace = <String, dynamic>{
    'enabled': true,
    'settings': {
      'default_rule_id': 'preset-1',
      'auto_for_new': true,
      'revision': 2,
    },
    'rules': [
      {'id': 'preset-1', 'name': 'Show pricing'},
    ],
    'copy': {'mode': 'default', 'revision': 3, 'state': 'waiting'},
  };
  const copy = SaleListingCopyContext(
    instanceId: 'copy-1',
    gvviId: 'GVVI-065CAB28-003419',
    vaultItemId: 'group-1',
    cardPrintId: 'card-1',
  );
  Future<void> render(
    WidgetTester tester,
    VendorPricingRulesService service,
  ) async {
    tester.view.physicalSize = const Size(400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: VaultCopySaleSheet(
            cardName: 'Venusaur ex',
            copy: copy,
            service: SaleListingService(),
            pricingService: service,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'opted-in new copy previews server price and applies no client amount',
    (tester) async {
      final actions = <String>[];
      Map<String, dynamic>? applied;
      final service = VendorPricingRulesService(
        call: (action, data) async {
          actions.add(action);
          if (action == 'workspace') return workspace;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Show pricing',
            };
          }
          if (action == 'apply') {
            applied = data;
            return {
              'ok': true,
              'status': 'ready',
              'id': 'copy-1',
              'amountMinor': 1150,
            };
          }
          throw StateError('unexpected action');
        },
      );
      await render(tester, service);
      expect(find.textContaining(r'$11.50'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.text('Make public and For sale'));
      await tester.pumpAndSettle();
      expect(actions.where((a) => a == 'apply').length, 1);
      expect(applied!['expectedRevision'], 3);
      expect(applied!['mode'], 'default');
      expect(applied!['publish'], true);
      expect(applied!.containsKey('amountMinor'), false);
      expect(applied!.containsKey('ownerId'), false);
      expect(find.textContaining('For sale saved.'), findsOneWidget);
      expect(find.textContaining('Ready to scan in Square'), findsNothing);
    },
  );
  testWidgets('missing reference cannot publish automatically', (tester) async {
    var applies = 0;
    final service = VendorPricingRulesService(
      call: (action, data) async {
        if (action == 'workspace') return workspace;
        if (action == 'preview') {
          return {
            'status': 'waiting',
            'reason': 'No fresh exact market reference.',
          };
        }
        applies++;
        throw StateError('must not publish');
      },
    );
    await render(tester, service);
    expect(find.text('No fresh exact market reference.'), findsOneWidget);
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Make public and For sale'),
    );
    expect(button.onPressed, isNull);
    expect(applies, 0);
  });
  test(
    'automatic writer rejects an identity or amount mismatch before Square',
    () async {
      for (final result in [
        {'ok': true, 'status': 'ready', 'id': 'wrong-copy', 'amountMinor': 200},
        {'ok': true, 'status': 'ready', 'id': 'copy-1', 'amountMinor': 0},
      ]) {
        final service = VendorPricingRulesService(call: (_, _) async => result);
        await expectLater(
          service.apply(
            instanceId: 'copy-1',
            selection: 'default',
            revision: 0,
          ),
          throwsFormatException,
        );
      }
    },
  );
  test('stale settings and missing references retain a useful error', () async {
    for (final code in [
      'vendor_pricing_copy_changed',
      'vendor_pricing_no_exact_market',
    ]) {
      final service = VendorPricingRulesService(
        call: (_, _) async => {'ok': false, 'error': code},
      );
      await expectLater(
        service.apply(instanceId: 'copy-1', selection: 'default', revision: 0),
        throwsFormatException,
      );
    }
  });
}
