import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SALES_TEST_URL');
  const key = String.fromEnvironment('SALES_TEST_KEY');
  const email = String.fromEnvironment('SALES_TEST_EMAIL');
  const password = String.fromEnvironment('SALES_TEST_PASSWORD');
  testWidgets('iPad real Auth mixed-cart sale and account receipt', (
    tester,
  ) async {
    expect(url, 'http://127.0.0.1:64801');
    expect(email.endsWith('@sales-ipad.invalid'), isTrue);
    final client = SupabaseClient(url, key);
    await client.auth.signInWithPassword(email: email, password: password);
    await tester.pumpWidget(
      MaterialApp(
        home: SalesDeskScreen(service: SalesCartService(client: client)),
      ),
    );
    Future<void> waitFor(Finder finder) async {
      for (var i = 0; i < 100 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(finder, findsWidgets);
    }

    await waitFor(find.text('Add to sale'));
    await binding.takeScreenshot('ipad-sales-cards');
    await tester.tap(find.text('Add to sale').first);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Actual sale price (USD)'),
      '12.34',
    );
    await tester.tap(find.text('Add to cart'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Quick-add unlisted item'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Card / item name'),
      'Walk-up card outside Vault',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Actual sale price (USD)'),
      '5.00',
    );
    await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '2');
    await tester.tap(find.text('Add to cart'));
    await tester.pumpAndSettle();
    if (find.text('Cart (2)').evaluate().isNotEmpty) {
      await tester.tap(find.text('Cart (2)'));
      await tester.pumpAndSettle();
    }
    await tester.enterText(
      find.widgetWithText(TextField, 'Store name on receipt'),
      'iPad fixture vendor',
    );
    await tester.scrollUntilVisible(
      find.text('Review & record sale'),
      180,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('sales-cart-scroll')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await binding.takeScreenshot('ipad-sales-mixed-cart');
    await tester.tap(find.text('Review & record sale'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Payment received · Record sale'));
    await waitFor(find.text('Sale recorded'));
    await tester.pumpAndSettle();
    await binding.takeScreenshot('ipad-sales-receipt');
    final book = await client.rpc('vendor_receipt_book_read_v1');
    expect((book['book']['receipts'] as List).length, 1);
    expect(book['book']['receipts'][0]['receipt']['totalMinor'], 2234);
    expect(book['book']['receipts'][0]['receipt']['items'].length, 2);
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
