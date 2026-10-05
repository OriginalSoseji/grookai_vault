import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_trade_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native checkout price and canonical/quick trade receipt', (
    tester,
  ) async {
    const url = String.fromEnvironment('SALES_TEST_URL');
    const email = String.fromEnvironment('SALES_TEST_EMAIL');
    expect(url, 'http://127.0.0.1:65301');
    expect(email.endsWith('@sales-trade-ipad.invalid'), true);
    final client = SupabaseClient(
      url,
      const String.fromEnvironment('SALES_TEST_KEY'),
    );
    await client.auth.signInWithPassword(
      email: email,
      password: const String.fromEnvironment('SALES_TEST_PASSWORD'),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.dark),
        ),
        home: SalesDeskScreen(service: SalesCartService(client: client)),
      ),
    );
    Future<void> waitFor(Finder finder) async {
      for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(finder, findsWidgets);
    }

    Future<void> tapText(String label) async {
      if (find.text(label).evaluate().isEmpty) {
        await tester.scrollUntilVisible(
          find.text(label),
          180,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('sales-cart-scroll')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
      }
      final finder = find.text(label).last;
      await tester.ensureVisible(finder);
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    Future<void> fill(String label, String value) async {
      final finder = find.widgetWithText(TextField, label);
      await tester.ensureVisible(finder);
      await tester.enterText(finder, value);
      await tester.pumpAndSettle();
    }

    await waitFor(find.text('Your price: USD 100.00'));
    expect(find.text('TCGplayer product'), findsOneWidget);
    await binding.takeScreenshot('ipad-trade-prices');
    await tapText('Add to sale');
    await fill('Actual sale price (USD)', '90');
    await tapText('Add to cart');
    await tapText('Quick-add unlisted item');
    await fill('Card / item name', 'Quick sale card');
    await fill('Actual sale price (USD)', '10');
    await tapText('Add to cart');
    if (find.text('Cart (2)').evaluate().isNotEmpty) await tapText('Cart (2)');
    expect(find.text('Checkout: 1 × USD 90.00'), findsOneWidget);
    expect(find.text('Your price: USD 100.00'), findsWidgets);
    await tapText('Add trade-in');
    await fill('Search canonical card', 'GV-PK-TRADEIPAD-001');
    final canonical = find.descendant(
      of: find.byType(SalesTradeDialog),
      matching: find.text('Synthetic trade Pikachu'),
    );
    await waitFor(canonical);
    // Missing artwork repeats the title inside the honest image placeholder.
    // Tap the result label, not every matching Text in the result tile.
    await tester.tap(canonical.last);
    await tester.pumpAndSettle();
    final printing = find
        .descendant(
          of: find.byType(SalesTradeDialog),
          matching: find.byType(DropdownButtonFormField<String>),
        )
        .first;
    await waitFor(printing);
    await tester.ensureVisible(printing);
    await tester.tap(printing);
    await tester.pumpAndSettle();
    await tapText('GV-PK-TRADEIPAD-001-STD');
    await tapText('Add this trade card to my Vault');
    await fill('Agreed card value (USD each)', '50');
    await fill('Trade-in percentage', '80');
    await binding.takeScreenshot('ipad-trade-canonical');
    await tapText('Add trade to deal');
    await tapText('Add trade-in');
    await tapText('Quick trade · enter card and value');
    await fill('Trade card / item', 'Quick incoming card');
    await fill('Agreed card value (USD each)', '20');
    await fill('Trade-in percentage', '50');
    await tapText('Add trade to deal');
    await fill('Store name on receipt', 'Synthetic native trade vendor');
    await tapText('Review & record sale');
    expect(find.text('Review the full deal'), findsOneWidget);
    expect(find.text('Customer pays: USD 50.00'), findsWidgets);
    await binding.takeScreenshot('ipad-trade-review');
    await tapText('Exchange completed · Record deal');
    await waitFor(find.text('Sale recorded'));
    await tester.pumpAndSettle();
    await binding.takeScreenshot('ipad-trade-receipt');
    final book = await client.rpc('vendor_receipt_book_read_v1');
    final receipts = book['book']['receipts'] as List;
    expect(receipts.length, 1);
    final receipt = receipts.single['receipt'];
    expect(receipt['totalMinor'], 10000);
    expect(receipt['items'].length, 2);
    expect(receipt['tradeIn']['items'].length, 2);
    expect(receipt['tradeIn']['totalCreditMinor'], 5000);
    expect(receipt['tradeIn']['balanceMinor'], 5000);
    await tester.tap(find.byTooltip('Sales dashboard'));
    await tester.pumpAndSettle();
    await binding.takeScreenshot('ipad-trade-dashboard');
    expect(find.text('USD 100.00'), findsWidgets);
    expect(find.text('USD 50.00'), findsWidgets);
    expect(tester.takeException(), isNull);
    await client.auth.signOut();
    await tester.pumpAndSettle();
    expect(
      find.text('Your account changed. Close and reopen the sales desk.'),
      findsOneWidget,
    );
    await client.dispose();
  });
}
