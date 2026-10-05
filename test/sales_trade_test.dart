import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_trade_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_trade.dart';
import 'package:grookai_vault/services/sales/sales_report.dart';
import 'sales_report_test.dart' as fixtures;
import 'sales_catalog_dialog_test.dart' show CatalogService;

class TradeService extends SalesCartService {
  @override
  Stream<void> get accountChanges => const Stream.empty();
}

void main() {
  testWidgets(
    'phone trade draft can be cancelled and account changes hide customer data',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = CatalogService();
      addTearDown(service.changes.close);
      SalesTradeLine? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await showDialog<SalesTradeLine>(
                    context: context,
                    builder: (_) => SalesTradeDialog(
                      service: service,
                      line: const SalesTradeLine(
                        description: 'Private customer trade',
                        valueMinor: 10000,
                        rateBps: 8000,
                      ),
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(TextField, 'Private customer trade'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(result, isNull);
      expect(service.created, 0);
      expect(service.calls, isEmpty);
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      service.changes.add(null);
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(TextField, 'Private customer trade'),
        findsNothing,
      );
      expect(find.text('Add trade to deal'), findsNothing);
      expect(find.textContaining('Your account changed'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(result, isNull);
      expect(service.calls, isEmpty);
    },
  );
  testWidgets(
    'editing a trade rechecks printing and updates the customer-visible identity',
    (tester) async {
      tester.view.physicalSize = const Size(1194, 834);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = CatalogService();
      addTearDown(service.changes.close);
      SalesTradeLine? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await showDialog<SalesTradeLine>(
                    context: context,
                    builder: (_) => SalesTradeDialog(
                      service: service,
                      line: const SalesTradeLine(
                        description: 'Catalog Charizard · OLD-PRINTING',
                        valueMinor: 10000,
                        rateBps: 8000,
                        cardId: 'canonical',
                        printingId: 'unavailable-printing',
                        condition: 'LP',
                      ),
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add trade to deal'));
      await tester.pumpAndSettle();
      expect(result, isNull);
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('GV-PK-TEST-001-HOLO').last);
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(
          TextField,
          'Catalog Charizard · GV-PK-TEST-001-HOLO',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Add trade to deal'));
      await tester.pumpAndSettle();
      expect(result!.printingId, 'printing');
      expect(result!.condition, 'LP');
      expect(result!.description, contains('GV-PK-TEST-001-HOLO'));
      expect(result!.description, isNot(contains('OLD-PRINTING')));
      expect(service.created, 0);
    },
  );
  test('explicit trade percentages and nearest-cent line credit', () {
    expect(saleMoney(-753), '-7.53');
    expect(saleMoney(-1), '-0.01');
    expect(saleMoney(0), '0.00');
    expect(tradeRateInput('80'), 8000);
    expect(tradeRateInput('82.25'), 8225);
    for (final value in ['-1', '0', '100.01', '80.001', 'NaN', '1e2', '']) {
      expect(tradeRateInput(value), isNull, reason: value);
    }
    const line = SalesTradeLine(
      description: 'Card',
      valueMinor: 999,
      rateBps: 8250,
    );
    expect(line.creditMinor, 824);
    expect(SalesTradeLine.fromJson(line.toJson()).creditMinor, 824);
    expect(
      const SalesTradeLine(
        description: 'Cards',
        valueMinor: 1,
        rateBps: 5000,
        quantity: 3,
      ).creditMinor,
      2,
    );
  });
  test(
    'trade credit is consideration, cash received and customer payout stay separate',
    () {
      final first = fixtures.receipt('one', '2026-10-03T12:00:00Z')
        ..['tradeIn'] = {
          'totalCreditMinor': 2000,
          'balanceMinor': 1247,
          'items': [
            {'description': 'Trade Umbreon'},
          ],
        };
      final second = fixtures.receipt('two', '2026-10-03T13:00:00Z')
        ..['tradeIn'] = {
          'totalCreditMinor': 4000,
          'balanceMinor': -753,
          'items': [],
        };
      final report = SalesReport(
        [first, second],
        start: DateTime.utc(2026),
        end: DateTime.utc(2027),
      );
      expect(report.salesMinor, 6000);
      expect(report.taxMinor, 494);
      expect(report.tradeCreditMinor, 6000);
      expect(report.totalMinor, 1247);
      expect(report.paidToCustomerMinor, 753);
      expect(report.payments['Cash'], 494);
      expect(report.csv(), contains('Paid to customer USD'));
      expect(
        SalesReport(
          [first, second],
          start: DateTime.utc(2026),
          end: DateTime.utc(2027),
          query: 'umbreon',
        ).transactions,
        1,
      );
    },
  );
  testWidgets(
    'quick trade shows customer value, percentage and credit; requires an explicit rate',
    (tester) async {
      tester.view.physicalSize = const Size(1194, 834);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SalesTradeLine? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await showDialog<SalesTradeLine>(
                    context: context,
                    builder: (_) => SalesTradeDialog(service: TradeService()),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Quick trade · enter card and value'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade card / item'),
        'Customer Charizard',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Agreed card value (USD each)'),
        '100',
      );
      await tester.tap(find.text('Add trade to deal'));
      await tester.pumpAndSettle();
      expect(result, isNull);
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade-in percentage'),
        '80',
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Trade credit: USD 80.00'), findsOneWidget);
      await tester.tap(find.text('Add trade to deal'));
      await tester.pumpAndSettle();
      expect(result!.creditMinor, 8000);
      expect(result!.cardId, isNull);
      expect(result!.addToVault, false);
    },
  );
}
