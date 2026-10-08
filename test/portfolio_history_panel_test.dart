import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/vault/portfolio_history_panel.dart';
import 'package:grookai_vault/services/vault/portfolio_history_service.dart';
import 'helpers/portfolio_history_fakes.dart';

void main() {
  late PortfolioFakeGateway gateway;
  late PortfolioMemoryStore store;
  late PortfolioHistoryService service;
  var serial = 100;
  PortfolioHistoryService make({bool enabled = true}) =>
      PortfolioHistoryService(
        gateway: gateway,
        store: store,
        newId: () => portfolioTestId(serial++),
        allowNewRecordings: enabled,
      );
  setUp(() {
    gateway = PortfolioFakeGateway();
    store = PortfolioMemoryStore();
    service = make();
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });
  Future<void> show(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: PortfolioHistoryPanel(
              ownerId: portfolioTestId(1),
              service: service,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'first visit automatically records once and never invents a prior gain',
    (tester) async {
      await show(tester);
      expect(gateway.captures, 1);
      expect(
        find.text('Collection recorded for 2026-10-08 UTC.'),
        findsOneWidget,
      );
      expect(
        find.textContaining('This is your first observation.'),
        findsOneWidget,
      );
      expect(find.textContaining('%'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      service.dispose();
      service = make();
      await show(tester);
      expect(gateway.captures, 1);
      expect(tester.takeException(), null);
    },
  );
  testWidgets(
    'unconfirmed request remains visible and recovers after panel recreation with entry off',
    (tester) async {
      gateway.loseResponse = true;
      await show(tester);
      expect(find.text('Recording needs confirmation'), findsOneWidget);
      final request = portfolioCopy(store.row!['pending']);
      await tester.pumpWidget(const SizedBox());
      service.dispose();
      service = make(enabled: false);
      await show(tester);
      expect(store.row!['pending'], null);
      expect(store.row!['lastOutcome']['request'], request);
      expect(gateway.captures, 1);
      expect(
        find.textContaining('New recordings are currently unavailable.'),
        findsOneWidget,
      );
    },
  );
  testWidgets('history read failure does not trigger an automatic capture', (
    tester,
  ) async {
    gateway.failList = true;
    await show(tester);
    expect(gateway.captures, 0);
    expect(find.text('Retry loading'), findsOneWidget);
    expect(find.textContaining('No recorded observations yet.'), findsNothing);
  });
  testWidgets('failed recording is not retried automatically on every visit', (
    tester,
  ) async {
    gateway.failure = 'pricing_unavailable';
    await show(tester);
    expect(gateway.captures, 1);
    expect(
      find.text('The price source is unavailable. No observation was saved.'),
      findsOneWidget,
    );
    await tester.pumpWidget(const SizedBox());
    service.dispose();
    service = make();
    await show(tester);
    expect(gateway.captures, 1);
    expect(find.text('Record today’s collection'), findsOneWidget);
  });
  testWidgets('account switch clears visible private history immediately', (
    tester,
  ) async {
    await show(tester);
    expect(
      find.textContaining('Latest recorded observation ·'),
      findsOneWidget,
    );
    gateway.switchOwner();
    await tester.pumpAndSettle();
    expect(find.textContaining('Latest recorded observation'), findsNothing);
    expect(find.textContaining('Your account changed.'), findsOneWidget);
  });
  testWidgets(
    'all-unpriced observation remains visible and is not called zero',
    (tester) async {
      gateway.enabled = false;
      gateway.points = [portfolioTestPoint(owned: 7)];
      await show(tester);
      expect(find.text('No priced copies'), findsNWidgets(2));
      expect(
        find.textContaining('7 unpriced copies are included in ownership'),
        findsOneWidget,
      );
      expect(find.textContaining('USD 0.00'), findsNothing);
      expect(tester.takeException(), null);
    },
  );
  testWidgets('narrow screen and enlarged text do not overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    gateway.enabled = false;
    gateway.points = [
      portfolioTestPoint(sequence: 2, owned: 7),
      portfolioTestPoint(),
    ];
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.6)),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            child: PortfolioHistoryPanel(
              ownerId: portfolioTestId(1),
              service: service,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), null);
    expect(find.text('What changed?'), findsOneWidget);
  });
}
