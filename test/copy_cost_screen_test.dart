import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/vault/copy_cost_screen.dart';
import 'package:grookai_vault/services/vault/copy_cost_journal.dart';
import 'package:grookai_vault/services/vault/copy_cost_models.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';
import 'support/copy_cost_fakes.dart';

void main() {
  late MemoryCostStore store;
  late FakeCostGateway gateway;
  late CopyCostService service;
  late GlobalKey<NavigatorState> navigator;
  setUp(() {
    store = MemoryCostStore([]);
    gateway = FakeCostGateway([])..updateCost = true;
    service = CopyCostService(
      gateway: gateway,
      store: store,
      newRequestId: () => requestId,
    );
    navigator = GlobalKey<NavigatorState>();
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });
  Future<void> open(
    WidgetTester tester, {
    bool enabled = true,
    bool recovery = false,
    double scale = 1,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: const Scaffold(body: Text('Inventory home')),
      ),
    );
    unawaited(
      navigator.currentState!.push(
        MaterialPageRoute<void>(
          builder: (_) => recovery
              ? CopyCostRecoveryScreen(service: service, entryEnabled: enabled)
              : CopyCostScreen(
                  service: service,
                  instanceId: instance,
                  gvviId: 'GVVI-TEST',
                  title: 'Private sample card',
                  entryEnabled: enabled,
                ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> show(WidgetTester tester, Finder target) async {
    if (target.evaluate().isEmpty) {
      await tester.scrollUntilVisible(
        target,
        220,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .last,
        maxScrolls: 30,
      );
    }
    await tester.ensureVisible(target);
    await tester.pumpAndSettle();
  }

  Future<void> tap(WidgetTester tester, String key) async {
    final button = find.byKey(Key(key));
    await show(tester, button);
    await tester.tap(button);
    await tester.pumpAndSettle();
  }

  Future<void> input(WidgetTester tester, String key, String text) async {
    await show(tester, find.byKey(Key(key)));
    await tester.enterText(find.byKey(Key(key)), text);
    await tester.pumpAndSettle();
  }

  CopyCostDraft draft() => CopyCostDraft.create(
    ownerId: owner,
    instanceId: instance,
    gvviId: 'GVVI-TEST',
    title: 'Private sample card',
    cost: unknown,
  ).withValues({'amountText': '12', 'currencyText': 'USD'});

  testWidgets('explicit currency is required and zero is a known cost', (
    tester,
  ) async {
    await open(tester);
    expect(find.text('Cost unknown'), findsOneWidget);
    await input(tester, 'copy_cost_amount', '0');
    await tap(tester, 'copy_cost_save');
    expect(gateway.requests, isEmpty);
    expect(
      find.textContaining('Enter both the cost and its currency'),
      findsOneWidget,
    );
    await input(tester, 'copy_cost_currency', 'USD');
    await tap(tester, 'copy_cost_save');
    expect(gateway.requests.single['amount'], '0.00');
    expect(gateway.requests.single['currency'], 'USD');
    expect(find.text('USD 0.00'), findsOneWidget);
    expect(store.value!.pending, isNull);
  });

  testWidgets('mark unknown saves a null pair', (tester) async {
    gateway.cost = const CopyCostEvidence(
      amount: '12.00',
      currency: 'USD',
      minor: '1200',
      status: 'known',
    );
    await open(tester);
    await tap(tester, 'copy_cost_unknown');
    await tap(tester, 'copy_cost_save');
    expect(gateway.requests.single['amount'], isNull);
    expect(gateway.requests.single['currency'], isNull);
    expect(gateway.requests.single['expectedAmount'], '12.00');
    expect(find.text('Cost unknown'), findsOneWidget);
  });

  testWidgets(
    'lost response survives reopening and recovers without another write',
    (tester) async {
      gateway.loseResponse = true;
      await open(tester);
      await input(tester, 'copy_cost_amount', '12');
      await input(tester, 'copy_cost_currency', 'USD');
      await tap(tester, 'copy_cost_save');
      expect(store.value!.pending!.requestId, requestId);
      expect(find.text('Save awaiting confirmation'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('Inventory home'), findsOneWidget);
      await open(tester, recovery: true, enabled: false);
      await tap(tester, 'recover_cost_$instance');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('copy_cost_amount')))
            .enabled,
        isFalse,
      );
      await tap(tester, 'copy_cost_recover');
      expect(store.value!.pending, isNull);
      expect(gateway.requests, hasLength(1));
      expect(find.text('Cost saved.'), findsOneWidget);
    },
  );

  testWidgets('archived copy and failed current read still expose recovery', (
    tester,
  ) async {
    gateway.loseResponse = true;
    await service.beginSave(draft());
    gateway.archived = true;
    gateway.editEnabled = false;
    gateway.failRead = true;
    await open(tester, enabled: false);
    expect(find.textContaining('Current cost could not load'), findsOneWidget);
    await tap(tester, 'copy_cost_recover');
    expect(gateway.requests, hasLength(1));
    expect(store.value!.pending, isNull);
  });

  testWidgets('device failure preserves text and prevents leaving', (
    tester,
  ) async {
    await open(tester);
    store.fail = true;
    await input(tester, 'copy_cost_amount', '27');
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text('Private cost'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('copy_cost_amount')))
          .controller!
          .text,
      '27',
    );
    expect(gateway.requests, isEmpty);
    store.fail = false;
    await tester.ensureVisible(find.text('Retry device save'));
    await tester.tap(find.text('Retry device save'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text('Inventory home'), findsOneWidget);
    expect(store.value!.amountText, '27');
  });

  testWidgets('back waits for the queued edit', (tester) async {
    await open(tester);
    store.hold = Completer<void>();
    await tester.enterText(find.byKey(const Key('copy_cost_amount')), '31');
    await tester.tap(find.byType(BackButton));
    await tester.pump();
    expect(find.text('Private cost'), findsOneWidget);
    expect(store.value, isNull);
    store.hold!.complete();
    await tester.pumpAndSettle();
    expect(find.text('Inventory home'), findsOneWidget);
    expect(store.value!.amountText, '31');
  });

  testWidgets(
    'account change hides private fields and rejects a late response',
    (tester) async {
      await open(tester);
      await input(tester, 'copy_cost_amount', '12');
      await input(tester, 'copy_cost_currency', 'USD');
      gateway.hold = Completer<void>();
      await tester.ensureVisible(find.byKey(const Key('copy_cost_save')));
      await tester.tap(find.byKey(const Key('copy_cost_save')));
      await tester.pump();
      gateway.ownerId = other;
      gateway.changes.add(other);
      await tester.pump();
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Private sample card'), findsNothing);
      expect(find.textContaining('Your account changed'), findsOneWidget);
      gateway.hold!.complete();
      await tester.pumpAndSettle();
      expect(store.value!.pending, isNotNull);
      expect(find.text('Cost saved.'), findsNothing);
    },
  );

  testWidgets('changed recorded cost requires review and retains proposal', (
    tester,
  ) async {
    await store.save(draft());
    gateway.cost = const CopyCostEvidence(
      amount: '19.00',
      currency: 'USD',
      minor: '1900',
      status: 'known',
    );
    await open(tester);
    await show(tester, find.byKey(const Key('copy_cost_save')));
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('copy_cost_save')))
          .onPressed,
      isNull,
    );
    await show(tester, find.text('Review current cost and keep proposal'));
    await tester.tap(find.text('Review current cost and keep proposal'));
    await tester.pumpAndSettle();
    expect(store.value!.expectedAmount, '19.00');
    expect(store.value!.amountText, '12');
    await tap(tester, 'copy_cost_save');
    expect(gateway.requests.single['expectedAmount'], '19.00');
  });

  testWidgets('read failure never displays unknown or permits a new save', (
    tester,
  ) async {
    gateway.failRead = true;
    await open(tester);
    expect(find.text('Cost unknown'), findsNothing);
    expect(find.byKey(const Key('copy_cost_save')), findsNothing);
    expect(find.textContaining('Current cost could not load'), findsOneWidget);
    gateway.failRead = false;
    await tap(tester, 'copy_cost_refresh');
    expect(find.text('Cost unknown'), findsOneWidget);
  });

  testWidgets('phone at double text size keeps actions reachable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await open(tester, scale: 2);
    await input(tester, 'copy_cost_amount', '12');
    await input(tester, 'copy_cost_currency', 'USD');
    await tap(tester, 'copy_cost_save');
    expect(gateway.requests, hasLength(1));
    expect(tester.takeException(), isNull);
  });
}
