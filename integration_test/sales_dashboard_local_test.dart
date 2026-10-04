import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'iPad reads existing native and web receipts without writing a sale',
    (tester) async {
      const url = String.fromEnvironment('SALES_TEST_URL');
      const email = String.fromEnvironment('SALES_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:65001');
      expect(email.endsWith('@sales-pro-ipad.invalid'), true);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SALES_TEST_KEY'),
      );
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('SALES_TEST_PASSWORD'),
      );
      final before = await client.rpc('vendor_receipt_book_read_v1');
      expect((before['book']['receipts'] as List).length, 2);
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.dark),
          ),
          home: SalesDeskScreen(service: SalesCartService(client: client)),
        ),
      );
      for (
        var i = 0;
        i < 100 && find.text('Your cards. Ready to sell.').evaluate().isEmpty;
        i++
      ) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      await tester.tap(find.byTooltip('Sales dashboard'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('All time'));
      await tester.pumpAndSettle();
      expect(find.text('USD 62.34'), findsWidgets);
      await binding.takeScreenshot('ipad-sales-dashboard-polished');
      await tester.scrollUntilVisible(
        find.text('Transaction history'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Find a receipt, customer or card'),
        'Walk-up card',
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.textContaining('Walk-up sale · USD'),
        150,
        scrollable: find.byType(Scrollable).first,
      );
      await binding.takeScreenshot('ipad-sales-history');
      await tester.tap(find.text('Walk-up sale · USD 42.34'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Total received: USD 42.34'), findsOneWidget);
      await binding.takeScreenshot('ipad-sales-history-receipt');
      await client.auth.signOut();
      await tester.pumpAndSettle();
      expect(find.textContaining('Total received: USD 42.34'), findsNothing);
      expect(
        find.text('Your account changed. Close and reopen the sales desk.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await client.dispose();
    },
  );
}
