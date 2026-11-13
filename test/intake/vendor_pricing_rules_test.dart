import 'dart:async';
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
    VendorPricingRulesService service, {
    SaleListingService? listing,
  }) async {
    tester.view.physicalSize = const Size(400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(() => tester.pumpWidget(const SizedBox.shrink()));
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: VaultCopySaleSheet(
            cardName: 'Venusaur ex',
            copy: copy,
            service: listing ?? SaleListingService(),
            pricingService: service,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Map<String, dynamic> state(int revision, String mode) => {
    ...workspace,
    'copy': {'mode': mode, 'revision': revision, 'state': 'ready'},
  };
  Future<void> choose(WidgetTester tester, String label) async {
    final field = find.byType(DropdownButtonFormField<String>);
    await tester.ensureVisible(field);
    await tester.tap(field);
    await tester.pumpAndSettle();
    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  Future<void> save(WidgetTester tester) async {
    final button = find.widgetWithText(
      FilledButton,
      'Make public and For sale',
    );
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pumpAndSettle();
  }

  SaleListingService manualWriter(void Function() committed) =>
      SaleListingService(
        currentUserId: 'owner-1',
        persist:
            ({required userId, required instanceId, required values}) async {
              committed();
              return {
                ...values,
                'id': instanceId,
                'gv_vi_id': copy.gvviId,
                'card_print_id': copy.cardPrintId,
              };
            },
      );

  testWidgets(
    'open automatic editor refreshes market and preset quotes without advancing its edit revision',
    (tester) async {
      var current = state(3, 'default');
      var amount = 1150;
      int? appliedRevision;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') return current;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': amount,
              'ruleName': 'Live rule',
            };
          }
          if (action == 'apply') {
            appliedRevision = data['expectedRevision'] as int;
            current = state(4, 'default');
            return {
              'ok': true,
              'status': 'ready',
              'id': 'copy-1',
              'amountMinor': amount,
            };
          }
          throw StateError('unexpected action');
        },
      );
      await render(tester, pricing);
      expect(find.textContaining(r'$11.50'), findsOneWidget);
      amount = 1375;
      current = {
        ...current,
        'settings': {...workspace['settings'] as Map, 'revision': 4},
      };
      await tester.pump(const Duration(seconds: 16));
      await tester.pumpAndSettle();
      expect(find.textContaining(r'$13.75'), findsOneWidget);
      expect(find.textContaining(r'$11.50'), findsNothing);
      await save(tester);
      expect(appliedRevision, 3);
    },
  );

  testWidgets(
    'automatic polling cannot adopt an external manual revision and overwrite it',
    (tester) async {
      var current = state(3, 'default');
      var writes = 0;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') return current;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Live rule',
            };
          }
          writes++;
          throw StateError('competing manual choice must remain protected');
        },
      );
      await render(tester, pricing);
      current = state(7, 'manual');
      await tester.pump(const Duration(seconds: 16));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('pricing changed in another view'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Make public and For sale'),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<DropdownButton<String>>(find.byType(DropdownButton<String>))
            .value,
        'default',
      );
      expect(writes, 0);
    },
  );

  testWidgets(
    'a refreshed automatic amount invalidates the previous Square readiness',
    (tester) async {
      var amount = 1150;
      var current = state(2, 'default');
      final pricing = _ReadyPricingService(
        call: (action, data) async {
          if (action == 'workspace') return current;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': amount,
              'ruleName': 'Live rule',
            };
          }
          throw StateError('read only');
        },
        applied: () => current = state(3, 'default'),
      );
      await render(tester, pricing);
      await save(tester);
      expect(
        find.text('For sale saved. Ready to scan in Square.'),
        findsOneWidget,
      );
      amount = 1375;
      await tester.pump(const Duration(seconds: 16));
      await tester.pumpAndSettle();
      expect(find.textContaining(r'$13.75'), findsOneWidget);
      expect(
        find.text('For sale saved. Ready to scan in Square.'),
        findsNothing,
      );
      expect(find.text('Check Square status'), findsOneWidget);
      expect(find.text('grookai QR'), findsOneWidget);
    },
  );

  testWidgets(
    'automatic refresh pauses in background, resumes fresh, and stops after closing',
    (tester) async {
      var amount = 1150, reads = 0;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') {
            reads++;
            return state(3, 'default');
          }
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': amount,
              'ruleName': 'Live rule',
            };
          }
          throw StateError('read only');
        },
      );
      await render(tester, pricing);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      addTearDown(
        () => tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        ),
      );
      amount = 1425;
      await tester.pump(const Duration(seconds: 16));
      expect(reads, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.textContaining(r'$14.25'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      final closedReads = reads;
      await tester.pump(const Duration(seconds: 31));
      expect(reads, closedReads);
    },
  );

  testWidgets('automatic refresh never replaces a fixed price being typed', (
    tester,
  ) async {
    var reads = 0;
    final pricing = VendorPricingRulesService(
      call: (action, data) async {
        if (action == 'workspace') {
          reads++;
          return state(3, 'default');
        }
        if (action == 'preview') {
          return {
            'status': 'ready',
            'amountMinor': 1150,
            'ruleName': 'Live rule',
          };
        }
        throw StateError('read only');
      },
    );
    await render(tester, pricing);
    await choose(tester, 'My price · fixed');
    await tester.enterText(find.byType(TextField), '2.50');
    await tester.pump(const Duration(seconds: 31));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '2.50',
    );
    expect(reads, 1);
  });

  testWidgets(
    'manual save then automatic uses the new revision in the same sheet',
    (tester) async {
      var current = state(3, 'default');
      int? appliedRevision;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') return current;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Show pricing',
            };
          }
          if (action == 'apply') {
            appliedRevision = data['expectedRevision'] as int;
            if (appliedRevision != (current['copy'] as Map)['revision']) {
              return {'ok': false, 'error': 'vendor_pricing_copy_changed'};
            }
            current = state(5, 'default');
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
      await render(
        tester,
        pricing,
        listing: manualWriter(() => current = state(4, 'manual')),
      );
      await choose(tester, 'My price · fixed');
      await tester.enterText(find.byType(TextField), '2.50');
      await save(tester);
      await choose(tester, 'Vendor default · automatic');
      await save(tester);
      expect(appliedRevision, 4);
      expect(find.textContaining('For sale saved.'), findsOneWidget);
      expect(find.textContaining('could not be confirmed'), findsNothing);
    },
  );

  testWidgets(
    'late initial strategy cannot replace a fixed price being typed',
    (tester) async {
      final initial = Completer<Map<String, dynamic>>();
      var current = state(3, 'default');
      var reads = 0, applies = 0;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') {
            return ++reads == 1 ? initial.future : current;
          }
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Show pricing',
            };
          }
          applies++;
          throw StateError('manual choice must not invoke automatic apply');
        },
      );
      double? entered;
      final listing = SaleListingService(
        currentUserId: 'owner-1',
        persist:
            ({required userId, required instanceId, required values}) async {
              entered = values['asking_price_amount'] as double;
              current = state(4, 'manual');
              return {
                ...values,
                'id': instanceId,
                'gv_vi_id': copy.gvviId,
                'card_print_id': copy.cardPrintId,
              };
            },
      );
      await render(tester, pricing, listing: listing);
      await tester.enterText(find.byType(TextField), '2.50');
      initial.complete(state(3, 'default'));
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '2.50',
      );
      await save(tester);
      expect(entered, 2.5);
      expect(applies, 0);
    },
  );

  testWidgets(
    'initial response arriving after a confirmed save cannot restore its old strategy',
    (tester) async {
      final initial = Completer<Map<String, dynamic>>();
      var current = state(3, 'default');
      var reads = 0;
      int? appliedRevision;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') {
            return ++reads == 1 ? initial.future : current;
          }
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Show pricing',
            };
          }
          if (action == 'apply') {
            appliedRevision = data['expectedRevision'] as int;
            if (appliedRevision != 4) {
              return {'ok': false, 'error': 'vendor_pricing_copy_changed'};
            }
            current = state(5, 'default');
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
      await render(
        tester,
        pricing,
        listing: manualWriter(() => current = state(4, 'manual')),
      );
      await tester.enterText(find.byType(TextField), '2.50');
      await save(tester);
      initial.complete(state(3, 'default'));
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '2.50',
      );
      await choose(tester, 'Vendor default · automatic');
      await save(tester);
      expect(appliedRevision, 4);
    },
  );

  testWidgets(
    'failed refresh keeps the confirmed manual sale and blocks stale automatic edits',
    (tester) async {
      var reads = 0;
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') {
            if (++reads == 1) return state(3, 'manual');
            throw StateError('fixture read outage');
          }
          throw StateError('automatic calls must stay disabled');
        },
      );
      await render(tester, pricing, listing: manualWriter(() {}));
      await tester.enterText(find.byType(TextField), '2.50');
      await save(tester);
      expect(find.textContaining('For sale saved.'), findsOneWidget);
      expect(
        find.textContaining('Sale saved. Close this sheet'),
        findsOneWidget,
      );
      final field = tester.widget<DropdownButton<String>>(
        find.byType(DropdownButton<String>),
      );
      expect(
        field.items!.singleWhere((item) => item.value == 'default').enabled,
        false,
      );
    },
  );

  testWidgets(
    'managing rules cannot advance an unsaved editor past an external manual change',
    (tester) async {
      var current = state(3, 'default');
      final pricing = VendorPricingRulesService(
        call: (action, data) async {
          if (action == 'workspace') return current;
          if (action == 'preview') {
            return {
              'status': 'ready',
              'amountMinor': 1150,
              'ruleName': 'Show pricing',
            };
          }
          throw StateError('must not write');
        },
      );
      await render(tester, pricing);
      await choose(tester, 'My price · fixed');
      await tester.enterText(find.byType(TextField), '2.50');
      current = state(7, 'manual');
      await tester.tap(find.text('Manage pricing rules'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        find.textContaining('pricing changed in another view'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Make public and For sale'),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '2.50',
      );
    },
  );

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

class _ReadyPricingService extends VendorPricingRulesService {
  _ReadyPricingService({required super.call, required this.applied});
  final VoidCallback applied;
  @override
  Future<String> apply({
    required String instanceId,
    required String selection,
    required int revision,
  }) async {
    applied();
    return 'ready';
  }
}
