import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';

class FakeSalesService extends SalesCartService {
  @override
  Stream<void> get accountChanges => const Stream.empty();
  final calls = <Map<String, dynamic>>[];
  Map<String, dynamic>? pending;
  bool loseReply = false;
  int attempts = 0;
  @override
  Future<SalesDeskData> load() async => SalesDeskData(
    available: true,
    storeName: 'Fixture store',
    customers: const [],
    pending: pending,
    rows: [
      VendorPricingWorkspaceRow(
        instanceId: 'copy-one',
        gvviId: 'GVVI-FIXTURE-000001',
        vaultItemId: 'anchor',
        cardPrintId: 'card',
        gvId: 'GV-PK-FIXTURE-001',
        name: 'Pikachu',
        displayName: 'Pikachu',
        number: '1',
        printingLabel: 'Holo',
        conditionLabel: 'NM',
        intent: 'hold',
        isGraded: false,
        marketPrice: null,
        askingPrice: 12.34,
        currency: 'USD',
        sectionIds: {},
      ),
    ],
  );
  @override
  Future<void> stage(Map<String, dynamic> request) async {
    pending = request;
  }

  @override
  Future<Map<String, dynamic>?> recover(String requestId) async => null;
  @override
  Future<void> clearPending(String requestId) async {
    pending = null;
  }

  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    attempts++;
    calls.add(request);
    if (loseReply && attempts == 1) throw StateError('lost reply');
    final cart = request['cart'] as Map;
    final items = (cart['items'] as List)
        .map((i) => {...i as Map, 'lineMinor': i['quantity'] * i['unitMinor']})
        .toList();
    final subtotal = items.fold<int>(
      0,
      (sum, i) => sum + i['lineMinor'] as int,
    );
    return {
      'id': request['id'],
      'storeName': cart['storeName'],
      'number': 'GV-20261003-12345678',
      'createdAt': '2026-10-03T00:00:00Z',
      'customerName': '',
      'method': cart['method'],
      'items': items,
      'subtotalMinor': subtotal,
      'taxMinor': cart['taxMinor'],
      'totalMinor': subtotal + cart['taxMinor'] as int,
      'note': '',
    };
  }
}

Future<void> open(
  WidgetTester tester,
  FakeSalesService service,
  Size size,
) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: service)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'hold and drag a physical copy into cart; duplicate drags are disabled',
    (tester) async {
      final service = FakeSalesService();
      await open(tester, service, const Size(1194, 834));
      final source = find.byKey(const ValueKey('drag-copy-one'));
      final gesture = await tester.startGesture(tester.getCenter(source));
      await tester.pump(const Duration(milliseconds: 600));
      await gesture.moveTo(
        tester.getCenter(find.byKey(const ValueKey('cart-drop'))),
      );
      await tester.pump();
      await gesture.up();
      await tester.pumpAndSettle();
      expect(find.text('Checkout: 1 × USD 12.34'), findsOneWidget);
      expect(find.text('In cart'), findsOneWidget);
      expect(
        tester
            .widget<LongPressDraggable<VendorPricingWorkspaceRow>>(source)
            .maxSimultaneousDrags,
        0,
      );
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('dashboard opens without losing the unsubmitted sale cart', (
    tester,
  ) async {
    await open(tester, FakeSalesService(), const Size(1194, 834));
    await tester.tap(find.text('Add to sale'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Sales dashboard'));
    await tester.pumpAndSettle();
    expect(find.text('Your sales, at a glance'), findsOneWidget);
    expect(find.text('Sales by hour'), findsOneWidget);
    await tester.tap(find.byTooltip('Back to selling'));
    await tester.pumpAndSettle();
    expect(find.text('In cart'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  test(
    'USD entry rejects rounding, scientific notation and oversized input',
    () {
      expect(saleMoneyInput('12.34'), 1234);
      expect(saleMoneyInput('0.1'), 10);
      expect(saleMoney(1234), '12.34');
      for (final bad in [
        '1.234',
        '-1',
        '1e4',
        'Infinity',
        '1000000.01',
        '1,200',
      ]) {
        expect(saleMoneyInput(bad), null);
      }
    },
  );

  testWidgets(
    'iPad has card thumbnails and cart together; mixed cart records once and next sale clears it',
    (tester) async {
      final service = FakeSalesService();
      await open(tester, service, const Size(1194, 834));
      expect(find.text('Sale cart'), findsOneWidget);
      expect(find.text('Pikachu'), findsWidgets);
      await tester.tap(find.text('Add to sale'));
      await tester.pumpAndSettle();
      expect(find.text('In cart'), findsOneWidget);
      await tester.tap(find.text('Quick-add unlisted item'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Card / item name'),
        'Walk-up Charizard',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        '20.00',
      );
      await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '2');
      await tester.tap(find.text('Add to cart'));
      await tester.pumpAndSettle();
      expect(service.calls, isEmpty);
      await tester.scrollUntilVisible(
        find.text('Review & record sale'),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('sales-cart-scroll')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.text('Review & record sale'));
      await tester.pumpAndSettle();
      expect(find.textContaining('USD 52.34'), findsWidgets);
      await tester.tap(find.text('Payment received · Record sale'));
      await tester.pumpAndSettle();
      expect(service.calls, hasLength(1));
      expect((service.calls.single['cart']['items'] as List).length, 2);
      expect(
        service.calls.single['cart']['items'][0]['instanceId'],
        'copy-one',
      );
      expect(service.calls.single['cart']['items'][1]['instanceId'], isNull);
      expect(find.text('Sale recorded'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('Start next sale'),
        150,
        scrollable: find.byType(Scrollable).last,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start next sale'));
      await tester.pumpAndSettle();
      expect(service.pending, isNull);
      expect(
        find.text('Add Vault cards or quick-add an item to begin.'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'portrait cart survives an unconfirmed response and retries identical payload',
    (tester) async {
      final service = FakeSalesService()..loseReply = true;
      await open(tester, service, const Size(768, 1024));
      await tester.tap(find.text('Quick-add unlisted item'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Card / item name'),
        'Unlisted card',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        '5',
      );
      await tester.tap(find.text('Add to cart'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cart (1)'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Review & record sale'));
      await tester.tap(find.text('Review & record sale'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Payment received · Record sale'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Sale status is unconfirmed'), findsOneWidget);
      expect(service.pending, isNotNull);
      await tester.ensureVisible(find.text('Retry / recover this sale'));
      await tester.tap(find.text('Retry / recover this sale'));
      await tester.pumpAndSettle();
      expect(service.calls, hasLength(2));
      expect(service.calls[0], service.calls[1]);
      expect(find.text('Sale recorded'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
