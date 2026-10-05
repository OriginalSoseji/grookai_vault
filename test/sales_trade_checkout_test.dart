import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_trade.dart';
import 'package:grookai_vault/screens/sales/sales_trade_dialog.dart';
import 'sales_catalog_dialog_test.dart' show CatalogService;
import 'sales_desk_screen_test.dart' show open;

class CheckoutTradeService extends CatalogService {
  @override
  Future<SalesDeskData> load() async {
    final d = await super.load();
    return SalesDeskData(
      available: d.available,
      rows: d.rows,
      storeName: d.storeName,
      customers: d.customers,
      pending: pending,
      tradesAvailable: true,
    );
  }

  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    final r = await super.complete(request);
    final trades = (request['cart']['trades'] as List)
        .map((t) => SalesTradeLine.fromJson(t as Map))
        .toList();
    final credit = trades.fold<int>(0, (n, t) => n + t.creditMinor);
    return {
      ...r,
      'tradeIn': {
        'items': trades
            .map((t) => {...t.toJson(), 'creditMinor': t.creditMinor})
            .toList(),
        'totalCreditMinor': credit,
        'balanceMinor': (r['totalMinor'] as int) - credit,
      },
    };
  }
}

void main() {
  testWidgets(
    'canonical trade has no inventory side effect until confirmed; checkout preserves full deal on retry',
    (tester) async {
      final service = CheckoutTradeService()..loseReply = true;
      addTearDown(service.changes.close);
      await open(tester, service, const Size(1194, 834));
      await tester.tap(find.text('Add to sale'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Add trade-in'));
      await tester.tap(find.text('Add trade-in'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Search canonical card'),
        'Charizard',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Catalog Charizard'));
      await tester.pumpAndSettle();
      await tester.tap(
        find
            .descendant(
              of: find.byType(SalesTradeDialog),
              matching: find.byType(DropdownButtonFormField<String>),
            )
            .first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('GV-PK-TEST-001-HOLO').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add this trade card to my Vault'));
      await tester.ensureVisible(
        find.widgetWithText(TextField, 'Agreed card value (USD each)'),
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Agreed card value (USD each)'),
        '10',
      );
      await tester.ensureVisible(
        find.widgetWithText(TextField, 'Trade-in percentage'),
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade-in percentage'),
        '80',
      );
      await tester.tap(find.text('Add trade to deal'));
      await tester.pumpAndSettle();
      expect(find.byType(SalesTradeDialog), findsNothing);
      expect(service.created, 0);
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
      await tester.pumpAndSettle();
      await tester.tap(find.text('Review & record sale'));
      await tester.pumpAndSettle();
      expect(find.text('Review the full deal'), findsOneWidget);
      expect(find.text('Customer pays: USD 4.34'), findsWidgets);
      await tester.tap(find.text('Exchange completed · Record deal'));
      await tester.pumpAndSettle();
      expect(service.pending!['cart']['version'], 2);
      expect(service.pending!['cart']['trades'][0]['addToVault'], true);
      await tester.scrollUntilVisible(
        find.text('Retry / recover this sale'),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('sales-cart-scroll')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry / recover this sale'));
      await tester.pumpAndSettle();
      expect(service.calls.length, 2);
      expect(service.calls[0], service.calls[1]);
      expect(
        find.textContaining('Total trade credit: USD 8.00'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
